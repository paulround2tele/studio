// src/lib/types/index.ts
// Configuration-driven type definitions for DomainFlow
// NO HARDCODING - All values come from configuration or environment

/**
 * Configuration-driven User type that adapts to different environments
 * Uses OpenAPI spec as baseline but allows for environment customization
 */
export interface User {
  // Core required fields (from OpenAPI User schema)
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Extended fields that may vary by environment
  lastLoginIp?: string;
  mfaLastUsedAt?: string;
  
  // Future extensibility - allows additional properties from config
  [key: string]: unknown;
}

/**
 * Generic API response wrapper that adapts to different response formats
 */
export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  error?: string;
  metadata?: {
    page?: PaginationInfo;
    [key: string]: unknown;
  };
}

/**
 * Configurable pagination interface
 */
export interface PaginationInfo {
  current: number;
  total: number;
  pageSize: number;
  count: number;
}

/**
 * Authentication state interface with environment-aware configuration
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Configurable authentication credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  captchaToken?: string; // Environment-dependent
}

/**
 * Campaign types from OpenAPI schema
 */
export type CampaignType = 
  | 'domain_generation'
  | 'dns_validation'
  | 'http_keyword_validation';

/**
 * Campaign status from OpenAPI schema
 */
export type CampaignStatus = 
  | 'pending'
  | 'queued'
  | 'running'
  | 'pausing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'archived'
  | 'cancelled';

/**
 * Environment-configurable Campaign interface
 */
export interface Campaign {
  id: string;
  name: string;
  campaignType: CampaignType;
  status: CampaignStatus;
  userId: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  lastHeartbeatAt?: string;
  estimatedCompletionAt?: string;
  errorMessage?: string;
  
  // Progress tracking
  totalItems?: number;
  processedItems?: number;
  successfulItems?: number;
  failedItems?: number;
  progressPercentage?: number;
  avgProcessingRate?: number;
  
  // Extensible metadata
  metadata?: Record<string, unknown>;
}

/**
 * Persona types from OpenAPI schema
 */
export type PersonaType = 'dns' | 'http';

/**
 * Configurable Persona interface
 */
export interface Persona {
  id: string;
  name: string;
  description?: string;
  personaType: PersonaType;
  isEnabled: boolean;
  configDetails: Record<string, unknown>; // Type-specific config
  createdAt: string;
  updatedAt: string;
}

/**
 * Proxy protocol types from OpenAPI schema
 */
export type ProxyProtocol = 'http' | 'https' | 'socks5' | 'socks4';

/**
 * Environment-configurable Proxy interface
 */
export interface Proxy {
  id: string;
  name: string;
  description?: string;
  protocol: ProxyProtocol;
  address: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string; // Masked in responses
  countryCode?: string;
  city?: string;
  provider?: string;
  isEnabled: boolean;
  isHealthy?: boolean;
  lastCheckedAt?: string;
  lastStatus?: string;
  latencyMs?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * WebSocket connection status interface
 */
export interface WebSocketConnectionStatus {
  connectionKey: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  isOperational: boolean;
  isTestConnection: boolean;
  lastConnected?: Date;
  lastError?: string;
  retryCount?: number;
}

/**
 * Error types for better error handling
 */
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Configuration interface for runtime configuration
 */
export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };
  websocket: {
    url: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
  };
  features: {
    enableDebugMode: boolean;
    enableRealTimeUpdates: boolean;
    enableAnalytics: boolean;
    enableOfflineMode: boolean;
  };
  // Extensible for environment-specific config
  [key: string]: unknown;
}

/**
 * Loading operation identifiers - configurable per environment
 */
export const LOADING_OPERATIONS = {
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  SESSION_CHECK: 'auth.session_check',
  CAMPAIGN_CREATE: 'campaign.create',
  CAMPAIGN_START: 'campaign.start',
  CAMPAIGN_PAUSE: 'campaign.pause',
  WEBSOCKET_CONNECT: 'websocket.connect',
  // Extensible for new operations
} as const;

export type LoadingOperation = typeof LOADING_OPERATIONS[keyof typeof LOADING_OPERATIONS];

/**
 * Re-export commonly used types for convenience
 */
export type {
  // Standard types that might be extended
  ComponentProps,
  ReactNode,
  MouseEvent,
  FormEvent,
  ChangeEvent,
} from 'react';

/**
 * Utility type for making all properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Utility type for making specific properties required
 */
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Environment-aware type guards
 */
export const isUser = (obj: unknown): obj is User => {
  return obj !== null && typeof obj === 'object' &&
         typeof (obj as Record<string, unknown>).id === 'string' &&
         typeof (obj as Record<string, unknown>).email === 'string';
};

export const isCampaign = (obj: unknown): obj is Campaign => {
  return obj !== null && typeof obj === 'object' &&
         typeof (obj as Record<string, unknown>).id === 'string' &&
         typeof (obj as Record<string, unknown>).name === 'string';
};

export const isApiResponse = <T>(obj: unknown): obj is ApiResponse<T> => {
  return obj !== null && typeof obj === 'object' &&
         ['success', 'error'].includes((obj as Record<string, unknown>).status as string);
};

/**
 * Configuration validation helpers
 */
export const validateConfig = (config: Partial<AppConfig>): config is AppConfig => {
  return !!(
    config.api?.baseUrl &&
    config.websocket?.url &&
    typeof config.features === 'object'
  );
};

// Export default configuration schema for validation
export const DEFAULT_CONFIG_SCHEMA: AppConfig = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
    timeout: 30000,
    retryAttempts: 3,
  },
  websocket: {
    url: process.env.NEXT_PUBLIC_WS_URL || (typeof window !== 'undefined' ?
      `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v2/ws` :
      '/api/v2/ws'),
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  },
  features: {
    enableDebugMode: process.env.NODE_ENV === 'development',
    enableRealTimeUpdates: true,
    enableAnalytics: process.env.NODE_ENV === 'production',
    enableOfflineMode: false,
  },
};