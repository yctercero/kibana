/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * NOTICE: Do not edit this file manually.
 * This file is automatically generated by the OpenAPI Generator, @kbn/openapi-generator.
 *
 * info:
 *   title: Get list API endpoint
 *   version: 2023-10-31
 */

import { z } from 'zod';

import { ListId } from '../model/list_common.gen';
import { List } from '../model/list_schemas.gen';

export type GetListRequestQuery = z.infer<typeof GetListRequestQuery>;
export const GetListRequestQuery = z.object({
  /**
   * List's `id` value
   */
  id: ListId,
});
export type GetListRequestQueryInput = z.input<typeof GetListRequestQuery>;

export type GetListResponse = z.infer<typeof GetListResponse>;
export const GetListResponse = List;
