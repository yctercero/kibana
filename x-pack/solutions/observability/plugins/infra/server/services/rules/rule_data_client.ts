/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';

import type { RuleRegistryPluginSetupContract } from '@kbn/rule-registry-plugin/server';
import { Dataset } from '@kbn/rule-registry-plugin/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import { ECS_COMPONENT_TEMPLATE_NAME } from '@kbn/alerting-plugin/server';
import type { InfraFeatureId } from '../../../common/constants';
import type { RuleRegistrationContext, RulesServiceStartDeps } from './types';

export const createRuleDataClient = ({
  ownerFeatureId,
  registrationContext,
  getStartServices,
  logger,
  ruleDataService,
}: {
  ownerFeatureId: InfraFeatureId;
  registrationContext: RuleRegistrationContext;
  getStartServices: CoreSetup<RulesServiceStartDeps>['getStartServices'];
  logger: Logger;
  ruleDataService: RuleRegistryPluginSetupContract['ruleDataService'];
}) => {
  return ruleDataService.initializeIndex({
    feature: ownerFeatureId,
    registrationContext,
    dataset: Dataset.alerts,
    componentTemplateRefs: [ECS_COMPONENT_TEMPLATE_NAME],
    componentTemplates: [
      {
        name: 'mappings',
        mappings: mappingFromFieldMap(legacyExperimentalFieldMap, 'strict'),
      },
    ],
  });
};
