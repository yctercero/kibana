/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  PluginInitializerContext,
} from 'src/core/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { AlertsAuthorization } from '../../../alerting/server/authorization';
import { RacClient } from './rac_client';

export interface RacClientFactoryOpts {
  logger: Logger;
  getSpaceId: (request: KibanaRequest) => string | undefined;
  kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  esClient: ElasticsearchClient;
  getAlertingAuthorization: (request: KibanaRequest) => PublicMethodsOf<AlertsAuthorization>;
}

export class RacClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private getSpaceId!: (request: KibanaRequest) => string | undefined;
  private kibanaVersion!: PluginInitializerContext['env']['packageInfo']['version'];
  private esClient!: ElasticsearchClient;
  private getAlertingAuthorization!: (
    request: KibanaRequest
  ) => PublicMethodsOf<AlertsAuthorization>;

  public initialize(options: RacClientFactoryOpts) {
    /**
     * This should be called by the plugin's start() method.
     */
    if (this.isInitialized) {
      throw new Error('AlertsClientFactory already initialized');
    }

    this.kibanaVersion = options.kibanaVersion;
    this.getAlertingAuthorization = options.getAlertingAuthorization;
    this.isInitialized = true;
    this.logger = options.logger;
    this.getSpaceId = options.getSpaceId;
    this.esClient = options.esClient;
  }

  public async create(request: KibanaRequest): Promise<RacClient> {
    const { getAlertingAuthorization, logger, kibanaVersion } = this;
    const spaceId = this.getSpaceId(request);

    return new RacClient({
      spaceId,
      kibanaVersion,
      logger,
      authorization: getAlertingAuthorization(request),
      esClient: this.esClient,
    });
  }
}
