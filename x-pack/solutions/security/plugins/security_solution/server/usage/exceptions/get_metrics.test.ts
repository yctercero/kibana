/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionsMetrics } from './get_metrics';
import { getExceptionsOverview } from './queries/get_exceptions_overview';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';

jest.mock('./queries/get_exceptions_overview', () => ({
  getExceptionsOverview: jest.fn(),
}));

describe('getExceptionsMetrics', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
    savedObjectsClient = savedObjectsClientMock.create();
    jest.clearAllMocks();
  });

  it('returns metrics from getExceptionsOverview', async () => {
    const mockMetrics = {
      lists_overview: {
        total: 2,
        endpoint: { lists: 1, items: 5 },
        rule_default: { lists: 1, items: 3 },
        detection: { lists: 0, items: 0 },
      },
      items_overview: {
        total: 8,
        has_expire_time: 3,
        are_expired: 1,
        has_comments: 2,
        entries: {
          match: 4,
          list: 2,
          nested: 1,
          match_any: 0,
          exists: 1,
          wildcard: 0,
        },
      },
    };

    (getExceptionsOverview as jest.Mock).mockResolvedValueOnce(mockMetrics);

    const result = await getExceptionsMetrics({ esClient, logger, savedObjectsClient });

    expect(result).toEqual(mockMetrics);
    expect(getExceptionsOverview).toHaveBeenCalledWith({ esClient, logger });
    expect(logger.debug).toHaveBeenCalledWith(expect.any(Function));
  });

  it('handles errors gracefully and logs them', async () => {
    const error = new Error('Failed to fetch metrics');
    (getExceptionsOverview as jest.Mock).mockRejectedValueOnce(error);

    await expect(getExceptionsMetrics({ esClient, logger, savedObjectsClient })).rejects.toThrow(
      error
    );

    expect(getExceptionsOverview).toHaveBeenCalledWith({ esClient, logger });
    expect(logger.debug).toHaveBeenCalledWith(expect.any(Function));
    expect(logger.error).toHaveBeenCalledWith('Error fetching exception metrics', error);
  });
});
