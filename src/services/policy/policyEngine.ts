/**
 * Policy Orchestration Engine (Phase 11)
 * Unified policy engine for governance actions, privacy levels, and constraints
 */

// Import feature flag function under an alias to avoid react-hooks lint rule (not a React component/hook here)
import { usePolicyEngine as policyEngineFlagEnabled } from '../../lib/feature-flags-simple';
import { telemetryService } from '../campaignMetrics/telemetryService';

// Feature flag check
const isPolicyEngineEnabled = (): boolean => policyEngineFlagEnabled();

/**
 * Policy condition evaluation context
 */
export interface PolicyEventContext {
  degradationTier?: number;
  dqFlags?: string[];
  metricKey?: string;
  metricValue?: number;
  experimentArm?: string;
  privacyLevel?: 'low' | 'medium' | 'high';
  cohortId?: string;
  campaignId?: string;
  userId?: string;
  timestamp?: number;
  additionalContext?: Record<string, any>;
}

/**
 * Policy action types
 */
export type PolicyActionType = 
  | 'suppressRecommendations'
  | 'escalatePrivacy'
  | 'excludeExperimentArm'
  | 'requireApproval'
  | 'auditLog'
  | 'notifyAdmin'
  | 'blockAccess';

/**
 * Policy action definition
 */
export interface PolicyAction {
  type: PolicyActionType;
  reason: string;
  severity?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
  expireAfterMs?: number;
}

/**
 * Policy condition (simplified JSON DSL)
 */
export interface PolicyCondition {
  field: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains' | 'any';
  value: any;
  and?: PolicyCondition[];
  or?: PolicyCondition[];
}

/**
 * Complete policy definition
 */
export interface Policy {
  id: string;
  name: string;
  description?: string;
  version: string;
  enabled: boolean;
  priority: number; // Higher number = higher priority
  when: PolicyCondition;
  actions: PolicyAction[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  tags?: string[];
}

/**
 * Policy evaluation result
 */
export interface PolicyEvaluationResult {
  policyId: string;
  matched: boolean;
  actions: PolicyAction[];
  evaluationTimeMs: number;
  context: PolicyEventContext;
}

/**
 * Policy decision result
 */
export interface PolicyDecision {
  allow: boolean;
  actions: PolicyAction[];
  appliedPolicies: string[];
  evaluationTimeMs: number;
  context: PolicyEventContext;
}

/**
 * Policy validation error
 */
export interface PolicyValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Policy Engine Service Implementation
 */
class PolicyEngineService {
  private policies = new Map<string, Policy>();
  private readonly SCHEMA_VERSION = '1.0';

  /**
   * Register a new policy
   */
  registerPolicy(policy: Policy): PolicyValidationError[] {
    if (!isPolicyEngineEnabled()) {
      throw new Error('Policy engine is disabled');
    }

    // Validate policy before registration
    const validationErrors = this.validatePolicy(policy);
    if (validationErrors.some(error => error.severity === 'error')) {
      throw new Error(`Policy validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    // Set timestamps if not provided
    const now = new Date().toISOString();
    if (!policy.createdAt) {
      policy.createdAt = now;
    }
    policy.updatedAt = now;

    this.policies.set(policy.id, policy);

    telemetryService.emitTelemetry('policy_registered', {
      policyId: policy.id,
      version: policy.version,
      actionsCount: policy.actions.length,
      priority: policy.priority
    });

    return validationErrors.filter(error => error.severity === 'warning');
  }

  /**
   * Evaluate policies against event context
   */
  evaluate(eventContext: PolicyEventContext): PolicyDecision {
    if (!isPolicyEngineEnabled()) {
      return {
        allow: true,
        actions: [],
        appliedPolicies: [],
        evaluationTimeMs: 0,
        context: eventContext
      };
    }

    const startTime = performance.now();
    const appliedActions: PolicyAction[] = [];
    const appliedPolicies: string[] = [];

    // Get all enabled policies sorted by priority (descending)
    const enabledPolicies = Array.from(this.policies.values())
      .filter(policy => policy.enabled)
      .sort((a, b) => b.priority - a.priority);

    // Evaluate each policy
    for (const policy of enabledPolicies) {
      const result = this.evaluatePolicy(policy, eventContext);
      
      if (result.matched) {
        appliedActions.push(...result.actions);
        appliedPolicies.push(policy.id);

        telemetryService.emitTelemetry('policy_evaluated', {
          policyId: policy.id,
          matched: true,
          actionsTriggered: result.actions.length
        });

        // Check for blocking actions
        const blockingAction = result.actions.find(action => 
          action.type === 'blockAccess' || 
          (action.type === 'requireApproval' && action.severity === 'high')
        );

        if (blockingAction) {
          // Policy blocks execution
          return {
            allow: false,
            actions: appliedActions,
            appliedPolicies,
            evaluationTimeMs: performance.now() - startTime,
            context: eventContext
          };
        }
      } else {
        telemetryService.emitTelemetry('policy_evaluated', {
          policyId: policy.id,
          matched: false
        });
      }
    }

    // Apply all non-blocking actions
    for (const action of appliedActions) {
      this.applyPolicyAction(action, eventContext);
    }

    return {
      allow: true,
      actions: appliedActions,
      appliedPolicies,
      evaluationTimeMs: performance.now() - startTime,
      context: eventContext
    };
  }

  /**
   * Get all registered policies
   */
  getPolicies(): Policy[] {
    if (!isPolicyEngineEnabled()) {
      return [];
    }
    return Array.from(this.policies.values());
  }

  /**
   * Get a specific policy by ID
   */
  getPolicy(policyId: string): Policy | undefined {
    if (!isPolicyEngineEnabled()) {
      return undefined;
    }
    return this.policies.get(policyId);
  }

  /**
   * Update an existing policy
   */
  updatePolicy(policyId: string, updates: Partial<Policy>): PolicyValidationError[] {
    if (!isPolicyEngineEnabled()) {
      throw new Error('Policy engine is disabled');
    }

    const existingPolicy = this.policies.get(policyId);
    if (!existingPolicy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    const updatedPolicy: Policy = {
      ...existingPolicy,
      ...updates,
      id: policyId, // Prevent ID changes
      updatedAt: new Date().toISOString()
    };

    const validationErrors = this.validatePolicy(updatedPolicy);
    if (validationErrors.some(error => error.severity === 'error')) {
      throw new Error(`Policy validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    this.policies.set(policyId, updatedPolicy);

    telemetryService.emitTelemetry('policy_updated', {
      policyId,
      version: updatedPolicy.version
    });

    return validationErrors.filter(error => error.severity === 'warning');
  }

  /**
   * Remove a policy
   */
  removePolicy(policyId: string): boolean {
    if (!isPolicyEngineEnabled()) {
      return false;
    }

    const removed = this.policies.delete(policyId);
    
    if (removed) {
      telemetryService.emitTelemetry('policy_removed', { policyId });
    }

    return removed;
  }

  /**
   * Evaluate a single policy against context
   */
  private evaluatePolicy(policy: Policy, context: PolicyEventContext): PolicyEvaluationResult {
    const startTime = performance.now();
    
    const matched = this.evaluateCondition(policy.when, context);
    const actions = matched ? policy.actions : [];

    return {
      policyId: policy.id,
      matched,
      actions,
      evaluationTimeMs: performance.now() - startTime,
      context
    };
  }

  /**
   * Evaluate a condition against context
   */
  private evaluateCondition(condition: PolicyCondition, context: PolicyEventContext): boolean {
    // Handle AND conditions
    if (condition.and) {
      return condition.and.every(subCondition => this.evaluateCondition(subCondition, context));
    }

    // Handle OR conditions
    if (condition.or) {
      return condition.or.some(subCondition => this.evaluateCondition(subCondition, context));
    }

    // Evaluate single condition
    const contextValue = this.getContextValue(context, condition.field);
    
    switch (condition.operator) {
      case '==':
        return contextValue === condition.value;
      case '!=':
        return contextValue !== condition.value;
      case '>':
        return typeof contextValue === 'number' && contextValue > condition.value;
      case '<':
        return typeof contextValue === 'number' && contextValue < condition.value;
      case '>=':
        return typeof contextValue === 'number' && contextValue >= condition.value;
      case '<=':
        return typeof contextValue === 'number' && contextValue <= condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(contextValue);
      case 'contains':
        return typeof contextValue === 'string' && contextValue.includes(condition.value);
      case 'any':
        return Array.isArray(contextValue) && contextValue.length > 0;
      default:
        console.warn(`Unknown policy operator: ${condition.operator}`);
        return false;
    }
  }

  /**
   * Get value from context by field path
   */
  private getContextValue(context: PolicyEventContext, field: string): any {
    const fieldParts = field.split('.');
    let value: any = context;

    for (const part of fieldParts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Apply a policy action
   */
  private applyPolicyAction(action: PolicyAction, context: PolicyEventContext): void {
    telemetryService.emitTelemetry('policy_action_applied', {
      actionType: action.type,
      reason: action.reason,
      severity: action.severity || 'medium',
      context: {
        campaignId: context.campaignId,
        metricKey: context.metricKey
      }
    });

    // Actions are typically applied by the calling service
    // This method primarily handles telemetry and logging
    switch (action.type) {
      case 'auditLog':
        console.log(`[Policy Audit] ${action.reason}`, { action, context });
        break;
      case 'notifyAdmin':
        console.warn(`[Policy Alert] ${action.reason}`, { action, context });
        break;
      default:
        // Other actions handled by caller
        break;
    }
  }

  /**
   * Validate a policy definition
   */
  private validatePolicy(policy: Policy): PolicyValidationError[] {
    const errors: PolicyValidationError[] = [];

    // Required fields
    if (!policy.id) {
      errors.push({ field: 'id', message: 'Policy ID is required', severity: 'error' });
    }

    if (!policy.name) {
      errors.push({ field: 'name', message: 'Policy name is required', severity: 'error' });
    }

    if (!policy.version) {
      errors.push({ field: 'version', message: 'Policy version is required', severity: 'error' });
    }

    if (!policy.when) {
      errors.push({ field: 'when', message: 'Policy condition is required', severity: 'error' });
    }

    if (!policy.actions || policy.actions.length === 0) {
      errors.push({ field: 'actions', message: 'At least one action is required', severity: 'error' });
    }

    // Validate actions
    for (let i = 0; i < (policy.actions?.length || 0); i++) {
      const action = policy.actions?.[i];
      
      if (!action) {
        errors.push({
          field: `actions[${i}]`,
          message: 'Action is undefined',
          severity: 'error'
        });
        continue;
      }
      
      if (!this.isValidActionType(action.type)) {
        errors.push({
          field: `actions[${i}].type`,
          message: `Unknown action type: ${action.type}`,
          severity: 'error'
        });
      }

      if (!action.reason) {
        errors.push({
          field: `actions[${i}].reason`,
          message: 'Action reason is required',
          severity: 'error'
        });
      }
    }

    // Validate condition structure
    if (policy.when) {
      errors.push(...this.validateCondition(policy.when, 'when'));
    }

    return errors;
  }

  /**
   * Validate a condition structure
   */
  private validateCondition(condition: PolicyCondition, path: string): PolicyValidationError[] {
    const errors: PolicyValidationError[] = [];

    if (!condition.field && !condition.and && !condition.or) {
      errors.push({
        field: path,
        message: 'Condition must have field or and/or operators',
        severity: 'error'
      });
    }

    if (condition.field && !condition.operator) {
      errors.push({
        field: `${path}.operator`,
        message: 'Condition with field must have operator',
        severity: 'error'
      });
    }

    if (condition.and) {
      condition.and.forEach((subCondition, index) => {
        errors.push(...this.validateCondition(subCondition, `${path}.and[${index}]`));
      });
    }

    if (condition.or) {
      condition.or.forEach((subCondition, index) => {
        errors.push(...this.validateCondition(subCondition, `${path}.or[${index}]`));
      });
    }

    return errors;
  }

  /**
   * Check if action type is valid
   */
  private isValidActionType(actionType: string): actionType is PolicyActionType {
    const validTypes: PolicyActionType[] = [
      'suppressRecommendations',
      'escalatePrivacy',
      'excludeExperimentArm',
      'requireApproval',
      'auditLog',
      'notifyAdmin',
      'blockAccess'
    ];
    
    return validTypes.includes(actionType as PolicyActionType);
  }
}

// Export singleton instance
export const policyEngine = new PolicyEngineService();