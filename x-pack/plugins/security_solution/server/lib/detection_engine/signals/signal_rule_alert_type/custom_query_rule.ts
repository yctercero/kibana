/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from 'src/core/server';

import { SetupPlugins } from '../../../../plugin';
import { AlertServices } from '../../../../../../alerts/server';
import { ExceptionListItemSchema } from '../../../../../../lists/common/schemas';
import { TelemetryEventsSender } from '../../../telemetry/sender';
import { getFilter } from '../get_filter';
import { getInputIndex } from '../get_input_output_index';
import { searchAfterAndBulkCreate } from '../search_after_bulk_create';
import { RuleTypeParams, RefreshTypes } from '../../types';
import { BuildRuleMessage } from '../rule_messages';
import { RuleAlertAttributes } from '../types';

interface ExecuteCustomRuleTypeParams {
  params: RuleTypeParams;
  logger: Logger;
  eventsTelemetry: TelemetryEventsSender | undefined;
  version: string;
  listClient: ListClient;
  buildRuleMessage: BuildRuleMessage;
  gap: moment.Duration | null;
  soAttributes: RuleAlertAttributes;
  exceptionItems: ExceptionListItemSchema[] | undefined;
  searchAfterSize: number;
  services: AlertServices;
  alert: {
    alertId: string;
    previousStartedAt: Date | null | undefined;
    updatedAt: string;
    refresh: RefreshTypes;
  };
}

export const executeCustomRuleType = async ({
  params,
  services,
  logger,
  buildRuleMessage,
  eventsTelemetry,
  version,
  alert,
  gap,
  soAttributes,
  listClient,
  exceptionItems,
  searchAfterSize,
}: ExecuteCustomRuleTypeParams) => {
  const { index, filters, outputIndex, language, savedId, query, type } = params;
  const {
    actions,
    name,
    tags,
    createdAt,
    createdBy,
    updatedBy,
    enabled,
    schedule: { interval },
    throttle,
  } = soAttributes;

  const { alertId, previousStartedAt, updatedAt, refresh } = alert;
  const inputIndex = await getInputIndex(services, version, index);
  const esFilter = await getFilter({
    type,
    filters,
    language,
    query,
    savedId,
    services,
    index: inputIndex,
    lists: exceptionItems ?? [],
  });

  return searchAfterAndBulkCreate({
    gap,
    previousStartedAt,
    listClient,
    exceptionsList: exceptionItems ?? [],
    ruleParams: params,
    services,
    logger,
    eventsTelemetry,
    id: alertId,
    inputIndexPattern: inputIndex,
    signalsIndex: outputIndex,
    filter: esFilter,
    actions,
    name,
    createdBy,
    createdAt,
    updatedBy,
    updatedAt,
    interval,
    enabled,
    pageSize: searchAfterSize,
    refresh,
    tags,
    throttle,
    buildRuleMessage,
  });
};
