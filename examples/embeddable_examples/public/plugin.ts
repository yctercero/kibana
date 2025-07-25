/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DashboardStart } from '@kbn/dashboard-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { ADD_PANEL_TRIGGER, UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import { setupApp } from './app/setup_app';
import { DATA_TABLE_ID } from './react_embeddables/data_table/constants';
import { registerCreateDataTableAction } from './react_embeddables/data_table/create_data_table_action';
import {
  ADD_EUI_MARKDOWN_ACTION_ID,
  EUI_MARKDOWN_ID,
} from './react_embeddables/eui_markdown/constants';
import { FIELD_LIST_ID } from './react_embeddables/field_list/constants';
import { registerCreateFieldListAction } from './react_embeddables/field_list/create_field_list_action';
import { registerFieldListPanelPlacementSetting } from './react_embeddables/field_list/register_field_list_embeddable';
import { registerCreateSavedBookAction } from './react_embeddables/saved_book/create_saved_book_action';
import { registerAddSearchPanelAction } from './react_embeddables/search/register_add_search_panel_action';
import { registerSearchEmbeddable } from './react_embeddables/search/register_search_embeddable';
import { setKibanaServices } from './kibana_services';
import { setupBookEmbeddable } from './react_embeddables/saved_book/setup_book_embeddable';

export interface SetupDeps {
  contentManagement: ContentManagementPublicSetup;
  developerExamples: DeveloperExamplesSetup;
  embeddable: EmbeddableSetup;
  uiActions: UiActionsSetup;
}

export interface StartDeps {
  contentManagement: ContentManagementPublicStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewFieldEditor: DataViewFieldEditorStart;
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  fieldFormats: FieldFormatsStart;
  dashboard: DashboardStart;
}

export class EmbeddableExamplesPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(
    core: CoreSetup<StartDeps>,
    { contentManagement, embeddable, developerExamples }: SetupDeps
  ) {
    setupApp(core, developerExamples);

    const startServicesPromise = core.getStartServices();

    embeddable.registerReactEmbeddableFactory(FIELD_LIST_ID, async () => {
      const { getFieldListFactory } = await import(
        './react_embeddables/field_list/field_list_embeddable'
      );
      const [coreStart, deps] = await startServicesPromise;
      return getFieldListFactory(coreStart, deps);
    });

    embeddable.registerReactEmbeddableFactory(EUI_MARKDOWN_ID, async () => {
      const { markdownEmbeddableFactory } = await import(
        './react_embeddables/eui_markdown/eui_markdown_react_embeddable'
      );
      return markdownEmbeddableFactory;
    });

    embeddable.registerReactEmbeddableFactory(DATA_TABLE_ID, async () => {
      const { getDataTableFactory } = await import(
        './react_embeddables/data_table/data_table_react_embeddable'
      );
      const [coreStart, deps] = await startServicesPromise;
      return getDataTableFactory(coreStart, deps);
    });

    setupBookEmbeddable(core, embeddable, contentManagement);

    registerSearchEmbeddable(
      embeddable,
      new Promise((resolve) => startServicesPromise.then(([_, startDeps]) => resolve(startDeps)))
    );
  }

  public start(core: CoreStart, deps: StartDeps) {
    setKibanaServices(core, deps);

    registerCreateFieldListAction(deps.uiActions);
    registerFieldListPanelPlacementSetting(deps.dashboard);

    deps.uiActions.registerActionAsync(ADD_EUI_MARKDOWN_ACTION_ID, async () => {
      const { createEuiMarkdownAction } = await import(
        './react_embeddables/eui_markdown/create_eui_markdown_action'
      );
      return createEuiMarkdownAction();
    });
    deps.uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_EUI_MARKDOWN_ACTION_ID);
    if (deps.uiActions.hasTrigger('ADD_CANVAS_ELEMENT_TRIGGER')) {
      // Because Canvas is not enabled in Serverless, this trigger might not be registered - only attach
      // the create action if the Canvas-specific trigger does indeed exist.
      deps.uiActions.attachAction('ADD_CANVAS_ELEMENT_TRIGGER', ADD_EUI_MARKDOWN_ACTION_ID);
    }

    registerAddSearchPanelAction(deps.uiActions);

    registerCreateDataTableAction(deps.uiActions);

    registerCreateSavedBookAction(deps.uiActions, core);
  }

  public stop() {}
}
