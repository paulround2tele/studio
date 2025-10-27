import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { CampaignProgress } from '../CampaignProgress';

describe('CampaignProgress phase normalization', () => {
  it('computes progress using normalized phase identifiers', () => {
    const campaign = {
      id: 'c1',
      name: 'Test Campaign',
      status: 'running',
      configuration: {},
      currentPhase: 'enrichment',
      progress: {},
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    } as any;

    const phaseExecutions = [
      {
        id: 'phase-http',
        campaignId: 'c1',
        phaseType: 'http_keyword_validation',
        status: 'in_progress',
        progressPercentage: 42,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:30Z',
      },
    ] as any;

    render(<CampaignProgress campaign={campaign} phaseExecutions={phaseExecutions} />);

    expect(screen.getAllByText('HTTP Data Enrichment').length).toBeGreaterThan(0);
    expect(screen.getByText(/48%/)).toBeInTheDocument();
  });
});
