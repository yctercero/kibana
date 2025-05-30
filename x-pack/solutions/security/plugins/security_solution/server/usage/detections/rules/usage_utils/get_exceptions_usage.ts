/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSearchResult } from '../../../types';

export const getExceptionsUsage = (
  ruleAttributes: RuleSearchResult
): {
  hasExceptionList: boolean;
  hasEndpointExceptionList: boolean;
  hasRuleDefaultExceptionList: boolean;
  hasSharedExceptionList: boolean;
  totalLinkedExceptionLists: number;
} => {
  if (!ruleAttributes.params.exceptionsList.length) {
    return {
      hasExceptionList: false,
      hasEndpointExceptionList: false,
      hasRuleDefaultExceptionList: false,
      hasSharedExceptionList: false,
      totalLinkedExceptionLists: 0,
    };
  }

  const endpointListExists = ruleAttributes.params.exceptionsList.find(
    (list) => list.type === 'endpoint'
  );
  const ruleDefaultListExists = ruleAttributes.params.exceptionsList.find(
    (list) => list.type === 'rule_default'
  );
  const sharedListExists = ruleAttributes.params.exceptionsList.find(
    (list) => list.type === 'detection'
  );

  return {
    hasExceptionList: true,
    hasEndpointExceptionList: !!endpointListExists,
    hasRuleDefaultExceptionList: !!ruleDefaultListExists,
    hasSharedExceptionList: !!sharedListExists,
    totalLinkedExceptionLists: ruleAttributes.params.exceptionsList.length,
  };
};
