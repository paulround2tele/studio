/**
 * Status Mapping Utilities
 * Maps between frontend and backend campaign status representations
 */

// Local status literals (API may not export an enum—use string union)
/* eslint-disable no-redeclare */
export const CampaignStatus = {
  draft: 'draft',
  running: 'running',
  paused: 'paused',
  completed: 'completed',
  failed: 'failed',
  cancelled: 'cancelled'
} as const;
export type CampaignStatus = typeof CampaignStatus[keyof typeof CampaignStatus];
/* eslint-enable no-redeclare */

// Define the actual status values used by the system (aligned with API)
export const CAMPAIGN_STATUSES = {
  DRAFT: 'draft',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type ValidCampaignStatus = typeof CAMPAIGN_STATUSES[keyof typeof CAMPAIGN_STATUSES];

// All valid status values as array
export const ALL_CAMPAIGN_STATUSES: CampaignStatus[] = Object.values(CampaignStatus);

/**
 * Check if a string is a valid campaign status
 */
export function isValidCampaignStatus(status: string): status is CampaignStatus {
  return (ALL_CAMPAIGN_STATUSES as string[]).includes(status);
}

/**
 * Normalize status string to valid campaign status
 */
export function normalizeStatus(status: unknown): CampaignStatus {
  if (typeof status !== 'string') {
    return CampaignStatus.draft;
  }

  const lowercaseStatus = status.toLowerCase();
  
  // Direct match
  if (isValidCampaignStatus(lowercaseStatus)) {
    return (lowercaseStatus as unknown) as CampaignStatus;
  }

  // Handle common variations and legacy statuses
  switch (lowercaseStatus) {
    case 'draft':
    case 'created':
    case 'new':
    case 'pending':
    return CampaignStatus.draft;
    case 'scheduled':
    case 'ready':
    case 'queued':
    case 'active':
    case 'inprogress':
    case 'running':
    case 'pausing':
    return CampaignStatus.running;
    case 'stopped':
    case 'halted':
    return CampaignStatus.paused;
    case 'done':
    case 'finished':
    case 'success':
    case 'succeeded':
    return CampaignStatus.completed;
    case 'error':
    case 'errored':
    case 'failure':
    case 'aborted':
    case 'terminated':
    case 'cancelled':
    case 'archived':
    case 'deleted':
    case 'removed':
    return CampaignStatus.failed;
    default:
      console.warn(`Unknown status value: ${status}, defaulting to draft`);
      return CampaignStatus.draft;
  }
}

/**
 * Get status display name for UI
 */
export function getStatusDisplayName(status: CampaignStatus): string {
  switch (status) {
  case CampaignStatus.draft:
      return 'Draft';
  case CampaignStatus.running:
      return 'Running';
  case CampaignStatus.paused:
      return 'Paused';
  case CampaignStatus.completed:
      return 'Completed';
  case CampaignStatus.failed:
      return 'Failed';
  case CampaignStatus.cancelled:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

/**
 * Get status color variant for UI components
 */
export function getStatusVariant(status: CampaignStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
  case CampaignStatus.draft:
      return 'outline';
  case CampaignStatus.running:
      return 'default';
  case CampaignStatus.paused:
      return 'secondary';
  case CampaignStatus.completed:
      return 'default';
  case CampaignStatus.failed:
      return 'destructive';
  case CampaignStatus.cancelled:
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * Check if status represents an active campaign
 */
export function isActiveStatus(status: CampaignStatus): boolean {
  return status === CampaignStatus.running;
}

/**
 * Get status color for UI (alias for getStatusVariant)
 */
export function getStatusColor(status: CampaignStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  return getStatusVariant(status);
}
