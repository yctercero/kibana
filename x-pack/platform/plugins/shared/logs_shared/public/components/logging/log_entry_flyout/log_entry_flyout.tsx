/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTextColor,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { OverlayRef } from '@kbn/core/public';
import type { Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import React, { useCallback, useEffect, useRef } from 'react';
import { TimeKey } from '@kbn/io-ts-utils';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { LogViewReference } from '../../../../common/log_views';
import { useLogEntry } from '../../../containers/logs/log_entry';
import { CenteredEuiFlyoutBody } from '../../centered_flyout_body';
import { DataSearchErrorCallout } from '../../data_search_error_callout';
import { DataSearchProgress } from '../../data_search_progress';
import { LogEntryActionsMenu } from './log_entry_actions_menu';
import { LogEntryFieldsTable } from './log_entry_fields_table';

export interface LogEntryFlyoutProps {
  logEntryId: string | null | undefined;
  onCloseFlyout: () => void;
  onSetFieldFilter?: (filter: Query, logEntryId: string, timeKey?: TimeKey) => void;
  logViewReference: LogViewReference | null | undefined;
}

export const useLogEntryFlyout = (logViewReference: LogViewReference) => {
  const flyoutRef = useRef<OverlayRef>();
  const {
    services: { http, data, share, uiSettings, application, logsShared },
    overlays: { openFlyout },
  } = useKibanaContextForPlugin();

  const closeLogEntryFlyout = useCallback(() => {
    flyoutRef.current?.close();
  }, []);

  const openLogEntryFlyout = useCallback(
    (logEntryId: string | null | undefined) => {
      const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
        http,
        data,
        share,
        uiSettings,
        application,
        logsShared,
      });

      flyoutRef.current = openFlyout(
        <KibanaReactContextProvider>
          <LogEntryFlyout
            logEntryId={logEntryId}
            onCloseFlyout={closeLogEntryFlyout}
            logViewReference={logViewReference}
          />
        </KibanaReactContextProvider>
      );
    },
    [
      logsShared,
      application,
      closeLogEntryFlyout,
      data,
      http,
      logViewReference,
      openFlyout,
      share,
      uiSettings,
    ]
  );

  useEffect(() => {
    return () => {
      closeLogEntryFlyout();
    };
  }, [closeLogEntryFlyout]);

  return {
    openLogEntryFlyout,
    closeLogEntryFlyout,
  };
};

export const LogEntryFlyout = ({
  logEntryId,
  onCloseFlyout,
  onSetFieldFilter,
  logViewReference,
}: LogEntryFlyoutProps) => {
  const modalTitleId = useGeneratedHtmlId();

  const {
    cancelRequest: cancelLogEntryRequest,
    errors: logEntryErrors,
    fetchLogEntry,
    isRequestRunning,
    loaded: logEntryRequestProgress,
    logEntry,
    total: logEntryRequestTotal,
  } = useLogEntry({
    logViewReference,
    logEntryId,
  });

  const {
    services: {
      logsShared: { LogAIAssistant },
    },
  } = useKibanaContextForPlugin();

  useEffect(() => {
    if (logViewReference && logEntryId) {
      fetchLogEntry();
    }
  }, [fetchLogEntry, logViewReference, logEntryId]);

  return (
    <EuiFlyout onClose={onCloseFlyout} size="m" aria-labelledby={modalTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id={modalTitleId}>
                <FormattedMessage
                  defaultMessage="Details for log entry {logEntryId}"
                  id="xpack.logsShared.logFlyout.flyoutTitle"
                  values={{
                    logEntryId: logEntryId ? <code>{logEntryId}</code> : '',
                  }}
                />
              </h3>
            </EuiTitle>
            {logEntry ? (
              <>
                <EuiSpacer size="s" />
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.logsShared.logFlyout.flyoutSubTitle"
                    defaultMessage="From index {indexName}"
                    values={{
                      indexName: <code>{logEntry.index}</code>,
                    }}
                  />
                </EuiTextColor>
              </>
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem style={{ padding: 8 }} grow={false}>
            {logEntry ? <LogEntryActionsMenu logEntry={logEntry} /> : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      {isRequestRunning ? (
        <CenteredEuiFlyoutBody>
          <div style={{ width: '75%' }}>
            <DataSearchProgress
              label={loadingProgressMessage}
              maxValue={logEntryRequestTotal}
              onCancel={cancelLogEntryRequest}
              value={logEntryRequestProgress}
            />
          </div>
        </CenteredEuiFlyoutBody>
      ) : logEntry ? (
        <EuiFlyoutBody
          banner={
            (logEntryErrors?.length ?? 0) > 0 ? (
              <DataSearchErrorCallout
                title={loadingErrorCalloutTitle}
                errors={logEntryErrors ?? []}
                onRetry={fetchLogEntry}
              />
            ) : undefined
          }
        >
          <EuiFlexGroup direction="column" gutterSize="m">
            {LogAIAssistant && (
              <EuiFlexItem grow={false}>
                <LogAIAssistant doc={logEntry} />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <LogEntryFieldsTable logEntry={logEntry} onSetFieldFilter={onSetFieldFilter} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      ) : (
        <CenteredEuiFlyoutBody>
          <div style={{ width: '75%' }}>
            <DataSearchErrorCallout
              title={loadingErrorCalloutTitle}
              errors={logEntryErrors ?? []}
              onRetry={fetchLogEntry}
            />
          </div>
        </CenteredEuiFlyoutBody>
      )}
    </EuiFlyout>
  );
};

// eslint-disable-next-line import/no-default-export
export default LogEntryFlyout;

const loadingProgressMessage = i18n.translate('xpack.logsShared.logFlyout.loadingMessage', {
  defaultMessage: 'Searching log entry in shards',
});

const loadingErrorCalloutTitle = i18n.translate(
  'xpack.logsShared.logFlyout.loadingErrorCalloutTitle',
  {
    defaultMessage: 'Error while searching the log entry',
  }
);
