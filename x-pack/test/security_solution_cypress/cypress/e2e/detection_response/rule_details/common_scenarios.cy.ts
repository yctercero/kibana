/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { deleteRuleFromDetailsPage } from '../../../tasks/alerts_detection_rules';
import {
  CUSTOM_RULES_BTN,
  RULES_MANAGEMENT_TABLE,
  RULES_ROW,
} from '../../../screens/alerts_detection_rules';
import { createRule } from '../../../tasks/api_calls/rules';
import { ruleDetailsUrl } from '../../../urls/navigation';
import {
  confirmRuleDetailsDefinition,
  confirmRuleDetailsAbout,
  confirmRuleDetailsSchedule,
} from '../../../tasks/rule_details';
import { getTimeline } from '../../../objects/timeline';
import { getExistingRule, getNewRule } from '../../../objects/rule';

import { RULE_NAME_HEADER, RULE_SWITCH } from '../../../screens/rule_details';

import { createTimeline } from '../../../tasks/api_calls/timelines';
import { cleanKibana, deleteAlertsAndRules, deleteConnectors } from '../../../tasks/common';
import { login, visitWithoutDateRange } from '../../../tasks/login';

// This test is meant to test all common aspects of the rule details page that should function
// the same regardless of rule type. For any rule type specific functionalities, please include
// them in the relevant /rule_details/[RULE_TYPE].cy.ts test.
describe('Common scenarios', { tags: ['@ess', '@serverless'] }, () => {
  const rule = getNewRule({
    author: ['elastic'],
    note: 'Investigation guide notes',
    references: ['http://example.com/', 'https://example.com/'],
    false_positives: ['False1', 'False2'],
    tags: ['test', 'newRule'],
    investigation_fields: {
      field_names: ['agent.hostname'],
    },
    license: 'CA',
    index: ['auditbeat-*'],
    interval: '5m',
  });

  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    deleteConnectors();
    login();
    cy.intercept('GET', '/api/detection_engine/rules?id*').as('getRule');
    createTimeline(getTimeline()).then((response) => {
      createRule({
        ...rule,
        timeline_id: response.body.data.persistTimeline.timeline.savedObjectId,
        timeline_title: response.body.data.persistTimeline.timeline.title ?? '',
      }).then((newRule) => {
        visitWithoutDateRange(ruleDetailsUrl(newRule.body.id));
      });
    });
  });

  it('Only modifies rule active status on enable/disable', () => {
    cy.get(RULE_NAME_HEADER).should('contain', rule.name);

    cy.intercept('POST', '/api/detection_engine/rules/_bulk_action?dry_run=false').as(
      'bulk_action'
    );
    cy.get(RULE_SWITCH).should('be.visible');
    cy.get(RULE_SWITCH).click();
    cy.wait('@bulk_action').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.wrap(response?.body.attributes.results.updated[0].max_signals).should(
        'eql',
        getExistingRule().max_signals
      );
      cy.wrap(response?.body.attributes.results.updated[0].enabled).should('eql', true);
    });
  });

  it('Displays rule details', function () {
    cy.wait('@getRule').then(({ response }) => {
      const ruleToCheck = response?.body;
      cy.log('Checking about section');
      cy.get(RULE_NAME_HEADER).should('contain', ruleToCheck.name);
      confirmRuleDetailsAbout(ruleToCheck);

      cy.log('Checking definition section');
      confirmRuleDetailsDefinition(ruleToCheck as RuleResponse);

      cy.log('Checking schedule section');
      confirmRuleDetailsSchedule(ruleToCheck as RuleResponse);
    });
  });

  it('Deletes one rule from detail page', () => {
    cy.intercept('POST', '/api/detection_engine/rules/_bulk_delete').as('deleteRule');

    deleteRuleFromDetailsPage();

    // @ts-expect-error update types
    cy.waitFor('@deleteRule').then(() => {
      cy.get(RULES_MANAGEMENT_TABLE).should('exist');
      cy.get(RULES_MANAGEMENT_TABLE).find(RULES_ROW).should('have.length', 0);
      cy.request({ url: '/api/detection_engine/rules/_find' }).then(({ body }) => {
        const numberOfRules = body.data.length;
        expect(numberOfRules).to.eql(0);
      });
      cy.get(CUSTOM_RULES_BTN).should('have.text', `Custom rules (${0})`);
    });
  });
});
