/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import type {
  ListArray,
  ExceptionListSchema,
  CreateExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { addExceptionList } from '@kbn/securitysolution-list-api';
import { useExceptionLists } from '@kbn/securitysolution-list-hooks';
import { DataViewBase } from '@kbn/es-query';

import * as i18n from './translations';
import { Rule } from '../../../../detections/containers/detection_engine/rules/types';
import { patchRule } from '../../../../detections/containers/detection_engine/rules/api';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../../../../common/endpoint/service/artifacts/constants';
import { useRuleAsync } from '../../../../detections/containers/detection_engine/rules/use_rule_async';
import { useGetInstalledJob } from '../../ml/hooks/use_get_jobs';
import { useKibana } from '../../../lib/kibana';
import { useFetchIndex } from '../../../containers/source';

export type ReturnUseFetchExceptionFlyoutData = {
  isLoading: boolean;
  rule: Rule | null;
  indexPatterns: DataViewBase;
};

export interface UseFetchExceptionFlyoutDataProps {
  ruleId: string;
}

/**
 * Hook for fetching or creating an exception list
 *
 * @param http Kibana http service
 * @param ruleId id of the rule
 * @param exceptionListType type of the exception list to be fetched or created
 * @param onError error callback
 *
 */
export const useFetchExceptionFlyoutData = ({
  ruleId,
}: UseFetchExceptionFlyoutDataProps): ReturnUseFetchExceptionFlyoutData => {
  const { http, notifications, data } = useKibana().services;
  const { rule: maybeRule, loading: isRuleLoading, refresh } = useRuleAsync(ruleId);

  // If data view is defined, it superceeds use of rule defined index patterns
  const hasDataViewId = maybeRule?.data_view_id || null;

  // Index pattern logic
  const memoMlJobIds = useMemo(() => !hasDataViewId && maybeRule?.machine_learning_job_id ? maybeRule?.machine_learning_job_id : [], [maybeRule]);
  const { loading: mlJobLoading, jobs } = useGetInstalledJob(memoMlJobIds);
  const memoRuleIndex = useMemo(() => !hasDataViewId && maybeRule?.index ? maybeRule?.index : [], [maybeRule]);
  const memoRuleIndices = useMemo(() => {
    if (jobs.length > 0) {
      return jobs[0].results_index_name ? [`.ml-anomalies-${jobs[0].results_index_name}`] : [];
    } else {
      return memoRuleIndex;
    }
  }, [jobs, memoRuleIndex]);
  const [isIndexPatternLoading, { indexPatterns: indexIndexPatterns }] =
    useFetchIndex(memoRuleIndices);

  // Data view logic
  const [dataViewIndexPatterns, setDataViewIndexPatterns] = useState<DataViewBase | null>(null);

  useEffect(() => {
    const fetchSingleDataView = async () => {
      if (hasDataViewId) {
        const dv = await data.dataViews.get(hasDataViewId);
        setDataViewIndexPatterns(dv);
      }
    };

    fetchSingleDataView();
  }, [hasDataViewId, data.dataViews, setDataViewIndexPatterns]);

  // Determine whether to use index patterns or data views
  const indexPatternsToUse = useMemo(
    (): DataViewBase | null => (hasDataViewId ? dataViewIndexPatterns : indexIndexPatterns),
    [hasDataViewId, dataViewIndexPatterns, indexIndexPatterns]
  );

  return { isLoading: isIndexPatternLoading || isRuleLoading || mlJobLoading, rule: maybeRule, indexPatterns: indexPatternsToUse };
};