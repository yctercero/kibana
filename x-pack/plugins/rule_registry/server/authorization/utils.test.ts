/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import uuid from 'uuid';
import { featuresPluginMock } from '../../../features/server/mocks';
import {
  PluginStartContract as FeaturesStartContract,
  KibanaFeature,
} from '../../../features/server';
import { getAuthorizedOwners, getEnabledKibanaSpaceFeatures, getRequiredPrivileges } from './utils';
import { ReadOperations, WriteOperations } from './types';
import { RacActions } from '../../../security/server/authorization/actions/rac';
import { CheckPrivilegesResponse } from '../../../security/server/authorization/types';
import { Actions } from '../../../security/server/authorization';

const mockActions = ({
  rac: new RacActions('1.0.0'),
} as unknown) as Actions;

function mockFeature(appName: string, owner?: string) {
  return new KibanaFeature({
    id: appName,
    name: appName,
    app: [],
    category: { id: 'foo', label: 'foo' },
    ...(owner
      ? {
          rac: [owner],
        }
      : {}),
    privileges: {
      all: {
        ...(owner
          ? {
              rac: {
                all: [owner],
              },
            }
          : {}),
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
      read: {
        ...(owner
          ? {
              rac: {
                read: [owner],
              },
            }
          : {}),
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
    },
  });
}

function mockFeatureWithSubFeature(appName: string, owner: string) {
  return new KibanaFeature({
    id: appName,
    name: appName,
    app: [],
    category: { id: 'foo', label: 'foo' },
    ...(owner
      ? {
          rac: [owner],
        }
      : {}),
    privileges: {
      all: {
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
      read: {
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
    },
    subFeatures: [
      {
        name: appName,
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'doSomethingRacRelated',
                name: 'sub feature rac',
                includeIn: 'all',
                rac: {
                  all: [owner],
                },
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['doSomethingRacRelated'],
              },
              {
                id: 'doSomethingRacRelated',
                name: 'sub feature rac',
                includeIn: 'read',
                rac: {
                  read: [owner],
                },
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['doSomethingRacRelated'],
              },
            ],
          },
        ],
      },
    ],
  });
}
const features: jest.Mocked<FeaturesStartContract> = featuresPluginMock.createStart();
const request = {} as KibanaRequest;
const getSpace = jest.fn();

const myAppFeature = mockFeature('myApp', 'securitySolution');
const myAppWithSubFeature = mockFeatureWithSubFeature('myAppWithSubFeature', 'observability');
const myOtherAppFeature = mockFeature('myOtherApp', 'observability');

describe('rac/authorization utils', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('#getEnabledKibanaSpaceFeatures', () => {
    test('returns empty set if no enabled features found', async () => {
      const space = {
        id: uuid.v4(),
        name: uuid.v4(),
        disabledFeatures: ['myApp'],
      };
      features.getKibanaFeatures.mockReturnValue([myAppFeature]);
      const enabledFeatures = await getEnabledKibanaSpaceFeatures({
        request,
        features,
        getSpace: getSpace.mockResolvedValue(space),
      });
      const expectedResult = new Set();

      expect(enabledFeatures).toEqual(expectedResult);
    });

    test('returns set of enabled kibana features', async () => {
      const space = {
        id: uuid.v4(),
        name: uuid.v4(),
        disabledFeatures: ['myApp'],
      };
      features.getKibanaFeatures.mockReturnValue([
        myAppFeature,
        myOtherAppFeature,
        myAppWithSubFeature,
      ]);
      const enabledFeatures = await getEnabledKibanaSpaceFeatures({
        request,
        features,
        getSpace: getSpace.mockResolvedValue(space),
      });
      const expectedResult = new Set(['observability']);

      expect(enabledFeatures).toEqual(expectedResult);
    });
  });

  describe('#getRequiredPrivileges', () => {
    const owners = new Set(['securitySolution', 'observability']);

    test('it correctly maps required find privileges', () => {
      const requiredPrivileges = getRequiredPrivileges(owners, [ReadOperations.Find], mockActions);
      const resultingMap = new Map();
      resultingMap.set('rac:1.0.0:securitySolution/find', ['securitySolution']);
      resultingMap.set('rac:1.0.0:observability/find', ['observability']);

      expect(requiredPrivileges).toEqual(resultingMap);
    });

    test('it correctly maps required get privileges', () => {
      const requiredPrivileges = getRequiredPrivileges(owners, [ReadOperations.Get], mockActions);
      const resultingMap = new Map();
      resultingMap.set('rac:1.0.0:securitySolution/get', ['securitySolution']);
      resultingMap.set('rac:1.0.0:observability/get', ['observability']);

      expect(requiredPrivileges).toEqual(resultingMap);
    });

    test('it correctly maps required update privileges', () => {
      const requiredPrivileges = getRequiredPrivileges(
        owners,
        [WriteOperations.Update],
        mockActions
      );
      const resultingMap = new Map();
      resultingMap.set('rac:1.0.0:securitySolution/update', ['securitySolution']);
      resultingMap.set('rac:1.0.0:observability/update', ['observability']);

      expect(requiredPrivileges).toEqual(resultingMap);
    });

    // Added to show that this method isn't meant to validate action URIs,
    // the security endpoint will do that for us - the action is simply
    // splicing the info you give it together
    test('it correctly maps any arbitrary operation', () => {
      const requiredPrivileges = getRequiredPrivileges(
        owners,
        ['blah' as WriteOperations],
        mockActions
      );
      const resultingMap = new Map();
      resultingMap.set('rac:1.0.0:securitySolution/blah', ['securitySolution']);
      resultingMap.set('rac:1.0.0:observability/blah', ['observability']);

      expect(requiredPrivileges).toEqual(resultingMap);
    });
  });

  describe('#getAuthorizedOwners', () => {
    const owners = ['securitySolution', 'observability'];
    const ownersSet = new Set(owners);
    const privileges = ({
      kibana: [
        { privilege: 'rac:1.0.0:securitySolution/find', authorized: true },
        { privilege: 'rac:1.0.0:securitySolution/update', authorized: true },
        { privilege: 'rac:1.0.0:observability/update', authorized: true },
      ],
    } as unknown) as CheckPrivilegesResponse['privileges'];
    const requiredPrivileges = new Map();
    requiredPrivileges.set('rac:1.0.0:securitySolution/update', ['securitySolution']);

    test('it returns all owners if hasAllRequested is true', () => {
      const result = getAuthorizedOwners(true, ownersSet, privileges, requiredPrivileges);

      expect(result).toEqual(owners);
    });

    test('it returns all owners where fetched privileges match required privileges', () => {
      const result = getAuthorizedOwners(false, ownersSet, privileges, requiredPrivileges);
      const authorizedOwners = ['securitySolution'];

      expect(result).toEqual(authorizedOwners);
    });

    test('it returns multiple owners if multiple privileges match required privileges', () => {
      const multiOwnerRequiredPrivileges = new Map();
      multiOwnerRequiredPrivileges.set('rac:1.0.0:securitySolution/update', ['securitySolution']);
      multiOwnerRequiredPrivileges.set('rac:1.0.0:observability/update', ['observability']);

      const result = getAuthorizedOwners(
        false,
        ownersSet,
        privileges,
        multiOwnerRequiredPrivileges
      );
      const expectedResult = ['securitySolution', 'observability'];

      expect(result).toEqual(expectedResult);
    });

    test('it does not return owner if fetched privileges return authorized false', () => {
      const privilegesMixedAuthorized = ({
        kibana: [
          { privilege: 'rac:1.0.0:securitySolution/find', authorized: false },
          { privilege: 'rac:1.0.0:securitySolution/update', authorized: false },
          { privilege: 'rac:1.0.0:observability/update', authorized: true },
        ],
      } as unknown) as CheckPrivilegesResponse['privileges'];
      const multiOwnerRequiredPrivileges = new Map();
      multiOwnerRequiredPrivileges.set('rac:1.0.0:securitySolution/update', ['securitySolution']);
      multiOwnerRequiredPrivileges.set('rac:1.0.0:observability/update', ['observability']);

      const result = getAuthorizedOwners(
        false,
        ownersSet,
        privilegesMixedAuthorized,
        multiOwnerRequiredPrivileges
      );
      const expectedResult = ['observability'];

      expect(result).toEqual(expectedResult);
    });
  });
});
