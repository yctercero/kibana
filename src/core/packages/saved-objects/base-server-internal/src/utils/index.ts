/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { getObjectKey, parseObjectKey } from './object_key';
export { getIndexForType } from './get_index_for_type';
export {
  getFieldListFromTypeMapping,
  getFieldListMapFromMappingDefinitions,
  type FieldListMap,
} from './get_field_list';
export { pickValuesBasedOnStructure } from './pick_values_based_on_structure';
