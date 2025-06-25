/**
 * Test for H-005 Updated: Campaign Status Enum - Include 'archived' status
 *
 * Backend and OpenAPI spec now include 'archived' in CampaignStatusEnum.
 * Ensure the generated client matches the backend values.
 */

import { ModelsCampaignStatusEnum } from '../models-campaign-status-enum';

describe('H-005: Campaign Status Enum Contract Alignment', () => {
  it('should include all backend statuses including archived', () => {
    const statusValues = Object.values(ModelsCampaignStatusEnum);

    // Verify all valid statuses are present
    expect(statusValues).toContain('pending');
    expect(statusValues).toContain('queued');
    expect(statusValues).toContain('running');
    expect(statusValues).toContain('pausing');
    expect(statusValues).toContain('paused');
    expect(statusValues).toContain('completed');
    expect(statusValues).toContain('failed');
    expect(statusValues).toContain('archived');
    expect(statusValues).toContain('cancelled');
  });

  it('should have exactly 9 status values (matching backend)', () => {
    const statusValues = Object.values(ModelsCampaignStatusEnum);
    expect(statusValues).toHaveLength(9);
  });

  it('should have CampaignStatusArchived key', () => {
    expect('CampaignStatusArchived' in ModelsCampaignStatusEnum).toBe(true);
  });

  it('should match backend enum values exactly', () => {
    // These are the exact values from backend models.go
    const backendStatuses = [
      'pending',
      'queued',
      'running',
      'pausing',
      'paused',
      'completed',
      'failed',
      'archived',
      'cancelled'
    ];

    const frontendStatuses = Object.values(ModelsCampaignStatusEnum);
    
    // Should have same values
    expect(frontendStatuses.sort()).toEqual(backendStatuses.sort());
  });

  it('should be usable in TypeScript type checking', () => {
    // Type test - this should compile without errors
    type StatusType = typeof ModelsCampaignStatusEnum[keyof typeof ModelsCampaignStatusEnum];
    
    const validStatus: StatusType = ModelsCampaignStatusEnum.CampaignStatusRunning;
    expect(validStatus).toBe('running');

    // Should allow archived as a valid value
    const archivedStatus: StatusType = ModelsCampaignStatusEnum.CampaignStatusArchived;
    expect(archivedStatus).toBe('archived');
  });
});