/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiAccordion, EuiSpacer, EuiTitle } from '@elastic/eui';
import styled, { css } from 'styled-components';

import { Action } from './reducer';
import * as i18n from './translations';
import { AddExceptionComments } from '../add_exception_comments';

const SectionHeader = styled(EuiTitle)`
  ${({ theme }) => css`
    font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  `}
`;

interface ExceptionsFlyoutMetaComponentProps {
  existingComments?: Comment[];
  newComment:  string;
  dispatch:  React.Dispatch<Action>;
}

const ExceptionsFlyoutCommentsComponent: React.FC<ExceptionsFlyoutMetaComponentProps> = ({
  existingComments = [],
  newComment,
  dispatch,
}): JSX.Element => {
  /** 
   * Reducer action dispatchers
  * */ 
   const setComment = useCallback(
    (comment: string): void => {
      dispatch({
        type: 'setComment',
        comment,
      });
    },
    [dispatch]
  );

  return (
    <EuiAccordion
      id="exceptionFlyoutCommentAccordion"
      buttonContent={
        <SectionHeader size="xs">
          <h3>{i18n.COMMENTS_SECTION_TITLE(existingComments.length)}</h3>
        </SectionHeader>
      }
    >
      <>
        <EuiSpacer size='s' />
        <AddExceptionComments
          exceptionItemComments={existingComments}
          newCommentValue={newComment}
          newCommentOnChange={setComment}
        />
      </>
    </EuiAccordion>
  );
};

export const ExceptionsFlyoutComments = React.memo(ExceptionsFlyoutCommentsComponent);

ExceptionsFlyoutComments.displayName = 'ExceptionsFlyoutComments';
