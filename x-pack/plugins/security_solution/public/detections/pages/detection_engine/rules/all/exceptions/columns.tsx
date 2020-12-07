/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { EuiButtonIcon, EuiBasicTableColumn } from '@elastic/eui';
import React from 'react';
import { ExceptionListSchema } from '../../../../../../../../lists/common';

type Func = (event: MouseEvent<HTMLAnchorElement, MouseEvent>) => void;

export type AllExceptionListsColumns = EuiBasicTableColumn<ExceptionListSchema>;

export const getAllExceptionListsColumns = (
  onExport: Func,
  onDelete: Func
): AllExceptionListsColumns[] => [
  {
    field: 'list_id',
    name: 'Exception ID',
    truncateText: true,
    dataType: 'string',
    width: '100px',
  },
  {
    field: 'created_at',
    name: 'Number of rules applied to',
    truncateText: true,
    dataType: 'number',
    width: '14%',
  },
  {
    field: 'created_by',
    name: 'Rules applied to',
    truncateText: true,
    dataType: 'string',
    width: '14%',
  },
  {
    field: 'created_at',
    name: 'Date created',
    truncateText: true,
    dataType: 'date',
    width: '14%',
  },
  {
    field: 'updated_at',
    name: 'Last edited',
    truncateText: true,
    width: '14%',
  },
  {
    align: 'right',
    width: '10px',
    isExpander: false,
    render: () => (
      <EuiButtonIcon
        onClick={onExport}
        aria-label="Export exception list"
        iconType="exportAction"
      />
    ),
  },
  {
    align: 'right',
    width: '10px',
    isExpander: false,
    render: () => (
      <EuiButtonIcon onClick={onDelete} aria-label="Delete exception list" iconType="trash" />
    ),
  },
];
