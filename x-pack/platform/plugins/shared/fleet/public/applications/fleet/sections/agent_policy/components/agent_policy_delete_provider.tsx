/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import { EuiConfirmModal, EuiCallOut, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useHistory } from 'react-router-dom';

import { SO_SEARCH_LIMIT } from '../../../../../constants';
import { useMultipleAgentPolicies } from '../../../hooks';

import {
  useStartServices,
  useConfig,
  useLink,
  useDeleteAgentPolicyMutation,
  sendGetAgents,
} from '../../../hooks';

import type { AgentPolicy, PackagePolicy } from '../../../types';

interface Props {
  children: (deleteAgentPolicy: DeleteAgentPolicy) => React.ReactElement;
  hasFleetServer: boolean;
  packagePolicies?: PackagePolicy[];
  agentPolicy: AgentPolicy;
}

export type DeleteAgentPolicy = (agentPolicy: string, onSuccess?: OnSuccessCallback) => void;

type OnSuccessCallback = (agentPolicyDeleted: string) => void;

export const AgentPolicyDeleteProvider: React.FunctionComponent<Props> = ({
  children,
  hasFleetServer,
  packagePolicies,
  agentPolicy,
}) => {
  const confirmModalTitleId = useGeneratedHtmlId();

  const { notifications } = useStartServices();
  const {
    agents: { enabled: isFleetEnabled },
  } = useConfig();
  const [agentPolicyId, setAgentPolicyId] = useState<string>();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoadingAgentsCount, setIsLoadingAgentsCount] = useState<boolean>(false);
  const [agentsCount, setAgentsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);
  const { getPath } = useLink();
  const history = useHistory();
  const deleteAgentPolicyMutation = useDeleteAgentPolicyMutation();
  const { canUseMultipleAgentPolicies } = useMultipleAgentPolicies();

  const deleteAgentPolicyPrompt: DeleteAgentPolicy = (
    agentPolicyIdToDelete,
    onSuccess = () => undefined
  ) => {
    if (!agentPolicyIdToDelete) {
      throw new Error('No agent policy specified for deletion');
    }
    setIsModalOpen(true);
    setAgentPolicyId(agentPolicyIdToDelete);
    fetchAgentsCount(agentPolicyIdToDelete);
    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setAgentPolicyId(undefined);
    setIsLoading(false);
    setIsLoadingAgentsCount(false);
    setIsModalOpen(false);
  };

  const deleteAgentPolicy = async () => {
    setIsLoading(true);

    try {
      const { data } = await deleteAgentPolicyMutation.mutateAsync({
        agentPolicyId: agentPolicyId!,
      });

      if (data) {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.fleet.deleteAgentPolicy.successSingleNotificationTitle', {
            defaultMessage: "Deleted agent policy ''{id}''",
            values: { id: data.name || data.id },
          })
        );
        if (onSuccessCallback.current) {
          onSuccessCallback.current(agentPolicyId!);
        }
      } else {
        notifications.toasts.addDanger(
          i18n.translate('xpack.fleet.deleteAgentPolicy.failureSingleNotificationTitle', {
            defaultMessage: "Error deleting agent policy ''{id}''",
            values: { id: agentPolicyId },
          })
        );
      }
    } catch (e) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.fleet.deleteAgentPolicy.fatalErrorNotificationTitle', {
          defaultMessage: 'Error deleting agent policy',
        })
      );
    }
    closeModal();
    history.push(getPath('policies_list'));
  };

  const fetchAgentsCount = useCallback(
    async (agentPolicyToCheck: string) => {
      if (!isFleetEnabled || isLoadingAgentsCount) {
        return;
      }
      setIsLoadingAgentsCount(true);
      // filtering out the unenrolled agents assigned to this policy
      const agents = await sendGetAgents({
        showInactive: true,
        kuery: `policy_id:"${agentPolicyToCheck}" and not status: unenrolled`,
        perPage: SO_SEARCH_LIMIT,
      });
      setAgentsCount(agents.data?.total ?? 0);
      setIsLoadingAgentsCount(false);
    },
    [isFleetEnabled, isLoadingAgentsCount]
  );

  const packagePoliciesWithMultiplePolicies = useMemo(() => {
    // Find if there are package policies that have multiple agent policies
    if (packagePolicies && canUseMultipleAgentPolicies) {
      return packagePolicies.some((policy) => policy?.policy_ids.length > 1);
    }
    return false;
  }, [canUseMultipleAgentPolicies, packagePolicies]);

  const renderModal = () => {
    if (!isModalOpen) {
      return null;
    }

    return (
      <EuiConfirmModal
        aria-labelledby={confirmModalTitleId}
        titleProps={{ id: confirmModalTitleId }}
        title={
          <FormattedMessage
            id="xpack.fleet.deleteAgentPolicy.confirmModal.deletePolicyTitle"
            defaultMessage="Delete this agent policy?"
          />
        }
        onCancel={closeModal}
        onConfirm={deleteAgentPolicy}
        cancelButtonText={
          <FormattedMessage
            id="xpack.fleet.deleteAgentPolicy.confirmModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={
          isLoading || isLoadingAgentsCount ? (
            <FormattedMessage
              id="xpack.fleet.deleteAgentPolicy.confirmModal.loadingButtonLabel"
              defaultMessage="Loading…"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.deleteAgentPolicy.confirmModal.confirmButtonLabel"
              defaultMessage="Delete policy"
            />
          )
        }
        buttonColor="danger"
        confirmButtonDisabled={
          isLoading || isLoadingAgentsCount || (!agentPolicy?.supports_agentless && !!agentsCount)
        }
      >
        {packagePoliciesWithMultiplePolicies && (
          <>
            <EuiCallOut
              color="primary"
              iconType="info"
              title={
                <FormattedMessage
                  id="xpack.fleet.deleteAgentPolicy.confirmModal.warningSharedIntegrationPolicies"
                  defaultMessage="Fleet has detected that this policy contains integration policies shared by multiple agent policies. These integration policies won't be deleted."
                />
              }
            />
            <EuiSpacer size="m" />
          </>
        )}
        {isLoadingAgentsCount ? (
          <FormattedMessage
            id="xpack.fleet.deleteAgentPolicy.confirmModal.loadingAgentsCountMessage"
            defaultMessage="Checking amount of affected agents…"
          />
        ) : agentsCount ? (
          <EuiCallOut
            color="danger"
            iconType="warning"
            title={i18n.translate(
              'xpack.fleet.deleteAgentPolicy.confirmModal.affectedAgentsTitle',
              {
                defaultMessage: 'Policy in use',
              }
            )}
          >
            {agentPolicy?.supports_agentless ? (
              <FormattedMessage
                id="xpack.fleet.deleteAgentPolicy.confirmModal.affectedAgentlessMessage"
                defaultMessage="Deleting this agent policy will automatically delete integrations assign to {name} and unenroll elastic agent."
                values={{
                  name: <strong>{agentPolicy.name}</strong>,
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.deleteAgentPolicy.confirmModal.affectedAgentsMessage"
                defaultMessage="{agentsCount, plural, one {# agent is} other {# agents are}} assigned to this agent policy. Unassign these agents before deleting this policy. This might include inactive agents."
                values={{
                  agentsCount,
                }}
              />
            )}
          </EuiCallOut>
        ) : hasFleetServer ? (
          <FormattedMessage
            id="xpack.fleet.deleteAgentPolicy.confirmModal.fleetServerMessage"
            defaultMessage="NOTE: This policy has Fleet Server integration, it is required for using Fleet."
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.deleteAgentPolicy.confirmModal.irreversibleMessage"
            defaultMessage="This action cannot be undone."
          />
        )}
      </EuiConfirmModal>
    );
  };

  return (
    <Fragment>
      {children(deleteAgentPolicyPrompt)}
      {renderModal()}
    </Fragment>
  );
};
