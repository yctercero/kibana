/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useState } from 'react';

import { fetchRules } from './api';

/**
 * Hook for fetching ExceptionLists
 *
 * @param showDetectionsListsOnly boolean, if true, only detection lists are searched
 *
 */
export const useAllExceptionLists = ({ exceptionLists }) => {
  const [loading, setLoading] = useState(true);
  const ids = useMemo((): string => {
    return exceptionLists.map(({ id }, index) =>
      index !== exceptionLists.length - 1 ? `${id} or ` : id
    );
  }, [exceptionLists]);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async (): Promise<void> => {
      try {
        setLoading(true);

        const { data: rules } = await fetchRules({
          filterOptions: {
            filter: `alert.attributes.exceptionsList: (${ids})`,
            showCustomRules: true,
            showElasticRules: true,
            sortField: 'created_at',
            sortOrder: 'desc',
            tags: [],
          },
          pagination: {
            page: 1,
            perPage: 500,
            total: 0,
          },
          signal: abortCtrl.signal,
        });

        console.log(ids, rules);

        if (isSubscribed) {
          setLoading(false);
        }
      } catch (error) {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };
    console.log(exceptionLists.length);
    if (exceptionLists.length > 0) {
      fetchData();
    }

    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [ids, exceptionLists.length]);

  return [loading];
};
