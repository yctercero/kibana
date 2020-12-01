/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import datemath from '@elastic/datemath';

import {
  DEFAULT_SEARCH_AFTER_PREVIEW_PAGE_SIZE,
  DEFAULT_SIGNALS_PREVIEW_INDEX,
} from '../../../../../common/constants';
import { getListsClient, getExceptions, createSearchAfterReturnType } from '../utils';
import { buildRuleMessageFactory } from '../rule_messages';
import { executeCustomRuleType } from './custom_query_rule';

export const signalPreviewRules = async ({
  logger,
  ml,
  lists,
  services,
  params,
  spaceId,
  soAttributes,
}) => {
  const { from, ruleId, maxSignals, exceptionsList, output_index: outputIndex, version } = params;

  // these values are mocked out as we are circumventing alerting
  const alertId = 'security_solution_preview_mock_alert_id';
  const previousStartedAt = datemath.parse(from).toDate();
  const startedAt = Date.now();
  const eventsTelemetry = undefined;
  const gap = null;
  console.log('---------------> SIGNAL RULE PREVIEW', outputIndex);
  const {
    actions,
    name,
    tags,
    createdAt,
    createdBy,
    updatedBy,
    updatedAt,
    enabled,
    schedule: { interval },
    throttle,
  } = soAttributes;

  const searchAfterSize = Math.min(maxSignals, DEFAULT_SEARCH_AFTER_PREVIEW_PAGE_SIZE);
  let result = createSearchAfterReturnType();

  const refresh = false;
  const buildRuleMessage = buildRuleMessageFactory({
    id: alertId,
    ruleId,
    name,
    index: outputIndex,
  });

  logger.debug(buildRuleMessage('[+] Starting Signal Preview Rule execution'));

  try {
    const { listClient, exceptionsClient } = getListsClient({
      services,
      updatedByUser: updatedBy,
      spaceId,
      lists,
      savedObjectClient: services.savedObjectsClient,
    });
    const exceptionItems = await getExceptions({
      client: exceptionsClient,
      lists: exceptionsList ?? [],
    });

    result = await executeCustomRuleType({
      params,
      services,
      logger,
      buildRuleMessage,
      eventsTelemetry,
      version,
      alert: { alertId, previousStartedAt, updatedAt, refresh },
      gap,
      soAttributes,
      listClient,
      exceptionItems,
      searchAfterSize,
    });

    if (result.success) {
      logger.debug(buildRuleMessage('[+] Signal Rule preview execution completed.'));
      logger.debug(
        buildRuleMessage(
          `[+] Finished indexing ${result.createdSignalsCount} signals into ${DEFAULT_SIGNALS_PREVIEW_INDEX}`
        )
      );
    } else {
      const errorMessage = buildRuleMessage(
        'Bulk Indexing of signals failed:',
        result.errors.join()
      );
      logger.error(errorMessage);
    }
  } catch (error) {
    const errorMessage = error.message ?? '(no error message given)';
    const message = buildRuleMessage(
      'An error occurred during rule execution:',
      `message: "${errorMessage}"`
    );

    logger.error(message);
  }
};
