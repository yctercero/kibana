/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSimpleCustomQueryRule } from '../../../objects/rule';
import { ALERTS_COUNT, ALERT_GRID_CELL } from '../../../screens/alerts';
import { DEFINE_CONTINUE_BUTTON } from '../../../screens/create_new_rule';
import { RULE_NAME_HEADER } from '../../../screens/rule_details';

import { deleteAlertsAndRules } from '../../../tasks/common';
import {
  createEnabledRule,
  createDisabledRule,
  fillScheduleRuleAndContinue,
  fillAboutRuleMinimumAndContinue,
  fillDefineCustomRuleAndContinue,
  fillAlertSuppression,
  fillDefineMinimumCustomRule,
  waitForAlertsToPopulate,
} from '../../../tasks/create_new_rule';
import { login, visit } from '../../../tasks/login';
import {
  confirmAlertSuppressionDetails,
  confirmRuleDetailsAbout,
  confirmRuleDetailsDefinition,
  confirmRuleDetailsSchedule,
  waitForTheRuleToBeExecuted,
} from '../../../tasks/rule_details';
import { RULE_CREATION } from '../../../urls/navigation';

describe('Create custom query rule', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
  });

  describe('Custom detection rules creation', () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      login();
      visit(RULE_CREATION);
    });

    it('Creates and enables a rule', function () {
      const rule = getSimpleCustomQueryRule();

      fillDefineCustomRuleAndContinue(rule);
      fillAboutRuleMinimumAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      createEnabledRule();

      cy.log('Asserting we have a new rule created');
      cy.get(RULE_NAME_HEADER).should('contain', rule.name);
      confirmRuleDetailsAbout(rule);
      confirmRuleDetailsDefinition(rule);
      confirmRuleDetailsSchedule(rule);

      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();

      cy.log('Asserting that alerts have been generated after the creation');
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .should('match', /^[1-9].+$/); // Any number of alerts
      cy.get(ALERT_GRID_CELL).contains(rule.name);
    });

    describe('Alert suppression', () => {
      it('creates rule with default suppression properties', function () {
        const rule = {
          ...getSimpleCustomQueryRule(),
          alert_suppression: {
            group_by: ['agent.name'],
            missing_fields_strategy: 'suppress',
          },
        };

        fillDefineMinimumCustomRule(rule);
        fillAlertSuppression(rule.alert_suppression);
        cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click();
        fillAboutRuleMinimumAndContinue(rule);
        fillScheduleRuleAndContinue(rule);
        createDisabledRule();

        cy.log('Asserting we have a new rule created');
        cy.get(RULE_NAME_HEADER).should('contain', rule.name);
        confirmAlertSuppressionDetails(rule.alert_suppression);
      });

      it('creates rule with non-default suppression properties', function () {
        const rule = {
          ...getSimpleCustomQueryRule(),
          alert_suppression: {
            duration: { unit: 'm', value: 5 },
            group_by: ['agent.name'],
            missing_fields_strategy: 'doNotSuppress',
          },
        };

        fillDefineMinimumCustomRule(rule);
        fillAlertSuppression(rule.alert_suppression);
        cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click();
        fillAboutRuleMinimumAndContinue(rule);
        fillScheduleRuleAndContinue(rule);
        createDisabledRule();

        cy.log('Asserting we have a new rule created');
        cy.get(RULE_NAME_HEADER).should('contain', rule.name);
        confirmAlertSuppressionDetails(rule.alert_suppression);
      });
    });
  });
});
