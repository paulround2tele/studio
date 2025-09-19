/**
 * Enhanced Security & Validation Hardening Service (Phase 9)
 * Schema hashing, payload signatures, stricter numeric guardrails for probabilistic bands
 */

import { telemetryService } from './telemetryService';
import { ForecastPoint } from './forecastService';

// Declare process for Node.js environment variables
declare const process: any;

/**
 * Schema hash for validation
 */
export interface SchemaHash {
  schemaVersion: string;
  hash: string;
  algorithm: 'sha256' | 'sha1' | 'md5';
  generatedAt: string;
}

/**
 * Payload signature for verification
 */
export interface PayloadSignature {
  signature: string;
  algorithm: 'hmac-sha256' | 'rsa-sha256';
  keyId?: string;
  timestamp: string;
}

/**
 * Validated payload wrapper
 */
export interface ValidatedPayload<T = any> {
  data: T;
  isValid: boolean;
  validationErrors: string[];
  schemaHash?: SchemaHash;
  signature?: PayloadSignature;
  validatedAt: string;
}

/**
 * Numeric validation bounds
 */
export interface NumericBounds {
  min?: number;
  max?: number;
  precision?: number;
  allowNaN?: boolean;
  allowInfinity?: boolean;
}

/**
 * Probabilistic band validation config
 */
export interface ProbabilisticBandConfig {
  valueRange: NumericBounds;
  confidenceRange: NumericBounds;
  quantileConsistency: boolean; // p10 <= p50 <= p90
  temporalConsistency: boolean; // validate against historical patterns
  maxVariance: number; // maximum allowed variance between bands
}

/**
 * Security configuration
 */
interface SecurityConfig {
  enableSchemaValidation: boolean;
  enablePayloadSignatures: boolean;
  enableStrictNumericValidation: boolean;
  maxPayloadSize: number; // bytes
  timeToleranceMs: number; // for timestamp validation
  defaultHashAlgorithm: 'sha256' | 'sha1' | 'md5';
  defaultSignatureAlgorithm: 'hmac-sha256' | 'rsa-sha256';
}

/**
 * Enhanced security & validation hardening service
 */
class SecurityHardeningService {
  private schemaHashes = new Map<string, SchemaHash>();
  private validationCache = new Map<string, ValidatedPayload>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  private config: SecurityConfig = {
    enableSchemaValidation: process.env.NEXT_PUBLIC_ENABLE_SCHEMA_VALIDATION !== 'false',
    enablePayloadSignatures: process.env.NEXT_PUBLIC_ENABLE_PAYLOAD_SIGNATURES === 'true',
    enableStrictNumericValidation: process.env.NEXT_PUBLIC_ENABLE_STRICT_NUMERIC !== 'false',
    maxPayloadSize: parseInt(process.env.NEXT_PUBLIC_MAX_PAYLOAD_SIZE || '1048576'), // 1MB
    timeToleranceMs: parseInt(process.env.NEXT_PUBLIC_TIME_TOLERANCE_MS || '300000'), // 5 minutes
    defaultHashAlgorithm: 'sha256',
    defaultSignatureAlgorithm: 'hmac-sha256',
  };

  /**
   * Generate schema hash for validation
   */
  generateSchemaHash(
    schema: any,
    version: string,
    algorithm: 'sha256' | 'sha1' | 'md5' = this.config.defaultHashAlgorithm
  ): SchemaHash {
    const schemaString = JSON.stringify(schema, Object.keys(schema).sort());
    const hash = this.computeHash(schemaString, algorithm);

    const schemaHash: SchemaHash = {
      schemaVersion: version,
      hash,
      algorithm,
      generatedAt: new Date().toISOString(),
    };

    this.schemaHashes.set(version, schemaHash);
    
    telemetryService.emitTelemetry('security_hardening', {
      action: 'schema_hash_generated',
      version,
      algorithm,
      hashLength: hash.length,
    });

    return schemaHash;
  }

  /**
   * Validate payload against schema hash
   */
  validatePayloadSchema<T>(
    payload: T,
    expectedSchema: any,
    schemaVersion: string
  ): ValidatedPayload<T> {
    const validationErrors: string[] = [];
    let isValid = true;

    try {
      // Check if schema validation is enabled
      if (!this.config.enableSchemaValidation) {
        return {
          data: payload,
          isValid: true,
          validationErrors: [],
          validatedAt: new Date().toISOString(),
        };
      }

      // Check payload size
      const payloadSize = JSON.stringify(payload).length;
      if (payloadSize > this.config.maxPayloadSize) {
        validationErrors.push(`Payload size ${payloadSize} exceeds maximum ${this.config.maxPayloadSize}`);
        isValid = false;
      }

      // Generate current schema hash
      const currentSchemaHash = this.generateSchemaHash(expectedSchema, schemaVersion);
      
      // Validate schema structure
      const schemaValidation = this.validateSchemaStructure(payload, expectedSchema);
      if (!schemaValidation.isValid) {
        validationErrors.push(...schemaValidation.errors);
        isValid = false;
      }

      const result: ValidatedPayload<T> = {
        data: payload,
        isValid,
        validationErrors,
        schemaHash: currentSchemaHash,
        validatedAt: new Date().toISOString(),
      };

      telemetryService.emitTelemetry('security_hardening', {
        action: 'payload_validated',
        isValid,
        errorCount: validationErrors.length,
        payloadSize,
      });

      return result;

    } catch (error) {
      return {
        data: payload,
        isValid: false,
        validationErrors: [`Validation error: ${String(error)}`],
        validatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Sign payload with HMAC or RSA
   */
  signPayload(
    payload: any,
    secretKey: string,
    algorithm: 'hmac-sha256' | 'rsa-sha256' = this.config.defaultSignatureAlgorithm,
    keyId?: string
  ): PayloadSignature {
    const payloadString = JSON.stringify(payload);
    const timestamp = new Date().toISOString();
    const dataToSign = `${payloadString}.${timestamp}`;

    let signature: string;

    switch (algorithm) {
      case 'hmac-sha256':
        signature = this.computeHMAC(dataToSign, secretKey);
        break;
      case 'rsa-sha256':
        // In a real implementation, this would use actual RSA signing
        signature = this.computeHash(`RSA:${dataToSign}:${secretKey}`, 'sha256');
        break;
      default:
        throw new Error(`Unsupported signature algorithm: ${algorithm}`);
    }

    const payloadSignature: PayloadSignature = {
      signature,
      algorithm,
      keyId,
      timestamp,
    };

    telemetryService.emitTelemetry('security_hardening', {
      action: 'payload_signed',
      algorithm,
      keyId,
      signatureLength: signature.length,
    });

    return payloadSignature;
  }

  /**
   * Verify payload signature
   */
  verifyPayloadSignature(
    payload: any,
    signature: PayloadSignature,
    secretKey: string
  ): boolean {
    try {
      if (!this.config.enablePayloadSignatures) {
        return true; // Skip verification if disabled
      }

      // Check timestamp tolerance
      const signatureTime = new Date(signature.timestamp).getTime();
      const now = Date.now();
      if (Math.abs(now - signatureTime) > this.config.timeToleranceMs) {
        console.warn('[SecurityHardeningService] Signature timestamp outside tolerance');
        return false;
      }

      // Reconstruct signature
      const payloadString = JSON.stringify(payload);
      const dataToSign = `${payloadString}.${signature.timestamp}`;

      let expectedSignature: string;

      switch (signature.algorithm) {
        case 'hmac-sha256':
          expectedSignature = this.computeHMAC(dataToSign, secretKey);
          break;
        case 'rsa-sha256':
          expectedSignature = this.computeHash(`RSA:${dataToSign}:${secretKey}`, 'sha256');
          break;
        default:
          console.warn('[SecurityHardeningService] Unsupported signature algorithm:', signature.algorithm);
          return false;
      }

      const isValid = this.constantTimeCompare(signature.signature, expectedSignature);

      telemetryService.emitTelemetry('security_hardening', {
        action: 'signature_verified',
        algorithm: signature.algorithm,
        isValid,
      });

      return isValid;

    } catch (error) {
      console.error('[SecurityHardeningService] Signature verification error:', error);
      return false;
    }
  }

  /**
   * Validate and sanitize forecast points with strict numeric guardrails
   */
  validateForecastPoints(
    points: ForecastPoint[],
    config?: ProbabilisticBandConfig
  ): { validPoints: ForecastPoint[]; errors: string[] } {
    const errors: string[] = [];
    const validPoints: ForecastPoint[] = [];

    const defaultConfig: ProbabilisticBandConfig = {
      valueRange: { min: 0, max: 1000000, precision: 6 },
      confidenceRange: { min: 0, max: 1, precision: 4 },
      quantileConsistency: true,
      temporalConsistency: true,
      maxVariance: 0.5, // 50% max variance
      ...config,
    };

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      if (!point) continue;
      
      const pointErrors: string[] = [];

      try {
        // Validate timestamp
        if (!point.timestamp || isNaN(new Date(point.timestamp).getTime())) {
          pointErrors.push(`Invalid timestamp at index ${i}: ${point.timestamp}`);
        }

        // Validate main value
        const valueValidation = this.validateNumericValue(
          point.value,
          defaultConfig.valueRange,
          `value at index ${i}`
        );
        if (!valueValidation.isValid) {
          pointErrors.push(...valueValidation.errors);
        }

        // Validate confidence bounds
        if (point.lower !== undefined) {
          const lowerValidation = this.validateNumericValue(
            point.lower,
            defaultConfig.valueRange,
            `lower bound at index ${i}`
          );
          if (!lowerValidation.isValid) {
            pointErrors.push(...lowerValidation.errors);
          }
        }

        if (point.upper !== undefined) {
          const upperValidation = this.validateNumericValue(
            point.upper,
            defaultConfig.valueRange,
            `upper bound at index ${i}`
          );
          if (!upperValidation.isValid) {
            pointErrors.push(...upperValidation.errors);
          }
        }

        // Validate quantile consistency
        if (defaultConfig.quantileConsistency) {
          const quantileErrors = this.validateQuantileConsistency(point, i);
          pointErrors.push(...quantileErrors);
        }

        // Validate band variance
        if (point.lower !== undefined && point.upper !== undefined) {
          const variance = (point.upper - point.lower) / point.value;
          if (variance > defaultConfig.maxVariance) {
            pointErrors.push(`Excessive variance ${variance.toFixed(3)} at index ${i}, max allowed: ${defaultConfig.maxVariance}`);
          }
        }

        // If no errors, sanitize and add to valid points
        if (pointErrors.length === 0) {
          validPoints.push(this.sanitizeForecastPoint(point, defaultConfig));
        } else {
          errors.push(...pointErrors);
        }

      } catch (error) {
        errors.push(`Validation error at index ${i}: ${String(error)}`);
      }
    }

    // Validate temporal consistency across points
    if (defaultConfig.temporalConsistency && validPoints.length > 1) {
      const temporalErrors = this.validateTemporalConsistency(validPoints);
      errors.push(...temporalErrors);
    }

    telemetryService.emitTelemetry('security_hardening', {
      action: 'forecast_points_validated',
      totalPoints: points.length,
      validPoints: validPoints.length,
      errorCount: errors.length,
    });

    return { validPoints, errors };
  }

  /**
   * Sanitize string input with XSS protection
   */
  sanitizeString(
    input: string,
    maxLength: number = 1000,
    allowedChars?: RegExp
  ): string {
    if (typeof input !== 'string') {
      return '';
    }

    let sanitized = input;

    // Trim to max length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Remove potentially dangerous characters
    sanitized = sanitized
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframe tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/[<>]/g, ''); // Remove angle brackets

    // Apply custom character filter if provided
    if (allowedChars) {
      sanitized = sanitized.replace(new RegExp(`[^${allowedChars.source}]`, 'g'), '');
    }

    return sanitized.trim();
  }

  /**
   * Validate numeric value against bounds
   */
  validateNumericValue(
    value: number,
    bounds: NumericBounds,
    context: string
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.enableStrictNumericValidation) {
      return { isValid: true, errors: [] };
    }

    // Check for NaN
    if (isNaN(value) && !bounds.allowNaN) {
      errors.push(`${context}: NaN not allowed`);
    }

    // Check for Infinity
    if (!isFinite(value) && !bounds.allowInfinity) {
      errors.push(`${context}: Infinity not allowed`);
    }

    // Check min bound
    if (bounds.min !== undefined && value < bounds.min) {
      errors.push(`${context}: ${value} below minimum ${bounds.min}`);
    }

    // Check max bound
    if (bounds.max !== undefined && value > bounds.max) {
      errors.push(`${context}: ${value} above maximum ${bounds.max}`);
    }

    // Check precision
    if (bounds.precision !== undefined) {
      const decimalPlaces = (value.toString().split('.')[1] || '').length;
      if (decimalPlaces > bounds.precision) {
        errors.push(`${context}: ${value} exceeds precision limit ${bounds.precision}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Compute hash using various algorithms
   */
  private computeHash(data: string, algorithm: 'sha256' | 'sha1' | 'md5'): string {
    // Simplified hash computation (in production, use crypto library)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    const hashString = Math.abs(hash).toString(16);
    
    // Simulate different algorithm outputs
    switch (algorithm) {
      case 'sha256': return hashString.padStart(64, '0');
      case 'sha1': return hashString.padStart(40, '0');
      case 'md5': return hashString.padStart(32, '0');
      default: return hashString;
    }
  }

  /**
   * Compute HMAC (simplified implementation)
   */
  private computeHMAC(data: string, key: string): string {
    const keyHash = this.computeHash(key, 'sha256');
    const dataWithKey = `${keyHash}.${data}`;
    return this.computeHash(dataWithKey, 'sha256');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Validate schema structure recursively
   */
  private validateSchemaStructure(
    data: any,
    schema: any,
    path: string = 'root'
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Type validation
      if (schema.type) {
        const actualType = Array.isArray(data) ? 'array' : typeof data;
        if (actualType !== schema.type) {
          errors.push(`${path}: expected ${schema.type}, got ${actualType}`);
        }
      }

      // Required fields validation
      if (schema.required && Array.isArray(schema.required)) {
        for (const field of schema.required) {
          if (!(field in data)) {
            errors.push(`${path}: missing required field '${field}'`);
          }
        }
      }

      // Properties validation
      if (schema.properties && typeof data === 'object' && data !== null) {
        for (const [key, value] of Object.entries(data)) {
          if (schema.properties[key]) {
            const subValidation = this.validateSchemaStructure(
              value,
              schema.properties[key],
              `${path}.${key}`
            );
            errors.push(...subValidation.errors);
          }
        }
      }

      // Array items validation
      if (schema.items && Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          const itemValidation = this.validateSchemaStructure(
            data[i],
            schema.items,
            `${path}[${i}]`
          );
          errors.push(...itemValidation.errors);
        }
      }

    } catch (error) {
      errors.push(`${path}: schema validation error - ${String(error)}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate quantile consistency (p10 <= p50 <= p90)
   */
  private validateQuantileConsistency(point: ForecastPoint, index: number): string[] {
    const errors: string[] = [];

    if (point.p10 !== undefined && point.p50 !== undefined && point.p10 > point.p50) {
      errors.push(`Quantile inconsistency at index ${index}: p10 (${point.p10}) > p50 (${point.p50})`);
    }

    if (point.p50 !== undefined && point.p90 !== undefined && point.p50 > point.p90) {
      errors.push(`Quantile inconsistency at index ${index}: p50 (${point.p50}) > p90 (${point.p90})`);
    }

    if (point.p10 !== undefined && point.p90 !== undefined && point.p10 > point.p90) {
      errors.push(`Quantile inconsistency at index ${index}: p10 (${point.p10}) > p90 (${point.p90})`);
    }

    // Validate lower/upper bounds consistency
    if (point.lower !== undefined && point.upper !== undefined && point.lower > point.upper) {
      errors.push(`Bound inconsistency at index ${index}: lower (${point.lower}) > upper (${point.upper})`);
    }

    return errors;
  }

  /**
   * Validate temporal consistency across forecast points
   */
  private validateTemporalConsistency(points: ForecastPoint[]): string[] {
    const errors: string[] = [];

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      
      if (!prev || !curr) continue;

      // Check timestamp ordering
      const prevTime = new Date(prev.timestamp).getTime();
      const currTime = new Date(curr.timestamp).getTime();

      if (currTime <= prevTime) {
        errors.push(`Temporal inconsistency: timestamp at index ${i} (${curr.timestamp}) not after previous (${prev.timestamp})`);
      }

      // Check for excessive jumps in values
      const valueDiff = Math.abs(curr.value - prev.value);
      const relativeChange = valueDiff / prev.value;

      if (relativeChange > 2.0) { // 200% change threshold
        errors.push(`Excessive value jump at index ${i}: ${relativeChange.toFixed(2)}x change from previous point`);
      }
    }

    return errors;
  }

  /**
   * Sanitize forecast point by clamping values and fixing precision
   */
  private sanitizeForecastPoint(
    point: ForecastPoint,
    config: ProbabilisticBandConfig
  ): ForecastPoint {
    const sanitized = { ...point };

    // Sanitize main value
    sanitized.value = this.sanitizeNumericValue(point.value, config.valueRange);

    // Sanitize bounds
    if (point.lower !== undefined) {
      sanitized.lower = this.sanitizeNumericValue(point.lower, config.valueRange);
    }

    if (point.upper !== undefined) {
      sanitized.upper = this.sanitizeNumericValue(point.upper, config.valueRange);
    }

    // Sanitize quantiles
    if (point.p10 !== undefined) {
      sanitized.p10 = this.sanitizeNumericValue(point.p10, config.valueRange);
    }

    if (point.p50 !== undefined) {
      sanitized.p50 = this.sanitizeNumericValue(point.p50, config.valueRange);
    }

    if (point.p90 !== undefined) {
      sanitized.p90 = this.sanitizeNumericValue(point.p90, config.valueRange);
    }

    return sanitized;
  }

  /**
   * Sanitize numeric value by clamping and precision
   */
  private sanitizeNumericValue(value: number, bounds: NumericBounds): number {
    let sanitized = value;

    // Handle NaN and Infinity
    if (isNaN(sanitized)) {
      sanitized = bounds.min || 0;
    }

    if (!isFinite(sanitized)) {
      sanitized = bounds.max || 1000;
    }

    // Apply bounds
    if (bounds.min !== undefined) {
      sanitized = Math.max(sanitized, bounds.min);
    }

    if (bounds.max !== undefined) {
      sanitized = Math.min(sanitized, bounds.max);
    }

    // Apply precision
    if (bounds.precision !== undefined) {
      sanitized = parseFloat(sanitized.toFixed(bounds.precision));
    }

    return sanitized;
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
    this.schemaHashes.clear();
  }

  /**
   * Get security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const enhancedSecurityHardeningService = new SecurityHardeningService();