/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Component being re-implemented in 8.5

/* eslint complexity: ["error", 35]*/

import React, { memo, useEffect, useCallback, useMemo, useReducer } from 'react';
import styled, { css } from 'styled-components';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutFooter,
  EuiFlyoutBody,
  EuiButton,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiSpacer,
  EuiFlexGroup,
} from '@elastic/eui';
import type {
  ExceptionListType,
  OsTypeArray,
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';

import { isEqlRule, isThresholdRule } from '../../../../../common/detection_engine/utils';
import type { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import * as i18nCommon from '../../../translations';
import * as i18n from './translations';
import * as sharedI18n from '../translations';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useKibana } from '../../../lib/kibana';
import { Loader } from '../../loader';
import { useAddOrUpdateException } from '../use_add_exception';
import {
  enrichNewExceptionItemsWithComments,
  enrichExceptionItemsWithOS,
  enrichNewExceptionItemsWithName,
  lowercaseHashValues,
  defaultEndpointExceptionItems,
  retrieveAlertOsTypes,
  filterIndexPatterns,
} from '../helpers';
import { ErrorCallout } from '../error_callout';
import type { AlertData } from '../types';
import { useFetchExceptionFlyoutData } from '../common/use_exception_flyout_data';
import { ExceptionsFlyoutMeta } from '../common/exception_flyout_meta';
import type { State } from '../common/reducer';
import { createExceptionItemsReducer } from '../common/reducer';
import { ExceptionsConditions } from '../common/exception_flyout_conditions';
import { ExceptionItemsFlyoutAlertOptions } from '../common/exception_flyout_alerts_option';
import { ExceptionsFlyoutComments } from '../common/exception_flyout_comments';
import { ExceptionsAddToLists } from '../common/exception_flyout_lists_option';

export interface AddExceptionFlyoutProps {
  ruleId: string;
  exceptionListType: ExceptionListType;
  showAlertCloseOptions: boolean;
  alertData?: AlertData;
  /**
   * The components that use this may or may not define `alertData`
   * If they do, they need to fetch it async. In that case `alertData` will be
   * undefined while `isAlertDataLoading` will be true. In the case that `alertData`
   *  is not used, `isAlertDataLoading` will be undefined
   */
  isAlertDataLoading?: boolean;
  alertStatus?: Status;
  onCancel: () => void;
  onConfirm: (didCloseAlert: boolean, didBulkCloseAlert: boolean) => void;
  onRuleChange?: () => void;
}

const FlyoutHeader = styled(EuiFlyoutHeader)`
  ${({ theme }) => css`
    border-bottom: 1px solid ${theme.eui.euiColorLightShade};
  `}
`;

const FlyoutBodySection = styled(EuiFlyoutBody)`
  ${({ theme }) => css`
    &.builder-section {
      overflow-y: scroll;
    }
  `}
`;

const FlyoutFooterGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    padding: ${theme.eui.euiSizeS};
  `}
`;

const initialState: State = {
  exceptionItems: [],
  exceptionItemMeta: { name: '' },
  newComment: '',
  errorsExist: false,
  closeSingleAlert: false,
  bulkCloseAlerts: false,
  disableBulkClose: false,
  bulkCloseIndex: undefined,
  selectedListsToAddTo: [],
  selectedOs: undefined,
  addExceptionToRule: true,
  exceptionListsToAddTo: [],
};

export const AddExceptionFlyout = memo(function AddExceptionFlyout({
  ruleId,
  exceptionListType,
  showAlertCloseOptions,
  alertData,
  isAlertDataLoading,
  onCancel,
  onConfirm,
  onRuleChange,
  alertStatus,
}: AddExceptionFlyoutProps) {
  const { http } = useKibana().services;
  const {
    isLoading,
    rule: maybeRule,
    indexPatterns,
  } = useFetchExceptionFlyoutData({
    ruleId,
  });

  const [
    {
      exceptionItemMeta: { name: exceptionItemName },
      selectedOs,
      exceptionItems,
      disableBulkClose,
      bulkCloseAlerts,
      closeSingleAlert,
      bulkCloseIndex,
      addExceptionToRule,
      newComment,
      errorsExist,
    },
    dispatch,
  ] = useReducer(createExceptionItemsReducer(), { ...initialState });

  const { addError, addSuccess, addWarning } = useAppToasts();

  const hasAlertData = useMemo((): boolean => {
    return alertData !== undefined;
  }, [alertData]);

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

  useEffect((): void => {
    if (exceptionListType === 'endpoint' && hasAlertData) {
      setExceptionItemsToAdd(
        defaultEndpointExceptionItems(ENDPOINT_LIST_ID, maybeRule?.name, alertData)
      );
    }
  }, [exceptionListType, maybeRule?.name, hasAlertData, alertData, setExceptionItemsToAdd]);

  const handleRuleChange = useCallback(
    (ruleChanged: boolean): void => {
      if (ruleChanged && onRuleChange) {
        onRuleChange();
      }
    },
    [onRuleChange]
  );

  const handleDissasociationSuccess = useCallback(
    (id: string): void => {
      handleRuleChange(true);
      addSuccess(sharedI18n.DISSASOCIATE_LIST_SUCCESS(id));
      onCancel();
    },
    [handleRuleChange, addSuccess, onCancel]
  );

  const handleDissasociationError = useCallback(
    (error: Error): void => {
      addError(error, { title: sharedI18n.DISSASOCIATE_EXCEPTION_LIST_ERROR });
      onCancel();
    },
    [addError, onCancel]
  );

  const onError = useCallback(
    (error: Error): void => {
      addError(error, { title: i18n.ADD_EXCEPTION_ERROR });
      onCancel();
    },
    [addError, onCancel]
  );

  const onSuccess = useCallback(
    (updated: number, conflicts: number): void => {
      handleRuleChange(true);
      addSuccess(i18n.ADD_EXCEPTION_SUCCESS);
      onConfirm(closeSingleAlert, bulkCloseAlerts);
      if (conflicts > 0) {
        addWarning({
          title: i18nCommon.UPDATE_ALERT_STATUS_FAILED(conflicts),
          text: i18nCommon.UPDATE_ALERT_STATUS_FAILED_DETAILED(updated, conflicts),
        });
      }
    },
    [addSuccess, addWarning, onConfirm, bulkCloseAlerts, closeSingleAlert, handleRuleChange]
  );

  const [{ isLoading: addExceptionIsLoading }, addOrUpdateExceptionItems] = useAddOrUpdateException(
    {
      http,
      onSuccess,
      onError,
    }
  );

  const osTypesSelection = useMemo((): OsTypeArray => {
    return hasAlertData ? retrieveAlertOsTypes(alertData) : selectedOs ? [...selectedOs] : [];
  }, [hasAlertData, alertData, selectedOs]);

  const enrichExceptionItems = useCallback((): Array<
    ExceptionListItemSchema | CreateExceptionListItemSchema
  > => {
    let enriched: Array<ExceptionListItemSchema | CreateExceptionListItemSchema> = [];
    enriched =
      newComment !== ''
        ? enrichNewExceptionItemsWithComments(exceptionItems, [{ comment: newComment }])
        : exceptionItems;
    if (exceptionListType === 'endpoint') {
      const osTypes = osTypesSelection;
      enriched = lowercaseHashValues(enrichExceptionItemsWithOS(enriched, osTypes));
    }

    if (exceptionItemName.trim() !== '') {
      enriched = enrichNewExceptionItemsWithName(exceptionItems, exceptionItemName);
    }

    return enriched;
  }, [newComment, exceptionItems, exceptionListType, osTypesSelection, exceptionItemName]);

  const onAddExceptionConfirm = useCallback((): void => {
    if (addOrUpdateExceptionItems != null) {
      const alertIdToClose = closeSingleAlert && alertData ? alertData._id : undefined;

      addOrUpdateExceptionItems(
        maybeRule?.rule_id ?? '',
        enrichExceptionItems(),
        alertIdToClose,
        bulkCloseIndex
      );
    }
  }, [
    addOrUpdateExceptionItems,
    maybeRule,
    enrichExceptionItems,
    closeSingleAlert,
    bulkCloseAlerts,
    alertData,
    bulkCloseIndex,
  ]);

  const isSubmitButtonDisabled = useMemo(
    (): boolean =>
      errorsExist != null ||
      exceptionItems.every((item) => item.entries.length === 0) ||
      errorsExist,
    [errorsExist, exceptionItems]
  );

  const addExceptionMessage =
    exceptionListType === 'endpoint' ? i18n.ADD_ENDPOINT_EXCEPTION : i18n.CREATE_RULE_EXCEPTION;

  return (
    <EuiFlyout
      ownFocus
      maskProps={{ style: 'z-index: 5000' }} // For an edge case to display above the timeline flyout
      size="l"
      onClose={onCancel}
      data-test-subj="add-exception-flyout"
    >
      <FlyoutHeader>
        <EuiTitle>
          <h2 data-test-subj="exception-flyout-title">{addExceptionMessage}</h2>
        </EuiTitle>
        <EuiSpacer size="m" />
      </FlyoutHeader>

      {errorsExist && (
        <EuiFlyoutFooter>
          <ErrorCallout
            http={http}
            errorInfo={errorsExist}
            rule={maybeRule}
            onCancel={onCancel}
            onSuccess={handleDissasociationSuccess}
            onError={handleDissasociationError}
            data-test-subj="addExceptionFlyoutErrorCallout"
          />
        </EuiFlyoutFooter>
      )}
      {!errorsExist && isLoading && <Loader data-test-subj="loadingAddExceptionFlyout" size="xl" />}
      {!errorsExist && !isLoading && (
        <FlyoutBodySection>
          <ExceptionsFlyoutMeta exceptionItemName={exceptionItemName} dispatch={dispatch} />
          <EuiHorizontalRule />
          <ExceptionsConditions
            exceptionItemName={exceptionItemName}
            allowLargeValueLists={!isEqlRule(maybeRule?.type) && !isThresholdRule(maybeRule?.type)}
            exceptionListItems={exceptionItems}
            indexPatterns={indexPatterns}
            maybeRule={maybeRule}
            dispatch={dispatch}
            handleFilterIndexPatterns={filterIndexPatterns}
            selectedOs={selectedOs}
            showOsTypeOptions={
              exceptionListType === ExceptionListTypeEnum.ENDPOINT && !hasAlertData
            }
          />
          {exceptionListType !== ExceptionListTypeEnum.ENDPOINT && (
            <>
              <EuiHorizontalRule />
              <ExceptionsAddToLists
                addExceptionToRule={addExceptionToRule}
                ruleName={maybeRule?.name}
                dispatch={dispatch}
              />
            </>
          )}
          {showAlertCloseOptions && !isAlertDataLoading && (
            <>
              <EuiHorizontalRule />
              <ExceptionItemsFlyoutAlertOptions
                exceptionListType={exceptionListType}
                shouldCloseSingleAlert={closeSingleAlert}
                bulkCloseAlerts={bulkCloseAlerts}
                disableBulkClose={disableBulkClose}
                dispatch={dispatch}
                exceptionListItems={exceptionItems}
                alertData={alertData}
                alertStatus={alertStatus}
              />
            </>
          )}
          <EuiHorizontalRule />
          <ExceptionsFlyoutComments newComment={newComment} dispatch={dispatch} />
        </FlyoutBodySection>
      )}
      <EuiFlyoutFooter>
        <FlyoutFooterGroup justifyContent="spaceBetween">
          <EuiButtonEmpty data-test-subj="cancelExceptionAddButton" onClick={onCancel}>
            {i18n.CANCEL}
          </EuiButtonEmpty>

          <EuiButton
            data-test-subj="add-exception-confirm-button"
            onClick={onAddExceptionConfirm}
            isLoading={addExceptionIsLoading}
            isDisabled={isSubmitButtonDisabled}
            fill
          >
            {addExceptionMessage}
          </EuiButton>
        </FlyoutFooterGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
});
