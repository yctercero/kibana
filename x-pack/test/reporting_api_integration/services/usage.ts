/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { INTERNAL_ROUTES, PUBLIC_ROUTES } from '@kbn/reporting-common';
import { Response } from 'supertest';
import { indexTimestamp } from './index_timestamp';
import { FtrProviderContext } from '../ftr_provider_context';

export function createUsageServices({ getService }: FtrProviderContext) {
  const log = getService('log');
  const esSupertest = getService('esSupertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  return {
    async waitForJobToFinish(
      downloadReportPath: string,
      ignoreFailure = false,
      username = 'elastic',
      password = process.env.TEST_KIBANA_PASS || 'changeme'
    ) {
      log.debug(`Waiting for job to finish: ${downloadReportPath}`);
      const JOB_IS_PENDING_CODE = 503;
      let response: Response & { statusCode?: number };

      const statusCode = await new Promise((resolve) => {
        const intervalId = setInterval(async () => {
          response = await supertestWithoutAuth
            .get(downloadReportPath)
            .auth(username, password)
            .responseType('blob');
          if (response.statusCode === 503) {
            log.debug(`Report at path ${downloadReportPath} is pending`);
          } else if (response.statusCode === 200) {
            log.debug(`Report at path ${downloadReportPath} is complete`);
          } else {
            log.debug(`Report at path ${downloadReportPath} returned code ${response.statusCode}`);
          }
          if (response.statusCode !== JOB_IS_PENDING_CODE) {
            clearInterval(intervalId);
            resolve(response.statusCode);
          }
        }, 1500);
      });
      if (!ignoreFailure) {
        const jobInfo = await supertestWithoutAuth
          .get(
            downloadReportPath.replace(
              PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX,
              INTERNAL_ROUTES.JOBS.INFO_PREFIX
            )
          )
          .auth(username, password);
        expect(jobInfo.body.output.warnings).to.be(undefined); // expect no failure message to be present in job info
        expect(statusCode).to.be(200);
      }
    },

    /**
     *
     * @return {Promise<Function>} A function to call to clean up the index alias that was added.
     */
    async coerceReportsIntoExistingIndex(indexName: string) {
      log.debug(`ReportingAPI.coerceReportsIntoExistingIndex(${indexName})`);

      // Adding an index alias coerces the report to be generated on an existing index which means any new
      // index schema won't be applied. This is important if a point release updated the schema. Reports may still
      // be inserted into an existing index before the new schema is applied.
      const timestampForIndex = indexTimestamp('week', '.');
      await esSupertest
        .post('/_aliases')
        .send({
          actions: [
            {
              add: { index: indexName, alias: `.reporting-${timestampForIndex}` },
            },
          ],
        })
        .expect(200);

      return async () => {
        await esSupertest
          .post('/_aliases')
          .send({
            actions: [
              {
                remove: { index: indexName, alias: `.reporting-${timestampForIndex}` },
              },
            ],
          })
          .expect(200);
      };
    },

    async expectAllJobsToFinishSuccessfully(jobPaths: string[]) {
      await Promise.all(
        jobPaths.map(async (path) => {
          log.debug(`wait for job to finish: ${path}`);
          await this.waitForJobToFinish(path);
        })
      );
    },
  };
}
