/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PublicMethodsOf } from '@kbn/utility-types';
import { AlertTypeParams } from '../../../alerting/server';
import {
  ReadOperations,
  AlertingAuthorization,
  WriteOperations,
  AlertingAuthorizationEntity,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../alerting/server/authorization';
import { Logger, ElasticsearchClient } from '../../../../../src/core/server';
import { alertAuditEvent, AlertAuditAction } from './audit_events';
import { RuleDataPluginService } from '../rule_data_plugin_service';
import { AuditLogger } from '../../../security/server';
import { ParsedTechnicalFields } from '../../common/parse_technical_fields';

export interface ConstructorOptions {
  logger: Logger;
  authorization: PublicMethodsOf<AlertingAuthorization>;
  auditLogger?: AuditLogger;
  esClient: ElasticsearchClient;
  ruleDataService: RuleDataPluginService;
}

export interface UpdateOptions<Params extends AlertTypeParams> {
  id: string;
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

  private async fetchAlert({ id, assetName }: GetAlertParams): Promise<ParsedTechnicalFields> {
    try {
      const result = await this.esClient.get<ParsedTechnicalFields>({
        index: this.getAlertsIndex(assetName),
        id,
      });

      if (
        result == null ||
        result.body == null ||
        result.body._source == null ||
        result.body._source['rule.id'] == null ||
        result.body._source['kibana.rac.alert.owner'] == null
      ) {
        const errorMessage = `[rac] - Unable to retrieve alert details for alert with id of "${id}".`;
        this.logger.debug(errorMessage);
        throw new Error(errorMessage);
      }

      return result.body._source;
    } catch (error) {
      const errorMessage = `[rac] - Unable to retrieve alert with id of "${id}".`;
      this.logger.debug(errorMessage);
      throw error;
    }
  }

  public async get({ id, assetName }: GetAlertParams): Promise<ParsedTechnicalFields> {
    try {
      // first search for the alert by id, then use the alert info to check if user has access to it
      const alert = await this.fetchAlert({
        id,
        assetName,
      });

      // this.authorization leverages the alerting plugin's authorization
      // client exposed to us for reuse
      await this.authorization.ensureAuthorized({
        ruleTypeId: alert['rule.id'],
        consumer: alert['kibana.rac.alert.owner'],
        operation: ReadOperations.Get,
        entity: AlertingAuthorizationEntity.Alert,
      });

      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.GET,
          id,
        })
      );

      return alert;
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
    data,
    assetName,
  }: UpdateOptions<Params>): Promise<ParsedTechnicalFields | null | undefined> {
    try {
      // TODO: use MGET
      const alert = await this.fetchAlert({
        id,
        assetName,
      });

      await this.authorization.ensureAuthorized({
        ruleTypeId: alert['rule.id'],
        consumer: alert['kibana.rac.alert.owner'],
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

      const res = await this.esClient.update<ParsedTechnicalFields, unknown, unknown, unknown>(
        updateParameters
      );

      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.UPDATE,
          id,
        })
      );

      return res.body.get?._source;
    } catch (error) {
      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.UPDATE,
          id,
          error,
        })
      );
      throw error;
    }
  }
}
