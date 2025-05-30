/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ExceptionMetricsSchema } from './types';
import { getExceptionsOverview } from './queries/get_exceptions_overview';
import { getExceptionListsOverview } from './queries/get_exception_lists_overview';

export interface GetExceptionsMetricsOptions {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

export const getExceptionsMetrics = async ({
  esClient,
  logger,
}: GetExceptionsMetricsOptions): Promise<ExceptionMetricsSchema> => {
  const res = await getExceptionListsOverview({
    esClient,
    logger,
  });
  logger.debug(() => `Getting exception metrics`);
  console.log('RESPONSE', JSON.stringify(res, null, 2));
  return getExceptionsOverview({
    esClient,
    logger,
  });
};
