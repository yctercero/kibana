/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { ExampleContext } from '../../../../test/context_example';

import { ToolbarSettings, ToolbarSettingsComponent } from '../toolbar_settings';

const style = {
  width: 256,
  height: 124,
  padding: 16,
  border: '1px solid #ccc',
  background: '#fff',
};

export default {
  title: 'shareables/Footer/Settings/ToolbarSettings',
};

export const Contextual = {
  render: () => (
    <ExampleContext {...{ style }}>
      <ToolbarSettings onSetAutohide={action('onSetAutohide')} />
    </ExampleContext>
  ),

  name: 'contextual',
};

export const ComponentOn = {
  render: () => (
    <ExampleContext {...{ style }}>
      <ToolbarSettingsComponent isAutohide={true} onSetAutohide={action('onSetAutohide')} />
    </ExampleContext>
  ),

  name: 'component: on',
};

export const ComponentOff = {
  render: () => (
    <ExampleContext {...{ style }}>
      <ToolbarSettingsComponent isAutohide={false} onSetAutohide={action('onSetAutohide')} />
    </ExampleContext>
  ),

  name: 'component: off',
};
