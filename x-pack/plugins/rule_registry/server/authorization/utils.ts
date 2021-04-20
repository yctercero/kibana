/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { remove } from 'lodash';

import { KibanaRequest } from '../../../../../src/core/server';
import { esQuery } from '../../../../../src/plugins/data/server';
import { EsQueryConfig, Query } from '../../../../../src/plugins/data/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { CheckPrivilegesResponse } from '../../../security/server/authorization/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Actions } from '../../../security/server/authorization';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
import { ESFilter, GetSpaceFn, ReadOperations, WriteOperations } from './types';

/**
 * Returns a user's enabled kibana features per the space the
 * request cam from
 *
 * @param getSpace function that extracts space from request
 * @param request
 * @param features helper to get all possible kibana features
 */
export const getEnabledKibanaSpaceFeatures = async ({
  getSpace,
  request,
  features,
}: {
  request: KibanaRequest;
  getSpace: GetSpaceFn;
  features: FeaturesPluginStart;
}): Promise<Set<string>> => {
  try {
    const disabledUserSpaceFeatures = new Set((await getSpace(request))?.disabledFeatures ?? []);
    // Filter through all user Kibana features to find corresponding enabled
    // RAC feature owners like 'security-solution' or 'observability'
    const owners: Set<string> = await new Set(
      features
        .getKibanaFeatures()
        // get all the rac 'owners' that aren't disabled
        .filter(({ id }) => !disabledUserSpaceFeatures.has(id))
        .flatMap((feature) => feature.rac ?? [])
    );
    return owners;
  } catch (error) {
    return new Set<string>();
  }
};

/**
 * Returns map of URI to owner
 * ex: Map {"rac:1.0.0:securitySolution/find" => ["securitySolution"]}
 *
 * @param owners set of owners user has access to
 * @param operations array of operations user is attempting
 * @param actions security plugin helper that builds URIs
 */
export const getRequiredPrivileges = (
  owners: Set<string>,
  operations: Array<ReadOperations | WriteOperations>,
  actions: Actions
): Map<string, [string]> => {
  const requiredPrivileges = new Map<string, [string]>();

  for (const owner of owners) {
    for (const operation of operations) {
      const actionUriFromSecurityPlugin = actions.rac.get(owner, operation);
      requiredPrivileges.set(actionUriFromSecurityPlugin, [owner]);
    }
  }

  return requiredPrivileges;
};

/**
 * Returns user's authorized owners after comparing what is being
 * requested to what privileges we have marked down
 * ex: ["securitySolution"]
 *
 * @param hasAllRequested boolean describing if user has all
 * access to all requested owners/operations
 * @param owners set of owners user has access to
 * @param privileges privileges structure fetched from features plugin
 * @param requiredPrivileges map of possible URI's to owners user is
 * attempting to access
 */
export const getAuthorizedOwners = (
  hasAllRequested: boolean,
  owners: Set<string>,
  privileges: CheckPrivilegesResponse['privileges'],
  requiredPrivileges: Map<string, [string]>
): string[] => {
  return hasAllRequested
    ? Array.from(owners)
    : privileges.kibana.reduce<string[]>((authorizedOwners, { authorized, privilege }) => {
        if (authorized && requiredPrivileges.has(privilege)) {
          const [owner] = requiredPrivileges.get(privilege)!;
          return [...authorizedOwners, owner];
        }

        return authorizedOwners;
      }, []);
};

export const getQueryFilter = (owners: string[]): ESFilter => {
  const ownersFilter = getOwnersFilter(owners);
  const kqlQuery: Query = {
    language: 'kuery',
    query: `(${ownersFilter})`,
  };
  const config: EsQueryConfig = {
    allowLeadingWildcards: true,
    dateFormatTZ: 'Zulu',
    ignoreFilterIfFieldNotInIndex: false,
    queryStringOptions: { analyze_wildcard: true },
  };

  return esQuery.buildEsQuery(undefined, kqlQuery, [], config);
};

export const getOwnersFilter = (owners: string[]): string => {
  return owners
    .reduce<string[]>((query, owner) => {
      ensureFieldIsSafeForQuery('owner', owner);
      return [...query, `owner: ${owner}`];
    }, [])
    .join(' or ');
};

export const ensureFieldIsSafeForQuery = (field: string, value: string): boolean => {
  const invalid = value.match(/([>=<\*:()]+|\s+)/g);
  if (invalid) {
    const whitespace = remove(invalid, (chars) => chars.trim().length === 0);
    const errors = [];
    if (whitespace.length) {
      errors.push(`whitespace`);
    }
    if (invalid.length) {
      errors.push(`invalid character${invalid.length > 1 ? `s` : ``}: ${invalid?.join(`, `)}`);
    }
    throw new Error(`expected ${field} not to include ${errors.join(' and ')}`);
  }
  return true;
};
