/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ExceptionMetricsSchema, ExceptionsOverviewAggsResponse } from '../types';

export interface GetExceptionsOverviewOptions {
  logger: Logger;
  esClient: ElasticsearchClient;
}

const METRICS_DEFAULT_STATE = {
  lists_overview: {
    endpoint: {
      lists: 0,
      total_items: 0,
      max_items_per_list: 0,
      min_items_per_list: 0,
      average_items_per_list: 0,
    },
    rule_default: {
      lists: 0,
      total_items: 0,
      max_items_per_list: 0,
      min_items_per_list: 0,
      average_items_per_list: 0,
    },
    detection: {
      lists: 0,
      total_items: 0,
      max_items_per_list: 0,
      min_items_per_list: 0,
      average_items_per_list: 0,
    },
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
};

export const getExceptionsOverview = async ({
  logger,
  esClient,
}: GetExceptionsOverviewOptions): Promise<ExceptionMetricsSchema> => {
  try {
    const query: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: '.kibana*',
      ignore_unavailable: false,
      size: 0, // no query results required - only aggregation quantity
      query: {
        bool: {
          should: [
            { term: { type: 'exception-list' } },
            { term: { type: 'exception-list-agnostic' } },
          ],
          must_not: [
            {
              terms: {
                'exception-list.list_id': [
                  'endpoint_trusted_apps',
                  'endpoint_event_filters',
                  'endpoint_host_isolation_exceptions',
                  'endpoint_blocklists',
                ],
              },
            },
            {
              terms: {
                'exception-list-agnostic.list_id': [
                  'endpoint_trusted_apps',
                  'endpoint_event_filters',
                  'endpoint_host_isolation_exceptions',
                  'endpoint_blocklists',
                ],
              },
            },
          ],
        },
      },
      aggs: {
        single_space_lists: {
          terms: {
            field: 'exception-list.list_id',
          },
          aggs: {
            list_details: {
              filter: {
                term: {
                  'exception-list.list_type': 'list',
                },
              },
              aggs: {
                by_type: {
                  terms: {
                    field: 'exception-list.type',
                  },
                },
              },
            },
            items_entries_type: {
              filter: {
                term: {
                  'exception-list.list_type': 'item',
                },
              },
              aggs: {
                by_type: {
                  terms: {
                    field: 'exception-list.entries.type',
                  },
                },
              },
            },
            non_empty_comments: {
              filter: {
                exists: {
                  field: 'exception-list.comments.comment',
                },
              },
            },
            expire_time_exists: {
              filter: {
                exists: {
                  field: 'exception-list.expire_time',
                },
              },
            },
            expire_time_expired: {
              filter: {
                range: {
                  'exception-list.expire_time': {
                    lt: 'now',
                  },
                },
              },
            },
          },
        },
        agnostic_space_lists: {
          terms: {
            field: 'exception-list-agnostic.list_id',
          },
          aggs: {
            list_details: {
              filter: {
                term: {
                  'exception-list-agnostic.list_type': 'list',
                },
              },
              aggs: {
                by_type: {
                  terms: {
                    field: 'exception-list-agnostic.type',
                  },
                },
              },
            },
            items_entries_type: {
              filter: {
                term: {
                  'exception-list-agnostic.list_type': 'item',
                },
              },
              aggs: {
                by_type: {
                  terms: {
                    field: 'exception-list-agnostic.entries.type',
                  },
                },
              },
            },
            non_empty_comments: {
              filter: {
                exists: {
                  field: 'exception-list-agnostic.comments.comment',
                },
              },
            },
            expire_time_exists: {
              filter: {
                exists: {
                  field: 'exception-list-agnostic.expire_time',
                },
              },
            },
            expire_time_expired: {
              filter: {
                range: {
                  'exception-list-agnostic.expire_time': {
                    lt: 'now',
                  },
                },
              },
            },
          },
        },
      },
    };

    const response = await esClient.search(query);
    const { aggregations: aggs } = response as unknown as ExceptionsOverviewAggsResponse;
    const agnosticLists = aggs.agnostic_space_lists.buckets;
    const singleSpaceLists = aggs.single_space_lists.buckets;
    const allLists = [...agnosticLists, ...singleSpaceLists];
    return allLists.reduce((aggResult, list) => {
      const listType = list.list_details.by_type.buckets[0]?.key;
      const items = list.doc_count - 1;
      const itemsWithComments = list.non_empty_comments.doc_count;
      const itemsWithExpireTime = list.expire_time_exists.doc_count;
      const itemsExpired = list.expire_time_expired.doc_count;
      const entries = list.items_entries_type.by_type.buckets.reduce(
        (acc, entry) => {
          const entryType = entry.key as keyof typeof acc;
          const entryCount = entry.doc_count;
          if (Object.keys(acc).includes(entryType)) {
            return {
              ...acc,
              [entryType]: acc[entryType] + entryCount,
            };
          }

          return acc;
        },
        {
          match: 0,
          list: 0,
          nested: 0,
          match_any: 0,
          exists: 0,
          wildcard: 0,
        }
      );

      if (listType == null) {
        return aggResult;
      }

      const updatedResult = {
        ...aggResult,
        lists_overview: {
          ...aggResult.lists_overview,
          total: allLists.length,
          endpoint: {
            lists: aggResult.lists_overview.endpoint.lists + 1,
            items: aggResult.lists_overview.endpoint.items + items,
          },
          rule_default: {
            lists: aggResult.lists_overview.rule_default.lists + 1,
            items: aggResult.lists_overview.rule_default.items + items,
          },
          detection: {
            lists: aggResult.lists_overview.detection.lists + 1,
            items: aggResult.lists_overview.detection.items + items,
          },
        },
        items_overview: {
          ...aggResult.items_overview,
          total: aggResult.items_overview.total + items,
          has_expire_time: aggResult.items_overview.has_expire_time + itemsWithExpireTime,
          are_expired: aggResult.items_overview.are_expired + itemsExpired,
          has_value_list: 0,
          has_comments: aggResult.items_overview.has_comments + itemsWithComments,
          entries: {
            match: aggResult.items_overview.entries.match + entries.match,
            list: aggResult.items_overview.entries.list + entries.list,
            nested: aggResult.items_overview.entries.nested + entries.nested,
            match_any: aggResult.items_overview.entries.match_any + entries.match_any,
            exists: aggResult.items_overview.entries.exists + entries.exists,
            wildcard: aggResult.items_overview.entries.wildcard + entries.wildcard,
          },
        },
      };
      return updatedResult;
    }, METRICS_DEFAULT_STATE);
  } catch (error) {
    return METRICS_DEFAULT_STATE;
  }
};
