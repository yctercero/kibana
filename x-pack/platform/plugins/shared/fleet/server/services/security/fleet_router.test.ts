/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CheckPrivilegesDynamically,
  CheckPrivilegesResponse,
  CheckPrivilegesPayload,
} from '@kbn/security-plugin/server';
import type { AuthenticatedUser, RequestHandler } from '@kbn/core/server';
import type { VersionedRouter } from '@kbn/core-http-server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import { coreMock } from '@kbn/core/server/mocks';

import { API_VERSIONS } from '../../../common/constants';

import type { FleetRequestHandlerContext } from '../..';
import { createAppContextStartContractMock } from '../../mocks';
import { appContextService } from '..';

import { makeRouterWithFleetAuthz } from './fleet_router';

const mockLogger = loggingSystemMock.createLogger();

function getCheckPrivilegesMockedImplementation(kibanaRoles: string[]) {
  return (checkPrivileges: CheckPrivilegesPayload) => {
    const kibana = ((checkPrivileges?.kibana ?? []) as string[]).map((role: string) => {
      return {
        privilege: role,
        authorized: kibanaRoles.includes(role),
      };
    });

    return Promise.resolve({
      hasAllRequested: kibana.every((r: any) => r.authorized),
      privileges: {
        kibana,
      },
    } as unknown as CheckPrivilegesResponse);
  };
}

describe('FleetAuthzRouter', () => {
  const runTest = async ({
    security: {
      roles = [],
      pluginEnabled = true,
      licenseEnabled = true,
      checkPrivilegesDynamically,
    } = {},
    routeConfig = {
      path: '/api/fleet/test',
    },
  }: {
    security: {
      roles?: string[];
      pluginEnabled?: boolean;
      licenseEnabled?: boolean;
      checkPrivilegesDynamically?: CheckPrivilegesDynamically;
    };
    routeConfig?: any;
  }) => {
    const fakeRouter = {
      versioned: {
        get: jest.fn().mockImplementation(() => {
          return {
            addVersion: jest
              .fn()
              .mockImplementation((options: any, handler: RequestHandler) => Promise.resolve()),
          };
        }),
      },
    } as unknown as jest.Mocked<VersionedRouter<FleetRequestHandlerContext>>;
    const fakeHandler: RequestHandler = jest.fn((ctx, req, res) => res.ok());

    const mockContext = createAppContextStartContractMock();
    // @ts-expect-error type doesn't properly respect deeply mocked keys
    mockContext.securityStart.authz.actions.api.get.mockImplementation((priv) => `api:${priv}`);
    // @ts-expect-error type doesn't properly respect deeply mocked keys
    mockContext.securityStart.authz.actions.ui.get.mockImplementation((priv) => `ui:${priv}`);

    mockContext.securityCoreStart.authc.getCurrentUser.mockReturnValue({
      username: 'foo',
      roles,
    } as unknown as AuthenticatedUser);

    mockContext.securitySetup.license.isEnabled.mockReturnValue(licenseEnabled);
    if (licenseEnabled) {
      mockContext.securityStart.authz.mode.useRbacForRequest.mockReturnValue(true);
    }

    if (checkPrivilegesDynamically) {
      mockContext.securityStart.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(
        checkPrivilegesDynamically
      );
    }

    appContextService.start(mockContext);

    const fleetAuthzRouter = makeRouterWithFleetAuthz(fakeRouter as any, mockLogger);
    fleetAuthzRouter.versioned
      .get({ ...routeConfig })
      .addVersion({ version: API_VERSIONS.public.v1, validate: false }, fakeHandler);
    // @ts-ignore
    const wrappedRouteConfig = fakeRouter.versioned.get.mock.calls[0][0];
    const wrappedHandler =
      // @ts-ignore
      fakeRouter.versioned.get.mock.results[0].value.addVersion.mock.calls[0][1];
    const resFactory = { forbidden: jest.fn(() => 'forbidden'), ok: jest.fn(() => 'ok') };

    const fakeReq = {
      route: {
        path: routeConfig.path,
        method: 'get',
        options: wrappedRouteConfig.options,
      },
    } as any;

    const res = await wrappedHandler(
      {
        core: coreMock.createRequestHandlerContext(),
      } as unknown as FleetRequestHandlerContext,
      fakeReq,
      resFactory as any
    );

    return res as unknown as 'forbidden' | 'ok';
  };

  const mockCheckPrivileges: jest.Mock<
    ReturnType<CheckPrivilegesDynamically>,
    Parameters<CheckPrivilegesDynamically>
  > = jest.fn().mockResolvedValue({ hasAllRequested: true });

  it('does not allow security plugin to be disabled', async () => {
    expect(
      await runTest({
        security: { pluginEnabled: false, licenseEnabled: false },
        routeConfig: {
          fleetAuthz: { fleet: { all: true } },
        },
      })
    ).toEqual('forbidden');
  });

  it('does not allow security license to be disabled', async () => {
    expect(
      await runTest({
        security: { licenseEnabled: false },
        routeConfig: {
          fleetAuthz: { fleet: { all: true } },
        },
      })
    ).toEqual('forbidden');
  });

  describe('with fleet setup privileges', () => {
    const routeConfig = {
      path: '/api/fleet/test',
      fleetAuthz: { fleet: { setup: true } },
    };

    it('allow users with fleet-setup role', async () => {
      mockCheckPrivileges.mockImplementation(
        getCheckPrivilegesMockedImplementation(['api:fleet-setup'])
      );
      expect(
        await runTest({
          security: { checkPrivilegesDynamically: mockCheckPrivileges },
          routeConfig,
        })
      ).toEqual('ok');
    });

    it('do not allow users without fleet-setup role', async () => {
      mockCheckPrivileges.mockImplementation(getCheckPrivilegesMockedImplementation([]));
      expect(
        await runTest({
          security: { checkPrivilegesDynamically: mockCheckPrivileges },
          routeConfig,
        })
      ).toEqual('forbidden');
    });
  });

  describe('with fleet role', () => {
    const routeConfig = {
      path: '/api/fleet/test',
      fleetAuthz: { integrations: { readPackageInfo: true } },
    };

    it('allow users with all required fleet authz role', async () => {
      mockCheckPrivileges.mockImplementation(
        getCheckPrivilegesMockedImplementation(['api:integrations-read'])
      );
      expect(
        await runTest({
          security: { checkPrivilegesDynamically: mockCheckPrivileges },
          routeConfig,
        })
      ).toEqual('ok');
    });

    it('does not allow users without the required fleet role', async () => {
      mockCheckPrivileges.mockImplementation(getCheckPrivilegesMockedImplementation([]));
      expect(
        await runTest({
          security: { checkPrivilegesDynamically: mockCheckPrivileges },
          routeConfig,
        })
      ).toEqual('forbidden');
    });
  });

  describe('default access', () => {
    let fakeRouter: jest.Mocked<VersionedRouter<FleetRequestHandlerContext>>;

    beforeEach(() => {
      fakeRouter = {
        versioned: {
          get: jest.fn().mockImplementation(() => {
            return {
              addVersion: jest
                .fn()
                .mockImplementation((options: any, handler: RequestHandler) => Promise.resolve()),
            };
          }),
          post: jest.fn().mockImplementation(() => {
            return {
              addVersion: jest
                .fn()
                .mockImplementation((options: any, handler: RequestHandler) => Promise.resolve()),
            };
          }),
          delete: jest.fn().mockImplementation(() => {
            return {
              addVersion: jest
                .fn()
                .mockImplementation((options: any, handler: RequestHandler) => Promise.resolve()),
            };
          }),
          put: jest.fn().mockImplementation(() => {
            return {
              addVersion: jest
                .fn()
                .mockImplementation((options: any, handler: RequestHandler) => Promise.resolve()),
            };
          }),
          patch: jest.fn().mockImplementation(() => {
            return {
              addVersion: jest
                .fn()
                .mockImplementation((options: any, handler: RequestHandler) => Promise.resolve()),
            };
          }),
        },
      } as unknown as jest.Mocked<VersionedRouter<FleetRequestHandlerContext>>;
    });

    const METHODS: Array<'get' | 'post' | 'delete' | 'put' | 'patch'> = [
      'get',
      'post',
      'delete',
      'put',
      'patch',
    ];

    for (const method of METHODS) {
      describe(`${method}`, () => {
        it('should set default access to public', () => {
          const fleetAuthzRouter = makeRouterWithFleetAuthz(fakeRouter as any, mockLogger);

          fleetAuthzRouter.versioned[method]({
            path: '/test',
            security: { authz: { enabled: false, reason: '' } },
          });
          // @ts-ignore
          expect(fakeRouter.versioned[method]).toBeCalledWith(
            expect.objectContaining({
              access: 'public',
            })
          );
        });

        it('should allow to define internal routes when called with access: internal', () => {
          const fleetAuthzRouter = makeRouterWithFleetAuthz(fakeRouter as any, mockLogger);
          fleetAuthzRouter.versioned[method]({
            path: '/test',
            access: 'internal',
            security: { authz: { enabled: false, reason: '' } },
          });
          // @ts-ignore
          expect(fakeRouter.versioned[method]).toBeCalledWith(
            expect.objectContaining({
              access: 'internal',
            })
          );
        });
      });
    }
  });
});
