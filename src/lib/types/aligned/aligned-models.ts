/**
 * Aligned TypeScript Models
 *
 * These interfaces are strictly aligned with Go backend contracts
 * All int64 fields use number (OpenAPI compatible)
 * All enums match Go values exactly (case-sensitive)
 *
 * Generated: 2025-06-30
 * Source of Truth: Go Backend (backend/internal/models/)
 */

// Using OpenAPI compatible types instead of branded types
export type IPAddress = string;

// ============================================
// ENUMS - Exact match with Go backend
// ============================================

export enum CampaignStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  PAUSING = 'pausing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
  // NOTE: 'archived' is NOT a valid status in backend
}

export enum CampaignType {
  DOMAIN_GENERATION = 'domain_generation',
  DNS_VALIDATION = 'dns_validation',
  HTTP_KEYWORD_VALIDATION = 'http_keyword_validation'
  // NOTE: 'keyword_validate' is deprecated and should not be used
}

export enum HTTPSourceType {
  DOMAIN_GENERATION = 'DomainGeneration',  // PascalCase required!
  DNS_VALIDATION = 'DNSValidation'         // PascalCase required!
}

export enum PersonaType {
  DNS = 'dns',
  HTTP = 'http'
}

export enum ProxyProtocol {
  HTTP = 'http',
  HTTPS = 'https',
  SOCKS5 = 'socks5',
  SOCKS4 = 'socks4'
}

export enum DomainPatternType {
  FIXED = 'fixed',
  VARIABLE = 'variable',
  HYBRID = 'hybrid'
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

// ============================================
// CORE MODELS
// ============================================

export interface Campaign {
  id: string;
  name: string;
  campaignType: CampaignType;
  status: CampaignStatus;
  userId?: string;
  
  // Int64 fields - use number (OpenAPI compatible)
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  
  progressPercentage?: number;
  metadata?: Record<string, unknown>;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  
  // Additional fields from DB
  estimatedCompletionAt?: string;
  avgProcessingRate?: number;
  lastHeartbeatAt?: string;
  
  errorMessage?: string;
  
  // Related params (populated via joins)
  domainGenerationParams?: DomainGenerationParams;
  dnsValidationParams?: DNSValidationParams;
  httpKeywordParams?: HTTPKeywordParams;
}

export interface DomainGenerationParams {
  id: string;
  campaignId: string;
  patternType: DomainPatternType;
  tld: string;
  constantString?: string;
  variableLength: number;
  characterSet: string;
  numDomainsToGenerate: number;
  
  // These fields use number (OpenAPI compatible)
  totalPossibleCombinations: number;
  currentOffset: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface DNSValidationParams {
  id: string;
  campaignId: string;
  dnsServers: string[];
  recordTypes: string[];
  timeout: number;
  retries: number;
  batchSize: number;
  sourceCampaignId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface HTTPKeywordParams {
  id: string;
  campaignId: string;
  targetUrl: string;
  keywordSetId?: string;
  
  // These fields use OpenAPI types
  sourceType: HTTPSourceType;  // Required field! Uses HTTPSourceType enum (DomainGeneration or DNSValidation)
  sourceCampaignId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  isActive: boolean;
  isLocked: boolean;
  failedLoginAttempts: number;
  lockedUntil?: string;
  lastLoginAt?: string;
  lastLoginIp?: IPAddress;
  mfaEnabled: boolean;
  mustChangePassword: boolean;
  passwordChangedAt: string;
  
  // Computed fields
  name?: string;  // firstName + " " + lastName
  
  // Relations
  roles?: Role[];
  permissions?: Permission[];
}

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;  // Computed: firstName + " " + lastName
  avatarUrl?: string;
  isActive: boolean;
  roles?: Role[];
  permissions?: Permission[];
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Persona {
  id: string;
  name: string;
  description?: string;
  personaType: PersonaType;
  configDetails: Record<string, unknown>;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  
  // NOTE: These fields exist in frontend but NOT in backend:
  // status?: string;
  // lastTested?: string;
  // lastError?: string;
  // tags?: string[];
}

export interface Proxy {
  id: string;
  name: string;
  description?: string;
  address: string;
  protocol: ProxyProtocol;
  username?: string;
  // password is never exposed to frontend
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

export interface GeneratedDomain {
  id: string;
  campaignId: string;
  domain: string;
  offsetIndex: number;  // Int64 field - use number (OpenAPI compatible)
  generatedAt: string;
  validatedAt?: string;
  isValid?: boolean;
  validationError?: string;
  metadata?: Record<string, unknown>;
}

export interface CampaignJob {
  id: string;
  campaignId: string;
  jobType: string;
  status: JobStatus;
  startOffset: number;  // Int64 - use number (OpenAPI compatible)
  endOffset: number;    // Int64 - use number (OpenAPI compatible)
  itemsInBatch: number; // Int64 - use number (OpenAPI compatible)
  successfulItems: number; // Int64 - use number (OpenAPI compatible)
  failedItems: number;   // Int64 - use number (OpenAPI compatible)
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  retryCount: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function isValidIPAddress(value: string): value is IPAddress {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  return ipv4Regex.test(value) || ipv6Regex.test(value);
}

export function createIPAddress(value: string): IPAddress {
  if (!isValidIPAddress(value)) {
    throw new Error(`Invalid IP address format: ${value}`);
  }
  return value as IPAddress;
}

// Helper functions for validation
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function isValidISODate(value: string): boolean {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return false;
  }
  const isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
  return isoRegex.test(value);
}

export function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}