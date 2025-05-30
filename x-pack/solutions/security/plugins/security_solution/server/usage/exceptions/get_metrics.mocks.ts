/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse } from '@kbn/core/server';
import type { ExceptionItemsSearchResult } from '../types';

export const getExceptionItemsMock = (): SavedObjectsFindResponse<ExceptionItemsSearchResult> => ({
  page: 1,
  per_page: 1_000,
  total: 0,
  saved_objects: [
    {
      type: 'exception-list',
      id: '3bb5cc10-9249-11eb-85b7-254c8af1a983',
      attributes: {
        id: '3bb5cc10-9249-11eb-85b7-254c8af1a983',
        list_id: 'exception-list-1',
        type: 'simple',
        item_id: 'exception-list-item-1',
        namespace_type: 'agnostic',
        name: 'exception-list-1',
        description: 'exception-list-1',
        tags: [],
        tie_breaker_id: '3bb5cc10-9249-11eb-85b7-254c8af1a983',
        comments: [],
        entries: [
          {
            type: 'list',
            field: 'host.name',
            operator: 'included',
            list: {
              id: 'list-id-1',
              type: 'keyword',
            },
          },
        ],
        expire_time: '2001-03-31T17:47:59.449Z',
        created_at: '2021-03-31T17:47:59.449Z',
        created_by: 'elastic',
        updated_at: '2021-03-31T17:47:59.818Z',
        updated_by: 'elastic',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        createdAt: '2021-03-31T17:47:59.449Z',
        updatedAt: '2021-03-31T17:47:59.818Z',
      },
      references: [],
      migrationVersion: {},
      coreMigrationVersion: '8.0.0',
      updated_at: '2021-03-31T17:47:59.818Z',
      version: 'WzI3MDIyODMsNF0=',
      namespaces: ['default'],
      score: 0,
    },
  ],
});
