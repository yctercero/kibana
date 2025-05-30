/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMetric, FeatureTypeUsage, RuleExceptionsUsage } from '../types';

export interface UpdateAlertSuppressionUsage {
  detectionRuleMetric: RuleMetric;
  usage: FeatureTypeUsage;
}

export const updateRuleUsageExceptionsUsage = ({
  detectionRuleMetric,
  usage,
}: UpdateAlertSuppressionUsage): RuleExceptionsUsage => {
  const hasExceptionList =
    detectionRuleMetric.has_shared_detection_exception_list ||
    detectionRuleMetric.has_endpoint_exception_list ||
    detectionRuleMetric.has_rule_default_exception_list;
  // if rule does not have exceptions configured
  // returned unchanged
  if (!hasExceptionList) {
    return usage.exceptions;
  }

  return {
    enabled_rules_with_exceptions:
      detectionRuleMetric.enabled && hasExceptionList
        ? usage.exceptions.enabled_rules_with_exceptions + 1
        : usage.exceptions.enabled_rules_with_exceptions,
    disabled_rules_with_exceptions:
      !detectionRuleMetric.enabled && hasExceptionList
        ? usage.exceptions.disabled_rules_with_exceptions + 1
        : usage.exceptions.disabled_rules_with_exceptions,
    has_shared_detection_exception_list: detectionRuleMetric.has_shared_detection_exception_list
      ? usage.exceptions.has_shared_detection_exception_list + 1
      : usage.exceptions.has_shared_detection_exception_list,
    has_rule_default_list: detectionRuleMetric.has_rule_default_exception_list
      ? usage.exceptions.has_rule_default_list + 1
      : usage.exceptions.has_rule_default_list,
    has_endpoint_list: detectionRuleMetric.has_endpoint_exception_list
      ? usage.exceptions.has_endpoint_list + 1
      : usage.exceptions.has_endpoint_list,
  };
};
