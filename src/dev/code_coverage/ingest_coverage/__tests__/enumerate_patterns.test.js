/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { enumeratePatterns } from '../team_assignment/enumerate_patterns';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';

const log = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

describe(`enumeratePatterns`, () => {
  it(`should resolve x-pack/platform/plugins/shared/screenshotting/server/browsers/extract/unzip.ts to kibana-screenshotting`, () => {
    const actual = enumeratePatterns(REPO_ROOT)(log)(
      new Map([['x-pack/platform/plugins/shared/screenshotting', ['kibana-screenshotting']]])
    );

    expect(actual.flat()).toContain(
      'x-pack/platform/plugins/shared/screenshotting/server/browsers/extract/unzip.ts kibana-screenshotting'
    );
  });
  it(`should resolve src/platform/plugins/shared/charts/common/static/color_maps/color_maps.ts to kibana-app`, () => {
    const actual = enumeratePatterns(REPO_ROOT)(log)(
      new Map([['src/platform/plugins/shared/charts/common/static/color_maps', ['kibana-app']]])
    );

    expect(actual.flat()).toContain(
      'src/platform/plugins/shared/charts/common/static/color_maps/color_maps.ts kibana-app'
    );
  });
});
