/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';

import { getNewRule } from '../../../objects/rule';
import { getTimeline } from '../../../objects/timeline';
import {
  ABOUT_CONTINUE_BTN,
  ABOUT_EDIT_BUTTON,
  CUSTOM_QUERY_INPUT,
  DEFINE_CONTINUE_BUTTON,
  DEFINE_EDIT_BUTTON,
  RULE_NAME_INPUT,
  SCHEDULE_CONTINUE_BUTTON,
} from '../../../screens/create_new_rule';
import { RULE_NAME_HEADER } from '../../../screens/rule_details';
import { createTimeline } from '../../../tasks/api_calls/timelines';
import { deleteAlertsAndRules } from '../../../tasks/common';
import {
  createDisabledRule,
  fillAboutRule,
  fillTimelineTemplate,
  fillFrom,
  importSavedQuery,
} from '../../../tasks/create_new_rule';
import { login, visit } from '../../../tasks/login';
import {
  confirmRuleDetailsAbout,
  confirmRuleDetailsDefinition,
  confirmRuleDetailsSchedule,
} from '../../../tasks/rule_details';
import { RULE_CREATION } from '../../../urls/navigation';

// This test is meant to test touching all the common various components in rule creation
// to ensure we don't miss any changes that maybe affect one of these more obscure UI components
// in the creation form. For any rule type specific functionalities, please include
// them in the relevant /rule_creation/[RULE_TYPE].cy.ts test.
describe('Common rule creation components', { tags: ['@ess', '@serverless'] }, () => {
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
    timeline_title: 'Comprehensive Network Timeline',
    index: ['auditbeat-*'],
    interval: '5m',
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    createTimeline(getTimeline())
      .then((response) => {
        return response.body.data.persistTimeline.timeline.savedObjectId;
      })
      .as('timelineId');
    login();
    visit(RULE_CREATION);
  });

  it('Creates and enables a rule', function () {
    cy.log('Filling define section');
    importSavedQuery(this.timelineId);
    fillTimelineTemplate(rule);
    cy.get(DEFINE_CONTINUE_BUTTON).click();

    cy.log('Filling about section');
    fillAboutRule(rule);
    cy.get(ABOUT_CONTINUE_BTN).click();

    cy.log('Filling schedule section');
    fillFrom('50000h');
    cy.get(SCHEDULE_CONTINUE_BUTTON).click();

    // expect define step to repopulate
    cy.get(DEFINE_EDIT_BUTTON).click();
    cy.get(CUSTOM_QUERY_INPUT).should('have.value', rule.query);
    cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click();

    // expect about step to populate
    cy.get(ABOUT_EDIT_BUTTON).click();
    cy.get(RULE_NAME_INPUT).invoke('val').should('eql', rule.name);
    cy.get(ABOUT_CONTINUE_BTN).should('exist').click();
    cy.get(SCHEDULE_CONTINUE_BUTTON).click();

    createDisabledRule();

    cy.get(RULE_NAME_HEADER).should('contain', rule.name);

    confirmRuleDetailsAbout(rule as RuleResponse);
    confirmRuleDetailsDefinition(rule as RuleResponse);
    confirmRuleDetailsSchedule(rule as RuleResponse);
  });
});
