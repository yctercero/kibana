/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { PublicMethodsOf } from '@kbn/utility-types';
import { AlertingAuthorizationFilterType } from '../../../alerting/server/authorization/alerts_authorization_kuery';
import {
  ReadOperations,
  AlertingAuthorizationTypes,
  AlertsAuthorization,
} from '../../../alerting/server/authorization';
import {
  Logger,
  PluginInitializerContext,
  ElasticsearchClient,
} from '../../../../../src/core/server';
import {
  GrantAPIKeyResult as SecurityPluginGrantAPIKeyResult,
  InvalidateAPIKeyResult as SecurityPluginInvalidateAPIKeyResult,
} from '../../../security/server';
import { AuditLogger } from '../../../security/server';
import { buildAlertsSearchQuery } from '../authorization/utils';

const alertingAuthorizationFilterOpts: AlertingAuthorizationFilterOpts = {
  type: AlertingAuthorizationFilterType.ESDSL,
  fieldNames: { ruleTypeId: 'alert.alertTypeId', consumer: 'alert.owner' },
};

export type CreateAPIKeyResult =
  | { apiKeysEnabled: false }
  | { apiKeysEnabled: true; result: SecurityPluginGrantAPIKeyResult };
export type InvalidateAPIKeyResult =
  | { apiKeysEnabled: false }
  | { apiKeysEnabled: true; result: SecurityPluginInvalidateAPIKeyResult };

export interface ConstructorOptions {
  logger: Logger;
  authorization: PublicMethodsOf<AlertsAuthorization>;
  spaceId?: string;
  kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  auditLogger?: AuditLogger;
  esClient: ElasticsearchClient;
}

export interface FindOptions extends IndexType {
  perPage?: number;
  page?: number;
  search?: string;
  defaultSearchOperator?: 'AND' | 'OR';
  searchFields?: string[];
  sortField?: string;
  sortOrder?: estypes.SortOrder;
  hasReference?: {
    type: string;
    id: string;
  };
  fields?: string[];
  filter?: string;
}

export interface CreateAlertParams {
  esClient: ElasticsearchClient;
  owner: 'observability' | 'securitySolution';
}

interface IndexType {
  [key: string]: unknown;
}

export interface AggregateResult {
  alertExecutionStatus: { [status: string]: number };
}

export interface FindResult<Params extends AlertTypeParams> {
  page: number;
  perPage: number;
  total: number;
  data: Array<SanitizedAlert<Params>>;
}

export interface UpdateOptions<Params extends AlertTypeParams> {
  id: string;
  data: {
    status: string;
  };
}

interface GetAlertParams {
  id: string;
}

export interface GetAlertInstanceSummaryParams {
  id: string;
  dateStart?: string;
}

export class RacClient {
  private readonly logger: Logger;
  private readonly spaceId?: string;
  private readonly authorization: RacAuthorization;
  private readonly kibanaVersion!: PluginInitializerContext['env']['packageInfo']['version'];
  private readonly esClient: ElasticsearchClient;

  constructor({ authorization, logger, spaceId, kibanaVersion, esClient }: ConstructorOptions) {
    this.logger = logger;
    this.spaceId = spaceId;
    this.authorization = authorization;
    this.kibanaVersion = kibanaVersion;
    this.esClient = esClient;
  }

  public async get({ id }: GetAlertParams): Promise<unknown> {
    const indices = this.authorization.getAuthorizedAlertsIndices();
    const query = buildAlertsSearchQuery({
      index: indices,
      alertId: id,
    });
    const { body: result } = await this.esClient.search(query);
    console.error('----------------BLAH', result.hits.hits[0]['kibana.rac.producer']);
    try {
      await this.authorization.ensureAuthorized({
        ruleTypeId: result.hits.hits[0]['kibana.rac.alert.uuid'] ?? 'siem.signals',
        consumer: result.hits.hits[0]['kibana.rac.producer'],
        operation: ReadOperations.Get,
        authorizationType: AlertingAuthorizationTypes.Alert,
      });
      return result;
    } catch (error) {
      console.error('HERES THE ERROR', error);
      throw error;
    }
  }

  public async find({ owner }: { owner: string }): Promise<unknown> {
    let authorizationTuple;
    try {
      authorizationTuple = await this.authorization.getFindAuthorizationFilter(
        AlertingAuthorizationTypes.Alert,
        alertingAuthorizationFilterOpts
      );
    } catch (error) {
      throw error;
    }
    const {
      filter: authorizationFilter,
      ensureRuleTypeIsAuthorized,
      logSuccessfulAuthorization,
    } = authorizationTuple;

    console.error(
      '-------------------------------FILTER--------------------------',
      JSON.stringify(authorizationFilter)
    );

    try {
      ensureRuleTypeIsAuthorized('siem.signals', 'siem', AlertingAuthorizationTypes.Alert);
    } catch (error) {
      console.error(
        '-------------------------------AUTHORIZATION CATCH--------------------------',
        error
      );
      throw error;
    }
  }

  public async update<Params extends AlertTypeParams = never>({
    id,
    data,
  }: UpdateOptions<Params>): Promise<PartialAlert<Params>> {
    // return await retryIfConflicts(
    //   this.logger,
    //   `alertsClient.update('${id}')`,
    //   async () => await this.updateWithOCC<Params>({ id, data })
    // );
  }

  static async create({ esClient, owner, data }: createAlertParams) {}
}
