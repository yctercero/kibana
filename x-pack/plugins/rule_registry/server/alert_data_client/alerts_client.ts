/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PublicMethodsOf } from '@kbn/utility-types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { RawAlert } from '../../../alerting/server/types';
import { AlertTypeParams, PartialAlert } from '../../../alerting/server';
import {
  ReadOperations,
  AlertingAuthorization,
  WriteOperations,
  AlertingAuthorizationEntity,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../alerting/server/authorization';
import { Logger, ElasticsearchClient, HttpResponsePayload } from '../../../../../src/core/server';
import { alertAuditEvent, AlertAuditAction } from './audit_events';
import { RuleDataPluginService } from '../rule_data_plugin_service';
import { AuditLogger } from '../../../security/server';

export interface ConstructorOptions {
  logger: Logger;
  authorization: PublicMethodsOf<AlertingAuthorization>;
  auditLogger?: AuditLogger;
  esClient: ElasticsearchClient;
  ruleDataService: RuleDataPluginService;
}

export interface UpdateOptions<Params extends AlertTypeParams> {
  id: string;
  owner: string;
  data: {
    status: string;
  };
  // observability-apm see here: x-pack/plugins/apm/server/plugin.ts:191
  assetName: string;
}

interface GetAlertParams {
  id: string;
  // observability-apm see here: x-pack/plugins/apm/server/plugin.ts:191
  assetName: string;
}

export class AlertsClient {
  private readonly logger: Logger;
  private readonly auditLogger?: AuditLogger;
  private readonly authorization: PublicMethodsOf<AlertingAuthorization>;
  private readonly esClient: ElasticsearchClient;
  private readonly ruleDataService: RuleDataPluginService;

  constructor({
    auditLogger,
    authorization,
    logger,
    esClient,
    ruleDataService,
  }: ConstructorOptions) {
    this.logger = logger;
    this.authorization = authorization;
    this.esClient = esClient;
    this.auditLogger = auditLogger;
    this.ruleDataService = ruleDataService;
  }

  /**
   * we are "hard coding" this string similar to how rule registry is doing it
   * x-pack/plugins/apm/server/plugin.ts:191
   */
  public getAlertsIndex(assetName: string) {
    return this.ruleDataService?.getFullAssetName(assetName);
  }

  // TODO: Type out alerts (rule registry fields + alerting alerts type)
  public async get({ id, assetName }: GetAlertParams): Promise<HttpResponsePayload> {
    try {
      // first search for the alert by id, then use the alert info to check if user has access to it
      const { body: result } = await this.esClient.get<RawAlert>({
        index: this.getAlertsIndex(assetName),
        id,
      });

      // this.authorization leverages the alerting plugin's authorization
      // client exposed to us for reuse
      await this.authorization.ensureAuthorized({
        ruleTypeId: result._source['rule.id'],
        consumer: result._source['kibana.rac.alert.owner'],
        operation: ReadOperations.Get,
        entity: AlertingAuthorizationEntity.Alert,
      });

      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.GET,
          id,
        })
      );

      return result;
    } catch (error) {
      this.logger.debug(`[rac] - Error fetching alert with id of "${id}"`);
      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.GET,
          id,
          error,
        })
      );
      throw error;
    }
  }

  public async update<Params extends AlertTypeParams = never>({
    id,
    owner,
    data,
    assetName,
  }: UpdateOptions<Params>): Promise<PartialAlert<Params>> {
    try {
      // TODO: Type out alerts (rule registry fields + alerting alerts type)
      const result = await this.esClient.get({
        index: this.getAlertsIndex(assetName),
        id,
      });
      const hits = result.body._source;

      // ASSUMPTION: user bulk updating alerts from single owner/space
      // may need to iterate to support rules shared across spaces
      await this.authorization.ensureAuthorized({
        ruleTypeId: hits['rule.id'],
        consumer: hits['kibana.rac.alert.owner'],
        operation: WriteOperations.Update,
        entity: AlertingAuthorizationEntity.Alert,
      });

      const index = this.getAlertsIndex(assetName);

      const updateParameters = {
        id,
        index,
        body: {
          doc: {
            'kibana.rac.alert.status': data.status,
          },
        },
      };

      return this.esClient.update(updateParameters);
    } catch (error) {
      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.GET,
          id,
          error,
        })
      );
      throw error;
    }
  }
}
