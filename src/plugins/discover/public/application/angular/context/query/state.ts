/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

<<<<<<< HEAD
=======
<<<<<<< HEAD:packages/kbn-test/src/functional_test_runner/lib/config/__fixtures__/config.2.js
export default async function ({ readConfigFile }) {
  const config1 = await readConfigFile(require.resolve('./config.1.js'));

  return {
    testFiles: [...config1.get('testFiles'), 'config.2'],
=======
>>>>>>> [Discover] Migrate remaining context files from js to ts (#99019)
import { LoadingStatus, LoadingStatusState } from '../../context_app_state';

export function createInitialLoadingStatusState(): LoadingStatusState {
  return {
    anchor: LoadingStatus.UNINITIALIZED,
    predecessors: LoadingStatus.UNINITIALIZED,
    successors: LoadingStatus.UNINITIALIZED,
<<<<<<< HEAD
=======
>>>>>>> [Discover] Migrate remaining context files from js to ts (#99019):src/plugins/discover/public/application/angular/context/query/state.ts
>>>>>>> [Discover] Migrate remaining context files from js to ts (#99019)
  };
}
