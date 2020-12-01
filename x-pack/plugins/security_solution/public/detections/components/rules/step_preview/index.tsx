/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo, useState, useCallback } from 'react';
import {
  EuiButton,
  EuiText,
  EuiBasicTable,
  EuiCodeBlock,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiTextColor,
} from '@elastic/eui';

import * as i18n from './translations';
import { StepContentWrapper } from '../step_content_wrapper';
import { NextStep } from '../next_step';
import { usePreviewRule } from './use_preview_rule';
import { getColumns } from './columns';

interface StepPreviewProps {
  isUpdateView: boolean;
  onPreview: () => void;
  onNext: () => void;
}

export const StepPreviewComponent: FC<StepPreviewProps> = ({
  isUpdateView = false,
  onNext,
  onPreview,
}) => {
  const [isLoading, signals, rulePreviewErrors, getSignals] = usePreviewRule();
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );

  const toggleDetails = useCallback(
    (item) => () => {
      setItemIdToExpandedRowMap((curr) => {
        const itemIdToExpandedRowMapValues = { ...curr };
        if (itemIdToExpandedRowMapValues[item._id]) {
          delete itemIdToExpandedRowMapValues[item._id];
        } else {
          itemIdToExpandedRowMapValues[item._id] = (
            <div>
              <EuiCodeBlock
                language="json"
                fontSize="m"
                paddingSize="m"
                overflowHeight={300}
                isCopyable
              >
                {JSON.stringify(item, null, 2)}
              </EuiCodeBlock>
            </div>
          );
        }

        return itemIdToExpandedRowMapValues;
      });
    },
    []
  );

  const parseErrors = useCallback((err) => {
    const message = JSON.stringify(err).split('::');
    return (
      <>
        <EuiText size="s" textAlign="center" color="danger">
          <p>{message[0] ?? 'Error occurred'}</p>
        </EuiText>
      </>
    );
  }, []);

  const columns = useMemo((): EuiBasicTableColumn[] => {
    return getColumns({ expandedItems: itemIdToExpandedRowMap, onToggle: toggleDetails });
  }, [itemIdToExpandedRowMap, toggleDetails]);

  const handleNext = useCallback(() => {
    if (onNext) {
      onNext();
    }
  }, [onNext]);

  const handlePreview = useCallback(async () => {
    const rule = onPreview();
    if (getSignals != null) {
      getSignals(rule);
    }
  }, [getSignals, onPreview]);

  const noItemsMessage = useMemo((): JSX.Element => {
    return (
      <EuiText>
        {rulePreviewErrors == null ? (
          <p>{i18n.NO_SIGNALS_MESSAGE}</p>
        ) : (
          <p>{parseErrors(rulePreviewErrors)}</p>
        )}
      </EuiText>
    );
  }, [parseErrors, rulePreviewErrors]);

  return (
    <>
      <StepContentWrapper addPadding={false}>
        <EuiFlexGroup gutterSize="s" direction="column">
          <EuiFlexItem>
            <EuiFlexGroup
              gutterSize="none"
              direction="row"
              justifyContent="spaceBetween"
              alignItems="flexEnd"
            >
              <EuiFlexItem grow={2}>
                <EuiTitle size="xxs">
                  <h5>{i18n.SIGNALS_TABLE_TITLE}</h5>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton size="s" onClick={handlePreview} isDisabled={isLoading}>
                  {i18n.PREVIEW}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiBasicTable
              loading={isLoading}
              itemId="_id"
              noItemsMessage={noItemsMessage}
              itemIdToExpandedRowMap={itemIdToExpandedRowMap}
              isExpandable={true}
              items={signals}
              rowHeader="firstName"
              columns={columns}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </StepContentWrapper>
      {!isUpdateView && (
        <NextStep dataTestSubj="define-continue" onClick={handleNext} isDisabled={isLoading} />
      )}
    </>
  );
};
