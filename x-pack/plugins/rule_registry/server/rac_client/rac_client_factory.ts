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
import { RacClient } from './rac_client';
import { SecurityPluginSetup, SecurityPluginStart } from '../../../security/server';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
// TODO: implement this class and audit logger
import { RacAuthorization } from '../authorization/rac_authorization';
// import { AlertsAuthorizationAuditLogger } from './authorization/audit_logger';
import { Space } from '../../../spaces/server';
import { RacAuthorizationAuditLogger } from '../authorization/audit_logger';

export interface RacClientFactoryOpts {
  logger: Logger;
  securityPluginSetup?: SecurityPluginSetup;
  securityPluginStart?: SecurityPluginStart;
  getSpaceId: (request: KibanaRequest) => string | undefined;
  getSpace: (request: KibanaRequest) => Promise<Space | undefined>;
  features: FeaturesPluginStart;
  kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  esClient: ElasticsearchClient;
}

export class RacClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private securityPluginSetup?: SecurityPluginSetup;
  private securityPluginStart?: SecurityPluginStart;
  private getSpaceId!: (request: KibanaRequest) => string | undefined;
  private getSpace!: (request: KibanaRequest) => Promise<Space | undefined>;
  private features!: FeaturesPluginStart;
  private kibanaVersion!: PluginInitializerContext['env']['packageInfo']['version'];
  private esClient!: ElasticsearchClient;

  public initialize(options: RacClientFactoryOpts) {
    /**
     * This should be called by the plugin's start() method.
     */
    if (this.isInitialized) {
      throw new Error('AlertsClientFactory already initialized');
    }
    this.isInitialized = true;
    this.logger = options.logger;
    this.getSpaceId = options.getSpaceId;
    this.features = options.features;
    this.securityPluginSetup = options.securityPluginSetup;
    this.securityPluginStart = options.securityPluginStart;
    this.esClient = options.esClient;
    this.getSpace = options.getSpace;
  }

  public async create(request: KibanaRequest): Promise<RacClient> {
    const { features, securityPluginSetup, securityPluginStart } = this;
    const spaceId = this.getSpaceId(request);

    const authorization = await RacAuthorization.create({
      authorization: securityPluginStart?.authz,
      request,
      getSpace: this.getSpace,
      features: features!,
      isAuthEnabled: true,
      auditLogger: new RacAuthorizationAuditLogger(securityPluginSetup?.audit.asScoped(request)),
    });
    return new RacClient({
      spaceId,
      kibanaVersion: this.kibanaVersion,
      logger: this.logger,
      authorization,
      auditLogger: securityPluginSetup?.audit.asScoped(request),
      esClient: this.esClient,
    });
  }
}
