/**
 * Transformation Layer
 * 
 * Helper functions for safe conversions between API responses and aligned types
 * Handles int64 conversions, enum transformations, and field mappings
 * 
 * Generated: 2025-06-20
 * Purpose: Bridge between raw API responses and type-safe frontend code
 */

// No longer using branded types - using OpenAPI compatible types

import {
  Campaign,
  CampaignType,
  CampaignStatus,
  HTTPSourceType,
  PersonaType,
  ProxyProtocol,
  DomainPatternType,
  User,
  PublicUser,
  Persona,
  Proxy,
  DomainGenerationParams,
  DNSValidationParams,
  HTTPKeywordParams,
  GeneratedDomain,
  Role,
  Permission,
  createIPAddress
} from './aligned-models';
import { CampaignProgressData } from './aligned-api-types';

import {
  normalizeHTTPSourceType,
  normalizeCampaignType,
  isValidCampaignStatus,
  isValidPersonaType,
  isValidProxyProtocol
} from './aligned-enums';

// ============================================
// INT64 FIELD MAPPINGS
// ============================================

/**
 * Fields that contain int64 values from Go backend
 */
export const INT64_FIELDS = {
  campaign: [
    'totalItems',
    'processedItems',
    'successfulItems',
    'failedItems'
  ],
  domainGeneration: [
    'totalPossibleCombinations',
    'currentOffset'
  ],
  generatedDomain: [
    'offsetIndex'
  ],
  campaignJob: [
    'startOffset',
    'endOffset',
    'itemsInBatch',
    'successfulItems',
    'failedItems'
  ],
  systemStats: [
    'total',
    'active',
    'completed',
    'failed',
    'validated',
    'invalid',
    'locked',
    'uptime'
  ],
  pagination: [
    'total'
  ]
} as const;

// ============================================
// CAMPAIGN TRANSFORMATIONS
// ============================================

/**
 * Transform raw API campaign response to type-safe Campaign
 */
export function transformCampaign(raw: Record<string, unknown>): Campaign {
  // Transform nested params if present
  const domainGenerationParams = raw.domainGenerationParams
    ? transformDomainGenerationParams(raw.domainGenerationParams as Record<string, unknown>)
    : undefined;
    
  const dnsValidationParams = raw.dnsValidationParams
    ? transformDNSValidationParams(raw.dnsValidationParams as Record<string, unknown>)
    : undefined;
    
  const httpKeywordParams = raw.httpKeywordParams
    ? transformHTTPKeywordParams(raw.httpKeywordParams as Record<string, unknown>)
    : undefined;
  
  return {
    id: raw.id as string,
    name: raw.name as string,
    campaignType: (normalizeCampaignType(raw.campaignType as string) || 'domain_generation') as CampaignType,
    status: (isValidCampaignStatus(raw.status) ? raw.status : 'pending') as CampaignStatus,
    userId: raw.userId ? raw.userId as string : undefined,
    
    // Int64 fields (converted to numbers for OpenAPI compatibility)
    totalItems: Number(raw.totalItems) || 0,
    processedItems: Number(raw.processedItems) || 0,
    successfulItems: Number(raw.successfulItems) || 0,
    failedItems: Number(raw.failedItems) || 0,
    
    progressPercentage: raw.progressPercentage as number | undefined,
    metadata: raw.metadata as Record<string, unknown> | undefined,
    
    // Timestamps
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
    startedAt: raw.startedAt ? raw.startedAt as string : undefined,
    completedAt: raw.completedAt ? raw.completedAt as string : undefined,
    
    // Additional fields
    estimatedCompletionAt: raw.estimatedCompletionAt
      ? raw.estimatedCompletionAt as string
      : undefined,
    avgProcessingRate: raw.avgProcessingRate as number | undefined,
    lastHeartbeatAt: raw.lastHeartbeatAt
      ? raw.lastHeartbeatAt as string
      : undefined,
    
    errorMessage: raw.errorMessage as string | undefined,
    
    // Nested params
    domainGenerationParams,
    dnsValidationParams,
    httpKeywordParams
  };
}

/**
 * Transform domain generation params
 */
export function transformDomainGenerationParams(
  raw: Record<string, unknown>
): DomainGenerationParams {
  return {
    id: raw.id as string,
    campaignId: raw.campaignId as string,
    patternType: raw.patternType as DomainPatternType,
    tld: raw.tld as string,
    constantString: raw.constantString as string | undefined,
    variableLength: raw.variableLength as number,
    characterSet: raw.characterSet as string,
    numDomainsToGenerate: raw.numDomainsToGenerate as number,
    
    // Critical int64 fields (converted to numbers for OpenAPI compatibility)
    totalPossibleCombinations: Number(raw.totalPossibleCombinations) || 0,
    currentOffset: Number(raw.currentOffset) || 0,
    
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string
  };
}

/**
 * Transform DNS validation params
 */
export function transformDNSValidationParams(
  raw: Record<string, unknown>
): DNSValidationParams {
  return {
    id: raw.id as string,
    campaignId: raw.campaignId as string,
    dnsServers: raw.dnsServers as string[],
    recordTypes: raw.recordTypes as string[],
    timeout: raw.timeout as number,
    retries: raw.retries as number,
    batchSize: raw.batchSize as number,
    sourceCampaignId: raw.sourceCampaignId
      ? raw.sourceCampaignId as string
      : undefined,
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string
  };
}

/**
 * Transform HTTP keyword params
 */
export function transformHTTPKeywordParams(
  raw: Record<string, unknown>
): HTTPKeywordParams {
  // CRITICAL: Handle case conversion for sourceType
  const sourceType = normalizeHTTPSourceType(raw.sourceType as string);
  if (!sourceType) {
    throw new Error(`Invalid HTTP source type: ${raw.sourceType}. Expected one of: DomainGeneration, DNSValidation`);
  }
  
  return {
    id: raw.id as string,
    campaignId: raw.campaignId as string,
    targetUrl: raw.targetUrl as string,
    keywordSetId: raw.keywordSetId
      ? raw.keywordSetId as string
      : undefined,
    
    // Critical field with case conversion
    sourceType: sourceType as HTTPSourceType,
    sourceCampaignId: raw.sourceCampaignId
      ? raw.sourceCampaignId as string
      : undefined,
      
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string
  };
}

// ============================================
// USER TRANSFORMATIONS
// ============================================

/**
 * Transform raw user response to type-safe User
 */
export function transformUser(raw: Record<string, unknown>): User {
  return {
    id: raw.id as string,
    email: raw.email as string,
    emailVerified: raw.emailVerified as boolean,
    firstName: raw.firstName as string,
    lastName: raw.lastName as string,
    avatarUrl: raw.avatarUrl as string | undefined,
    isActive: raw.isActive as boolean,
    isLocked: raw.isLocked as boolean,
    failedLoginAttempts: raw.failedLoginAttempts as number,
    lockedUntil: raw.lockedUntil
      ? raw.lockedUntil as string
      : undefined,
    lastLoginAt: raw.lastLoginAt
      ? raw.lastLoginAt as string
      : undefined,
    lastLoginIp: raw.lastLoginIp
      ? createIPAddress(raw.lastLoginIp as string)
      : undefined,
    mfaEnabled: raw.mfaEnabled as boolean,
    mustChangePassword: raw.mustChangePassword as boolean,
    passwordChangedAt: raw.passwordChangedAt as string,
    
    // Computed field
    name: `${raw.firstName} ${raw.lastName}`,
    
    // Relations (if included)
    roles: raw.roles ? (raw.roles as unknown[]).map(item => transformRole(item as Record<string, unknown>)) : undefined,
    permissions: raw.permissions ? (raw.permissions as unknown[]).map(item => transformPermission(item as Record<string, unknown>)) : undefined
  };
}

/**
 * Transform to public user (removes sensitive fields)
 */
export function transformPublicUser(raw: Record<string, unknown>): PublicUser {
  return {
    id: raw.id as string,
    email: raw.email as string,
    firstName: raw.firstName as string,
    lastName: raw.lastName as string,
    name: raw.name as string || `${raw.firstName} ${raw.lastName}`,
    avatarUrl: raw.avatarUrl as string | undefined,
    isActive: raw.isActive as boolean,
    roles: raw.roles ? (raw.roles as unknown[]).map(item => transformRole(item as Record<string, unknown>)) : undefined,
    permissions: raw.permissions ? (raw.permissions as unknown[]).map(item => transformPermission(item as Record<string, unknown>)) : undefined
  };
}

function transformRole(raw: Record<string, unknown>): Role {
  return {
    id: raw.id as string,
    name: raw.name as string,
    description: raw.description as string | undefined,
    permissions: raw.permissions ? (raw.permissions as unknown[]).map(item => transformPermission(item as Record<string, unknown>)) : undefined,
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string
  };
}

function transformPermission(raw: Record<string, unknown>): Permission {
  return {
    id: raw.id as string,
    resource: raw.resource as string,
    action: raw.action as string,
    description: raw.description as string | undefined,
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string
  };
}

// ============================================
// PERSONA TRANSFORMATIONS
// ============================================

/**
 * Transform raw persona response
 */
export function transformPersona(raw: Record<string, unknown>): Persona {
  return {
    id: raw.id as string,
    name: raw.name as string,
    description: raw.description as string | undefined,
    personaType: (isValidPersonaType(raw.personaType)
      ? raw.personaType
      : 'dns') as PersonaType,
    configDetails: raw.configDetails as Record<string, unknown>,
    isEnabled: raw.isEnabled as boolean,
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string
  };
}

// ============================================
// PROXY TRANSFORMATIONS
// ============================================

/**
 * Transform raw proxy response
 */
export function transformProxy(raw: Record<string, unknown>): Proxy {
  return {
    id: raw.id as string,
    name: raw.name as string,
    description: raw.description as string | undefined,
    address: raw.address as string,
    protocol: (isValidProxyProtocol(raw.protocol)
      ? raw.protocol
      : 'http') as ProxyProtocol,
    username: raw.username as string | undefined,
    host: raw.host as string | undefined,
    port: raw.port as number | undefined,
    isEnabled: raw.isEnabled as boolean,
    isHealthy: raw.isHealthy as boolean,
    lastStatus: raw.lastStatus as string | undefined,
    lastCheckedAt: raw.lastCheckedAt
      ? raw.lastCheckedAt as string
      : undefined,
    latencyMs: raw.latencyMs as number | undefined,
    city: raw.city as string | undefined,
    countryCode: raw.countryCode as string | undefined,
    provider: raw.provider as string | undefined,
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string
  };
}

// ============================================
// DOMAIN TRANSFORMATIONS
// ============================================

/**
 * Transform generated domain response
 */
export function transformGeneratedDomain(raw: Record<string, unknown>): GeneratedDomain {
  return {
    id: raw.id as string,
    campaignId: raw.campaignId as string,
    domain: raw.domain as string,
    offsetIndex: Number(raw.offsetIndex) || 0,
    generatedAt: raw.generatedAt as string,
    validatedAt: raw.validatedAt
      ? raw.validatedAt as string
      : undefined,
    isValid: raw.isValid as boolean | undefined,
    validationError: raw.validationError as string | undefined,
    metadata: raw.metadata as Record<string, unknown> | undefined
  };
}

// ============================================
// WEBSOCKET MESSAGE TRANSFORMATIONS
// ============================================

/**
 * Transform WebSocket campaign progress message
 */
export function transformCampaignProgress(raw: Record<string, unknown>): CampaignProgressData {
  return {
    campaignId: raw.campaignId as string,
    totalItems: Number(raw.totalItems) || 0,
    processedItems: Number(raw.processedItems) || 0,
    successfulItems: Number(raw.successfulItems) || 0,
    failedItems: Number(raw.failedItems) || 0,
    progressPercentage: raw.progressPercentage as number,
    estimatedTimeRemaining: raw.estimatedTimeRemaining as number | undefined,
    currentRate: raw.currentRate as number | undefined
  };
}

// ============================================
// SERIALIZATION HELPERS
// ============================================

/**
 * Prepare campaign for API request
 */
export function serializeCampaignForAPI(campaign: Partial<Campaign>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    ...campaign
  };
  
  // Convert number fields (OpenAPI compatible)
  if (campaign.totalItems !== undefined) {
    serialized.totalItems = campaign.totalItems;
  }
  if (campaign.processedItems !== undefined) {
    serialized.processedItems = campaign.processedItems;
  }
  if (campaign.successfulItems !== undefined) {
    serialized.successfulItems = campaign.successfulItems;
  }
  if (campaign.failedItems !== undefined) {
    serialized.failedItems = campaign.failedItems;
  }
  
  return serialized;
}

/**
 * Prepare domain generation params for API
 */
export function serializeDomainGenerationParams(
  params: Partial<DomainGenerationParams>
): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    ...params
  };
  
  // Convert number fields (OpenAPI compatible)
  if (params.totalPossibleCombinations !== undefined) {
    serialized.totalPossibleCombinations = params.totalPossibleCombinations;
  }
  if (params.currentOffset !== undefined) {
    serialized.currentOffset = params.currentOffset;
  }
  
  return serialized;
}

// ============================================
// BATCH TRANSFORMATIONS
// ============================================

/**
 * Transform array of campaigns
 */
export function transformCampaigns(raw: unknown[]): Campaign[] {
  return raw.map(item => transformCampaign(item as Record<string, unknown>));
}

/**
 * Transform array of users
 */
export function transformUsers(raw: unknown[]): User[] {
  return raw.map(item => transformUser(item as Record<string, unknown>));
}

/**
 * Transform array of personas
 */
export function transformPersonas(raw: unknown[]): Persona[] {
  return raw.map(item => transformPersona(item as Record<string, unknown>));
}

/**
 * Transform array of proxies
 */
export function transformProxies(raw: unknown[]): Proxy[] {
  return raw.map(item => transformProxy(item as Record<string, unknown>));
}

/**
 * Transform array of domains
 */
export function transformGeneratedDomains(raw: unknown[]): GeneratedDomain[] {
  return raw.map(item => transformGeneratedDomain(item as Record<string, unknown>));
}

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Safe transformation with error handling
 */
export function safeTransform<T>(
  transformer: (raw: Record<string, unknown>) => T,
  raw: unknown,
  fallback?: T
): T | undefined {
  try {
    if (!raw || typeof raw !== 'object') {
      return fallback;
    }
    return transformer(raw as Record<string, unknown>);
  } catch (error) {
    console.error('Transformation error:', error);
    return fallback;
  }
}

/**
 * Transform with validation
 */
export function transformWithValidation<T>(
  transformer: (raw: Record<string, unknown>) => T,
  validator: (value: T) => boolean,
  raw: unknown
): T {
  const transformed = transformer(raw as Record<string, unknown>);
  if (!validator(transformed)) {
    throw new Error('Transformed value failed validation');
  }
  return transformed;
}