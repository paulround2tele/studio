/**
 * Type transformation utilities for OpenAPI data (Legacy - No longer needed)
 * Since we now use OpenAPI types directly, these transforms are pass-through
 */

import type { Campaign, User } from "../types";

// Raw API data types (OpenAPI responses)
export interface RawAPIData {
  [key: string]: unknown;
}

/**
 * Legacy transform utilities - now pass-through since we use OpenAPI types directly
 */
export class TypeTransformer {
  /**
   * Pass-through for string IDs (no longer branded)
   */
  static toUUID(value: string | undefined | null): string | undefined {
    return value || undefined;
  }

  /**
   * Pass-through for numbers (OpenAPI compatible)
   */
  static toNumber(
    value: number | string | undefined | null,
  ): number | undefined {
    if (value === undefined || value === null) return undefined;
    return typeof value === 'string' ? Number(value) : value;
  }

  // Backward compatibility alias (to be removed later)
  static toSafeBigInt = this.toNumber;

  /**
   * Pass-through for date strings (no longer branded)
   */
  static toISODateString(
    value: string | undefined | null,
  ): string | undefined {
    return value || undefined;
  }

  /**
   * Pass-through for user object (OpenAPI types)
   */
  static transformUser(raw: RawAPIData): User {
    if (!raw) return raw as User;

    return {
      ...raw,
      id: raw.id as string,
      createdAt: raw.createdAt as string,
      updatedAt: raw.updatedAt as string,
      lastLoginAt: raw.lastLoginAt as string,
      mfaLastUsedAt: raw.mfaLastUsedAt as string,
    } as User;
  }

  /**
   * Pass-through for campaign object (OpenAPI types)
   */
  static transformCampaign(raw: RawAPIData): Campaign {
    if (!raw) return raw as Campaign;

    return {
      ...raw,
      id: raw.id as string,
      userId: raw.userId as string,
      createdAt: raw.createdAt as string,
      updatedAt: raw.updatedAt as string,
      startedAt: raw.startedAt as string,
      completedAt: raw.completedAt as string,
      estimatedCompletionAt: raw.estimatedCompletionAt as string,
      lastHeartbeatAt: raw.lastHeartbeatAt as string,
      totalItems: typeof raw.totalItems === 'number' ? raw.totalItems : undefined,
      processedItems: typeof raw.processedItems === 'number' ? raw.processedItems : undefined,
      successfulItems: typeof raw.successfulItems === 'number' ? raw.successfulItems : undefined,
      failedItems: typeof raw.failedItems === 'number' ? raw.failedItems : undefined,
      progressPercentage:
        raw.progressPercentage !== undefined
          ? Number(raw.progressPercentage)
          : undefined,
      avgProcessingRate:
        raw.avgProcessingRate !== undefined
          ? Number(raw.avgProcessingRate)
          : undefined,
    } as Campaign;
  }

  /**
   * Pass-through for generated domain object (OpenAPI types)
   */
  static transformGeneratedDomain(raw: RawAPIData): RawAPIData {
    if (!raw) return raw;

    return {
      ...raw,
      id: raw.id as string,
      generationCampaignId: raw.generationCampaignId as string,
      offsetIndex: typeof raw.offsetIndex === 'number' ? raw.offsetIndex : undefined,
      generatedAt: raw.generatedAt as string,
      createdAt: raw.createdAt as string,
    };
  }

  /**
   * Pass-through for DNS validation result object (OpenAPI types)
   */
  static transformDNSValidationResult(raw: RawAPIData): RawAPIData {
    if (!raw) return raw;

    return {
      ...raw,
      id: raw.id as string,
      dnsCampaignId: raw.dnsCampaignId as string,
      generatedDomainId: raw.generatedDomainId as string,
      validatedByPersonaId: raw.validatedByPersonaId as string,
      attempts: typeof raw.attempts === 'number' ? raw.attempts : undefined,
      lastCheckedAt: raw.lastCheckedAt as string,
      createdAt: raw.createdAt as string,
    };
  }

  /**
   * Pass-through for HTTP keyword result object (OpenAPI types)
   */
  static transformHTTPKeywordResult(raw: RawAPIData): RawAPIData {
    if (!raw) return raw;

    return {
      ...raw,
      id: raw.id as string,
      httpKeywordCampaignId: raw.httpKeywordCampaignId as string,
      dnsResultId: raw.dnsResultId as string,
      validatedByPersonaId: raw.validatedByPersonaId as string,
      attempts: typeof raw.attempts === 'number' ? raw.attempts : undefined,
      httpStatusCode:
        raw.httpStatusCode !== undefined
          ? Number(raw.httpStatusCode)
          : undefined,
      lastCheckedAt: raw.lastCheckedAt as string,
      createdAt: raw.createdAt as string,
    };
  }

  /**
   * Pass-through for campaign job object (OpenAPI types)
   */
  static transformCampaignJob(raw: RawAPIData): RawAPIData {
    if (!raw) return raw;

    return {
      ...raw,
      id: raw.id as string,
      campaignId: raw.campaignId as string,
      batchSize: typeof raw.batchSize === 'number' ? raw.batchSize : undefined,
      processedCount: typeof raw.processedCount === 'number' ? raw.processedCount : undefined,
      scheduledAt: raw.scheduledAt as string,
      startedAt: raw.startedAt as string,
      completedAt: raw.completedAt as string,
      lastHeartbeatAt: raw.lastHeartbeatAt as string,
      createdAt: raw.createdAt as string,
      updatedAt: raw.updatedAt as string,
    };
  }

  /**
   * Pass-through for audit log object (OpenAPI types)
   */
  static transformAuditLog(raw: RawAPIData): RawAPIData {
    if (!raw) return raw;

    return {
      ...raw,
      id: raw.id as string,
      userId: raw.userId as string,
      entityId: raw.entityId as string,
      timestamp: raw.timestamp as string,
    };
  }

  /**
   * Pass-through for session object (OpenAPI types)
   */
  static transformSession(raw: RawAPIData): RawAPIData {
    if (!raw) return raw;

    return {
      ...raw,
      id: raw.id as string,
      userId: raw.userId as string,
      expiresAt: raw.expiresAt as string,
      lastActivityAt: raw.lastActivityAt as string,
      createdAt: raw.createdAt as string,
      updatedAt: raw.updatedAt as string,
    };
  }

  /**
   * Pass-through for persona object (OpenAPI types)
   */
  static transformToPersona(raw: RawAPIData): RawAPIData {
    if (!raw) return raw;

    return {
      ...raw,
      id: raw.id as string,
      lastTested: raw.lastTested as string,
      createdAt: raw.createdAt as string,
      updatedAt: raw.updatedAt as string,
    };
  }

  /**
   * Pass-through for proxy object (OpenAPI types)
   */
  static transformToProxy(raw: RawAPIData): RawAPIData {
    if (!raw) return raw;

    return {
      ...raw,
      id: raw.id as string,
      port: raw.port !== undefined ? Number(raw.port) : undefined,
      lastTested: raw.lastTested as string,
      createdAt: raw.createdAt as string,
      updatedAt: raw.updatedAt as string,
    };
  }

  /** Pass-through for proxy pool object (OpenAPI types) */
  static transformToProxyPool(raw: RawAPIData): RawAPIData {
    if (!raw) return raw;
    return {
      ...raw,
      id: raw.id as string,
      healthCheckIntervalSeconds:
        raw.healthCheckIntervalSeconds !== undefined
          ? Number(raw.healthCheckIntervalSeconds)
          : undefined,
      maxRetries:
        raw.maxRetries !== undefined ? Number(raw.maxRetries) : undefined,
      timeoutSeconds:
        raw.timeoutSeconds !== undefined
          ? Number(raw.timeoutSeconds)
          : undefined,
      createdAt: raw.createdAt as string,
      updatedAt: raw.updatedAt as string,
      proxies: this.transformArray(
        raw.proxies as unknown[] | undefined,
        this.transformToProxy,
      ) as unknown as RawAPIData[],
    };
  }

  /**
   * Transform arrays of objects
   */
  static transformArray<T>(
    items: unknown[] | undefined,
    transformer: (item: RawAPIData) => T,
  ): T[] {
    if (!Array.isArray(items)) return [];
    return items.map((item) => transformer(item as RawAPIData));
  }
}

/**
 * Helper functions for specific transformations
 */
export const transformUser =
  TypeTransformer.transformUser.bind(TypeTransformer);
export const transformCampaign =
  TypeTransformer.transformCampaign.bind(TypeTransformer);
export const transformGeneratedDomain =
  TypeTransformer.transformGeneratedDomain.bind(TypeTransformer);
export const transformDNSValidationResult =
  TypeTransformer.transformDNSValidationResult.bind(TypeTransformer);
export const transformHTTPKeywordResult =
  TypeTransformer.transformHTTPKeywordResult.bind(TypeTransformer);
export const transformCampaignJob =
  TypeTransformer.transformCampaignJob.bind(TypeTransformer);
export const transformAuditLog =
  TypeTransformer.transformAuditLog.bind(TypeTransformer);
export const transformSession =
  TypeTransformer.transformSession.bind(TypeTransformer);
export const transformToPersona =
  TypeTransformer.transformToPersona.bind(TypeTransformer);
export const transformToProxy =
  TypeTransformer.transformToProxy.bind(TypeTransformer);
export const transformToProxyPool =
  TypeTransformer.transformToProxyPool.bind(TypeTransformer);
