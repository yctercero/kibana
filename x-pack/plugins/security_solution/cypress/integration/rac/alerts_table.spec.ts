/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SHOWING_ALERTS } from '../../screens/alerts';

import { waitForAlertsPanelToBeLoaded } from '../../tasks/alerts';
import { createReferenceRuleActivated, deleteCustomRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { loginAndWaitForPage } from '../../tasks/login';
import { refreshPage } from '../../tasks/security_header';

import { ALERTS_URL } from '../../urls/navigation';

describe.only('Closing alerts', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPage(ALERTS_URL);
    // waitForAlertsPanelToBeLoaded();
    // waitForAlertsAsDataIndexToBeCreated();
    createReferenceRuleActivated();
    waitForAlertsToPopulate(2);
    deleteCustomRule();
  });

  it('Displays alerts', () => {
    cy.get(SHOWING_ALERTS).should('have.text', `Showing 1 alert`);
  });
});
