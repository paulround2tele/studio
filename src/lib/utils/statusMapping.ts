/**
 * Status Mapping Utilities
 * Maps between frontend and backend campaign status representations
 */

import type { components } from '@/lib/api-client/types';

type CampaignStatus = NonNullable<components['schemas']['api.CampaignSummary']['phaseStatus']>;

// Define the actual status values used by the system (aligned with API)
export const CAMPAIGN_STATUSES = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

export type ValidCampaignStatus = typeof CAMPAIGN_STATUSES[keyof typeof CAMPAIGN_STATUSES];

// All valid status values as array
export const ALL_CAMPAIGN_STATUSES: CampaignStatus[] = [
  'not_started',
  'in_progress',
  'paused',
  'completed',
  'failed'
];

/**
 * Check if a string is a valid campaign status
 */
export function isValidCampaignStatus(status: string): status is CampaignStatus {
  return ALL_CAMPAIGN_STATUSES.includes(status as CampaignStatus);
}

/**
 * Normalize status string to valid campaign status
 */
export function normalizeStatus(status: unknown): CampaignStatus {
  if (typeof status !== 'string') {
    return 'not_started';
  }

  const lowercaseStatus = status.toLowerCase();
  
  // Direct match
  if (isValidCampaignStatus(lowercaseStatus)) {
    return lowercaseStatus;
  }

  // Handle common variations and legacy statuses
  switch (lowercaseStatus) {
    case 'draft':
    case 'created':
    case 'new':
    case 'pending':
      return 'not_started';
    case 'scheduled':
    case 'ready':
    case 'queued':
    case 'active':
    case 'inprogress':
    case 'running':
    case 'pausing':
      return 'in_progress';
    case 'stopped':
    case 'halted':
      return 'paused';
    case 'done':
    case 'finished':
    case 'success':
    case 'succeeded':
      return 'completed';
    case 'error':
    case 'errored':
    case 'failure':
    case 'aborted':
    case 'terminated':
    case 'cancelled':
    case 'archived':
    case 'deleted':
    case 'removed':
      return 'failed';
    default:
      console.warn(`Unknown status value: ${status}, defaulting to not_started`);
      return 'not_started';
  }
}

/**
 * Get status display name for UI
 */
export function getStatusDisplayName(status: CampaignStatus): string {
  switch (status) {
    case 'not_started':
      return 'Not Started';
    case 'in_progress':
      return 'In Progress';
    case 'paused':
      return 'Paused';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    default:
      return 'Unknown';
  }
}

/**
 * Get status color variant for UI components
 */
export function getStatusVariant(status: CampaignStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'not_started':
      return 'outline';
    case 'in_progress':
      return 'default';
    case 'paused':
      return 'secondary';
    case 'completed':
      return 'default';
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Check if status represents an active campaign
 */
export function isActiveStatus(status: CampaignStatus): boolean {
  return status === 'in_progress';
}

/**
 * Get status color for UI (alias for getStatusVariant)
 */
export function getStatusColor(status: CampaignStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  return getStatusVariant(status);
}
