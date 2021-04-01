/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsActions } from './alerts';

const version = '1.0.0-zeta1';

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((spaceId: any) => {
    test(`spaceId of ${JSON.stringify(spaceId)} throws error`, () => {
      const alertsActions = new AlertsActions(version);
      expect(() =>
        alertsActions.get(spaceId, 'my-solution', 'operation')
      ).toThrowErrorMatchingSnapshot();
    });
  });

  [null, undefined, '', 1, true, {}].forEach((operation: any) => {
    test(`operation of ${JSON.stringify(operation)} throws error`, () => {
      const alertsActions = new AlertsActions(version);
      expect(() =>
        alertsActions.get('my-space', 'my-solution', operation)
      ).toThrowErrorMatchingSnapshot();
    });
  });

  [null, '', 1, true, undefined, {}].forEach((owner: any) => {
    test(`owner of ${JSON.stringify(owner)} throws error`, () => {
      const alertsActions = new AlertsActions(version);
      expect(() =>
        alertsActions.get('my-space', owner, 'operation')
      ).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns `alerts:${version}:${spaceId}:${owner}/${operation}`', () => {
    const alertsActions = new AlertsActions(version);
    expect(alertsActions.get('my-space', 'my-solution', 'bar-operation')).toBe(
      'alerts:1.0.0-zeta1:my-space:my-solution/bar-operation'
    );
  });
});
