/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createListIndex, ApiParams } from '@kbn/securitysolution-list-api';
import { withOptionalSignal } from '@kbn/securitysolution-hook-utils';

import { READ_INDEX_QUERY_KEY } from '../constants';

const createListIndexWithOptionalSignal = withOptionalSignal(createListIndex);

export const useCreateListIndex = ({
  http,
  onError,
}: {
  http: ApiParams['http'];
  onError?: (err: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  const { mutate, isLoading, error } = useMutation(
    () => createListIndexWithOptionalSignal({ http }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(READ_INDEX_QUERY_KEY);
      },
      onError,
    }
  );

  return {
    start: mutate,
    loading: isLoading,
    error,
  };
};
