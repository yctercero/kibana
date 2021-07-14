/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatMap, map, mergeMap } from 'rxjs/operators';
import { from } from 'rxjs';

import {
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterType,
  PluginStartContract as AlertPluginStartContract,
} from '../../../../alerting/server';
import {
  ISearchStrategy,
  PluginStart,
  shimHitsTotal,
} from '../../../../../../src/plugins/data/server';
import {
  TimelineFactoryQueryTypes,
  TimelineStrategyResponseType,
  TimelineStrategyRequestType,
} from '../../../common/search_strategy/timeline';
import { timelineFactory } from './factory';
import { TimelineFactory } from './factory/types';

export const timelineSearchStrategyProvider = <T extends TimelineFactoryQueryTypes>(
  data: PluginStart,
  alerting: AlertPluginStartContract
): ISearchStrategy<TimelineStrategyRequestType<T>, TimelineStrategyResponseType<T>> => {
  const es = data.search.searchAsInternalUser;
  return {
    search: (request, options, deps) => {
      const factoryQueryType = request.factoryQueryType;

      if (factoryQueryType == null) {
        throw new Error('factoryQueryType is required');
      }

      // Note: Alerts RBAC are built off of the alerting's authorization class, which
      // is why we are pulling from alerting, not ther alertsClient here
      const alertingAuthorizationClient = alerting.getAlertingAuthorizationWithRequest(
        deps.request
      );
      console.error('I AM HERE----------------------')
      const queryFactory: TimelineFactory<T> = timelineFactory[factoryQueryType];
      console.error('QUERY FACTORY TYPE----------------------')

      const getAuthFilter = async () => {
        const a = await alertingAuthorizationClient.getFindAuthorizationFilter(
          AlertingAuthorizationEntity.Alert,
          {
            type: AlertingAuthorizationFilterType.ESDSL,
            fieldNames: { consumer: 'kibana.rac.alert.owner', ruleTypeId: 'kibana.rac.alert.id' },
          }
        );
console.log('GETAUTHFILTER', JSON.stringify(a))
        return a;
      };
      return from(getAuthFilter()).pipe(
        flatMap(({ filter }) => {
          console.error('AUTH FILTER', JSON.stringify(filter))
          const dsl = queryFactory.buildDsl({ ...request, authFilter: filter });
          return es.search({ ...request, params: dsl }, options, deps);
        }),
        map((response) => {
          return {
            ...response,
            ...{
              rawResponse: shimHitsTotal(response.rawResponse, options),
            },
          };
        }),
        mergeMap((esSearchRes) => queryFactory.parse(request, esSearchRes))
      );
    },
    cancel: async (id, options, deps) => {
      console.error('WHY AM I CANCELLING')
      if (es.cancel) {
        return es.cancel(id, options, deps);
      }
    },
  };
};
