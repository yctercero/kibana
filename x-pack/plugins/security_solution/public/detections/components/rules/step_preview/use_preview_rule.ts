/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useRef, useState } from 'react';

import { previewRule } from '../../../containers/detection_engine/rules/api';

type Func = () => void;
export type ReturnPreviewRule = [boolean, any, Func | null];

/**
 * Hook for conducting a dry run of a rule
 *
 * @param rule rule to be previewed
 *
 */
export const usePreviewRule = (): ReturnPreviewRule => {
  const [signals, setSignals] = useState([]);
  const [errors, setError] = useState(null);
  const fetchPreview = useRef<Func | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async (rule): Promise<void> => {
      try {
        setLoading(true);

        if (isSubscribed) {
          const { signals: returnedSignals } = await previewRule({
            rule,
            signal: abortCtrl.signal,
          });

          setSignals(returnedSignals.hits.hits ?? []);
          setLoading(false);
        }
      } catch (error) {
        if (isSubscribed) {
          setSignals([]);
          setLoading(false);
          setError(error.body.message);
        }
      }
    };

    fetchPreview.current = fetchData;
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, []);

  return [loading, signals, errors, fetchPreview.current];
};
