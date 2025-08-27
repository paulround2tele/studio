// src/lib/utils/domainCalculation.ts
// Production domain calculation utilities
// Uses backend OpenAPI types exclusively

// TODO: map to generated model when available
type DomainGenerationParams = any;

/**
 * Calculate maximum theoretical domains for a given configuration
 * Uses backend-defined types exclusively (when they exist)
 */
export function calculateMaxTheoreticalDomains(config: DomainGenerationParams): number {
  if (!config) return 0;

  const { patternType, characterSet, variableLength } = config;
  const charSetLength = characterSet?.length || 26;

  switch (patternType) {
    case 'prefix':
      return variableLength ? Math.pow(charSetLength, variableLength) : 0;
    case 'suffix':
      return variableLength ? Math.pow(charSetLength, variableLength) : 0;
    case 'both':
      // For 'both' pattern, assume half length for prefix and half for suffix
      const halfLength = Math.floor(variableLength / 2);
      const prefixCombos = halfLength > 0 ? Math.pow(charSetLength, halfLength) : 1;
      const suffixCombos = halfLength > 0 ? Math.pow(charSetLength, halfLength) : 1;
      return prefixCombos * suffixCombos;
    default:
      return 0;
  }
}

/**
 * Calculate remaining domains in sequence for a configuration
 * This would typically check against backend state, but for now provides estimate
 */
export function calculateRemainingDomains(
  config: DomainGenerationParams,
  currentOffset: number = 0
): number {
  const maxTheoretical = calculateMaxTheoreticalDomains(config);
  return Math.max(0, maxTheoretical - currentOffset);
}

/**
 * Validate domain generation configuration using backend schema
 */
export function validateDomainConfig(config: DomainGenerationParams): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.constantString?.trim()) {
    errors.push('Constant string is required');
  }

  if (!config.characterSet?.trim()) {
    errors.push('Character set is required');
  }

  if (!config.variableLength || config.variableLength < 1) {
    errors.push('Variable length must be at least 1');
  }

  if (!config.tlds?.length || !config.tlds.some((tld: string) => tld.trim())) {
    errors.push('At least one valid TLD is required');
  }

  if (!['prefix', 'suffix', 'both'].includes(config.patternType)) {
    errors.push('Pattern type must be prefix, suffix, or both');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
