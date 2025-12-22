/**
 * Export barrel for Phase 1 UI Refactor components
 * Organized to support tree-shaking while providing convenient imports
 */

// Campaign-specific components
export { default as CampaignCreateWizard } from './campaign/CampaignCreateWizard';
export { default as CampaignOverviewV2 } from './campaign/CampaignOverviewV2';
export { default as CampaignKpiCard } from './campaign/CampaignKpiCard';
export { default as ClassificationBuckets } from './campaign/ClassificationBuckets';
export { default as WarningSummary } from './campaign/WarningSummary';
export { default as ConfigSummary } from './campaign/ConfigSummary';
export { default as PipelineBarContainer } from './campaign/PipelineBarContainer';

// Wizard step components
export { default as GoalStep } from './campaign/steps/GoalStep';
export { default as PatternStep } from './campaign/steps/PatternStep';
export { default as TargetingStep } from './campaign/steps/TargetingStep';
export { default as ReviewStep } from './campaign/steps/ReviewStep';

// Types
export type {
  CampaignDomain,
  DomainStatus,
  PhaseStatus,
  CampaignPhaseExecution,
  WizardGoalStep,
  WizardPatternStep,
  WizardTargetingStep,
  WizardReviewStep,
  CampaignWizardState,
  ClassificationBucket,
  PipelineSegment,
  CampaignKpi
} from './types';

// Test utilities (for testing external components that use these)
export {
  generateClassificationBuckets,
  generatePipelineSegments
} from './__tests__/aggregates.test';

export {
  classifyDomainByScore,
  classifyDomainByStatus,
  getDomainHealth,
  filterDomainsByQuality
} from './__tests__/classification.test';