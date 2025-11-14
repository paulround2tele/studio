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
});
