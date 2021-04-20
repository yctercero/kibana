/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';

import { KibanaRequest } from 'src/core/server';
import { EventType, SecurityPluginStart } from '../../../security/server';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
import { RacAuthorizationAuditLogger } from './audit_logger';
import { getEnabledKibanaSpaceFeatures } from './utils';
import { GetSpaceFn, ReadOperations, WriteOperations, ESFilter } from './types';

export interface ConstructorOptions {
  request: KibanaRequest;
  authorization?: SecurityPluginStart['authz'];
  owners: Set<string>;
  auditLogger: RacAuthorizationAuditLogger;
}

export interface CreateOptions {
  request: KibanaRequest;
  authorization?: SecurityPluginStart['authz'];
  auditLogger: RacAuthorizationAuditLogger;
  getSpace: GetSpaceFn;
  features: FeaturesPluginStart;
}

export class RacAuthorization {
  private readonly request: KibanaRequest;
  private readonly authorization?: SecurityPluginStart['authz'];
  private readonly auditLogger: RacAuthorizationAuditLogger;
  private readonly featureOwners: Set<string>;

  constructor({ request, authorization, owners, auditLogger }: ConstructorOptions) {
    this.request = request;
    this.authorization = authorization;
    this.featureOwners = owners;
    this.auditLogger = auditLogger;
  }

  static async create({
    request,
    authorization,
    getSpace,
    features,
    auditLogger,
  }: CreateOptions): Promise<RacAuthorization> {
    const owners = await getEnabledKibanaSpaceFeatures({
      getSpace,
      request,
      features,
    });

    return new RacAuthorization({ request, authorization, owners, auditLogger });
  }

  /**
   * Determines whether the security license is disabled
   */
  private shouldCheckAuthorization(): boolean {
    return this.authorization?.mode?.useRbacForRequest(this.request) ?? false;
  }

  public async ensureAuthorized(owner: string, operation: ReadOperations | WriteOperations) {
    const { authorization } = this;

    // Does the owner the client sent up match with the KibanaFeatures structure
    const isAvailableOwner = this.featureOwners.has(owner);
    if (authorization != null && this.shouldCheckAuthorization()) {
      const requiredPrivileges = [authorization.actions.rac.get(owner, operation)];
      const checkPrivileges = authorization.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested, username, privileges } = await checkPrivileges({
        kibana: requiredPrivileges,
      });
      if (!isAvailableOwner) {
        /**
         * Under most circumstances this would have been caught by `checkPrivileges` as
         * a user can't have Privileges to an unknown consumer, but super users
         * don't actually get "privilege checked" so the made up consumer *will* return
         * as Privileged.
         * This check will ensure we don't accidentally let these through
         */
        throw Boom.forbidden(
          this.auditLogger.racAuthorizationFailure({
            owner,
            username,
            operation,
            type: EventType.ACCESS,
          })
        );
      }
      if (hasAllRequested) {
        this.auditLogger.racAuthorizationSuccess({
          owner,
          username,
          operation,
          type: EventType.ACCESS,
        });
      } else {
        const authorizedPrivileges = privileges.kibana.reduce<string[]>((acc, privilege) => {
          if (privilege.authorized) {
            return [...acc, privilege.privilege];
          }
          return acc;
        }, []);
        const unauthorizedPrivilages = requiredPrivileges.filter(
          (privilege) => !authorizedPrivileges.includes(privilege)
        );

        throw Boom.forbidden(
          this.auditLogger.racAuthorizationFailure({
            owner: unauthorizedPrivilages.join(','),
            username,
            operation,
            type: EventType.ACCESS,
          })
        );
      }
    } else if (!isAvailableOwner) {
      throw Boom.forbidden(
        this.auditLogger.racAuthorizationFailure({
          owner,
          username: '',
          operation,
          type: EventType.ACCESS,
        })
      );
    }
  }

  public async getFindAuthorizationFilter(): Promise<{
    filter?: ESFilter;
    ensureOwnerIsAuthorized: (owner: string) => void;
    logSuccessfulAuthorization: () => void;
  }> {
    const operations = [ReadOperations.Find];

    if (this.authorization != null && this.shouldCheckAuthorization()) {
      const { username, authorizedOwners } = await this.getAuthorizedOwners(operations);

      if (!authorizedOwners.length) {
        throw Boom.forbidden(
          this.auditLogger.racAuthorizationFailure({
            username: username ?? '',
            owner: Array.from(this.featureOwners).join(','),
            operation: ReadOperations.Find,
            type: EventType.ACCESS,
          })
        );
      }

      return {
        filter: getQueryFilter(authorizedOwners),
        ensureOwnerIsAuthorized: (owner: string) => {
          if (!authorizedOwners.includes(owner)) {
            throw Boom.forbidden(
              this.auditLogger.racAuthorizationFailure({
                username: username ?? '',
                owner,
                operation: ReadOperations.Find,
                type: EventType.ACCESS,
              })
            );
          }
        },
        logSuccessfulAuthorization: () => {
          this.auditLogger.racAuthorizationBulkSuccess({
            username,
            owners: Array.from(this.featureOwners),
            operation: ReadOperations.Find,
            type: EventType.ACCESS,
          });
        },
      };
    }
    return {
      ensureOwnerIsAuthorized: (owner: string) => {},
      logSuccessfulAuthorization: () => {},
    };
  }

  private async getAuthorizedOwners(
    operations: Array<ReadOperations | WriteOperations>
  ): Promise<{
    username?: string;
    hasAllRequested: boolean;
    authorizedOwners: string[];
  }> {
    const { featureOwners } = this;
    if (this.authorization != null && this.shouldCheckAuthorization()) {
      const checkPrivileges = this.authorization.checkPrivilegesDynamicallyWithRequest(
        this.request
      );
      const requiredPrivileges = getRequiredPrivileges(
        featureOwners,
        operations,
        this.authorization.actions
      );

      const { hasAllRequested, username, privileges } = await checkPrivileges({
        kibana: [...requiredPrivileges.keys()],
      });

      const authorizedOwners = getAuthorizedOwners(
        hasAllRequested,
        featureOwners,
        privileges,
        requiredPrivileges
      );

      return {
        hasAllRequested,
        username,
        authorizedOwners,
      };
    } else {
      return {
        hasAllRequested: true,
        authorizedOwners: Array.from(featureOwners),
      };
    }
  }
}
