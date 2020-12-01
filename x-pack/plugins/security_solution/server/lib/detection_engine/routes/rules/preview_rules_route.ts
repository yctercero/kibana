/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PARAMETERS_OPTIONS } from '../../../../../../index_management/public/application/components/mappings_editor/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { IRouter } from '../../../../../../../../src/core/server';
import {
  DEFAULT_SIGNALS_PREVIEW_INDEX,
  DETECTION_ENGINE_PREVIEW_URL,
} from '../../../../../common/constants';
import { createRulesSchema } from '../../../../../common/detection_engine/schemas/request';
import { transformError, buildSiemResponse } from '../utils';
import { createRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/create_rules_type_dependents';
import { convertPreviewCreateAPIToInternalSchema } from '../../schemas/rule_converters';
import { signalPreviewRules } from '../../signals/signal_rule_alert_type/signal_rule_preview';
import { buildSignalsSearchQuery } from '../../notifications/build_signals_query';

export const previewRulesRoute = (
  router: IRouter,
  ml: SetupPlugins['ml'],
  lists: SetupPlugins['lists'],
  logger: Logger
) => {
  router.post(
    {
      path: DETECTION_ENGINE_PREVIEW_URL,
      validate: {
        body: buildRouteValidation(createRulesSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = createRuleValidateTypeDependents(request.body);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }

      try {
        const alertsClient = context.alerting?.getAlertsClient();
        const clusterClient = context.core.elasticsearch.legacy.client;
        const savedObjectsClient = context.core.savedObjects.client;
        const siemClient = context.securitySolution?.getAppClient();
        console.log('--------->, IN ROUTE');
        if (!siemClient || !alertsClient) {
          console.log('--------->, NO CLIENT');
          return siemResponse.error({ statusCode: 404 });
        }

        const { params, ...rest } = convertPreviewCreateAPIToInternalSchema(
          request.body,
          siemClient
        );
        console.log('--------->, RULEID', params.ruleId, DEFAULT_SIGNALS_PREVIEW_INDEX);

        const rule = { ...params, created_at: Date.now() };
        await signalPreviewRules({
          logger,
          params: rule,
          ml,
          lists,
          services: {
            callCluster: clusterClient.callAsCurrentUser,
            savedObjectsClient,
          },
          soAttributes: { ...rest },
          spaceId: 'default',
        });
        console.log('--------->, GETTING SIGNALS');

        // get signals
        const signals = await clusterClient.callAsCurrentUser(
          'search',
          buildSignalsSearchQuery({
            ruleId: params.ruleId,
            index: siemClient.getSignalsPreviewIndex(),
            from: 'now-1h',
            to: 'now',
          })
        );
        console.log(
          '--------->, SIGNALS',
          JSON.stringify(
            buildSignalsSearchQuery({
              ruleId: params.ruleId,
              index: siemClient.getSignalsPreviewIndex(),
              from: 'now-1h',
              to: 'now',
            })
          )
        );

        console.log('--------->, SIGNALS2', JSON.stringify(signals));

        // delete signals
        await clusterClient.callAsCurrentUser(
          'deleteByQuery',
          buildSignalsSearchQuery({
            ruleId: params.ruleId,
            index: siemClient.getSignalsPreviewIndex(),
            from: 'now-1h',
            to: 'now',
          })
        );
        console.log('--------->, DELETED');

        return response.ok({ body: { signals } });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
