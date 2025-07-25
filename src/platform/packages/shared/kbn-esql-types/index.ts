/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  ESQLVariableType,
  EsqlControlType,
  VariableNamePrefix,
  type ControlWidthOptions,
  type ESQLControlState,
  type ESQLControlVariable,
  type PublishesESQLVariable,
  type PublishesESQLVariables,
  apiPublishesESQLVariable,
  apiPublishesESQLVariables,
} from './src/variables_types';

export {
  type IndicesAutocompleteResult,
  type IndexAutocompleteItem,
} from './src/sources_autocomplete_types';

export {
  type RecommendedQuery,
  type RecommendedField,
  type ResolveIndexResponse,
} from './src/extensions_autocomplete_types';

export {
  type InferenceEndpointsAutocompleteResult,
  type InferenceEndpointAutocompleteItem,
} from './src/inference_endpoint_autocomplete_types';

export type { ESQLLicenseType, ESQLSignatureLicenseType, ESQLLicenseResult } from './src/license';

export { REGISTRY_EXTENSIONS_ROUTE } from './src/constants';
