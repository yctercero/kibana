/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type {
  ExceptionListIdsAggsResponse,
  ExceptionMetricsSchema,
  ExceptionsOverviewAggsResponse,
} from '../types';

export interface GetExceptionsOverviewOptions {
  logger: Logger;
  esClient: ElasticsearchClient;
}

const METRICS_DEFAULT_STATE = {
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
};

export const getExceptionListsOverview = async ({
  logger,
  esClient,
}: GetExceptionsOverviewOptions): Promise<ExceptionMetricsSchema> => {
  try {
    const listIdsByListType = await esClient.search({
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: '.kibana*',
      ignore_unavailable: false,
      size: 0,
      query: {
        bool: {
          must: [
            {
              terms: {
                type: ['exception-list', 'exception-list-agnostic'],
              },
            },
          ],
          must_not: [
            {
              bool: {
                should: [
                  { term: { 'exception-list.list_type': 'item' } },
                  { term: { 'exception-list-agnostic.list_type': 'item' } },
                ],
              },
            },
          ],
        },
      },
      aggs: {
        by_exception_list_type: {
          terms: {
            script: {
              source: `
            if (doc['type'].value == 'exception-list' && doc.containsKey('exception-list.type')) {
              return doc['exception-list.type'].value;
            } else if (doc['type'].value == 'exception-list-agnostic' && doc.containsKey('exception-list-agnostic.type')) {
              return doc['exception-list-agnostic.type'].value;
            } else {
              return 'unknown';
            }
          `,
              lang: 'painless',
            },
          },
          aggs: {
            list_ids: {
              terms: {
                script: {
                  source: `
                if (doc['type'].value == 'exception-list' && doc.containsKey('exception-list.list_id')) {
                  return doc['exception-list.list_id'].value;
                } else if (doc['type'].value == 'exception-list-agnostic' && doc.containsKey('exception-list-agnostic.list_id')) {
                  return doc['exception-list-agnostic.list_id'].value;
                } else {
                  return 'unknown';
                }
              `,
                  lang: 'painless',
                },
              },
            },
          },
        },
      },
    });
    const { aggregations: aggs } = listIdsByListType as unknown as ExceptionListIdsAggsResponse;
    const ruleDefaultListIds = aggs.by_exception_list_type.buckets
      .find((bucket) => bucket.key === 'rule_default')
      ?.list_ids.buckets.map((bucket) => bucket.key);
    const detectionListIds = aggs.by_exception_list_type.buckets
      .find((bucket) => bucket.key === 'detection')
      ?.list_ids.buckets.map((bucket) => bucket.key);
    const endpointListIds = aggs.by_exception_list_type.buckets
      .find((bucket) => bucket.key === 'endpoint')
      ?.list_ids.buckets.map((bucket) => bucket.key);
    console.log('RESPONSE INSIDE', JSON.stringify(aggs, null, 2));

    const listStats = await esClient.search({
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: '.kibana*',
      ignore_unavailable: false,
      size: 0,
      runtime_mappings: {
        normalized_list_id: {
          type: 'keyword',
          script: {
            source: `
          if (doc.containsKey('exception-list.list_id') && !doc['exception-list.list_id'].empty) {
            emit(doc['exception-list.list_id'].value);
          } else if (doc.containsKey('exception-list-agnostic.list_id') && !doc['exception-list-agnostic.list_id'].empty) {
            emit(doc['exception-list-agnostic.list_id'].value);
          }
        `,
          },
        },
      },
      query: {
        bool: {
          should: [
            { term: { type: 'exception-list' } },
            { term: { type: 'exception-list-agnostic' } },
          ],
          must_not: [
            { term: { 'exception-list.list_type': 'item' } },
            { term: { 'exception-list-agnostic.list_type': 'item' } },
          ],
        },
      },
      aggs: {
        list_id_groups: {
          filters: {
            filters: {
              endpoint: {
                terms: {
                  normalized_list_id: endpointListIds ?? [],
                },
              },
              rule_default: {
                terms: {
                  normalized_list_id: ruleDefaultListIds ?? [],
                },
              },
              detections: {
                terms: {
                  normalized_list_id: detectionListIds ?? [],
                },
              },
            },
          },
          aggs: {
            items_per_list: {
              terms: {
                field: 'normalized_list_id',
                size: 1000,
              },
            },
            min_items_per_list: {
              min_bucket: {
                buckets_path: 'items_per_list._count',
              },
            },
            max_items_per_list: {
              max_bucket: {
                buckets_path: 'items_per_list._count',
              },
            },
            avg_items_per_list: {
              avg_bucket: {
                buckets_path: 'items_per_list._count',
              },
            },
          },
        },
      },
    });

    const { aggregations: aggsListStats } = listStats as unknown as ExceptionsOverviewAggsResponse;
    const endpointAggs = aggsListStats.list_id_groups.buckets.endpoint;
    const ruleDefaultAggs = aggsListStats.list_id_groups.buckets.rule_default;
    const detectionAggs = aggsListStats.list_id_groups.buckets.detections;

    return {
      endpoint: {
        lists: (endpointListIds ?? []).length,
        total_items: endpointAggs.doc_count,
        max_items_per_list: endpointAggs.max_items_per_list.value,
        min_items_per_list: endpointAggs.min_items_per_list.value,
        average_items_per_list: endpointAggs.avg_items_per_list.value,
      },
      rule_default: {
        lists: (ruleDefaultListIds ?? []).length,
        total_items: ruleDefaultAggs.doc_count,
        max_items_per_list: ruleDefaultAggs.max_items_per_list.value,
        min_items_per_list: ruleDefaultAggs.min_items_per_list.value,
        average_items_per_list: ruleDefaultAggs.avg_items_per_list.value,
      },
      detection: {
        lists: (detectionListIds ?? []).length,
        total_items: detectionAggs.doc_count,
        max_items_per_list: detectionAggs.max_items_per_list.value,
        min_items_per_list: detectionAggs.min_items_per_list.value,
        average_items_per_list: detectionAggs.avg_items_per_list.value,
      },
    };
  } catch (error) {
    return METRICS_DEFAULT_STATE;
  }
};
