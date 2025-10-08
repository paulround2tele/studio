/**
 * Privacy Redaction Service (Phase 10)
 * Field-level redaction policies and audit tagging
 */

// Feature flag check
const isPrivacyRedactionEnabled = (): boolean => {
  return typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ENABLE_PRIVACY_REDACTION === 'true';
};

// Types for privacy policies and redaction
export type PrivacyLevel = 'public' | 'internal' | 'restricted' | 'confidential';

export interface PrivacyPolicy {
  version: string;
  rules: PrivacyRule[];
  defaultLevel: PrivacyLevel;
  auditRequired: boolean;
}

export interface PrivacyRule {
  id: string;
  fieldPattern: string | RegExp;
  action: 'redact' | 'hash' | 'mask' | 'remove' | 'allow';
  level: PrivacyLevel;
  description: string;
  preserveFormat?: boolean;
  maskCharacter?: string;
  hashSalt?: string;
}

export interface RedactionResult {
  redacted: unknown;
  applied: RedactionEntry[];
  policyVersion: string;
}

export interface RedactionEntry {
  field: string;
  action: string;
  level: PrivacyLevel;
  originalType: string;
  redactedAt: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  operation: string;
  fields: string[];
  privacyLevel: PrivacyLevel;
  userId?: string;
  sessionId?: string;
  metadata: Record<string, unknown>;
}

// Telemetry events
export interface PrivacyRedactionAppliedEvent {
  fields: number;
  policyVersion: string;
}

/**
 * Privacy Redaction Service Class
 */
class PrivacyRedactionService {
  private policy: PrivacyPolicy;
  private auditLog: AuditEntry[] = [];

  constructor() {
    this.policy = this.getDefaultPolicy();
  }

  /**
   * Check if privacy redaction is available
   */
  isAvailable(): boolean {
    return isPrivacyRedactionEnabled();
  }

  /**
   * Redact payload according to privacy policy
   */
  redactPayload(obj: unknown, policy?: PrivacyPolicy): RedactionResult {
    if (!this.isAvailable()) {
      return {
        redacted: obj,
        applied: [],
        policyVersion: this.policy.version
      };
    }

    const activePolicy = policy || this.policy;
    const applied: RedactionEntry[] = [];
    const redacted = this.redactObject(obj, activePolicy, applied, '');

    // Emit telemetry
    this.emitRedactionTelemetry({
      fields: applied.length,
      policyVersion: activePolicy.version
    });

    return {
      redacted,
      applied,
      policyVersion: activePolicy.version
    };
  }

  /**
   * Tag audit entry with privacy level
   */
  tagAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>, privacyLevel: PrivacyLevel): AuditEntry {
    if (!this.isAvailable()) {
      return {
        ...entry,
        id: '',
        timestamp: new Date().toISOString()
      };
    }

    const auditEntry: AuditEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      privacyLevel
    };

    this.auditLog.push(auditEntry);

    // Keep audit log under control (last 1000 entries)
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    return auditEntry;
  }

  /**
   * Update privacy policy
   */
  updatePolicy(newPolicy: PrivacyPolicy): void {
    this.policy = newPolicy;
  }

  /**
   * Get current policy
   */
  getPolicy(): PrivacyPolicy {
    return this.policy;
  }

  /**
   * Get audit log entries
   */
  getAuditLog(limit?: number): AuditEntry[] {
    if (!this.isAvailable()) return [];
    
    const entries = limit ? this.auditLog.slice(-limit) : this.auditLog;
    return entries;
  }

  /**
   * Clear audit log (admin only)
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Check if field should be redacted
   */
  shouldRedactField(fieldPath: string, level: PrivacyLevel = 'public'): boolean {
    if (!this.isAvailable()) return false;

    const rule = this.findMatchingRule(fieldPath);
    if (!rule) return false;

    return this.shouldApplyRule(rule, level);
  }

  /**
   * Redact a single value - consolidated implementation
   */
  redactValue(value: unknown, fieldPath: string, level: PrivacyLevel = 'public'): { redacted: unknown; applied: boolean } {
    if (!this.isAvailable()) {
      return { redacted: value, applied: false };
    }

    const rule = this.findMatchingRule(fieldPath);
    if (!rule || !this.shouldApplyRule(rule, level)) {
      return { redacted: value, applied: false };
    }

    const redacted = this.applyRedactionRule(value, rule);
    return { redacted, applied: true };
  }

  /**
   * Redact an object recursively
   */
  private redactObject(obj: unknown, policy: PrivacyPolicy, applied: RedactionEntry[], path: string): unknown {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      const rule = this.findMatchingRule(path, policy);
      if (rule && this.shouldApplyRule(rule, policy.defaultLevel)) {
        applied.push({
          field: path,
          action: rule.action,
          level: rule.level,
          originalType: typeof obj,
          redactedAt: new Date().toISOString()
        });
        return this.applyRedactionRule(obj, rule);
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) => 
        this.redactObject(item, policy, applied, `${path}[${index}]`)
      );
    }

    if (typeof obj === 'object') {
  const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        const fieldPath = path ? `${path}.${key}` : key;
        const rule = this.findMatchingRule(fieldPath, policy);
        
        if (rule && rule.action === 'remove' && this.shouldApplyRule(rule, policy.defaultLevel)) {
          applied.push({
            field: fieldPath,
            action: rule.action,
            level: rule.level,
            originalType: typeof value,
            redactedAt: new Date().toISOString()
          });
          continue; // Skip this field entirely
        }

        result[key] = this.redactObject(value, policy, applied, fieldPath);
      }
      return result;
    }

    return obj;
  }

  /**
   * Find matching privacy rule for a field
   */
  private findMatchingRule(fieldPath: string, policy?: PrivacyPolicy): PrivacyRule | null {
    const activePolicy = policy || this.policy;
    
    for (const rule of activePolicy.rules) {
      if (this.matchesPattern(fieldPath, rule.fieldPattern)) {
        return rule;
      }
    }
    
    return null;
  }

  /**
   * Check if field path matches pattern
   */
  private matchesPattern(fieldPath: string, pattern: string | RegExp): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(fieldPath);
    }
    
    // Convert simple patterns to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    return new RegExp(`^${regexPattern}$`).test(fieldPath);
  }

  /**
   * Check if rule should be applied based on privacy level
   */
  private shouldApplyRule(rule: PrivacyRule, currentLevel: PrivacyLevel): boolean {
    const levelHierarchy: PrivacyLevel[] = ['public', 'internal', 'restricted', 'confidential'];
    const ruleIndex = levelHierarchy.indexOf(rule.level);
    const currentIndex = levelHierarchy.indexOf(currentLevel);
    
    return ruleIndex >= currentIndex;
  }

  /**
   * Apply redaction rule to a value
   */
  private applyRedactionRule(value: unknown, rule: PrivacyRule): unknown {
    switch (rule.action) {
      case 'redact':
        return this.performRedaction(value, rule);
      case 'hash':
        return this.hashValue(value, rule.hashSalt);
      case 'mask':
        return this.maskValue(value, rule);
      case 'remove':
        return undefined;
      case 'allow':
        return value;
      default:
        return value;
    }
  }

  /**
   * Perform redaction operation (internal helper)
   */
  private performRedaction(value: unknown, rule: PrivacyRule): string {
    if (rule.preserveFormat && typeof value === 'string') {
      // Preserve format but redact content
      return value.replace(/[a-zA-Z0-9]/g, rule.maskCharacter || '*');
    }
    
    return '[REDACTED]';
  }

  /**
   * Hash a value
   */
  private hashValue(value: unknown, salt?: string): string {
    const stringValue = String(value);
    const saltedValue = salt ? `${stringValue}${salt}` : stringValue;
    
    // Simple hash function (not cryptographically secure)
    let hash = 0;
    for (let i = 0; i < saltedValue.length; i++) {
      const char = saltedValue.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `hash_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Mask a value (partial redaction)
   */
  private maskValue(value: unknown, rule: PrivacyRule): string {
    const stringValue = String(value);
    const maskChar = rule.maskCharacter || '*';
    
    if (stringValue.length <= 4) {
      return maskChar.repeat(stringValue.length);
    }
    
    // Show first and last 2 characters, mask the middle
    const start = stringValue.substring(0, 2);
    const end = stringValue.substring(stringValue.length - 2);
    const middle = maskChar.repeat(stringValue.length - 4);
    
    return `${start}${middle}${end}`;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default privacy policy
   */
  private getDefaultPolicy(): PrivacyPolicy {
    return {
      version: '1.0.0',
      defaultLevel: 'public',
      auditRequired: true,
      rules: [
        {
          id: 'email_redaction',
          fieldPattern: '*email*',
          action: 'mask',
          level: 'internal',
          description: 'Mask email addresses',
          preserveFormat: true,
          maskCharacter: '*'
        },
        {
          id: 'password_removal',
          fieldPattern: '*password*',
          action: 'remove',
          level: 'public',
          description: 'Remove password fields'
        },
        {
          id: 'token_redaction',
          fieldPattern: '*token*',
          action: 'redact',
          level: 'public',
          description: 'Redact authentication tokens'
        },
        {
          id: 'api_key_redaction',
          fieldPattern: '*key*',
          action: 'redact',
          level: 'public',
          description: 'Redact API keys'
        },
        {
          id: 'personal_data_hash',
          fieldPattern: 'user.personalInfo.*',
          action: 'hash',
          level: 'restricted',
          description: 'Hash personal information',
          hashSalt: 'privacy_salt_2024'
        },
        {
          id: 'ip_address_mask',
          fieldPattern: '*ip*',
          action: 'mask',
          level: 'internal',
          description: 'Mask IP addresses',
          preserveFormat: true
        }
      ]
    };
  }

  /**
   * Emit redaction telemetry
   */
  private emitRedactionTelemetry(data: PrivacyRedactionAppliedEvent): void {
    if (typeof window !== 'undefined') {
      const telemetryService = (window as unknown as { __telemetryService?: { emit?: (e:string,d:unknown)=>void; emitTelemetry?: (e:string,d:Record<string,unknown>)=>void } }).__telemetryService;
      if (telemetryService) {
        if (typeof telemetryService.emitTelemetry === 'function') {
          telemetryService.emitTelemetry('privacy_redaction_applied', data as unknown as Record<string, unknown>);
        } else if (typeof telemetryService.emit === 'function') {
          telemetryService.emit('privacy_redaction_applied', data);
        }
      }
    }
  }
}

// Export singleton instance
export const privacyRedactionService = new PrivacyRedactionService();

// Availability check function
export const isPrivacyRedactionAvailable = (): boolean => {
  return privacyRedactionService.isAvailable();
};