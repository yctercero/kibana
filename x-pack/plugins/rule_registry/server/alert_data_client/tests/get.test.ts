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

describe('get()', () => {
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
    const result = await alertsClient.get({ id: '1', assetName: 'observability-apm' });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "_id": "NoxgpHkBqbdrfX07MqXV",
        "_index": ".alerts-observability-apm",
        "_source": Object {
          "kibana.rac.alert.owner": "apm",
          "kibana.rac.alert.status": "open",
          "message": "hello world 1",
          "rule.id": "apm.error_rate",
        },
      }
    `);
    expect(esClientMock.get).toHaveBeenCalledTimes(1);
    expect(esClientMock.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
          "index": ".alerts-observability-apm",
        },
      ]
    `);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: undefined,
      event: { action: 'alert_get', category: ['database'], outcome: 'success', type: ['access'] },
      message: 'User has accessed alert [id=1]',
    });
  });

  test(`throws an error if ES client get fails`, async () => {
    const error = new Error('something when wrong');
    const alertsClient = new AlertsClient(alertsClientParams);
    esClientMock.get.mockRejectedValue(error);

    await expect(
      alertsClient.get({ id: '1', assetName: 'observability-apm' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"something when wrong"`);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: { code: 'Error', message: 'something when wrong' },
      event: { action: 'alert_get', category: ['database'], outcome: 'failure', type: ['access'] },
      message: 'Failed attempt to access alert [id=1]',
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
    });

    test('returns alert if user is authorized to read alert under the consumer', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      const result = await alertsClient.get({ id: '1', assetName: 'observability-apm' });

      expect(alertingAuthMock.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'alert',
        consumer: 'apm',
        operation: 'get',
        ruleTypeId: 'apm.error_rate',
      });
      expect(result).toMatchInlineSnapshot(`
      Object {
        "_id": "NoxgpHkBqbdrfX07MqXV",
        "_index": ".alerts-observability-apm",
        "_source": Object {
          "kibana.rac.alert.owner": "apm",
          "kibana.rac.alert.status": "open",
          "message": "hello world 1",
          "rule.id": "apm.error_rate",
        },
      }
    `);
    });

    test('throws when user is not authorized to get this type of alert', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      alertingAuthMock.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to get a "apm.error_rate" alert for "apm"`)
      );

      await expect(
        alertsClient.get({ id: '1', assetName: 'observability-apm' })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to get a "apm.error_rate" alert for "apm"]`
      );

      expect(alertingAuthMock.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'alert',
        consumer: 'apm',
        operation: 'get',
        ruleTypeId: 'apm.error_rate',
      });
    });
  });
});
