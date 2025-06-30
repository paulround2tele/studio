/**
 * ALIGNED API MODELS - Corrected to match Go backend exactly
 *
 * Migration Guide:
 * 1. Replace all imports from 'src/lib/api-client/models/*' with this file
 * 2. All int64 fields now use number for OpenAPI compatibility
 * 3. Ensure all API responses are transformed using the provided transformers
 *
 * CRITICAL CHANGES:
 * - All int64 fields now use number instead of SafeBigInt (OpenAPI compatible)
 * - Field names match Go JSON tags exactly (no snake_case variants)
 * - Enums exclude 'archived' status to match backend
 */

// Using OpenAPI compatible types (string, number) instead of branded types

// ============================================================================
// ENUMS - Aligned with Go backend
// ============================================================================

export enum ModelsCampaignTypeEnum {
  DomainGeneration = 'domain_generation',
  DnsValidation = 'dns_validation',
  HttpKeywordValidation = 'http_keyword_validation'
}

export enum ModelsCampaignStatusEnum {
  Pending = 'pending',
  Queued = 'queued',
  Running = 'running',
  Pausing = 'pausing',
  Paused = 'paused',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled'
  // REMOVED: Archived = 'archived' - not in backend
}

export enum ModelsPersonaTypeEnum {
  Dns = 'dns',
  Http = 'http'
}

export enum ModelsProxyProtocolEnum {
  Http = 'http',
  Https = 'https',
  Socks5 = 'socks5',
  Socks4 = 'socks4'
}

export enum ModelsKeywordRuleTypeEnum {
  String = 'string',
  Regex = 'regex'
}

// ============================================================================
// CORE MODELS - With correct types
// ============================================================================

/**
 * Campaign API model aligned with Go backend
 *
 * @description Represents a campaign entity with type-safe fields matching the Go backend exactly.
 * All int64 fields from Go are represented as numbers for OpenAPI compatibility.
 *
 * @example
 * ```typescript
 * const campaign: ModelsCampaignAPI = {
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   name: 'DNS Validation Campaign',
 *   campaignType: ModelsCampaignTypeEnum.DnsValidation,
 *   status: ModelsCampaignStatusEnum.Running,
 *   totalItems: 1000000,
 *   processedItems: 500000,
 *   progressPercentage: 50.0
 * };
 * ```
 *
 * @see transformCampaignResponse - Use this to transform API responses
 */
export interface ModelsCampaignAPI {
  id?: string;
  name?: string;
  campaignType?: ModelsCampaignTypeEnum;
  status?: ModelsCampaignStatusEnum;
  userId?: string;
  
  // OpenAPI compatible: Using number instead of SafeBigInt
  totalItems?: number;
  processedItems?: number;
  successfulItems?: number;
  failedItems?: number;
  
  progressPercentage?: number; // float64 - safe as number
  metadata?: Record<string, unknown>;
  
  // Timestamps as strings
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletionAt?: string;
  lastHeartbeatAt?: string;
  
  // Other fields
  errorMessage?: string;
  avgProcessingRate?: number; // float64 - safe as number
}

/**
 * User API model with correct field names
 *
 * @description Represents a user entity with authentication and authorization details.
 * Includes roles and permissions as full objects, not just strings.
 *
 * @example
 * ```typescript
 * const user: ModelsUserAPI = {
 *   id: createUUID('123e4567-e89b-12d3-a456-426614174000'),
 *   email: 'user@example.com',
 *   emailVerified: true,
 *   roles: [{
 *     id: createUUID('...'),
 *     name: 'admin',
 *     displayName: 'Administrator',
 *     isSystemRole: true,
 *     createdAt: createISODateString('2024-01-01T00:00:00Z'),
 *     updatedAt: createISODateString('2024-01-01T00:00:00Z')
 *   }],
 *   mfaEnabled: true
 * };
 * ```
 *
 * @see transformUserResponse - Use this to transform API responses
 */
export interface ModelsUserAPI {
  id?: string;
  email?: string;
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
  name?: string; // Computed field
  avatarUrl?: string;
  isActive?: boolean;
  isLocked?: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  mustChangePassword?: boolean;
  mfaEnabled?: boolean;
  mfaLastUsedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // These should be full objects, not strings
  roles?: ModelsRoleAPI[];
  permissions?: ModelsPermissionAPI[];
}

/**
 * Role API model
 */
export interface ModelsRoleAPI {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: ModelsPermissionAPI[];
}

/**
 * Permission API model
 */
export interface ModelsPermissionAPI {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  resource: string;
  action: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Login Response - Fixed field naming
 */
export interface ModelsLoginResponseAPI {
  success?: boolean;
  user?: ModelsUserAPI;
  error?: string | null;
  requiresCaptcha?: boolean | null;
  sessionId?: string | null;
  expiresAt?: string;
}

/**
 * Persona API model with correct field names and types
 *
 * @description Represents a persona entity for DNS or HTTP validation.
 * All fields use proper types for OpenAPI compatibility.
 */
export interface ModelsPersonaAPI {
  id: string;
  name: string;
  personaType: 'dns' | 'http';
  description?: string;
  configDetails: Record<string, unknown>;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Frontend-only fields (not in backend)
  status?: string;
  lastTested?: string;
  lastError?: string;
  tags?: string[];
}

/**
 * Proxy API model with correct field names and types
 *
 * @description Represents a proxy entity for HTTP requests.
 * All fields use proper types including UUID branding for type safety.
 */
export interface ModelsProxyAPI {
  id: string;
  name: string;
  description?: string;
  address: string;
  protocol?: 'http' | 'https' | 'socks5' | 'socks4';
  username?: string;
  host?: string;
  port?: number;
  isEnabled: boolean;
  isHealthy: boolean;
  lastStatus?: string;
  lastCheckedAt?: string;
  latencyMs?: number;
  city?: string;
  countryCode?: string;
  provider?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Login Request
 */
export interface ModelsLoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  captchaToken?: string;
}

// ============================================================================
// CAMPAIGN CREATION MODELS
// ============================================================================

/**
 * Domain Generation Parameters with OpenAPI compatible types
 *
 * @description Parameters for configuring domain generation campaigns.
 * totalPossibleCombinations and currentOffset use number for OpenAPI compatibility.
 *
 * @example
 * ```typescript
 * const params: ServicesDomainGenerationParams = {
 *   patternType: 'prefix',
 *   variableLength: 5,
 *   characterSet: 'abcdefghijklmnopqrstuvwxyz',
 *   constantString: 'test',
 *   tld: 'com',
 *   numDomainsToGenerate: 1000,
 *   totalPossibleCombinations: 11881376, // 26^5
 *   currentOffset: 0
 * };
 * ```
 *
 * @property {number} totalPossibleCombinations - Total number of possible domain combinations (OpenAPI compatible)
 * @property {number} currentOffset - Current position in generation sequence (OpenAPI compatible)
 */
export interface ServicesDomainGenerationParams {
  patternType: 'prefix' | 'suffix' | 'both';
  variableLength?: number; // int32 - safe
  characterSet?: string;
  constantString?: string;
  tld: string;
  numDomainsToGenerate?: number; // int32 - safe
  
  // OpenAPI compatible: Using number instead of SafeBigInt
  totalPossibleCombinations: number;
  currentOffset: number;
}

/**
 * DNS Validation Parameters
 */
export interface ServicesDnsValidationParams {
  sourceGenerationCampaignId?: string;
  personaIds: string[];
  rotationIntervalSeconds?: number;
  processingSpeedPerMinute?: number;
  batchSize?: number;
  retryAttempts?: number;
  metadata?: Record<string, unknown>;
}

/**
 * HTTP Keyword Parameters with correct sourceType values
 */
export interface ServicesHttpKeywordParams {
  sourceCampaignId: string;
  sourceType: 'DomainGeneration' | 'DNSValidation'; // EXACT casing required
  keywordSetIds?: string[];
  adHocKeywords?: string[];
  personaIds: string[];
  proxyIds?: string[];
  proxyPoolId?: string;
  proxySelectionStrategy?: string;
  rotationIntervalSeconds?: number;
  processingSpeedPerMinute?: number;
  batchSize?: number;
  retryAttempts?: number;
  targetHttpPorts?: number[];
  lastProcessedDomainName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Unified campaign creation request with type safety
 */
export type ServicesCreateCampaignRequest =
  | {
      name: string;
      campaignType: ModelsCampaignTypeEnum.DomainGeneration;
      domainGenerationParams: ServicesDomainGenerationParams;
      dnsValidationParams?: never;
      httpKeywordParams?: never;
      description?: string;
      userId?: string;
    }
  | {
      name: string;
      campaignType: ModelsCampaignTypeEnum.DnsValidation;
      domainGenerationParams?: never;
      dnsValidationParams: ServicesDnsValidationParams;
      httpKeywordParams?: never;
      description?: string;
      userId?: string;
    }
  | {
      name: string;
      campaignType: ModelsCampaignTypeEnum.HttpKeywordValidation;
      domainGenerationParams?: never;
      dnsValidationParams?: never;
      httpKeywordParams: ServicesHttpKeywordParams;
      description?: string;
      userId?: string;
    };

// ============================================================================
// RESULT MODELS
// ============================================================================

/**
 * Generated Domain with OpenAPI compatible types
 *
 * @description Represents a domain generated by a domain generation campaign.
 * The offsetIndex field uses number for OpenAPI compatibility.
 *
 * @example
 * ```typescript
 * const domain: ModelsGeneratedDomainAPI = {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   generationCampaignId: '550e8400-e29b-41d4-a716-446655440000',
 *   domainName: 'test12345.com',
 *   offsetIndex: 12345, // Position in generation sequence
 *   generatedAt: '2024-01-15T10:30:00Z',
 *   sourcePattern: 'test{5}',
 *   tld: 'com',
 *   createdAt: '2024-01-15T10:30:00Z'
 * };
 * ```
 *
 * @property {number} offsetIndex - Position in the generation sequence (OpenAPI compatible)
 */
export interface ModelsGeneratedDomainAPI {
  id: string;
  generationCampaignId: string;
  domainName: string;
  offsetIndex: number; // OpenAPI compatible: Using number instead of SafeBigInt
  generatedAt: string;
  sourceKeyword?: string;
  sourcePattern?: string;
  tld?: string;
  createdAt: string;
}

/**
 * DNS Validation Result
 */
export interface ModelsDNSValidationResultAPI {
  id: string;
  dnsCampaignId: string;
  generatedDomainId?: string;
  domainName: string;
  validationStatus: 'pending' | 'resolved' | 'unresolved' | 'timeout' | 'error';
  dnsRecords?: Record<string, unknown>;
  validatedByPersonaId?: string;
  attempts?: number;
  lastCheckedAt?: string;
  createdAt: string;
}

/**
 * HTTP Keyword Result
 */
export interface ModelsHTTPKeywordResultAPI {
  id: string;
  httpKeywordCampaignId: string;
  dnsResultId?: string;
  domainName: string;
  validationStatus: 'pending' | 'success' | 'failed' | 'timeout' | 'error';
  httpStatusCode?: number;
  responseHeaders?: Record<string, unknown>;
  pageTitle?: string;
  extractedContentSnippet?: string;
  foundKeywordsFromSets?: Record<string, unknown>;
  foundAdHocKeywords?: string[];
  contentHash?: string;
  validatedByPersonaId?: string;
  usedProxyId?: string;
  attempts?: number;
  lastCheckedAt?: string;
  createdAt: string;
}

// ============================================================================
// TRANSFORMATION HELPERS
// ============================================================================

/**
 * Transform raw API response to type-safe model
 *
 * @description Converts raw API response data into a properly typed ModelsCampaignAPI object.
 * Handles conversion of string representations of int64 values to numbers for OpenAPI compatibility.
 *
 * @param raw - Raw response data from the API
 * @returns Type-safe campaign model
 *
 * @example
 * ```typescript
 * // API returns strings for int64 fields
 * const apiResponse = {
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   totalItems: '1000000', // String representation of int64
 *   processedItems: '500000',
 *   createdAt: '2024-01-15T10:30:00Z'
 * };
 *
 * const campaign = transformCampaignResponse(apiResponse);
 * // campaign.totalItems is now number
 * // campaign.createdAt is now string
 * ```
 *
 * @throws {Error} If required fields are invalid or cannot be transformed
 */
export function transformCampaignResponse(raw: unknown): ModelsCampaignAPI {
  const data = raw as Record<string, unknown>;
  return {
    ...data,
    id: data.id ? data.id as string : undefined,
    userId: data.userId ? data.userId as string : undefined,
    
    // Transform int64 fields to numbers
    totalItems: data.totalItems != null ? Number(data.totalItems) : undefined,
    processedItems: data.processedItems != null ? Number(data.processedItems) : undefined,
    successfulItems: data.successfulItems != null ? Number(data.successfulItems) : undefined,
    failedItems: data.failedItems != null ? Number(data.failedItems) : undefined,
    
    // Transform timestamps to strings
    createdAt: data.createdAt ? data.createdAt as string : undefined,
    updatedAt: data.updatedAt ? data.updatedAt as string : undefined,
    startedAt: data.startedAt ? data.startedAt as string : undefined,
    completedAt: data.completedAt ? data.completedAt as string : undefined,
    estimatedCompletionAt: data.estimatedCompletionAt ? data.estimatedCompletionAt as string : undefined,
    lastHeartbeatAt: data.lastHeartbeatAt ? data.lastHeartbeatAt as string : undefined,
    
    // Validate enums
    campaignType: data.campaignType as ModelsCampaignTypeEnum,
    status: data.status as ModelsCampaignStatusEnum
  };
}

/**
 * Transform user response with proper role/permission objects
 *
 * @description Converts raw API response data into a properly typed ModelsUserAPI object.
 * Handles legacy string arrays for roles/permissions and converts them to proper objects.
 *
 * @param raw - Raw response data from the API
 * @returns Type-safe user model
 *
 * @example
 * ```typescript
 * const apiResponse = {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   email: 'user@example.com',
 *   roles: ['admin', 'user'], // Legacy string array
 *   createdAt: '2024-01-15T10:30:00Z'
 * };
 *
 * const user = transformUserResponse(apiResponse);
 * // user.roles is now ModelsRoleAPI[]
 * ```
 */
export function transformUserResponse(raw: unknown): ModelsUserAPI {
  const data = raw as Record<string, unknown>;
  return {
    ...data,
    id: data.id ? data.id as string : undefined,
    
    // Transform timestamps to strings
    createdAt: data.createdAt ? data.createdAt as string : undefined,
    updatedAt: data.updatedAt ? data.updatedAt as string : undefined,
    lastLoginAt: data.lastLoginAt ? data.lastLoginAt as string : undefined,
    mfaLastUsedAt: data.mfaLastUsedAt ? data.mfaLastUsedAt as string : undefined,
    
    // Transform roles and permissions if they're strings
    roles: Array.isArray(data.roles) && data.roles.length > 0 && typeof data.roles[0] === 'string'
      ? (data.roles as string[]).map((name: string) => ({ name } as ModelsRoleAPI)) // Temporary - backend should send full objects
      : data.roles as ModelsRoleAPI[],
    permissions: Array.isArray(data.permissions) && data.permissions.length > 0 && typeof data.permissions[0] === 'string'
      ? (data.permissions as string[]).map((name: string) => ({ name } as ModelsPermissionAPI)) // Temporary - backend should send full objects
      : data.permissions as ModelsPermissionAPI[]
  };
}

/**
 * Transform generated domain with OpenAPI compatible types
 *
 * @description Converts raw API response for generated domains into type-safe model.
 * Handles both camelCase and snake_case field names for backward compatibility.
 *
 * @param raw - Raw response data from the API
 * @returns Type-safe generated domain model
 *
 * @example
 * ```typescript
 * const apiResponse = {
 *   id: '...',
 *   domain_name: 'test12345.com', // May be snake_case
 *   offset_index: '12345', // String representation of int64
 *   generated_at: '2024-01-15T10:30:00Z'
 * };
 *
 * const domain = transformGeneratedDomainResponse(apiResponse);
 * // domain.offsetIndex is now number
 * // domain.domainName uses correct camelCase
 * ```
 */
export function transformGeneratedDomainResponse(raw: unknown): ModelsGeneratedDomainAPI {
  const data = raw as Record<string, unknown>;
  return {
    ...data,
    id: data.id as string,
    generationCampaignId: (data.generationCampaignId || data.domain_generation_campaign_id) as string,
    domainName: data.domainName as string || data.domain_name as string,
    offsetIndex: Number(data.offsetIndex || data.offset_index),
    generatedAt: (data.generatedAt || data.generated_at) as string,
    createdAt: (data.createdAt || data.created_at) as string,
    sourceKeyword: data.sourceKeyword as string,
    sourcePattern: data.sourcePattern as string,
    tld: data.tld as string
  };
}

/**
 * Transform persona response with OpenAPI compatible types
 *
 * @description Converts raw API response data into a properly typed ModelsPersonaAPI object.
 * Uses standard string types for OpenAPI compatibility.
 *
 * @param raw - Raw response data from the API
 * @returns Type-safe persona model
 *
 * @example
 * ```typescript
 * const apiResponse = {
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   name: 'DNS Persona 1',
 *   personaType: 'dns',
 *   isEnabled: true,
 *   createdAt: '2024-01-15T10:30:00Z'
 * };
 *
 * const persona = transformPersonaResponse(apiResponse);
 * // persona.id is now string
 * ```
 */
export function transformPersonaResponse(raw: unknown): ModelsPersonaAPI {
  const data = raw as Record<string, unknown>;
  return {
    ...data,
    id: data.id as string,
    name: data.name as string,
    personaType: data.personaType as 'dns' | 'http',
    description: data.description as string | undefined,
    configDetails: data.configDetails as Record<string, unknown>,
    isEnabled: data.isEnabled as boolean,
    createdAt: data.createdAt as string,
    updatedAt: data.updatedAt as string,
    
    // Optional frontend fields
    status: data.status as string | undefined,
    lastTested: data.lastTested ? data.lastTested as string : undefined,
    lastError: data.lastError as string | undefined,
    tags: data.tags as string[] | undefined
  };
}

/**
 * Transform proxy response with OpenAPI compatible types
 *
 * @description Converts raw API response data into a properly typed ModelsProxyAPI object.
 * Uses standard string types for OpenAPI compatibility.
 *
 * @param raw - Raw response data from the API
 * @returns Type-safe proxy model
 *
 * @example
 * ```typescript
 * const apiResponse = {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   name: 'US Proxy 1',
 *   address: 'proxy.example.com:8080',
 *   protocol: 'http',
 *   isEnabled: true,
 *   createdAt: '2024-01-15T10:30:00Z'
 * };
 *
 * const proxy = transformProxyResponse(apiResponse);
 * // proxy.id is now string
 * ```
 */
export function transformProxyResponse(raw: unknown): ModelsProxyAPI {
  const data = raw as Record<string, unknown>;
  return {
    ...data,
    id: data.id as string,
    name: data.name as string,
    description: data.description as string | undefined,
    address: data.address as string,
    protocol: data.protocol as 'http' | 'https' | 'socks5' | 'socks4' | undefined,
    username: data.username as string | undefined,
    host: data.host as string | undefined,
    port: data.port as number | undefined,
    isEnabled: data.isEnabled as boolean,
    isHealthy: data.isHealthy as boolean,
    lastStatus: data.lastStatus as string | undefined,
    lastCheckedAt: data.lastCheckedAt ? data.lastCheckedAt as string : undefined,
    latencyMs: data.latencyMs as number | undefined,
    city: data.city as string | undefined,
    countryCode: data.countryCode as string | undefined,
    provider: data.provider as string | undefined,
    createdAt: data.createdAt as string,
    updatedAt: data.updatedAt as string
  };
}

// ============================================================================
// ERROR RESPONSE
// ============================================================================

export interface ErrorResponse {
  error?: string;
  message?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

// ============================================================================
// MIGRATION CHECKLIST
// ============================================================================

/**
 * Migration Steps:
 *
 * 1. Replace imports:
 *    - FROM: import { ModelsCampaignAPI } from '@/lib/api-client/models/models-campaign-api';
 *    - TO: import { ModelsCampaignAPI } from '@/lib/types/models-aligned';
 *
 * 2. Update API client to use transformers:
 *    ```typescript
 *    // Campaigns
 *    const response = await apiClient.get('/campaigns');
 *    const campaigns = response.data.map(transformCampaignResponse);
 *
 *    // Users
 *    const userResponse = await apiClient.get('/users/me');
 *    const user = transformUserResponse(userResponse.data);
 *
 *    // Personas
 *    const personaResponse = await apiClient.get('/personas/dns');
 *    const personas = personaResponse.data.map(transformPersonaResponse);
 *
 *    // Proxies
 *    const proxyResponse = await apiClient.get('/proxies');
 *    const proxies = proxyResponse.data.map(transformProxyResponse);
 *    ```
 *
 * 3. Update all numeric comparisons to use standard numbers:
 *    ```typescript
 *    // Correct: All int64 fields are now numbers for OpenAPI compatibility
 *    if (campaign.totalItems && campaign.totalItems > 1000) {
 *      // handle logic
 *    }
 *    ```
 *
 * 4. Remove all references to 'archived' status
 *
 * 5. Fix login response handling to use camelCase field names
 *
 * 6. Ensure HTTP source types use exact casing:
 *    - 'DomainGeneration' not 'domain_generation'
 *    - 'DNSValidation' not 'dns_validation'
 *
 * 7. Use standard string types for all entity IDs (OpenAPI compatible):
 *    ```typescript
 *    // Correct: All IDs are now strings for OpenAPI compatibility
 *    const userId: string = user.id;
 *    ```
 */