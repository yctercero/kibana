/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiConfirmModal, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

interface ConfirmPackageInstallProps {
  onCancel: () => void;
  onConfirm: () => void;
  packageName: string;
  numOfAssets: number;
  numOfTransformAssets: number;
}

import { TransformInstallWithCurrentUserPermissionCallout } from '../../../../../../../components/transform_install_as_current_user_callout';

export const ConfirmPackageInstall = (props: ConfirmPackageInstallProps) => {
  const { onCancel, onConfirm, packageName, numOfAssets, numOfTransformAssets } = props;
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={
        <FormattedMessage
          id="xpack.fleet.integrations.settings.confirmInstallModal.installTitle"
          defaultMessage="Install {packageName}"
          values={{ packageName }}
        />
      }
      titleProps={{ id: modalTitleId }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.integrations.settings.confirmInstallModal.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.fleet.integrations.settings.confirmInstallModal.installButtonLabel"
          defaultMessage="Install {packageName}"
          values={{ packageName }}
        />
      }
      defaultFocusedButton="confirm"
    >
      <EuiCallOut
        iconType="info"
        title={
          <FormattedMessage
            id="xpack.fleet.integrations.settings.confirmInstallModal.installCalloutTitle"
            defaultMessage="This action will install {numOfAssets} assets"
            values={{ numOfAssets }}
          />
        }
      />
      {numOfTransformAssets > 0 ? (
        <>
          <EuiSpacer size="m" />
          <TransformInstallWithCurrentUserPermissionCallout count={numOfTransformAssets} />
        </>
      ) : null}
      <EuiSpacer size="l" />
      <p>
        <FormattedMessage
          id="xpack.fleet.integrations.settings.confirmInstallModal.installDescription"
          defaultMessage="Kibana assets will be installed in the current Space (Default) and will only be accessible to users who have permission to view this Space. Elasticsearch assets are installed globally and will be accessible to all Kibana users."
        />
      </p>
    </EuiConfirmModal>
  );
};
