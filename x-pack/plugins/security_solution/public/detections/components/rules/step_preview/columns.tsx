/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
/* eslint-disable react/display-name */
import { EuiBasicTableColumn, EuiText, EuiButtonIcon } from '@elastic/eui';

import { FormattedDate } from '../../../../common/components/formatted_date';
import { getEmptyTagValue } from '../../../../common/components/empty_value';

export const getColumns = ({ expandedItems, onToggle }): EuiBasicTableColumn[] => [
  {
    field: '_source.@timestamp',
    name: '@timestamp',
    dataType: 'date',
    sortable: false,
    truncateText: false,
    width: '40px',
    render: (field: string) => <FormattedDate value={field} fieldName="@timestamp" />,
  },
  {
    field: '_source.event.module',
    name: 'event.module',
    sortable: false,
    truncateText: false,
    dataType: 'string',
    width: '40px',
    render: (value: string) => {
      return value == null ? (
        getEmptyTagValue()
      ) : (
        <EuiText data-test-subj="eventModule" size="s">
          {value}
        </EuiText>
      );
    },
  },
  {
    field: '_source.event.action',
    name: 'event.action',
    sortable: false,
    truncateText: false,
    dataType: 'string',
    width: '40px',
    render: (value: string) => {
      return value == null ? (
        getEmptyTagValue()
      ) : (
        <EuiText data-test-subj="eventAction" size="s">
          {value}
        </EuiText>
      );
    },
  },
  {
    field: '_source.event.category',
    name: 'event.category',
    sortable: false,
    truncateText: false,
    dataType: 'string',
    width: '40px',
    render: (value: string) => {
      return value == null ? (
        getEmptyTagValue()
      ) : (
        <EuiText data-test-subj="eventCategory" size="s">
          {value}
        </EuiText>
      );
    },
  },
  {
    field: '_source.host.name',
    name: 'host.name',
    sortable: false,
    truncateText: false,
    dataType: 'string',
    width: '40px',
    render: (value: string) => {
      return value == null ? (
        getEmptyTagValue()
      ) : (
        <EuiText data-test-subj="hostName" size="s">
          {value}
        </EuiText>
      );
    },
  },
  {
    align: 'right',
    width: '10px',
    isExpander: true,
    render: (item) => (
      <EuiButtonIcon
        onClick={onToggle(item)}
        aria-label={expandedItems[item._id] ? 'Collapse' : 'Expand'}
        iconType={expandedItems[item._id] ? 'arrowUp' : 'arrowDown'}
      />
    ),
  },
];
