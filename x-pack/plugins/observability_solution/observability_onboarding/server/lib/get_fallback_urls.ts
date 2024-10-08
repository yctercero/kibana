/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import { EsLegacyConfigService } from '../services/es_legacy_config_service';

export function getKibanaUrl(coreSetup: CoreSetup, cloudSetup?: CloudSetup) {
  return (
    // falls back to local network binding
    // then cloud id
    coreSetup.http.basePath.publicBaseUrl ?? // priority given to server.publicBaseUrl
    cloudSetup?.kibanaUrl ??
    getFallbackKibanaUrl(coreSetup)
  );
}

export function getFallbackKibanaUrl({ http }: CoreSetup) {
  const basePath = http.basePath;
  const { protocol, hostname, port } = http.getServerInfo();
  return `${protocol}://${hostname}:${port}${basePath
    // Prepending on '' removes the serverBasePath
    .prepend('/')
    .slice(0, -1)}`;
}

export async function getFallbackESUrl(esLegacyConfigService: EsLegacyConfigService) {
  const config = await esLegacyConfigService.readConfig();

  return config.hosts;
}
