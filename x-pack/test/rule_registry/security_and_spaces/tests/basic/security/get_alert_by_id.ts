/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  superUser,
  globalRead,
  obsOnlySpacesAll,
  obsSecSpacesAll,
  obsSecReadSpacesAll,
  secOnly,
  secOnlyRead,
  noKibanaPrivileges,
  secOnlySpacesAll,
  secOnlyReadSpacesAll,
} from '../../../../common/lib/authentication/users';
import type { User } from '../../../../common/lib/authentication/types';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../../common/lib/authentication/spaces';

/*
 * Note - these tests focus on ensuring that the correct access
 * is granted based on read/all privileges and indices
 * Uses, users with access to default space, for space specific
 * testing see tests in the /spaces folder
 */

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const TEST_URL = '/internal/rac/alerts';
  const ALERTS_INDEX_URL = `${TEST_URL}/index`;
  const APM_ALERT_ID = 'NoxgpHkBqbdrfX07MqXV';
  const SECURITY_SOLUTION_ALERT_ID = '020202';

  const getAPMIndexName = async (user: User) => {
    const {
      body: indexNames,
    }: { body: { index_name: string[] | undefined } } = await supertestWithoutAuth
      .get(`${getSpaceUrlPrefix()}${ALERTS_INDEX_URL}`)
      .auth(user.username, user.password)
      .set('kbn-xsrf', 'true')
      .expect(200);
    const observabilityIndex = indexNames?.index_name?.find(
      (indexName) => indexName === '.alerts-observability-apm'
    );
    expect(observabilityIndex).to.eql('.alerts-observability-apm');
    return observabilityIndex;
  };

  const getSecuritySolutionIndexName = async (user: User) => {
    const {
      body: indexNames,
    }: { body: { index_name: string[] | undefined } } = await supertestWithoutAuth
      .get(`${getSpaceUrlPrefix()}${ALERTS_INDEX_URL}`)
      .auth(user.username, user.password)
      .set('kbn-xsrf', 'true')
      .expect(200);
    const securitySolution = indexNames?.index_name?.find(
      (indexName) => indexName === '.alerts-security-solution'
    );
    expect(securitySolution).to.eql('.alerts-security-solution');
    return securitySolution;
  };

  describe('Get alert - RBAC - auth', () => {
    let securitySolutionIndex: string | undefined;
    let apmIndex: string | undefined;

    beforeEach(async () => {
      securitySolutionIndex = await getSecuritySolutionIndexName(superUser);
      apmIndex = await getAPMIndexName(superUser);

      await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    afterEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    describe('Users:', () => {
      it('should return alert when user has "read" privileges', async () => {
        const res = await supertestWithoutAuth
          .get(`${getSpaceUrlPrefix()}${TEST_URL}?id=${APM_ALERT_ID}=${apmIndex}`)
          .auth(superUser.username, superUser.password)
          .set('kbn-xsrf', 'true')
          .expect(200);
        expect(res.body).to.eql({});
      });

      it('should return a 403 when trying to access a solutions alerts for which access has not been granted', async () => {
        await supertestWithoutAuth
          .get(`${getSpaceUrlPrefix()}${TEST_URL}?id=${APM_ALERT_ID}=${apmIndex}`)
          .auth(secOnlySpacesAll.username, secOnlySpacesAll.password)
          .set('kbn-xsrf', 'true')
          .expect(403);
      });

      xdescribe('Security Solution', () => {
        [
          superUser,
          secOnlySpacesAll,
          secOnlyReadSpacesAll,
          obsSecSpacesAll,
          obsSecReadSpacesAll,
          globalRead,
        ]
          .map((role) => ({
            user: role,
          }))
          .forEach(({ user }) => {
            it(`${user.username} with "read" privileges should be able to access alerts`, async () => {
              await supertestWithoutAuth
                .get(
                  `${getSpaceUrlPrefix()}${TEST_URL}?id=${SECURITY_SOLUTION_ALERT_ID}=${securitySolutionIndex}`
                )
                .auth(user.username, user.password)
                .set('kbn-xsrf', 'true')
                .expect(200);
            });
          });

        [noKibanaPrivileges, obsOnlySpacesAll]
          .map((role) => ({
            user: role,
          }))
          .forEach(({ user }) => {
            it(`${user.username} without "read" privileges should NOT be able to access alerts`, async () => {
              await supertestWithoutAuth
                .get(
                  `${getSpaceUrlPrefix()}${TEST_URL}?id=${SECURITY_SOLUTION_ALERT_ID}=${securitySolutionIndex}`
                )
                .auth(user.username, user.password)
                .set('kbn-xsrf', 'true')
                .expect(403);
            });
          });
      });

      describe('APM', () => {
        [superUser, obsOnlySpacesAll, obsSecSpacesAll, obsSecReadSpacesAll]
          .map((role) => ({
            user: role,
          }))
          .forEach(({ user }) => {
            it(`${user.username} with "read" privileges should be able to access alerts`, async () => {
              await supertestWithoutAuth
                .get(`${getSpaceUrlPrefix()}${TEST_URL}?id=${APM_ALERT_ID}=${apmIndex}`)
                .auth(user.username, user.password)
                .set('kbn-xsrf', 'true')
                .expect(200);
            });
          });

        [secOnly, secOnlyRead, noKibanaPrivileges, secOnlySpacesAll, secOnlyReadSpacesAll]
          .map((role) => ({
            user: role,
          }))
          .forEach(({ user }) => {
            it(`${user.username} without "read" privileges should NOT be able to access alerts`, async () => {
              await supertestWithoutAuth
                .get(`${getSpaceUrlPrefix()}${TEST_URL}?id=${APM_ALERT_ID}=${apmIndex}`)
                .auth(user.username, user.password)
                .set('kbn-xsrf', 'true')
                .expect(403);
            });
          });
      });
    });

    describe('extra params', () => {
      it('should NOT allow to pass a filter query parameter', async () => {
        await supertest
          .get(`${getSpaceUrlPrefix()}${TEST_URL}?sortOrder=asc&namespaces[0]=*`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(400);
      });

      it('should NOT allow to pass a non supported query parameter', async () => {
        await supertest
          .get(`${getSpaceUrlPrefix()}${TEST_URL}?notExists=something`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(400);
      });
    });
  });
};
