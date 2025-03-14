/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
  DEFAULT_APP_CATEGORIES,
} from '@kbn/core/server';
import { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import { DataViewPersistableStateService } from '@kbn/data-views-plugin/common';
import type { EMSSettings } from '@kbn/maps-ems-plugin/server';

import { KibanaFeatureConfig, KibanaFeatureScope } from '@kbn/features-plugin/common';
import { CONTENT_ID, LATEST_VERSION } from '../common/content_management';
import { getEcommerceSavedObjects } from './sample_data/ecommerce_saved_objects';
import { getFlightsSavedObjects } from './sample_data/flights_saved_objects';
import { getWebLogsSavedObjects } from './sample_data/web_logs_saved_objects';
import { registerMapsUsageCollector } from './maps_telemetry/collectors/register';
import { APP_ID, APP_ICON, MAP_SAVED_OBJECT_TYPE, getFullPath } from '../common/constants';
import { MapsXPackConfig } from './config';
import { setStartServices } from './kibana_server_services';
import { emsBoundariesSpecProvider } from './tutorials/ems';
import { initRoutes } from './routes';
import { setupEmbeddable } from './embeddable';
import { setupSavedObjects } from './saved_objects';
import { registerIntegrations } from './register_integrations';
import { StartDeps, SetupDeps } from './types';
import { MapsStorage } from './content_management';

export class MapsPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  readonly _initializerContext: PluginInitializerContext<MapsXPackConfig>;
  private readonly _logger: Logger;

  constructor(initializerContext: PluginInitializerContext<MapsXPackConfig>) {
    this._logger = initializerContext.logger.get();
    this._initializerContext = initializerContext;
  }

  _initHomeData(
    home: HomeServerPluginSetup,
    prependBasePath: (path: string) => string,
    emsSettings: EMSSettings
  ) {
    const sampleDataLinkLabel = i18n.translate('xpack.maps.sampleDataLinkLabel', {
      defaultMessage: 'Map',
    });

    home.sampleData.addSavedObjectsToSampleDataset('ecommerce', getEcommerceSavedObjects());

    home.sampleData.addAppLinksToSampleDataset('ecommerce', [
      {
        sampleObject: {
          type: MAP_SAVED_OBJECT_TYPE,
          id: '2c9c1f60-1909-11e9-919b-ffe5949a18d2',
        },
        getPath: getFullPath,
        label: sampleDataLinkLabel,
        icon: APP_ICON,
      },
    ]);

    home.sampleData.replacePanelInSampleDatasetDashboard({
      sampleDataId: 'ecommerce',
      dashboardId: '722b74f0-b882-11e8-a6d9-e546fe2bba5f',
      oldEmbeddableId: '9c6f83f0-bb4d-11e8-9c84-77068524bcab',
      embeddableId: '2c9c1f60-1909-11e9-919b-ffe5949a18d2',
      // @ts-expect-error
      embeddableType: MAP_SAVED_OBJECT_TYPE,
      embeddableConfig: {
        isLayerTOCOpen: false,
        hiddenLayers: [],
        mapCenter: { lat: 45.88578, lon: -15.07605, zoom: 2.11 },
        openTOCDetails: [],
      },
    });

    home.sampleData.addSavedObjectsToSampleDataset('flights', getFlightsSavedObjects());

    home.sampleData.addAppLinksToSampleDataset('flights', [
      {
        sampleObject: {
          type: MAP_SAVED_OBJECT_TYPE,
          id: '5dd88580-1906-11e9-919b-ffe5949a18d2',
        },
        getPath: getFullPath,
        label: sampleDataLinkLabel,
        icon: APP_ICON,
      },
    ]);

    home.sampleData.replacePanelInSampleDatasetDashboard({
      sampleDataId: 'flights',
      dashboardId: '7adfa750-4c81-11e8-b3d7-01146121b73d',
      oldEmbeddableId: '334084f0-52fd-11e8-a160-89cc2ad9e8e2',
      embeddableId: '5dd88580-1906-11e9-919b-ffe5949a18d2',
      // @ts-expect-error
      embeddableType: MAP_SAVED_OBJECT_TYPE,
      embeddableConfig: {
        isLayerTOCOpen: true,
        hiddenLayers: [],
        mapCenter: { lat: 48.72307, lon: -115.18171, zoom: 4.28 },
        openTOCDetails: [],
      },
    });

    home.sampleData.addSavedObjectsToSampleDataset('logs', getWebLogsSavedObjects());
    home.sampleData.addAppLinksToSampleDataset('logs', [
      {
        sampleObject: {
          type: MAP_SAVED_OBJECT_TYPE,
          id: 'de71f4f0-1902-11e9-919b-ffe5949a18d2',
        },
        getPath: getFullPath,
        label: sampleDataLinkLabel,
        icon: APP_ICON,
      },
    ]);
    home.sampleData.replacePanelInSampleDatasetDashboard({
      sampleDataId: 'logs',
      dashboardId: 'edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b',
      oldEmbeddableId: '06cf9c40-9ee8-11e7-8711-e7a007dcef99',
      embeddableId: 'de71f4f0-1902-11e9-919b-ffe5949a18d2',
      // @ts-expect-error
      embeddableType: MAP_SAVED_OBJECT_TYPE,
      embeddableConfig: {
        isLayerTOCOpen: false,
        hiddenLayers: [],
        mapCenter: { lat: 42.16337, lon: -88.92107, zoom: 3.64 },
        openTOCDetails: [],
      },
    });

    home.tutorials.registerTutorial(
      emsBoundariesSpecProvider({
        prependBasePath,
        emsLandingPageUrl: emsSettings.getEMSLandingPageUrl(),
      })
    );
  }

  setup(core: CoreSetup<StartDeps>, plugins: SetupDeps) {
    const getFilterMigrations = plugins.data.query.filterManager.getAllMigrations.bind(
      plugins.data.query.filterManager
    );
    const getDataViewMigrations = DataViewPersistableStateService.getAllMigrations.bind(
      DataViewPersistableStateService
    );

    const { usageCollection, home, features, customIntegrations, contentManagement } = plugins;
    const config$ = this._initializerContext.config.create();

    const emsSettings = plugins.mapsEms.createEMSSettings();

    initRoutes(core, this._logger);

    if (home) {
      this._initHomeData(home, core.http.basePath.prepend, emsSettings);
    }

    if (customIntegrations) {
      registerIntegrations(core, customIntegrations);
    }

    const getBaseMapsFeature = (
      version: 'v1' | 'v2'
    ): Omit<KibanaFeatureConfig, 'id' | 'order'> => {
      const apiAllPrivileges = [];
      const savedObjectAllPrivileges = [MAP_SAVED_OBJECT_TYPE];
      const uiAllPrivileges = ['save', 'show'];
      const apiReadPrivileges = [];
      const savedObjectReadPrivileges = [MAP_SAVED_OBJECT_TYPE, 'index-pattern', 'tag'];

      if (version === 'v1') {
        apiAllPrivileges.push('savedQuery:manage', 'savedQuery:read');
        savedObjectAllPrivileges.push('query');
        uiAllPrivileges.push('saveQuery');
        apiReadPrivileges.push('savedQuery:read');
        savedObjectReadPrivileges.push('query');
      }

      return {
        name: i18n.translate('xpack.maps.featureRegistry.mapsFeatureName', {
          defaultMessage: 'Maps',
        }),
        category: DEFAULT_APP_CATEGORIES.kibana,
        scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
        app: [APP_ID, 'kibana'],
        catalogue: [APP_ID],
        privileges: {
          all: {
            app: [APP_ID, 'kibana'],
            api: apiAllPrivileges,
            catalogue: [APP_ID],
            savedObject: {
              all: savedObjectAllPrivileges,
              read: ['index-pattern', 'tag'],
            },
            ui: uiAllPrivileges,
            ...(version === 'v1' && {
              replacedBy: [
                { feature: 'maps_v2', privileges: ['all'] },
                { feature: 'savedQueryManagement', privileges: ['all'] },
              ],
            }),
          },
          read: {
            app: [APP_ID, 'kibana'],
            api: apiReadPrivileges,
            catalogue: [APP_ID],
            savedObject: {
              all: [],
              read: savedObjectReadPrivileges,
            },
            ui: ['show'],
            ...(version === 'v1' && {
              replacedBy: {
                default: [
                  { feature: 'maps_v2', privileges: ['read'] },
                  { feature: 'savedQueryManagement', privileges: ['read'] },
                ],
                minimal: [
                  { feature: 'maps_v2', privileges: ['minimal_read'] },
                  { feature: 'savedQueryManagement', privileges: ['minimal_read'] },
                ],
              },
            }),
          },
        },
      };
    };

    features.registerKibanaFeature({
      deprecated: {
        notice: i18n.translate('xpack.maps.featureRegistry.mapsFeatureDeprecationNotice', {
          defaultMessage:
            'The Maps V1 privilege has been deprecated and replaced with a Maps V2 privilege in order to improve saved query management. See {link} for more details.',
          values: { link: 'https://github.com/elastic/kibana/pull/202863' },
        }),
        replacedBy: ['maps_v2'],
      },
      id: APP_ID,
      order: 400,
      ...getBaseMapsFeature('v1'),
    });

    features.registerKibanaFeature({
      id: 'maps_v2',
      order: 401,
      ...getBaseMapsFeature('v2'),
    });

    setupSavedObjects(core, getFilterMigrations, getDataViewMigrations);
    registerMapsUsageCollector(usageCollection);

    contentManagement.register({
      id: CONTENT_ID,
      storage: new MapsStorage({
        throwOnResultValidationError: this._initializerContext.env.mode.dev,
        logger: this._logger.get('storage'),
      }),
      version: {
        latest: LATEST_VERSION,
      },
    });

    setupEmbeddable(plugins.embeddable, getFilterMigrations, getDataViewMigrations);

    return {
      config: config$,
    };
  }

  start(core: CoreStart, plugins: StartDeps) {
    setStartServices(core);
  }
}
