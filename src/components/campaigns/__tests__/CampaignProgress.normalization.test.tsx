import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { CampaignProgress } from '../CampaignProgress';
import type { CampaignResponse } from '@/lib/api-client/models/campaign-response';
import type { PhaseExecution } from '@/lib/api-client/models/phase-execution';

describe('CampaignProgress phase normalization', () => {
  it('computes progress using normalized phase identifiers', () => {
    const campaign: CampaignResponse = {
      id: 'c1',
      name: 'Test Campaign',
      status: 'running',
      configuration: {},
      currentPhase: 'enrichment',
      progress: { percentComplete: 48 },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const phaseExecutions: PhaseExecution[] = [
      {
        id: 'phase-http',
        campaignId: 'c1',
        phaseType: 'http_keyword_validation' as unknown as PhaseExecution['phaseType'],
        status: 'in_progress',
        progressPercentage: 42,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:30Z',
      },
    ];

    render(<CampaignProgress campaign={campaign} phaseExecutions={phaseExecutions} />);

    expect(screen.getAllByText('Lead Enrichment').length).toBeGreaterThan(0);
    expect(screen.getByText(/48%/)).toBeInTheDocument();
  });

  it('surfaces backend error details when a phase fails', () => {
    const campaign: CampaignResponse = {
      id: 'c1',
      name: 'Failure Campaign',
      status: 'failed',
      configuration: {},
      currentPhase: 'analysis',
      progress: { percentComplete: 75 },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:05:00.000Z',
    };

    const phaseExecutions: PhaseExecution[] = [
      {
        id: 'phase-analysis',
        campaignId: 'c1',
        phaseType: 'analysis',
        status: 'failed',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:04:59Z',
        errorDetails: {
          code: 'E_ANALYSIS_MISSING_FEATURES',
          message: 'no feature vectors present (HTTP phase missing or enrichment disabled)',
          details: {
            phase: 'analysis',
            missingTable: 'domain_extraction_features'
          }
        }
      }
    ];

    render(<CampaignProgress campaign={campaign} phaseExecutions={phaseExecutions} />);

    const surfacedMessages = screen.getAllByText(/no feature vectors present/i);
    expect(surfacedMessages.length).toBeGreaterThan(0);
    const surfacedCodes = screen.getAllByText(/E_ANALYSIS_MISSING_FEATURES/);
    expect(surfacedCodes.length).toBeGreaterThan(0);
    expect(screen.getByText(/Technical details/i)).toBeInTheDocument();
  });
});
