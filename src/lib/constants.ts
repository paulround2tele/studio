// src/lib/constants.ts - Frontend Constants Synchronized with Backend Go Constants
// Perfect alignment with backend/internal/models/models.go and auth_models.go

// ===== CAMPAIGN TYPE CONSTANTS =====
export const CAMPAIGN_TYPES = {
DOMAIN_GENERATION: "domain_generation",
  DNS_VALIDATION: "dns_validation",
  HTTP_KEYWORD_VALIDATION: "http_keyword_validation"
} as const;

// ===== CAMPAIGN STATUS CONSTANTS =====
export const CAMPAIGN_STATUSES = {
PENDING: "pending",
  QUEUED: "queued",
  RUNNING: "running",
  PAUSING: "pausing",
  PAUSED: "paused",
  COMPLETED: "completed",
  FAILED: "failed",
  ARCHIVED: "archived",
  CANCELLED: "cancelled"
} as const;

// ===== PERSONA TYPE CONSTANTS =====
export const PERSONA_TYPES = {
DNS: "dns",
  HTTP: "http"
} as const;

// ===== PROXY PROTOCOL CONSTANTS =====
export const PROXY_PROTOCOLS = {
HTTP: "http",
  HTTPS: "https",
  SOCKS5: "socks5",
  SOCKS4: "socks4"
} as const;

// ===== KEYWORD RULE TYPE CONSTANTS =====
export const KEYWORD_RULE_TYPES = {
STRING: "string",
  REGEX: "regex"
} as const;

// ===== CAMPAIGN JOB STATUS CONSTANTS =====
export const CAMPAIGN_JOB_STATUSES = {
PENDING: "pending",
  QUEUED: "queued",
  RUNNING: "running",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  RETRY: "retry"
} as const;

// ===== VALIDATION STATUS CONSTANTS =====
export const VALIDATION_STATUSES = {
PENDING: "pending",
  VALID: "valid",
  INVALID: "invalid",
  ERROR: "error",
  SKIPPED: "skipped"
} as const;

// ===== DNS VALIDATION STATUS CONSTANTS =====
export const DNS_VALIDATION_STATUSES = {
RESOLVED: "resolved",
  UNRESOLVED: "unresolved",
  TIMEOUT: "timeout",
  ERROR: "error"
} as const;

// ===== HTTP VALIDATION STATUS CONSTANTS =====
export const HTTP_VALIDATION_STATUSES = {
SUCCESS: "success",
  FAILED: "failed",
  TIMEOUT: "timeout",
  ERROR: "error"
} as const;

// ===== AUTHENTICATION EVENT TYPES =====
export const AUTH_EVENT_TYPES = {
LOGIN: "login",
  LOGOUT: "logout",
  FAILED_LOGIN: "failed_login",
  PASSWORD_CHANGE: "password_change",
  PASSWORD_RESET: "password_reset",
  ACCOUNT_LOCKED: "account_locked",
  SESSION_EXPIRED: "session_expired",
  MFA_ENABLED: "mfa_enabled",
  MFA_DISABLED: "mfa_disabled",
  MFA_CHALLENGE: "mfa_challenge",
  MFA_SUCCESS: "mfa_success",
  MFA_FAILED: "mfa_failed"
} as const;

// ===== AUTHENTICATION EVENT STATUSES =====
export const AUTH_EVENT_STATUSES = {
SUCCESS: "success",
  FAILED: "failed",
  BLOCKED: "blocked",
  TIMEOUT: "timeout"
} as const;

// ===== DOMAIN GENERATION PATTERN TYPES =====
export const DOMAIN_GENERATION_PATTERNS = {
PREFIX: "prefix",
  SUFFIX: "suffix",
  BOTH: "both"
} as const;

// ===== DNS RESOLVER STRATEGIES =====
export const DNS_RESOLVER_STRATEGIES = {
RANDOM_ROTATION: "random_rotation",
  SEQUENTIAL_FAILOVER: "sequential_failover",
  SPECIFIC_ORDER: "specific_order",
  WEIGHTED_ROTATION: "weighted_rotation"
} as const;

// ===== TLS VERSIONS =====
export const TLS_VERSIONS = {
TLS10: "TLS10",
  TLS11: "TLS11",
  TLS12: "TLS12",
  TLS13: "TLS13"
} as const;

// ===== HTTP COOKIE HANDLING MODES =====
export const HTTP_COOKIE_MODES = {
SESSION: "session",
  NONE: "none",
  IGNORE: "ignore"
} as const;

// ===== DEFAULT CONFIGURATION VALUES =====
export const DEFAULT_CONFIG = {
DNS: {
QUERY_TIMEOUT_SECONDS: 10,
    MAX_DOMAINS_PER_REQUEST: 100,
    CONCURRENT_QUERIES_PER_DOMAIN: 3,
    QUERY_DELAY_MIN_MS: 100,
    QUERY_DELAY_MAX_MS: 1000,
    MAX_CONCURRENT_GOROUTINES: 10,
    RATE_LIMIT_DPS: 100.0,
    RATE_LIMIT_BURST: 10
},
  HTTP: {
REQUEST_TIMEOUT_SECONDS: 30,
    RATE_LIMIT_DPS: 10.0,
    RATE_LIMIT_BURST: 5,
    USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
},
  CAMPAIGN: {
BATCH_SIZE: 100,
    RETRY_ATTEMPTS: 3,
    PROCESSING_SPEED_PER_MINUTE: 1000,
    ROTATION_INTERVAL_SECONDS: 300
}
} as const;

// ===== SESSION CONSTANTS =====
export const SESSION_CONFIG = {
DEFAULT_TIMEOUT_MINUTES: 30,
  REMEMBER_ME_DAYS: 7,
  MAX_SESSIONS_PER_USER: 5,
  SESSION_COOKIE_NAME: "domainflow_session"
} as const;

// ===== RATE LIMITING CONSTANTS =====
export const RATE_LIMITS = {
LOGIN_ATTEMPTS: {
MAX_ATTEMPTS: 5,
    WINDOW_MINUTES: 15,
    LOCKOUT_MINUTES: 30
},
  API_REQUESTS: {
REQUESTS_PER_MINUTE: 100,
    BURST_SIZE: 20
},
  PASSWORD_RESET: {
MAX_ATTEMPTS: 3,
    WINDOW_MINUTES: 60
}
} as const;

// ===== VALIDATION CONSTANTS =====
export const VALIDATION_RULES = {
PASSWORD: {
MIN_LENGTH: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true
},
  EMAIL: {
MAX_LENGTH: 254
},
  NAMES: {
MIN_LENGTH: 1,
    MAX_LENGTH: 100
}
} as const;

// ===== ERROR CODES =====
export const ERROR_CODES = {
  // Authentication errors,
INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  ACCOUNT_DISABLED: "ACCOUNT_DISABLED",
  RATE_LIMITED: "RATE_LIMITED",

  // Validation errors,
VALIDATION_FAILED: "VALIDATION_FAILED",
  REQUIRED_FIELD_MISSING: "REQUIRED_FIELD_MISSING",
  INVALID_FORMAT: "INVALID_FORMAT",

  // Resource errors,
RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  RESOURCE_CONFLICT: "RESOURCE_CONFLICT",
  RESOURCE_LOCKED: "RESOURCE_LOCKED",

  // System errors,
INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  DATABASE_ERROR: "DATABASE_ERROR"
} as const;

// ===== WEBSOCKET CONSTANTS =====
export const WEBSOCKET_CONFIG = {
RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY_MS: 1000,
  HEARTBEAT_INTERVAL_MS: 30000,
  CONNECTION_TIMEOUT_MS: 10000
} as const;

// ===== LEGACY COMPATIBILITY CONSTANTS =====
export const LEGACY_CAMPAIGN_PHASES = {
IDLE: "setup",
  DOMAIN_GENERATION: "DomainGeneration",
  DNS_VALIDATION: "DNSValidation",
  HTTP_VALIDATION: "HTTPValidation",
  LEAD_GENERATION: "LeadGeneration",
  COMPLETED: "completed",
  FAILED: "failed"
} as const;

export const LEGACY_PHASE_STATUSES = {
PENDING: "pending",
  IN_PROGRESS: "in_progress",
  SUCCEEDED: "completed",
  FAILED: "failed",
  IDLE: "setup",
  PAUSED: "paused"
} as const;

// ===== DISPLAY NAMES FOR UI =====
export const DISPLAY_NAMES = {
CAMPAIGN_TYPES: {
    [CAMPAIGN_TYPES.DOMAIN_GENERATION]: "Domain Generation",
    [CAMPAIGN_TYPES.DNS_VALIDATION]: "DNS Validation",
    [CAMPAIGN_TYPES.HTTP_KEYWORD_VALIDATION]: "HTTP Keyword Validation"
},
  CAMPAIGN_STATUSES: {
    [CAMPAIGN_STATUSES.PENDING]: "pending",
    [CAMPAIGN_STATUSES.QUEUED]: "Queued",
    [CAMPAIGN_STATUSES.RUNNING]: "Running",
    [CAMPAIGN_STATUSES.PAUSING]: "Pausing",
    [CAMPAIGN_STATUSES.PAUSED]: "paused",
    [CAMPAIGN_STATUSES.COMPLETED]: "completed",
    [CAMPAIGN_STATUSES.FAILED]: "failed",
    [CAMPAIGN_STATUSES.ARCHIVED]: "Archived",
    [CAMPAIGN_STATUSES.CANCELLED]: "Cancelled"
},
  PERSONA_TYPES: {
    [PERSONA_TYPES.DNS]: "DNS",
    [PERSONA_TYPES.HTTP]: "HTTP"
},
  PROXY_PROTOCOLS: {
    [PROXY_PROTOCOLS.HTTP]: "HTTP",
    [PROXY_PROTOCOLS.HTTPS]: "HTTPS",
    [PROXY_PROTOCOLS.SOCKS5]: "SOCKS5",
    [PROXY_PROTOCOLS.SOCKS4]: "SOCKS4"
}
} as const;

// ===== TYPE GUARDS =====
export const isValidCampaignType = (
type: string,
): type is keyof typeof CAMPAIGN_TYPES => {
  return Object.values(CAMPAIGN_TYPES).includes(
    type as (typeof CAMPAIGN_TYPES)[keyof typeof CAMPAIGN_TYPES],
  );
};

export const isValidCampaignStatus = (
status: string,
): status is keyof typeof CAMPAIGN_STATUSES => {
  return Object.values(CAMPAIGN_STATUSES).includes(
    status as (typeof CAMPAIGN_STATUSES)[keyof typeof CAMPAIGN_STATUSES],
  );
};

export const isValidPersonaType = (
type: string,
): type is keyof typeof PERSONA_TYPES => {
  return Object.values(PERSONA_TYPES).includes(
    type as (typeof PERSONA_TYPES)[keyof typeof PERSONA_TYPES],
  );
};

export const isValidProxyProtocol = (
protocol: string,
): protocol is keyof typeof PROXY_PROTOCOLS => {
  return Object.values(PROXY_PROTOCOLS).includes(
    protocol as (typeof PROXY_PROTOCOLS)[keyof typeof PROXY_PROTOCOLS],
  );
};

// ===== UTILITY FUNCTIONS =====
export const getDisplayName = (
type: "campaign" | "persona" | "proxy",
  value: string,
): string => {
  switch (type) {
    case "campaign":
      return (
        DISPLAY_NAMES.CAMPAIGN_TYPES[
          value as keyof typeof DISPLAY_NAMES.CAMPAIGN_TYPES
        ] || value
      );
    case "persona":
      return (
        DISPLAY_NAMES.PERSONA_TYPES[
          value as keyof typeof DISPLAY_NAMES.PERSONA_TYPES
        ] || value
      );
    case "proxy":
      return (
        DISPLAY_NAMES.PROXY_PROTOCOLS[
          value as keyof typeof DISPLAY_NAMES.PROXY_PROTOCOLS
        ] || value
      );
default:
      return value;
  }
};

// ===== LEGACY CAMPAIGN PHASE ORDERING =====
export const CAMPAIGN_PHASES_ORDERED: Record<string, string[]> = {
domain_generation: ["DomainGeneration", "DNSValidation", "HTTPValidation"],
  dns_validation: ["DNSValidation", "HTTPValidation"],
  http_keyword_validation: ["HTTPValidation"],
  lead_generation: ["LeadGeneration"]
} as const;

// ===== LEGACY PHASE UTILITY FUNCTIONS =====
export const getNextPhase = (
  campaignType: string,
  currentPhase: string
): string | null => {
  const phases = CAMPAIGN_PHASES_ORDERED[campaignType];
  if (!phases || !Array.isArray(phases)) return null;

  const currentIndex = phases.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex === phases.length - 1) return null;

  return phases[currentIndex + 1] || null;
};

export const getFirstPhase = (campaignType: string): string | null => {
  const phases = CAMPAIGN_PHASES_ORDERED[campaignType];
  return phases && Array.isArray(phases) && phases.length > 0
    ? phases[0] || null
    : null;
};

// ===== PHASE DISPLAY NAMES FOR UI =====
export const phaseDisplayNames: Record<string, string> = {
DomainGeneration: "Domain Generation",
  DNSValidation: "DNS Validation",
  HTTPValidation: "HTTP Validation",
  LeadGeneration: "Lead Generation",
  Idle: "setup",
  Completed: "completed",
  Failed: "failed"
};

// ===== LEGACY COMPATIBILITY EXPORTS =====
export const CAMPAIGN_SELECTED_TYPES = CAMPAIGN_TYPES; // Legacy alias for backwards compatibility
