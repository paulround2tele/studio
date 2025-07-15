/**
 * Enum Helper Utilities
 * Provides type-safe enum operations and validation
 * Updated to use OpenAPI types directly
 */

import type { components } from '@/lib/api-client/types';

// Extract OpenAPI union types
type _CampaignType = components["schemas"]["Campaign"]["campaignType"]; // Unused
type _CampaignStatus = components["schemas"]["Campaign"]["status"]; // Unused
type _PersonaType = components["schemas"]["Persona"]["personaType"]; // Unused
type _ProxyProtocol = components["schemas"]["Proxy"]["protocol"]; // Unused
type _KeywordRuleType = components["schemas"]["KeywordRule"]["ruleType"]; // Unused

// Create enum-like objects for backwards compatibility
export const ModelsCampaignTypeEnum = {
  DomainGeneration: "domain_generation" as const,
  DnsValidation: "dns_validation" as const,
  HttpKeywordValidation: "http_keyword_validation" as const
} as const;

export const ModelsCampaignStatusEnum = {
  Pending: "pending" as const,
  Queued: "queued" as const,
  Running: "running" as const,
  Pausing: "pausing" as const,
  Paused: "paused" as const,
  Completed: "completed" as const,
  Failed: "failed" as const,
  Archived: "archived" as const,
  Cancelled: "cancelled" as const
} as const;

export const ModelsPersonaTypeEnum = {
  Dns: "dns" as const,
  Http: "http" as const
} as const;

export const ModelsProxyProtocolEnum = {
  Http: "http" as const,
  Https: "https" as const,
  Socks5: "socks5" as const,
  Socks4: "socks4" as const
} as const;

export const ModelsKeywordRuleTypeEnum = {
  String: "string" as const,
  Regex: "regex" as const
} as const;

// Type aliases for consistency
export type ModelsCampaignTypeEnumType = typeof ModelsCampaignTypeEnum[keyof typeof ModelsCampaignTypeEnum];
export type ModelsCampaignStatusEnumType = typeof ModelsCampaignStatusEnum[keyof typeof ModelsCampaignStatusEnum];
export type ModelsPersonaTypeEnumType = typeof ModelsPersonaTypeEnum[keyof typeof ModelsPersonaTypeEnum];
export type ModelsProxyProtocolEnumType = typeof ModelsProxyProtocolEnum[keyof typeof ModelsProxyProtocolEnum];
export type ModelsKeywordRuleTypeEnumType = typeof ModelsKeywordRuleTypeEnum[keyof typeof ModelsKeywordRuleTypeEnum];

/**
 * Type-safe enum checker
 */
export function isEnumValue<T extends Record<string, string>>(
  value: unknown,
  enumObj: T
): value is T[keyof T] {
  return typeof value === 'string' && Object.values(enumObj).includes(value);
}

/**
 * Get enum keys with type safety
 */
export function getEnumKeys<T extends Record<string, string>>(
  enumObj: T
): (keyof T)[] {
  return Object.keys(enumObj) as (keyof T)[];
}

/**
 * Get enum values with type safety
 */
export function getEnumValues<T extends Record<string, string>>(
  enumObj: T
): T[keyof T][] {
  return Object.values(enumObj) as T[keyof T][];
}

/**
 * Campaign type helpers
 */
export const CampaignTypeHelpers = {
  isValid: (value: unknown): value is ModelsCampaignTypeEnumType =>
    isEnumValue(value, ModelsCampaignTypeEnum),
  
  getDisplayName: (type: ModelsCampaignTypeEnumType): string => {
    switch (type) {
      case ModelsCampaignTypeEnum.DomainGeneration:
        return 'Domain Generation';
      case ModelsCampaignTypeEnum.DnsValidation:
        return 'DNS Validation';
      case ModelsCampaignTypeEnum.HttpKeywordValidation:
        return 'HTTP Keyword Validation';
      default:
        return exhaustiveCheck(type);
    }
  },
  
  getShortName: (type: ModelsCampaignTypeEnumType): string => {
    switch (type) {
      case ModelsCampaignTypeEnum.DomainGeneration:
        return 'Gen';
      case ModelsCampaignTypeEnum.DnsValidation:
        return 'DNS';
      case ModelsCampaignTypeEnum.HttpKeywordValidation:
        return 'HTTP';
      default:
        return exhaustiveCheck(type);
    }
  },
  
  getIcon: (type: ModelsCampaignTypeEnumType): string => {
    switch (type) {
      case ModelsCampaignTypeEnum.DomainGeneration:
        return '🔧';
      case ModelsCampaignTypeEnum.DnsValidation:
        return '🔍';
      case ModelsCampaignTypeEnum.HttpKeywordValidation:
        return '🌐';
      default:
        return exhaustiveCheck(type);
    }
  }
} as const;

/**
 * Campaign status helpers
 */
export const CampaignStatusHelpers = {
  isValid: (value: unknown): value is ModelsCampaignStatusEnumType =>
    isEnumValue(value, ModelsCampaignStatusEnum),
  
  isActive: (status: ModelsCampaignStatusEnumType): boolean => {
    switch (status) {
      case ModelsCampaignStatusEnum.Running:
      case ModelsCampaignStatusEnum.Pausing:
        return true;
      default:
        return false;
    }
  },
  
  isTerminal: (status: ModelsCampaignStatusEnumType): boolean => {
    switch (status) {
      case ModelsCampaignStatusEnum.Completed:
      case ModelsCampaignStatusEnum.Failed:
      case ModelsCampaignStatusEnum.Cancelled:
        return true;
      default:
        return false;
    }
  },
  
  canStart: (status: ModelsCampaignStatusEnumType): boolean => {
    switch (status) {
      case ModelsCampaignStatusEnum.Pending:
      case ModelsCampaignStatusEnum.Queued:
        return true;
      default:
        return false;
    }
  },
  
  canPause: (status: ModelsCampaignStatusEnumType): boolean => {
    return status === ModelsCampaignStatusEnum.Running;
  },
  
  canResume: (status: ModelsCampaignStatusEnumType): boolean => {
    return status === ModelsCampaignStatusEnum.Paused;
  },
  
  canCancel: (status: ModelsCampaignStatusEnumType): boolean => {
    switch (status) {
      case ModelsCampaignStatusEnum.Pending:
      case ModelsCampaignStatusEnum.Queued:
      case ModelsCampaignStatusEnum.Running:
      case ModelsCampaignStatusEnum.Paused:
      case ModelsCampaignStatusEnum.Pausing:
        return true;
      default:
        return false;
    }
  },
  
  getDisplayName: (status: ModelsCampaignStatusEnumType): string => {
    switch (status) {
      case ModelsCampaignStatusEnum.Pending:
        return 'Pending' as any;
      case ModelsCampaignStatusEnum.Queued:
        return 'Queued';
      case ModelsCampaignStatusEnum.Running:
        return 'Running';
      case ModelsCampaignStatusEnum.Pausing:
        return 'Pausing';
      case ModelsCampaignStatusEnum.Paused:
        return 'paused' as any;
      case ModelsCampaignStatusEnum.Completed:
        return 'completed' as any;
      case ModelsCampaignStatusEnum.Failed:
        return 'Failed' as any;
      case ModelsCampaignStatusEnum.Cancelled:
        return 'Cancelled';
      case ModelsCampaignStatusEnum.Archived:
        return 'Archived';
      default:
        return exhaustiveCheck(status);
    }
  },
  
  getColor: (status: ModelsCampaignStatusEnumType): string => {
    switch (status) {
      case ModelsCampaignStatusEnum.Pending:
      case ModelsCampaignStatusEnum.Queued:
        return 'gray' as any;
      case ModelsCampaignStatusEnum.Running:
        return 'blue' as any;
      case ModelsCampaignStatusEnum.Pausing:
        return 'orange' as any;
      case ModelsCampaignStatusEnum.Paused:
        return 'yellow' as any;
      case ModelsCampaignStatusEnum.Completed:
        return 'green' as any;
      case ModelsCampaignStatusEnum.Failed:
        return 'red' as any;
      case ModelsCampaignStatusEnum.Cancelled:
        return 'gray' as any;
      case ModelsCampaignStatusEnum.Archived:
        return 'gray' as any;
      default:
        return exhaustiveCheck(status);
    }
  }
} as const;

/**
 * Persona type helpers
 */
export const PersonaTypeHelpers = {
  isValid: (value: unknown): value is ModelsPersonaTypeEnumType =>
    isEnumValue(value, ModelsPersonaTypeEnum),
  
  getDisplayName: (type: ModelsPersonaTypeEnumType): string => {
    switch (type) {
      case ModelsPersonaTypeEnum.Dns:
        return 'DNS Persona';
      case ModelsPersonaTypeEnum.Http:
        return 'HTTP Persona';
      default:
        return exhaustiveCheck(type);
    }
  },
  
  getIcon: (type: ModelsPersonaTypeEnumType): string => {
    switch (type) {
      case ModelsPersonaTypeEnum.Dns:
        return '🔍';
      case ModelsPersonaTypeEnum.Http:
        return '🌐';
      default:
        return exhaustiveCheck(type);
    }
  }
} as const;

/**
 * Proxy protocol helpers
 */
export const ProxyProtocolHelpers = {
  isValid: (value: unknown): value is ModelsProxyProtocolEnumType =>
    isEnumValue(value, ModelsProxyProtocolEnum),
  
  getDisplayName: (protocol: ModelsProxyProtocolEnumType): string => {
    switch (protocol) {
      case ModelsProxyProtocolEnum.Http:
        return 'HTTP';
      case ModelsProxyProtocolEnum.Https:
        return 'HTTPS';
      case ModelsProxyProtocolEnum.Socks5:
        return 'SOCKS5';
      case ModelsProxyProtocolEnum.Socks4:
        return 'SOCKS4';
      default:
        return exhaustiveCheck(protocol);
    }
  },
  
  getDefaultPort: (protocol: ModelsProxyProtocolEnumType): number => {
    switch (protocol) {
      case ModelsProxyProtocolEnum.Http:
        return 80;
      case ModelsProxyProtocolEnum.Https:
        return 443;
      case ModelsProxyProtocolEnum.Socks5:
        return 1080;
      case ModelsProxyProtocolEnum.Socks4:
        return 1080;
      default:
        return exhaustiveCheck(protocol);
    }
  },
  
  isSecure: (protocol: ModelsProxyProtocolEnumType): boolean => {
    return protocol === ModelsProxyProtocolEnum.Https;
  }
} as const;

/**
 * Keyword rule type helpers
 */
export const KeywordRuleTypeHelpers = {
  isValid: (value: unknown): value is ModelsKeywordRuleTypeEnumType =>
    isEnumValue(value, ModelsKeywordRuleTypeEnum),
  
  getDisplayName: (type: ModelsKeywordRuleTypeEnumType): string => {
    switch (type) {
      case ModelsKeywordRuleTypeEnum.String:
        return 'Exact Match';
      case ModelsKeywordRuleTypeEnum.Regex:
        return 'Regular Expression';
      default:
        return exhaustiveCheck(type);
    }
  },
  
  getHelpText: (type: ModelsKeywordRuleTypeEnumType): string => {
    switch (type) {
      case ModelsKeywordRuleTypeEnum.String:
        return 'Matches the exact string (case-sensitive option available)';
      case ModelsKeywordRuleTypeEnum.Regex:
        return 'Matches using regular expression pattern';
      default:
        return exhaustiveCheck(type);
    }
  }
} as const;

/**
 * Exhaustive check helper for switch statements
 * Ensures all enum cases are handled
 */
function exhaustiveCheck(value: never): never {
  throw new Error(`Unhandled value: ${value}`);
}

/**
 * Convert string to enum with validation
 */
export function stringToEnum<T extends Record<string, string>>(
  value: string,
  enumObj: T,
  defaultValue?: T[keyof T]
): T[keyof T] | undefined {
  if (isEnumValue(value, enumObj)) {
    return value;
  }
  return defaultValue;
}

/**
 * Batch convert strings to enums
 */
export function stringsToEnums<T extends Record<string, string>>(
  values: string[],
  enumObj: T
): T[keyof T][] {
  return values
    .map(v => stringToEnum(v, enumObj))
    .filter((v): v is T[keyof T] => v !== undefined);
}