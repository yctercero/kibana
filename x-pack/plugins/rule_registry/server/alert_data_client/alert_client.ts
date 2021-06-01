/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { estypes } from '@elastic/elasticsearch';
import { PublicMethodsOf } from '@kbn/utility-types';

import { SanitizedAlert } from '../../../alerting/common';
import {
  AlertTypeParams,
  // PartialAlert
} from '../../../alerting/server';
import {
  ReadOperations,
  // AlertingAuthorizationFilterType,
  AlertingAuthorization,
  WriteOperations,
  AlertingAuthorizationEntity,
} from '../../../alerting/server';
import { Logger, ElasticsearchClient, HttpResponsePayload } from '../../../../../src/core/server';
import { ParsedTechnicalFields } from '../../common/parse_technical_fields';
import { RacAuthorizationAuditLogger } from './audit_logger';
import { RuleDataPluginService } from '../rule_data_plugin_service';

export interface ConstructorOptions {
  logger: Logger;
  authorization: PublicMethodsOf<AlertingAuthorization>;
  spaceId?: string;
  auditLogger: RacAuthorizationAuditLogger;
  esClient: ElasticsearchClient;
  index: string;
  ruleDataService: RuleDataPluginService;
}

interface IndexType {
  [key: string]: unknown;
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

export interface FindResult<Params extends AlertTypeParams> {
  page: number;
  perPage: number;
  total: number;
  data: Array<SanitizedAlert<Params>>;
}

export interface UpdateOptions<Params extends AlertTypeParams> {
  id: string;
  owner: string;
  data: {
    status: string;
  };
  assetName: string; // observability-apm see here: x-pack/plugins/apm/server/plugin.ts:191
}

export interface BulkUpdateOptions<Params extends AlertTypeParams> {
  ids: string[];
  owner: string;
  data: {
    status: string;
  };
  query: unknown;
  assetName: string;
}

interface GetAlertParams {
  id: string;
  assetName: string; // observability-apm see here: x-pack/plugins/apm/server/plugin.ts:191
}

export interface GetAlertInstanceSummaryParams {
  id: string;
  dateStart?: string;
}

// const alertingAuthorizationFilterOpts: AlertingAuthorizationFilterOpts = {
//   type: AlertingAuthorizationFilterType.ESDSL,
//   fieldNames: { ruleTypeId: 'alert.alertTypeId', consumer: 'alert.owner' },
// };

export class AlertsClient {
  private readonly logger: Logger;
  private readonly auditLogger: RacAuthorizationAuditLogger;
  // private readonly spaceId?: string;
  // private readonly alertsIndex: string;
  private readonly authorization: PublicMethodsOf<AlertingAuthorization>;
  private readonly esClient: ElasticsearchClient;
  private readonly ruleDataService: RuleDataPluginService;

  constructor({
    auditLogger,
    authorization,
    logger,
    spaceId,
    esClient,
    index,
    ruleDataService,
  }: ConstructorOptions) {
    this.logger = logger;
    // this.spaceId = spaceId;
    this.authorization = authorization;
    this.esClient = esClient;
    this.auditLogger = auditLogger;
    // this.alertsIndex = index;
    this.ruleDataService = ruleDataService;
  }

  /**
   * we are "hard coding" this string similar to how rule registry is doing it
   * x-pack/plugins/apm/server/plugin.ts:191
   */
  public getAlertsIndex(assetName: string) {
    // possibly append spaceId here?
    return this.ruleDataService.getFullAssetName(assetName); // await this.authorization.getAuthorizedAlertsIndices();
  }

  // TODO: Type out alerts (rule registry fields + alerting alerts type)
  public async get({
    id,
    assetName,
  }: GetAlertParams): Promise<HttpResponsePayload | null | undefined> {
    // first search for the alert specified, then check if user has access to it
    // and return search results
    // const query = buildAlertsSearchQuery({
    //   index: this.getAlertsIndex(assetName), // '.alerts-observability-apm',
    //   alertId: id,
    // });
    // TODO: Type out alerts (rule registry fields + alerting alerts type)
    try {
      const { body: result } = await this.esClient.get<ParsedTechnicalFields>({
        index: this.getAlertsIndex(assetName), // '.alerts-observability-apm',
        id,
      });
      if (
        result == null ||
        result._source == null ||
        result._source['rule.id'] == null ||
        result._source['kibana.rac.alert.owner'] == null
      ) {
        return undefined;
      }

      try {
        // use security plugin routes to check what URIs user is authorized to
        await this.authorization.ensureAuthorized({
          ruleTypeId: result._source['rule.id'],
          consumer: result._source['kibana.rac.alert.owner'],
          operation: ReadOperations.Get,
          entity: AlertingAuthorizationEntity.Alert,
        });
      } catch (error) {
        throw Boom.forbidden(
          this.auditLogger.racAuthorizationFailure({
            owner: result._source['kibana.rac.alert.owner'],
            operation: ReadOperations.Get,
            type: 'access',
          })
        );
      }

      return result;
    } catch (exc) {
      throw exc;
    }
  }

  // public async find({ owner }: { owner: string }): Promise<unknown> {
  //   let authorizationTuple;
  //   try {
  //     authorizationTuple = await this.authorization.getFindAuthorizationFilter(
  //       AlertingAuthorizationEntity.Alert,
  //       alertingAuthorizationFilterOpts
  //     );
  //   } catch (error) {
  //     this.auditLogger.racAuthorizationFailure({
  //       owner,
  //       operation: ReadOperations.Find,
  //       type: 'access',
  //     });
  //     throw error;
  //   }

  //   const {
  //     filter: authorizationFilter,
  //     ensureRuleTypeIsAuthorized,
  //     logSuccessfulAuthorization,
  //   } = authorizationTuple;

  //   try {
  //     ensureRuleTypeIsAuthorized('siem.signals', owner, AlertingAuthorizationEntity.Alert);
  //   } catch (error) {
  //     this.logger.error(`Unable to bulk find alerts for ${owner}. Error follows: ${error}`);
  //     throw error;
  //   }
  // }

  public async update<Params extends AlertTypeParams = never>({
    id,
    owner,
    data,
    assetName,
  }: UpdateOptions<Params>): Promise<ParsedTechnicalFields | null | undefined> {
    // TODO: Type out alerts (rule registry fields + alerting alerts type)
    // TODO: use MGET
    const { body: result } = await this.esClient.get<ParsedTechnicalFields>({
      index: this.getAlertsIndex(assetName), // '.alerts-observability-apm', // '.siem-signals-devin-hurley-default',
      id,
    });
    const hits = result._source;
    if (hits == null || hits['rule.id'] == null || hits['kibana.rac.alert.owner'] == null) {
      return undefined;
    }

    try {
      // ASSUMPTION: user bulk updating alerts from single owner/space
      // may need to iterate to support rules shared across spaces
      await this.authorization.ensureAuthorized({
        ruleTypeId: hits['rule.id'],
        consumer: hits['kibana.rac.alert.owner'],
        operation: WriteOperations.Update,
        entity: AlertingAuthorizationEntity.Alert,
      });

      try {
        const index = this.getAlertsIndex(assetName); // this.authorization.getAuthorizedAlertsIndices(hits['kibana.rac.alert.owner']);

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
        return res.body.get?._source;
      } catch (error) {
        // TODO: Update error message
        this.logger.error('');
        throw error;
      }
    } catch (error) {
      throw Boom.forbidden(
        this.auditLogger.racAuthorizationFailure({
          owner: hits['kibana.rac.alert.owner'],
          operation: ReadOperations.Get,
          type: 'access',
        })
      );
    }
  }

  // public async bulkUpdate<Params extends AlertTypeParams = never>({
  //   ids,
  //   query,
  //   assetName,
  //   data,
  // }: BulkUpdateOptions<Params>): Promise<PartialAlert<Params>> {
  //   const { status } = data;
  //   let queryObject;
  //   if (ids) {
  //     // maybe use an aggs query to make this fast
  //     queryObject = {
  //       ids: { values: ids },
  //       // USE AGGS and then get returned fields against ensureAuthorizedForAllRuleTypes
  //       aggs: {
  //         ...(await this.authorization.getFindAuthorizationFilter(
  //           AlertingAuthorizationEntity.Alert,
  //           {
  //             type: AlertingAuthorizationFilterType.ESDSL,
  //             fieldNames: { consumer: 'kibana.rac.alert.owner', ruleTypeId: 'rule.id' },
  //           },
  //           WriteOperations.Update
  //         )),
  //       },
  //     };
  //   }
  //   console.error('QUERY OBJECT', JSON.stringify(queryObject, null, 2));
  //   if (query) {
  //     queryObject = {
  //       bool: {
  //         ...query,
  //       },
  //     };
  //   }
  //   try {
  //     const result = await this.esClient.updateByQuery({
  //       index: this.getAlertsIndex(assetName),
  //       conflicts: 'abort', // conflicts ?? 'abort',
  //       // @ts-expect-error refresh should allow for 'wait_for'
  //       refresh: 'wait_for',
  //       body: {
  //         script: {
  //           source: `ctx._source.signal.status = '${status}'`,
  //           lang: 'painless',
  //         },
  //         query: queryObject,
  //       },
  //       ignoreUnavailable: true,
  //     });
  //     return result;
  //   } catch (err) {
  //     // TODO: Update error message
  //     this.logger.error('');
  //     console.error('UPDATE ERROR', JSON.stringify(err, null, 2));
  //     throw err;
  //   }
  //   // Looking like we may need to first fetch the alerts to ensure we are
  //   // pulling the correct ruleTypeId and owner
  //   // await this.esClient.mget()

  //   // try {
  //   //   // ASSUMPTION: user bulk updating alerts from single owner/space
  //   //   // may need to iterate to support rules shared across spaces

  //   //   const ruleTypes = await this.authorization.ensureAuthorizedForAllRuleTypes({
  //   //     owner,
  //   //     operation: WriteOperations.Update,
  //   //     entity: AlertingAuthorizationEntity.Alert,
  //   //   });

  //   //   const totalRuleTypes = this.authorization.getRuleTypesByProducer(owner);

  //   //   console.error('RULE TYPES', ruleTypes);

  //   //   // await this.authorization.ensureAuthorized({
  //   //   //   ruleTypeId: 'siem.signals', // can they update multiple at once or will a single one just be passed in?
  //   //   //   consumer: owner,
  //   //   //   operation: WriteOperations.Update,
  //   //   //   entity: AlertingAuthorizationEntity.Alert,
  //   //   // });

  //   //   try {
  //   //     const index = this.authorization.getAuthorizedAlertsIndices(owner);
  //   //     if (index == null) {
  //   //       throw Error(`cannot find authorized index for owner: ${owner}`);
  //   //     }

  //   //     const body = ids.flatMap((id) => [
  //   //       {
  //   //         update: {
  //   //           _id: id,
  //   //           _index: this.authorization.getAuthorizedAlertsIndices(ruleTypes[0].producer),
  //   //         },
  //   //       },
  //   //       {
  //   //         doc: { 'kibana.rac.alert.status': data.status },
  //   //       },
  //   //     ]);

  //   //     const result = await this.esClient.bulk({
  //   //       index,
  //   //       body,
  //   //     });
  //   //     return result;
  //   //   } catch (updateError) {
  //   //     this.logger.error(
  //   //       `Unable to bulk update alerts for ${owner}. Error follows: ${updateError}`
  //   //     );
  //   //     throw updateError;
  //   //   }
  //   // } catch (error) {
  //   //   console.error("HERE'S THE ERROR", error);
  //   //   throw Boom.forbidden(
  //   //     this.auditLogger.racAuthorizationFailure({
  //   //       owner,
  //   //       operation: ReadOperations.Get,
  //   //       type: 'access',
  //   //     })
  //   //   );
  //   // }
  // }
}
