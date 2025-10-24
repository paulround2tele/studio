import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mock API config to avoid real construction
jest.mock('@/lib/api/config', () => ({ apiConfiguration: {} }));

// Module-level mutable vars for mock data
let mockEnriched: unknown = {};
let mockProfiles: unknown[] = [];

// Mock campaignApi BEFORE component import
jest.mock('@/store/api/campaignApi', () => {
  const mockStatuses: Record<string, { status: string }> = {
    discovery: { status: 'completed' },
    validation: { status: 'completed' },
    extraction: { status: 'completed' },
    analysis: { status: 'completed' },
  };
  return {
    __esModule: true,
    setMockEnriched: (d: unknown) => { mockEnriched = d; },
    campaignApi: {
      endpoints: {
        getPhaseStatusStandalone: {
          select: ({ phase }: unknown) => () => ({ data: mockStatuses[phase] })
        },
        getCampaignEnriched: {
          select: () => () => ({ data: mockEnriched })
        }
      }
    },
    useStartPhaseStandaloneMutation: () => [jest.fn(), { isLoading: false }],
    useGetCampaignEnrichedQuery: () => ({ data: mockEnriched }),
  };
});

// Mock scoringApi BEFORE component import
jest.mock('@/store/api/scoringApi', () => {
  return {
    __esModule: true,
    setMockProfiles: (p: unknown[]) => { mockProfiles = p; },
    scoringApi: {
      endpoints: {
        listScoringProfiles: {
          select: () => () => ({ data: { items: mockProfiles } })
        }
      }
    },
    useListScoringProfilesQuery: () => ({ data: { items: mockProfiles } }),
  };
});

// After mocks, import component & helpers
import { CampaignOverviewCard } from '@/components/campaigns/workspace/CampaignOverviewCard';

// Provide a tiny store with just the slices the selectors expect.
function makeStore() {
  return configureStore({
    reducer: {
      // These dummy reducers exist only so the selector tree doesn't explode when accessing state keys.
      campaignUI: (s = { byId: { cmp1: { fullSequenceMode: false } } }) => s,
      pipelineExec: (s = { byCampaign: { cmp1: {} } }) => s,
    }
  });
}

describe('CampaignOverviewCard scoring display', () => {
  it('renders scoring profile, avg score and last rescore', () => {
    mockEnriched = { scoringProfileId: 'profA', scoring: { averageScore: 87.3, lastRescoreAt: '2024-12-01T00:00:00Z', profileId: 'profA' } };
    mockProfiles = [{ id: 'profA', name: 'Primary Profile' }];
    const store = makeStore();
    render(<Provider store={store}><CampaignOverviewCard campaignId="cmp1" /></Provider>);
    expect(screen.getByText(/Primary Profile/)).toBeInTheDocument();
    expect(screen.getByText(/Avg Score/i)).toBeInTheDocument();
    expect(screen.getByText(/87\.3/)).toBeInTheDocument();
    expect(screen.getByText(/Last Rescore/i)).toBeInTheDocument();
  });
});
