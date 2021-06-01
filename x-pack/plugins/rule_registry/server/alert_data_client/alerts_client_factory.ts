/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, KibanaRequest, Logger } from 'src/core/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { SecurityPluginSetup } from '../../../security/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertingAuthorization } from '../../../alerting/server/authorization';
import { AlertsClient } from './alerts_client';
import { RuleDataPluginService } from '../rule_data_plugin_service';

export interface AlertsClientFactoryProps {
  logger: Logger;
  esClient: ElasticsearchClient;
  getAlertingAuthorization: (request: KibanaRequest) => PublicMethodsOf<AlertingAuthorization>;
  securityPluginSetup: SecurityPluginSetup | undefined;
  ruleDataService: RuleDataPluginService | null;
}

export class AlertsClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private esClient!: ElasticsearchClient;
  private getAlertingAuthorization!: (
    request: KibanaRequest
  ) => PublicMethodsOf<AlertingAuthorization>;
  private securityPluginSetup!: SecurityPluginSetup | undefined;
  private ruleDataService!: RuleDataPluginService;

  public initialize(options: AlertsClientFactoryProps) {
    /**
     * This should be called by the plugin's start() method.
     */
    if (this.isInitialized) {
      throw new Error('AlertsClientFactory (RAC) already initialized');
    }

    if (options.ruleDataService == null) {
      throw new Error('Rule registry data service required for alerts client');
    }

    this.getAlertingAuthorization = options.getAlertingAuthorization;
    this.isInitialized = true;
    this.logger = options.logger;
    this.esClient = options.esClient;
    this.securityPluginSetup = options.securityPluginSetup;
    this.ruleDataService = options.ruleDataService;
  }

  public async create(request: KibanaRequest): Promise<AlertsClient> {
    const { securityPluginSetup, getAlertingAuthorization, logger } = this;

    return new AlertsClient({
      logger,
      authorization: getAlertingAuthorization(request),
      auditLogger: securityPluginSetup?.audit.asScoped(request),
      esClient: this.esClient,
      ruleDataService: this.ruleDataService!,
    });
  }
}
