/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsClient, ConstructorOptions } from '../alerts_client';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { ruleDataPluginServiceMock } from '../../rule_data_plugin_service/rule_data_plugin_service.mock';
import { RuleDataPluginServiceConstructorOptions } from '../../rule_data_plugin_service';
import { alertingAuthorizationMock } from '../../../../alerting/server/authorization/alerting_authorization.mock';
import { AuditLogger } from '../../../../security/server';

const ruleDataServiceMock = ruleDataPluginServiceMock.create(
  {} as RuleDataPluginServiceConstructorOptions
);
const alertingAuthMock = alertingAuthorizationMock.create();
const esClientMock = elasticsearchClientMock.createElasticsearchClient();
const auditLogger = {
  log: jest.fn(),
} as jest.Mocked<AuditLogger>;

const alertsClientParams: jest.Mocked<ConstructorOptions> = {
  logger: loggingSystemMock.create().get(),
  ruleDataService: {
    ...ruleDataServiceMock,
    getFullAssetName: (_?: string | undefined) => '.alerts-observability-apm',
  },
  authorization: alertingAuthMock,
  esClient: esClientMock,
  auditLogger,
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe('update()', () => {
  test('calls ES client with given params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    esClientMock.get.mockResolvedValueOnce(
      elasticsearchClientMock.createApiResponse({
        body: {
          _index: '.alerts-observability-apm',
          _id: 'NoxgpHkBqbdrfX07MqXV',
          _source: {
            'rule.id': 'apm.error_rate',
            message: 'hello world 1',
            'kibana.rac.alert.owner': 'apm',
            'kibana.rac.alert.status': 'open',
          },
        },
      })
    );
    esClientMock.update.mockResolvedValueOnce(
      elasticsearchClientMock.createApiResponse({
        body: {
          get: {
            _index: '.alerts-observability-apm',
            _id: 'NoxgpHkBqbdrfX07MqXV',
            _source: {
              'rule.id': 'apm.error_rate',
              message: 'hello world 1',
              'kibana.rac.alert.owner': 'apm',
              'kibana.rac.alert.status': 'closed',
            },
          },
        },
      })
    );
    const result = await alertsClient.update({
      id: '1',
      data: { status: 'closed' },
      assetName: 'observability-apm',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "kibana.rac.alert.owner": "apm",
        "kibana.rac.alert.status": "closed",
        "message": "hello world 1",
        "rule.id": "apm.error_rate",
      }
    `);
    expect(esClientMock.update).toHaveBeenCalledTimes(1);
    expect(esClientMock.update.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "body": Object {
            "doc": Object {
              "kibana.rac.alert.status": "closed",
            },
          },
          "id": "1",
          "index": ".alerts-observability-apm",
        },
      ]
    `);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: undefined,
      event: {
        action: 'alert_update',
        category: ['database'],
        outcome: 'success',
        type: ['change'],
      },
      message: 'User has updated alert [id=1]',
    });
  });

  test(`throws an error if ES client get fails`, async () => {
    const error = new Error('something when wrong on get');
    const alertsClient = new AlertsClient(alertsClientParams);
    esClientMock.get.mockRejectedValue(error);

    await expect(
      alertsClient.update({
        id: '1',
        data: { status: 'closed' },
        assetName: 'observability-apm',
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"something when wrong on get"`);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: { code: 'Error', message: 'something when wrong on get' },
      event: {
        action: 'alert_update',
        category: ['database'],
        outcome: 'failure',
        type: ['change'],
      },
      message: 'Failed attempt to update alert [id=1]',
    });
  });

  test(`throws an error if ES client update fails`, async () => {
    const error = new Error('something when wrong on update');
    const alertsClient = new AlertsClient(alertsClientParams);
    esClientMock.get.mockResolvedValueOnce(
      elasticsearchClientMock.createApiResponse({
        body: {
          _index: '.alerts-observability-apm',
          _id: 'NoxgpHkBqbdrfX07MqXV',
          _source: {
            'rule.id': 'apm.error_rate',
            message: 'hello world 1',
            'kibana.rac.alert.owner': 'apm',
            'kibana.rac.alert.status': 'open',
          },
        },
      })
    );
    esClientMock.update.mockRejectedValue(error);

    await expect(
      alertsClient.update({
        id: '1',
        data: { status: 'closed' },
        assetName: 'observability-apm',
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"something when wrong on update"`);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: { code: 'Error', message: 'something when wrong on update' },
      event: {
        action: 'alert_update',
        category: ['database'],
        outcome: 'failure',
        type: ['change'],
      },
      message: 'Failed attempt to update alert [id=1]',
    });
  });

  describe('authorization', () => {
    beforeEach(() => {
      esClientMock.get.mockResolvedValueOnce(
        elasticsearchClientMock.createApiResponse({
          body: {
            _index: '.alerts-observability-apm',
            _id: 'NoxgpHkBqbdrfX07MqXV',
            _source: {
              'rule.id': 'apm.error_rate',
              message: 'hello world 1',
              'kibana.rac.alert.owner': 'apm',
              'kibana.rac.alert.status': 'open',
            },
          },
        })
      );
      esClientMock.update.mockResolvedValueOnce(
        elasticsearchClientMock.createApiResponse({
          body: {
            get: {
              _index: '.alerts-observability-apm',
              _id: 'NoxgpHkBqbdrfX07MqXV',
              _source: {
                'rule.id': 'apm.error_rate',
                message: 'hello world 1',
                'kibana.rac.alert.owner': 'apm',
                'kibana.rac.alert.status': 'closed',
              },
            },
          },
        })
      );
    });

    test('returns alert if user is authorized to update alert under the consumer', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      const result = await alertsClient.update({
        id: '1',
        data: { status: 'closed' },
        assetName: 'observability-apm',
      });

      expect(alertingAuthMock.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'alert',
        consumer: 'apm',
        operation: 'update',
        ruleTypeId: 'apm.error_rate',
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "kibana.rac.alert.owner": "apm",
          "kibana.rac.alert.status": "closed",
          "message": "hello world 1",
          "rule.id": "apm.error_rate",
        }
      `);
    });

    test('throws when user is not authorized to update this type of alert', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      alertingAuthMock.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to get a "apm.error_rate" alert for "apm"`)
      );

      await expect(
        alertsClient.update({
          id: '1',
          data: { status: 'closed' },
          assetName: 'observability-apm',
        })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to get a "apm.error_rate" alert for "apm"]`
      );

      expect(alertingAuthMock.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'alert',
        consumer: 'apm',
        operation: 'update',
        ruleTypeId: 'apm.error_rate',
      });
    });
  });
});
