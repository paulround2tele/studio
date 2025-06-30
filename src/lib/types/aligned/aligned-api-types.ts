/**
 * Aligned API Types
 *
 * Request and response types that exactly match Go backend API contracts
 * All types use aligned models to ensure consistency
 *
 * Generated: 2025-06-30
 * Source of Truth: Go Backend API handlers
 */

import {
  Campaign,
  CampaignType,
  CampaignStatus,
  DomainGenerationParams,
  DNSValidationParams,
  HTTPKeywordParams,
  User,
  PublicUser,
  Persona,
  PersonaType,
  Proxy,
  GeneratedDomain,
  
} from './aligned-models';

// ============================================
// AUTHENTICATION API TYPES
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
  captchaToken?: string;
}

export interface LoginResponse {
  user: PublicUser;
  sessionId: string;
  expiresAt: string;
  requiresCaptcha: boolean;
  mfaRequired?: boolean;
}

export interface RefreshRequest {
  sessionId: string;
}

export interface RefreshResponse {
  sessionId: string;
  expiresAt: string;
}

export interface LogoutRequest {
  sessionId: string;
}

export interface LogoutResponse {
  success: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

// ============================================
// USER MANAGEMENT API TYPES (Currently Missing!)
// ============================================

export interface ListUsersRequest {
  page?: number;
  pageSize?: number;
  search?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface ListUsersResponse {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleIds?: string[];
  mustChangePassword?: boolean;
}

export interface CreateUserResponse {
  user: User;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  isActive?: boolean;
  roleIds?: string[];
  mustChangePassword?: boolean;
}

export interface UpdateUserResponse {
  user: User;
}

export interface DeleteUserRequest {
  userId: string;
}

export interface DeleteUserResponse {
  success: boolean;
}

// ============================================
// CAMPAIGN API TYPES
// ============================================

export interface CreateCampaignRequest {
  name: string;
  campaignType: CampaignType;
  domainGenerationParams?: Omit<DomainGenerationParams, 'id' | 'campaignId' | 'createdAt' | 'updatedAt'>;
  dnsValidationParams?: Omit<DNSValidationParams, 'id' | 'campaignId' | 'createdAt' | 'updatedAt'>;
  httpKeywordParams?: Omit<HTTPKeywordParams, 'id' | 'campaignId' | 'createdAt' | 'updatedAt'>;
  metadata?: Record<string, unknown>;
}

export interface CreateCampaignResponse {
  campaign: Campaign;
}

export interface ListCampaignsRequest {
  page?: number;
  pageSize?: number;
  status?: CampaignStatus;
  campaignType?: CampaignType;
  userId?: string;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface ListCampaignsResponse {
  campaigns: Campaign[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GetCampaignRequest {
  campaignId: string;
}

export interface GetCampaignResponse {
  campaign: Campaign;
}

export interface UpdateCampaignRequest {
  campaignId: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCampaignResponse {
  campaign: Campaign;
}

export interface UpdateCampaignStatusRequest {
  campaignId: string;
  status: CampaignStatus;
  reason?: string;
}

export interface UpdateCampaignStatusResponse {
  campaign: Campaign;
}

export interface DeleteCampaignRequest {
  campaignId: string;
}

export interface DeleteCampaignResponse {
  success: boolean;
}

// ============================================
// PERSONA API TYPES
// ============================================

// NOTE: Backend requires type-specific endpoints!
export interface ListPersonasRequest {
  personaType: PersonaType;  // 'dns' or 'http'
  page?: number;
  pageSize?: number;
  isEnabled?: boolean;
  search?: string;
}

export interface ListPersonasResponse {
  personas: Persona[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreatePersonaRequest {
  personaType: PersonaType;
  name: string;
  description?: string;
  configDetails: Record<string, unknown>;
  isEnabled?: boolean;
}

export interface CreatePersonaResponse {
  persona: Persona;
}

export interface UpdatePersonaRequest {
  personaId: string;
  personaType: PersonaType;  // Required for type-specific endpoint
  name?: string;
  description?: string;
  configDetails?: Record<string, unknown>;
  isEnabled?: boolean;
}

export interface UpdatePersonaResponse {
  persona: Persona;
}

export interface DeletePersonaRequest {
  personaId: string;
  personaType: PersonaType;  // Required for type-specific endpoint
}

export interface DeletePersonaResponse {
  success: boolean;
}

// ============================================
// PROXY API TYPES
// ============================================

export interface ListProxiesRequest {
  page?: number;
  pageSize?: number;
  isEnabled?: boolean;
  isHealthy?: boolean;
  protocol?: string;
  search?: string;
}

export interface ListProxiesResponse {
  proxies: Proxy[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateProxyRequest {
  name: string;
  description?: string;
  address: string;
  protocol: string;
  username?: string;
  password?: string;
  host?: string;
  port?: number;
  isEnabled?: boolean;
}

export interface CreateProxyResponse {
  proxy: Proxy;
}

export interface UpdateProxyRequest {
  proxyId: string;
  name?: string;
  description?: string;
  address?: string;
  protocol?: string;
  username?: string;
  password?: string;
  host?: string;
  port?: number;
  isEnabled?: boolean;
}

export interface UpdateProxyResponse {
  proxy: Proxy;
}

export interface DeleteProxyRequest {
  proxyId: string;
}

export interface DeleteProxyResponse {
  success: boolean;
}

export interface TestProxyRequest {
  proxyId: string;
  targetUrl?: string;
}

export interface TestProxyResponse {
  success: boolean;
  latencyMs?: number;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
}

export interface ProxyHealthCheckRequest {
  proxyIds?: string[];  // If empty, check all proxies
}

export interface ProxyHealthCheckResponse {
  results: Array<{
    proxyId: string;
    isHealthy: boolean;
    latencyMs?: number;
    error?: string;
    checkedAt: string;
  }>;
}

// ============================================
// KEYWORD EXTRACTION API TYPES
// ============================================

export interface ExtractKeywordsRequest {
  url: string;
  maxKeywords?: number;
  minLength?: number;
  includeMetaTags?: boolean;
}

export interface ExtractKeywordsResponse {
  keywords: Array<{
    keyword: string;
    frequency: number;
    relevance: number;
  }>;
  metadata?: {
    title?: string;
    description?: string;
    pageSize: number;
    extractionTime: number;
  };
}

export interface StreamKeywordsRequest {
  urls: string[];
  maxKeywordsPerUrl?: number;
  minLength?: number;
  includeMetaTags?: boolean;
}

// Stream response is handled via WebSocket or SSE

// ============================================
// DOMAIN GENERATION API TYPES
// ============================================

export interface ListGeneratedDomainsRequest {
  campaignId: string;
  page?: number;
  pageSize?: number;
  isValid?: boolean;
  search?: string;
}

export interface ListGeneratedDomainsResponse {
  domains: GeneratedDomain[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ExportDomainsRequest {
  campaignId: string;
  format: 'csv' | 'json' | 'txt';
  isValid?: boolean;
  limit?: number;
  offset?: number;
}

export interface ExportDomainsResponse {
  downloadUrl: string;
  expiresAt: string;
  totalDomains: number;
  fileSize: number;
}

// ============================================
// SYSTEM API TYPES
// ============================================

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;  // milliseconds
  timestamp: string;
  checks: {
    database: boolean;
    redis?: boolean;
    storage?: boolean;
  };
}

export interface SystemStatsResponse {
  campaigns: {
    total: number;
    active: number;
    completed: number;
    failed: number;
  };
  domains: {
    total: number;
    validated: number;
    invalid: number;
  };
  users: {
    total: number;
    active: number;
    locked: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    goroutines: number;
  };
}

// ============================================
// ERROR RESPONSE TYPE
// ============================================

export interface APIError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  requestId?: string;
  timestamp: string;
}

// ============================================
// PAGINATION TYPES
// ============================================

export interface PaginationRequest {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ============================================
// WEBSOCKET MESSAGE TYPES
// ============================================

export enum WebSocketMessageType {
  // Campaign events
  CAMPAIGN_CREATED = 'campaign_created',
  CAMPAIGN_STARTED = 'campaign_started',
  CAMPAIGN_PROGRESS = 'campaign_progress',
  CAMPAIGN_COMPLETED = 'campaign_completed',
  CAMPAIGN_FAILED = 'campaign_failed',
  CAMPAIGN_PAUSED = 'campaign_paused',
  CAMPAIGN_RESUMED = 'campaign_resumed',
  
  // System events
  SYSTEM_NOTIFICATION = 'system_notification',
  SYSTEM_ERROR = 'system_error',
  
  // Proxy events
  PROXY_STATUS_CHANGED = 'proxy_status_changed',
  PROXY_HEALTH_CHECK = 'proxy_health_check',
  
  // Persona events
  PERSONA_STATUS_CHANGED = 'persona_status_changed',
}

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  timestamp: string;
  data: T;
  correlationId?: string;
}

export interface CampaignProgressData {
  campaignId: string;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  progressPercentage: number;
  estimatedTimeRemaining?: number;  // seconds
  currentRate?: number;  // items per second
}

export interface SystemNotificationData {
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface ProxyStatusData {
  proxyId: string;
  isHealthy: boolean;
  latencyMs?: number;
  lastCheckedAt: string;
  error?: string;
}