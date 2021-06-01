/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request } from '@hapi/hapi';

import { AlertsClientFactory, AlertsClientFactoryProps } from './alerts_client_factory';
import { ElasticsearchClient, KibanaRequest } from 'src/core/server';
import { loggingSystemMock } from 'src/core/server/mocks';
import { securityMock } from '../../../security/server/mocks';
import { AuditLogger } from '../../../security/server';
import { ruleDataPluginServiceMock } from '../rule_data_plugin_service/rule_data_plugin_service.mock';
import { alertingAuthorizationMock } from '../../../alerting/server/authorization/alerting_authorization.mock';
import { RuleDataPluginServiceConstructorOptions } from '../rule_data_plugin_service';

jest.mock('./alerts_client');

const securityPluginSetup = securityMock.createSetup();
const ruleDataServiceMock = ruleDataPluginServiceMock.create(
  {} as RuleDataPluginServiceConstructorOptions
);
const alertingAuthMock = alertingAuthorizationMock.create();

const alertsClientFactoryParams: jest.Mocked<AlertsClientFactoryProps> = {
  logger: loggingSystemMock.create().get(),
  getAlertingAuthorization: (_: KibanaRequest) => alertingAuthMock,
  securityPluginSetup,
  esClient: {} as ElasticsearchClient,
  ruleDataService: ruleDataServiceMock,
};

const fakeRequest = ({
  app: {},
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
} as unknown) as Request;

const auditLogger = {
  log: jest.fn(),
} as jest.Mocked<AuditLogger>;

beforeEach(() => {
  jest.resetAllMocks();

  securityPluginSetup.audit.asScoped.mockReturnValue(auditLogger);
});

test('creates an alerts client with proper constructor arguments', async () => {
  const factory = new AlertsClientFactory();
  factory.initialize({ ...alertsClientFactoryParams });
  const request = KibanaRequest.from(fakeRequest);
  await factory.create(request);

  expect(jest.requireMock('./alerts_client').AlertsClient).toHaveBeenCalledWith({
    authorization: alertingAuthMock,
    logger: alertsClientFactoryParams.logger,
    auditLogger,
    esClient: {},
    ruleDataService: ruleDataServiceMock,
  });
});

test('throws an error if already initialized', () => {
  const factory = new AlertsClientFactory();
  factory.initialize({ ...alertsClientFactoryParams });

  expect(() =>
    factory.initialize({ ...alertsClientFactoryParams })
  ).toThrowErrorMatchingInlineSnapshot(`"AlertsClientFactory (RAC) already initialized"`);
});

test('throws an error if ruleDataService not available', () => {
  const factory = new AlertsClientFactory();

  expect(() =>
    factory.initialize({
      ...alertsClientFactoryParams,
      ruleDataService: null,
    })
  ).toThrowErrorMatchingInlineSnapshot(`"Rule registry data service required for alerts client"`);
});
