/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiIconTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiEmptyPrompt,
  EuiPanel,
  EuiRadioGroup,
  EuiLoadingLogo,
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import { useExceptionLists } from '@kbn/securitysolution-list-hooks';

import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { Action } from './reducer';
import * as i18n from './translations';
import { useKibana } from '../../../lib/kibana';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../../../../common/endpoint/service/artifacts/constants';

interface ExceptionsAddToListsComponentProps {
  addExceptionToRule: boolean;
  ruleName: string;
  dispatch: React.Dispatch<Action>;
}

const SectionHeader = styled(EuiTitle)`
  ${({ theme }) => css`
    font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  `}
`;

const columns = [
  {
    field: 'name',
    name: 'Name',
    sortable: true,
    'data-test-subj': 'exceptionListNameCell',
  },
  {
    field: 'a',
    name: '# of rules linked to',
    sortable: false,
    'data-test-subj': 'exceptionListRulesLinkedToIdCell',
  },
  //  Uncomment once exception list details view is available
  // {
  //   name: 'Actions',
  //   actions: [
  //     {
  //       'data-test-subj': 'exceptionListAction-view',
  //       render: () => {
  //         return (
  //           <EuiLink color="primary" href="#" target="_blank" external>
  //             {i18n.VIEW_LIST_DETAIL_ACTION}
  //           </EuiLink>
  //         );
  //       },
  //     },
  //   ],
  // },
];

const ExceptionsAddToListsComponent: React.FC<ExceptionsAddToListsComponentProps> = ({
  addExceptionToRule,
  ruleName,
  dispatch,
}): JSX.Element => {
  const { http, notifications } = useKibana().services;
  const [_, setSelection] = useState<ExceptionListSchema[]>([]);
  const [listsToDisplay, setListsToDisplay] = useState<ExceptionListSchema[]>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0 });
  const [message, setMessage] = useState<JSX.Element | string>(
    <EuiEmptyPrompt
      title={<h3>{i18n.ADD_TO_LIST_EMPTY_TITLE}</h3>}
      titleSize="xs"
      body={i18n.ADD_TO_LIST_EMPTY_BODY}
    />
  );

  const [loadingLists, lists] = useExceptionLists({
    errorMessage: i18n.ERROR_EXCEPTION_LISTS,
    filterOptions: undefined,
    http,
    namespaceTypes: ['single', 'agnostic'],
    notifications,
    initialPagination: {
      page: 1,
      perPage: 2000,
      total: 0,
    },
    hideLists: ALL_ENDPOINT_ARTIFACT_LIST_IDS,
  });

  useEffect(() => {
    if (loadingLists) {
      setMessage(<EuiEmptyPrompt icon={<EuiLoadingLogo logo="logoKibana" size="m" />} />);
      setListsToDisplay([]);
    } else {
      setListsToDisplay(lists.filter((list) => list.type === 'detection'));
    }
  }, [setMessage, loadingLists, lists]);

  /**
   * Reducer action dispatchers
   * */
  const setAddExceptionToRule = useCallback(
    (addExceptionToRule: boolean): void => {
      dispatch({
        type: 'setAddExceptionToRule',
        addExceptionToRule,
      });
    },
    [dispatch]
  );

  const setListsToAddExceptionTo = useCallback(
    (lists: ExceptionListSchema[]): void => {
      dispatch({
        type: 'setAddExceptionToLists',
        listsToAddTo: lists,
      });
    },
    [dispatch]
  );

  const handleRadioChange = useCallback(
    (id: string) => {
      if (id === 'add_to_rule') {
        setAddExceptionToRule(true);
      } else {
        setAddExceptionToRule(false);
      }
    },
    [setAddExceptionToRule]
  );

  const RADIO_OPTIONS = useMemo(
    () => [
      {
        id: 'add_to_rule',
        label: i18n.ADD_TO_RULE_RADIO_OPTION(ruleName),
      },
      {
        id: 'add_to_lists',
        label: (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText>{i18n.ADD_TO_LISTS_OPTION}</EuiText>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={
                  listsToDisplay.length === 0
                    ? i18n.ADD_TO_LISTS_OPTION_DISABLED_TOOLTIP
                    : i18n.ADD_TO_LISTS_OPTION_TOOLTIP
                }
                title={i18n.ADD_TO_LISTS_OPTION_TOOLTIP_TITLE}
                position="top"
                type="iInCircle"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        disabled: listsToDisplay.length === 0,
      },
    ],
    [listsToDisplay.length, ruleName]
  );

  const selectionValue = {
    onSelectionChange: (selection: ExceptionListSchema[]) => {
      setSelection(selection);
      setListsToAddExceptionTo(selection);
    },
    initialSelected: [],
  };

  return (
    <EuiPanel paddingSize="none" hasShadow={false}>
      <SectionHeader size="xs">
        <h3>{i18n.ADD_TO_LISTS_SECTION_TITLE}</h3>
      </SectionHeader>
      <EuiSpacer size="s" />
      <EuiRadioGroup
        options={RADIO_OPTIONS}
        idSelected={addExceptionToRule ? 'add_to_rule' : 'add_to_lists'}
        onChange={handleRadioChange}
        name={i18n.ADD_TO_LISTS_SECTION_TITLE}
      />
      {!addExceptionToRule && (
        <>
          <EuiSpacer size="s" />
          <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
            <>
              <EuiText size="s">{i18n.ADD_TO_LISTS_DESCRIPTION}</EuiText>
              <EuiSpacer size="s" />
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiText data-test-subj="fields-showing" size="xs">
                    {i18n.showSelectedLists(listsToDisplay.length)}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiInMemoryTable<ExceptionListSchema>
                compressed
                tableCaption="List of exception lists"
                itemId="list_id"
                items={listsToDisplay}
                loading={loadingLists}
                message={message}
                columns={columns}
                pagination={{
                  ...pagination,
                  pageSizeOptions: [5, 10, 0],
                }}
                onTableChange={({ page: { index } }) => setPagination({ pageIndex: index })}
                sorting={true}
                selection={selectionValue}
                isSelectable={true}
              />
            </>
          </EuiPanel>
        </>
      )}
    </EuiPanel>
  );
};

export const ExceptionsAddToLists = React.memo(ExceptionsAddToListsComponent);

ExceptionsAddToLists.displayName = 'ExceptionsAddToLists';
