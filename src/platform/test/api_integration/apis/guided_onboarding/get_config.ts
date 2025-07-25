/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { API_BASE_PATH } from '@kbn/guided-onboarding-plugin/common';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../ftr_provider_context';

const getConfigsPath = `${API_BASE_PATH}/configs`;
export default function testGetGuideConfig({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe(`GET ${getConfigsPath}`, () => {
    // check that production guides are present
    ['siem'].map((guideId) => {
      it(`returns config for ${guideId}`, async () => {
        const response = await supertest
          .get(`${getConfigsPath}/${guideId}`)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .expect(200);
        expect(response.body).not.to.be.empty();
        const { config } = response.body;
        expect(config).to.not.be.empty();
      });
    });
  });
}
