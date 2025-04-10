/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getClusterStats } from './get_cluster_stats';
import { CLUSTER_STAT_TIMEOUT } from './constants';

describe('get_cluster_stats', () => {
  it('uses the esClient to get the response from the `cluster.stats` API', async () => {
    const response = { cluster_uuid: '1234' };
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    esClient.cluster.stats.mockImplementationOnce(
      // @ts-expect-error the method only cares about the response body
      async (_params = { timeout: CLUSTER_STAT_TIMEOUT }) => {
        return response;
      }
    );
    const result = await getClusterStats(esClient);
    expect(esClient.cluster.stats).toHaveBeenCalledWith(
      { timeout: CLUSTER_STAT_TIMEOUT, include_remotes: true },
      { requestTimeout: CLUSTER_STAT_TIMEOUT }
    );
    expect(result).toStrictEqual(response);
  });
});
