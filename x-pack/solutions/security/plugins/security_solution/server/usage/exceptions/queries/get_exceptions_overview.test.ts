/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionsOverview } from './get_exceptions_overview';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

describe('getExceptionsOverview', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
  });

  it('returns default metrics when no data is found', async () => {
    esClient.search.mockResolvedValueOnce({
      took: 0,
      timed_out: false,
      _shards: { total: 0, successful: 0, failed: 0 },
      hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        single_space_lists: { buckets: [] },
        agnostic_space_lists: { buckets: [] },
      },
    });

    const result = await getExceptionsOverview({ esClient, logger });

    expect(result).toEqual({
      lists_overview: {
        total: 0,
        endpoint: { lists: 0, items: 0 },
        rule_default: { lists: 0, items: 0 },
        detection: { lists: 0, items: 0 },
      },
      items_overview: {
        total: 0,
        has_expire_time: 0,
        are_expired: 0,
        has_comments: 0,
        entries: {
          match: 0,
          list: 0,
          nested: 0,
          match_any: 0,
          exists: 0,
          wildcard: 0,
        },
      },
    });
  });

  it('aggregates metrics correctly when data is present', async () => {
    esClient.search.mockResolvedValueOnce({
      took: 0,
      timed_out: false,
      _shards: { total: 2, successful: 0, failed: 0 },
      hits: { total: { value: 2, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        single_space_lists: {
          buckets: [
            {
              key: 'list_1',
              doc_count: 5,
              list_details: {
                by_type: { buckets: [{ key: 'detection', doc_count: 1 }] },
              },
              items_entries_type: {
                by_type: [
                  { key: 'match', doc_count: 2 },
                  { key: 'list', doc_count: 1 },
                ],
              },
              non_empty_comments: { doc_count: 1 },
              expire_time_exists: { doc_count: 2 },
              expire_time_expired: { doc_count: 1 },
            },
          ],
        },
        agnostic_space_lists: {
          buckets: [
            {
              key: 'list_2',
              doc_count: 3,
              list_details: {
                by_type: { buckets: [{ key: 'rule_default', doc_count: 1 }] },
              },
              items_entries_type: {
                by_type: [
                  { key: 'nested', doc_count: 1 },
                  { key: 'exists', doc_count: 1 },
                ],
              },
              non_empty_comments: { doc_count: 0 },
              expire_time_exists: { doc_count: 1 },
              expire_time_expired: { doc_count: 0 },
            },
          ],
        },
      },
    });

    const result = await getExceptionsOverview({ esClient, logger });

    expect(result).toEqual({
      lists_overview: {
        total: 2,
        endpoint: { lists: 0, items: 0 },
        rule_default: { lists: 1, items: 3 },
        detection: { lists: 1, items: 5 },
      },
      items_overview: {
        total: 8,
        has_expire_time: 3,
        are_expired: 1,
        has_comments: 1,
        entries: {
          match: 2,
          list: 1,
          nested: 1,
          match_any: 0,
          exists: 1,
          wildcard: 0,
        },
      },
    });
  });

  it('returns default metrics when Elasticsearch query fails', async () => {
    esClient.search.mockRejectedValueOnce(new Error('Elasticsearch query failed'));

    const result = await getExceptionsOverview({ esClient, logger });

    expect(result).toEqual({
      lists_overview: {
        total: 0,
        endpoint: { lists: 0, items: 0 },
        rule_default: { lists: 0, items: 0 },
        detection: { lists: 0, items: 0 },
      },
      items_overview: {
        total: 0,
        has_expire_time: 0,
        are_expired: 0,
        has_comments: 0,
        entries: {
          match: 0,
          list: 0,
          nested: 0,
          match_any: 0,
          exists: 0,
          wildcard: 0,
        },
      },
    });
  });
});
