/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiCallOut, EuiComboBox, EuiFormRow, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { getExceptionBuilderComponentLazy } from '@kbn/lists-plugin/public';
import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  ExceptionListType,
  OsTypeArray,
} from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionsBuilderExceptionItem } from '@kbn/securitysolution-list-utils';
import type { DataViewBase } from '@kbn/es-query';
import styled, { css } from 'styled-components';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import { hasEqlSequenceQuery, isEqlRule } from '../../../../../common/detection_engine/utils';
import type { Rule } from '../../../../detections/containers/detection_engine/rules/types';

import { useKibana } from '../../../lib/kibana';
import type { Action } from './reducer';
import * as i18n from './translations';
import * as sharedI18n from '../translations';

const OS_OPTIONS: Array<EuiComboBoxOptionOption<OsTypeArray>> = [
  {
    label: sharedI18n.OPERATING_SYSTEM_WINDOWS,
    value: ['windows'],
  },
  {
    label: sharedI18n.OPERATING_SYSTEM_MAC,
    value: ['macos'],
  },
  {
    label: sharedI18n.OPERATING_SYSTEM_LINUX,
    value: ['linux'],
  },
  {
    label: sharedI18n.OPERATING_SYSTEM_WINDOWS_AND_MAC,
    value: ['windows', 'macos'],
  },
];

const SectionHeader = styled(EuiTitle)`
  ${() => css`
    font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  `}
`;

interface ExceptionsFlyoutMetaComponentProps {
  exceptionItemName: string;
  allowLargeValueLists: boolean;
  exceptionListItems: ExceptionsBuilderExceptionItem[];
  indexPatterns: DataViewBase;
  maybeRule: Rule | null;
  dispatch: React.Dispatch<Action>;
  showOsTypeOptions: boolean;
  selectedOs: OsTypeArray | undefined;
  isEndpointException: boolean;
  handleFilterIndexPatterns: (
    patterns: DataViewBase,
    type: ExceptionListType,
    osTypes?: Array<'linux' | 'macos' | 'windows'> | undefined
  ) => DataViewBase;
}

const ExceptionsConditionsComponent: React.FC<ExceptionsFlyoutMetaComponentProps> = ({
  exceptionItemName,
  allowLargeValueLists,
  isEndpointException,
  exceptionListItems,
  indexPatterns,
  maybeRule,
  dispatch,
  handleFilterIndexPatterns,
  showOsTypeOptions,
  selectedOs,
}): JSX.Element => {
  const { http, unifiedSearch } = useKibana().services;

  const isRuleEQLSequenceStatement = useMemo((): boolean => {
    if (maybeRule != null) {
      return isEqlRule(maybeRule.type) && hasEqlSequenceQuery(maybeRule.query);
    }
    return false;
  }, [maybeRule]);

  /**
   * Reducer action dispatchers
   * */
  const setExceptionItemsToAdd = useCallback(
    (items: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>): void => {
      dispatch({
        type: 'setExceptionItems',
        items,
      });
    },
    [dispatch]
  );

  const setErrorsExist = useCallback(
    (errorExists: boolean): void => {
      dispatch({
        type: 'setErrorsExist',
        errorExists,
      });
    },
    [dispatch]
  );

  const setSelectedOs = useCallback(
    (os: OsTypeArray | undefined): void => {
      dispatch({
        type: 'setSelectedOsOptions',
        selectedOs: os,
      });
    },
    [dispatch]
  );

  const handleBuilderOnChange = useCallback(
    ({
      exceptionItems,
      errorExists,
    }: {
      exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>;
      errorExists: boolean;
    }) => {
      setExceptionItemsToAdd(exceptionItems);
      setErrorsExist(errorExists);
    },
    [setErrorsExist, setExceptionItemsToAdd]
  );

  const handleOSSelectionChange = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<OsTypeArray>>): void => {
      const os = selectedOptions[0].value;
      setSelectedOs(os ? os : undefined);
    },
    [setSelectedOs]
  );

  const osSingleSelectionOptions = useMemo(() => {
    return { asPlainText: true };
  }, []);

  const selectedOStoOptions = useMemo((): Array<EuiComboBoxOptionOption<OsTypeArray>> => {
    return OS_OPTIONS.filter((option) => {
      return selectedOs === option.value;
    });
  }, [selectedOs]);

  const isExceptionBuilderFormDisabled = useMemo(() => {
    return showOsTypeOptions && selectedOs === undefined;
  }, [showOsTypeOptions, selectedOs]);

  return (
    <>
      <SectionHeader size="xs">
        <h3>{i18n.RULE_EXCEPTION_CONDITIONS}</h3>
      </SectionHeader>
      {isRuleEQLSequenceStatement && (
        <>
          <EuiCallOut
            data-test-subj="eql-sequence-callout"
            title={i18n.ADD_EXCEPTION_SEQUENCE_WARNING}
          />
          <EuiSpacer />
        </>
      )}
      <EuiSpacer size="s" />
      <EuiText size="s">{i18n.EXCEPTION_BUILDER_INFO}</EuiText>
      <EuiSpacer size="s" />
      {showOsTypeOptions && (
        <>
          <EuiFormRow label={sharedI18n.OPERATING_SYSTEM_LABEL}>
            <EuiComboBox
              placeholder={i18n.OPERATING_SYSTEM_PLACEHOLDER}
              singleSelection={osSingleSelectionOptions}
              options={OS_OPTIONS}
              selectedOptions={selectedOStoOptions}
              onChange={handleOSSelectionChange}
              isClearable={false}
              data-test-subj="os-selection-dropdown"
            />
          </EuiFormRow>
          <EuiSpacer size="l" />
        </>
      )}
      {getExceptionBuilderComponentLazy({
        allowLargeValueLists,
        httpService: http,
        autocompleteService: unifiedSearch.autocomplete,
        exceptionListItems,
        listType: isEndpointException
          ? ExceptionListTypeEnum.ENDPOINT
          : ExceptionListTypeEnum.DETECTION,
        osTypes: selectedOs,
        listId: isEndpointException ? ENDPOINT_LIST_ID : undefined,
        listNamespaceType: isEndpointException ? 'agnostic' : undefined,
        listTypeSpecificIndexPatternFilter: handleFilterIndexPatterns,
        exceptionItemName,
        indexPatterns,
        isOrDisabled: isExceptionBuilderFormDisabled,
        isAndDisabled: isExceptionBuilderFormDisabled,
        isNestedDisabled: isExceptionBuilderFormDisabled,
        dataTestSubj: 'alert-exception-builder',
        idAria: 'alert-exception-builder',
        onChange: handleBuilderOnChange,
        isDisabled: isExceptionBuilderFormDisabled,
      })}
    </>
  );
};

export const ExceptionsConditions = React.memo(ExceptionsConditionsComponent);

ExceptionsConditions.displayName = 'ExceptionsConditions';
