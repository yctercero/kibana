/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'src/core/server';

import { Space } from '../../../spaces/server';

export type GetSpaceFn = (request: KibanaRequest) => Promise<Space | undefined>;

export enum ReadOperations {
  Get = 'get',
  Find = 'find',
}

export enum WriteOperations {
  Update = 'update',
}

export interface ESFilter {
  bool: unknown | unknown[];
}
