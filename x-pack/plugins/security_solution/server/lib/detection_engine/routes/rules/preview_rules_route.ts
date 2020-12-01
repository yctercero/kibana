/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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

        if (!siemClient || !alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const { params, ...rest } = convertPreviewCreateAPIToInternalSchema(
          request.body,
          siemClient
        );

        await signalPreviewRules({
          logger,
          params,
          ml,
          lists,
          services: {
            callCluster: clusterClient.callAsCurrentUser,
            savedObjectsClient,
          },
          soAttributes: { ...rest },
          spaceId: 'default',
        });

        // get signals
        const signals = await clusterClient.callAsCurrentUser('search', {
          ...buildSignalsSearchQuery({
            ruleId: params.ruleId,
            index: siemClient.getSignalsPreviewIndex(),
            from: 'now-1h',
            to: 'now',
          }),
          size: 10,
        });

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
