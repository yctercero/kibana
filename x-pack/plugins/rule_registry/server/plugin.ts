/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, Plugin, CoreSetup, SharedGlobalConfig } from 'src/core/server';
import { SecurityPluginSetup } from '../../security/server';
import { PluginSetupContract as AlertingPluginSetupContract } from '../../alerting/server';
import { RuleRegistry } from './rule_registry';
import { defaultIlmPolicy } from './rule_registry/defaults/ilm_policy';
import { defaultFieldMap } from './rule_registry/defaults/field_map';
import { RacClientFactory } from './rac_client/rac_client';
export interface RacPluginsSetup {
  security?: SecurityPluginSetup;
  alerting: AlertingPluginSetupContract;
}
export interface RacPluginsStart {
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  alerting: AlertingPluginStartContract;
}

export type RacPluginSetupContract = RuleRegistry<typeof defaultFieldMap>;

export class RuleRegistryPlugin implements Plugin<RacPluginSetupContract> {
  private readonly config: Promise<SharedGlobalConfig>;
  private readonly racClientFactory: RacClientFactory;
  private security?: SecurityPluginSetup;
  private readonly logger: Logger;
  private readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];

  constructor(private readonly initContext: PluginInitializerContext) {
    this.config = initContext.config.legacy.get();
    this.initContext = initContext;
    this.racClientFactory = new RacClientFactory();
    this.logger = initContext.logger.get('root');
    this.kibanaVersion = initContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup, plugins: RacPluginsSetup): RacPluginSetupContract {
    this.security = plugins.security;

    // RULE REGISTRY
    const rootRegistry = new RuleRegistry({
      core,
      ilmPolicy: defaultIlmPolicy,
      fieldMap: defaultFieldMap,
      kibanaIndex: this.config.kibana.index,
      namespace: 'alert-history',
      kibanaVersion: this.kibanaVersion,
      logger: this.logger,
      alertingPluginSetupContract: plugins.alerting,
      writeEnabled: config.writeEnabled,
    });

    // ALERTS ROUTES
    core.http.registerRouteHandlerContext<RacRequestHandlerContext, 'rac'>(
      'rac',
      this.createRouteHandlerContext(core)
    );

    return rootRegistry;
  }

  public start(core: CoreStart, plugins: RacPluginsStart) {
    const { logger, licenseState, security, racClientFactory } = this;

    racClientFactory.initialize({
      logger,
      securityPluginSetup: security,
      securityPluginStart: plugins.security,
      getSpaceId(request: KibanaRequest) {
        return plugins.spaces?.spacesService.getSpaceId(request);
      },
      async getSpace(request: KibanaRequest) {
        return plugins.spaces?.spacesService.getActiveSpace(request);
      },
      features: plugins.features,
      kibanaVersion: this.kibanaVersion,
    });

    const getRacClientWithRequest = (request: KibanaRequest) => {
      if (isESOCanEncrypt !== true) {
        throw new Error(
          `Unable to create rac client because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
        );
      }
      return racClientFactory!.create(request, core.savedObjects);
    };

    return {
      getRacClientWithRequest,
    };
  }

  private createRouteHandlerContext = (
    core: CoreSetup
  ): IContextProvider<AlertingRequestHandlerContext, 'alerting'> => {
    const { alertTypeRegistry, alertsClientFactory } = this;
    return async function alertsRouteHandlerContext(context, request) {
      const [{ savedObjects }] = await core.getStartServices();
      return {
        getAlertsClient: () => {
          return alertsClientFactory!.create(request, savedObjects);
        },
        listTypes: alertTypeRegistry!.list.bind(alertTypeRegistry!),
        getFrameworkHealth: async () =>
          await getHealth(savedObjects.createInternalRepository(['alert'])),
      };
    };
  };

  public stop() {}
}
