/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ExceptionMetricsSchema {
  lists_overview: {
    endpoint: {
      lists: number;
      total_items: number;
      max_items_per_list: number;
      min_items_per_list: number;
      average_items_per_list: number;
    };
    rule_default: {
      lists: number;
      total_items: number;
      max_items_per_list: number;
      min_items_per_list: number;
      average_items_per_list: number;
    };
    detection: {
      lists: number;
      total_items: number;
      max_items_per_list: number;
      min_items_per_list: number;
      average_items_per_list: number;
    };
  };
  items_overview: {
    total: number;
    entries: {
      match: number;
      list: number;
      nested: number;
      match_any: number;
      exists: number;
      wildcard: number;
    };
    has_expire_time: number;
    are_expired: number;
    has_comments: number;
  };
}

export interface ExceptionsOverviewAggsResponse {
  aggregations: {
    agnostic_space_lists: {
      buckets: Array<{
        key: string;
        doc_count: number;
        list_details: {
          by_type: {
            buckets: Array<{
              key: string;
              doc_count: number;
            }>;
          };
        };
        items_entries_type: {
          by_type: {
            buckets: Array<{
              key: string;
              doc_count: number;
            }>;
          };
        };
        non_empty_comments: {
          doc_count: number;
        };
        expire_time_exists: {
          doc_count: number;
        };
        expire_time_expired: {
          doc_count: number;
        };
      }>;
    };
    single_space_lists: {
      buckets: Array<{
        key: string;
        doc_count: number;
        list_details: {
          by_type: {
            buckets: Array<{
              key: string;
              doc_count: number;
            }>;
          };
        };
        items_entries_type: {
          by_type: {
            buckets: Array<{
              key: string;
              doc_count: number;
            }>;
          };
        };
        non_empty_comments: {
          doc_count: number;
        };
        expire_time_exists: {
          doc_count: number;
        };
        expire_time_expired: {
          doc_count: number;
        };
      }>;
    };
  };
}

export interface ExceptionListIdsAggsResponse {
  aggregations: {
    by_exception_list_type: {
      buckets: Array<{
        key: string;
        doc_count: number;
        list_ids: {
          buckets: Array<{
            key: string;
            doc_count: number;
          }>;
        };
      }>;
    };
  };
}
