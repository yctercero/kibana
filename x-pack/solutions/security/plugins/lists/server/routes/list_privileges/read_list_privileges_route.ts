/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readPrivileges, transformError } from '@kbn/securitysolution-es-utils';
import { merge } from 'lodash/fp';
import { LIST_PRIVILEGES_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../../types';
import { buildSiemResponse, getListClient } from '../utils';

export const readPrivilegesRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .get({
      access: 'public',
      path: LIST_PRIVILEGES_URL,
      security: {
        authz: {
          requiredPrivileges: ['lists-read'],
        },
      },
    })
    .addVersion(
      {
        validate: false,
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const lists = await getListClient(context);
          const clusterPrivilegesLists = await readPrivileges(esClient, lists.getListName());
          const clusterPrivilegesListItems = await readPrivileges(
            esClient,
            lists.getListItemName()
          );
          const privileges = merge(
            {
              listItems: clusterPrivilegesListItems,
              lists: clusterPrivilegesLists,
            },
            {
              is_authenticated: request.auth.isAuthenticated ?? false,
            }
          );
          return response.ok({ body: privileges });
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
