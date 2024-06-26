/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useContext, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSwitch } from '@elastic/eui';
import { ES_AGGREGATION } from '@kbn/ml-anomaly-utils';
import { JobCreatorContext } from '../../../job_creator_context';
import { Description } from './description';

export const SparseDataSwitch: FC = () => {
  const { jobCreator, jobCreatorUpdated, jobCreatorUpdate } = useContext(JobCreatorContext);
  const [sparseData, setSparseData] = useState(jobCreator.sparseData);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    jobCreator.sparseData = sparseData;
    jobCreatorUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sparseData]);

  useEffect(() => {
    const aggs = [ES_AGGREGATION.COUNT, ES_AGGREGATION.SUM];
    const isCountOrSum = jobCreator.aggregations.some(
      (agg) => agg.dslName !== null && aggs.includes(agg.dslName)
    );
    setEnabled(isCountOrSum);
    if (isCountOrSum === false && sparseData === true) {
      setSparseData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  function toggleSparseData() {
    setSparseData(!sparseData);
  }

  return (
    <Description>
      <EuiSwitch
        name="switch"
        disabled={enabled === false}
        checked={sparseData}
        onChange={toggleSparseData}
        data-test-subj="mlJobWizardSwitchSparseData"
        label={i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.sparseData.title', {
          defaultMessage: 'Sparse data',
        })}
      />
    </Description>
  );
};
