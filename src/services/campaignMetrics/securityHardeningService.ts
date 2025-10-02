/**
 * Security and Data Sanitization Utilities (Phase 8)
 * Lightweight security hardening for numeric payloads and input validation
 */

// Feature flag for security hardening
const isSecurityHardeningEnabled = () => 
  process.env.NEXT_PUBLIC_SECURITY_HARDENING !== 'false';

/**
 * Numeric bounds configuration
 */
export interface NumericBounds {
  min?: number;
  max?: number;
  allowNaN?: boolean;
  allowInfinity?: boolean;
}

/**
 * Forecast horizon limits (Phase 8 requirement)
 */
const FORECAST_HORIZON_LIMITS = {
  min: 1,
  max: parseInt(process.env.NEXT_PUBLIC_MAX_FORECAST_HORIZON || '30', 10) // Default 30 days max
};

/**
 * Default numeric bounds for different metric types
 */
const DEFAULT_BOUNDS: Record<string, NumericBounds> = {
  // Lead scores typically 0-100
  avgLeadScore: { min: 0, max: 100, allowNaN: false, allowInfinity: false },
  
  // Success rates are percentages 0-1
  successRate: { min: 0, max: 1, allowNaN: false, allowInfinity: false },
  
  // DNS/HTTP success rates are percentages 0-1
  dnsSuccessRate: { min: 0, max: 1, allowNaN: false, allowInfinity: false },
  httpSuccessRate: { min: 0, max: 1, allowNaN: false, allowInfinity: false },
  
  // Domain counts should be non-negative integers
  totalDomains: { min: 0, max: 1000000, allowNaN: false, allowInfinity: false },
  
  // General positive metrics
  runtime: { min: 0, max: 86400000, allowNaN: false, allowInfinity: false }, // Max 24 hours in ms
  
  // Forecast horizons
  forecastHorizon: FORECAST_HORIZON_LIMITS,
  
  // Quality scores typically 0-100
  qualityScore: { min: 0, max: 100, allowNaN: false, allowInfinity: false },
  
  // Confidence values typically 0-1
  confidence: { min: 0, max: 1, allowNaN: false, allowInfinity: false }
};

/**
 * Sanitization result
 */
export interface SanitizationResult<T> {
  value: T;
  wasModified: boolean;
  violations: string[];
  metadata: {
    originalValue?: any;
    sanitizedFields: string[];
    securityLevel: 'none' | 'low' | 'medium' | 'high';
  };
}

/**
 * Security and data sanitization service
 */
class SecurityHardeningService {
  
  /**
   * Sanitize numeric value according to bounds
   */
  sanitizeNumeric(
    value: any,
    bounds: NumericBounds = {},
    fieldName?: string
  ): SanitizationResult<number> {
    const originalValue = value;
    const violations: string[] = [];
    let sanitizedValue: number;
    let wasModified = false;
    
    // Convert to number if possible
    if (typeof value === 'string') {
      sanitizedValue = parseFloat(value);
      wasModified = true;
    } else if (typeof value === 'number') {
      sanitizedValue = value;
    } else {
      sanitizedValue = 0;
      wasModified = true;
      violations.push(`Invalid type: ${typeof value}, converted to 0`);
    }
    
    // Check for NaN
    if (isNaN(sanitizedValue)) {
      if (!bounds.allowNaN) {
        sanitizedValue = 0;
        wasModified = true;
        violations.push('NaN value sanitized to 0');
      }
    }
    
    // Check for Infinity
    if (!isFinite(sanitizedValue)) {
      if (!bounds.allowInfinity) {
        sanitizedValue = bounds.max || 0;
        wasModified = true;
        violations.push('Infinity value clamped to max bound');
      }
    }
    
    // Apply bounds
    if (typeof bounds.min === 'number' && sanitizedValue < bounds.min) {
      sanitizedValue = bounds.min;
      wasModified = true;
      violations.push(`Value below minimum (${bounds.min}), clamped`);
    }
    
    if (typeof bounds.max === 'number' && sanitizedValue > bounds.max) {
      sanitizedValue = bounds.max;
      wasModified = true;
      violations.push(`Value above maximum (${bounds.max}), clamped`);
    }
    
    return {
      value: sanitizedValue,
      wasModified,
      violations,
      metadata: {
        originalValue: wasModified ? originalValue : undefined,
        sanitizedFields: fieldName ? [fieldName] : [],
        securityLevel: violations.length > 0 ? 'medium' : 'none'
      }
    };
  }
  
  /**
   * Sanitize object with numeric fields
   */
  sanitizeNumericPayload<T extends Record<string, any>>(
    payload: T,
    customBounds: Record<string, NumericBounds> = {}
  ): SanitizationResult<T> {
    if (!isSecurityHardeningEnabled()) {
      return {
        value: payload,
        wasModified: false,
        violations: [],
        metadata: { sanitizedFields: [], securityLevel: 'none' }
      };
    }
    
  // Create a mutable working copy; we'll assert to T at the end
  const workingCopy: Record<string, any> = { ...payload };
    const allViolations: string[] = [];
    const sanitizedFields: string[] = [];
    let wasModified = false;
    
    // Recursively sanitize numeric fields
    Object.keys(workingCopy).forEach(key => {
      const value = workingCopy[key];
      
      if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
        const bounds = customBounds[key] || DEFAULT_BOUNDS[key] || {};
        const result = this.sanitizeNumeric(value, bounds, key);
        
        if (result.wasModified) {
          workingCopy[key] = result.value;
          wasModified = true;
          sanitizedFields.push(key);
          allViolations.push(...result.violations.map(v => `${key}: ${v}`));
        }
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively sanitize nested objects
        const nestedResult = this.sanitizeNumericPayload(value, customBounds);
        if (nestedResult.wasModified) {
          workingCopy[key] = nestedResult.value;
          wasModified = true;
          sanitizedFields.push(...nestedResult.metadata.sanitizedFields.map(f => `${key}.${f}`));
          allViolations.push(...nestedResult.violations);
        }
      }
    });
    
    return {
      value: workingCopy as T,
      wasModified,
      violations: allViolations,
      metadata: {
        sanitizedFields,
        securityLevel: allViolations.length > 5 ? 'high' : allViolations.length > 0 ? 'medium' : 'none'
      }
    };
  }
  
  /**
   * Validate and clamp forecast horizon (Phase 8 requirement)
   */
  validateForecastHorizon(horizon: any): SanitizationResult<number> {
    return this.sanitizeNumeric(horizon, FORECAST_HORIZON_LIMITS, 'forecastHorizon');
  }
  
  /**
   * Sanitize forecast points for rendering
   */
  sanitizeForecastPoints(points: any[]): SanitizationResult<any[]> {
    if (!Array.isArray(points)) {
      return {
        value: [],
        wasModified: true,
        violations: ['Invalid forecast points array'],
        metadata: { sanitizedFields: ['points'], securityLevel: 'medium' }
      };
    }
    
    const sanitizedPoints: any[] = [];
    const allViolations: string[] = [];
    const sanitizedFields: string[] = [];
    let wasModified = false;
    
    points.forEach((point, index) => {
      if (!point || typeof point !== 'object') {
        wasModified = true;
        allViolations.push(`Point ${index}: Invalid point object`);
        return; // Skip invalid points
      }
      
      const sanitizedPoint = { ...point };
      
      // Sanitize numeric fields in forecast point
      ['value', 'lower', 'upper', 'p10', 'p50', 'p90'].forEach(field => {
        if (field in sanitizedPoint) {
          const result = this.sanitizeNumeric(
            sanitizedPoint[field], 
            DEFAULT_BOUNDS.avgLeadScore, // Use lead score bounds as default
            `point${index}.${field}`
          );
          
          if (result.wasModified) {
            sanitizedPoint[field] = result.value;
            wasModified = true;
            sanitizedFields.push(`point${index}.${field}`);
            allViolations.push(...result.violations);
          }
        }
      });
      
      // Validate timestamp
      if (sanitizedPoint.timestamp) {
        const timestamp = new Date(sanitizedPoint.timestamp);
        if (isNaN(timestamp.getTime())) {
          sanitizedPoint.timestamp = new Date().toISOString();
          wasModified = true;
          allViolations.push(`Point ${index}: Invalid timestamp corrected`);
        }
      }
      
      sanitizedPoints.push(sanitizedPoint);
    });
    
    return {
      value: sanitizedPoints,
      wasModified,
      violations: allViolations,
      metadata: {
        sanitizedFields,
        securityLevel: allViolations.length > 10 ? 'high' : allViolations.length > 0 ? 'medium' : 'none'
      }
    };
  }
  
  /**
   * Sanitize metric aggregates for display
   */
  sanitizeMetricAggregates(aggregates: any): SanitizationResult<any> {
    if (!aggregates || typeof aggregates !== 'object') {
      return {
        value: {},
        wasModified: true,
        violations: ['Invalid aggregates object'],
        metadata: { sanitizedFields: ['aggregates'], securityLevel: 'medium' }
      };
    }
    
    return this.sanitizeNumericPayload(aggregates, DEFAULT_BOUNDS);
  }
  
  /**
   * Validate string input for XSS prevention (basic)
   */
  sanitizeString(input: any, maxLength: number = 1000): SanitizationResult<string> {
    let sanitizedValue: string;
    let wasModified = false;
    const violations: string[] = [];
    
    if (typeof input !== 'string') {
      sanitizedValue = String(input || '');
      wasModified = true;
      violations.push('Non-string input converted to string');
    } else {
      sanitizedValue = input;
    }
    
    // Basic XSS prevention - remove script tags and javascript: URLs
    const originalLength = sanitizedValue.length;
    sanitizedValue = sanitizedValue
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
    
    if (sanitizedValue.length !== originalLength) {
      wasModified = true;
      violations.push('Potentially dangerous content removed');
    }
    
    // Truncate if too long
    if (sanitizedValue.length > maxLength) {
      sanitizedValue = sanitizedValue.substring(0, maxLength);
      wasModified = true;
      violations.push(`String truncated to ${maxLength} characters`);
    }
    
    return {
      value: sanitizedValue,
      wasModified,
      violations,
      metadata: {
        sanitizedFields: ['string'],
        securityLevel: violations.some(v => v.includes('dangerous')) ? 'high' : 
                      violations.length > 0 ? 'low' : 'none'
      }
    };
  }
  
  /**
   * Get current security hardening configuration
   */
  getSecurityConfig(): {
    enabled: boolean;
    maxForecastHorizon: number;
    defaultBounds: typeof DEFAULT_BOUNDS;
  } {
    return {
      enabled: isSecurityHardeningEnabled(),
      maxForecastHorizon: FORECAST_HORIZON_LIMITS.max,
      defaultBounds: DEFAULT_BOUNDS
    };
  }
}

// Export singleton instance
export const securityHardeningService = new SecurityHardeningService();

/**
 * Sanitize numeric payload before rendering (convenience function)
 */
export function sanitizeNumericPayload<T extends Record<string, any>>(
  payload: T,
  customBounds?: Record<string, NumericBounds>
): SanitizationResult<T> {
  return securityHardeningService.sanitizeNumericPayload(payload, customBounds);
}

/**
 * Validate forecast horizon (convenience function)
 */
export function validateForecastHorizon(horizon: any): SanitizationResult<number> {
  return securityHardeningService.validateForecastHorizon(horizon);
}

/**
 * Sanitize forecast points for safe rendering (convenience function)
 */
export function sanitizeForecastPoints(points: any[]): SanitizationResult<any[]> {
  return securityHardeningService.sanitizeForecastPoints(points);
}

/**
 * Check if security hardening is available
 */
export function isSecurityHardeningAvailable(): boolean {
  return isSecurityHardeningEnabled();
}

/**
 * Sanitize string input (convenience function)
 */
export function sanitizeString(input: any, maxLength?: number): SanitizationResult<string> {
  return securityHardeningService.sanitizeString(input, maxLength);
}