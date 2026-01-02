/**
 * Tests for CampaignOverviewV2 component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CampaignOverviewV2 from '../campaign/CampaignOverviewV2';
import { campaignApi } from '@/store/api/campaignApi';

jest.mock('@/hooks/useMetricsContext', () => {
  const React = require('react');

  const buildBuckets = (count: number) => {
    const total = Math.max(count, 1);
    const toPct = (value: number) => (count === 0 ? 0 : Math.round((value / count) * 100));
    if (count === 0) {
      return [
        { label: 'High Quality', count: 0, percentage: 0, color: '#10b981' },
        { label: 'Medium Quality', count: 0, percentage: 0, color: '#fbbf24' },
        { label: 'Low Quality', count: 0, percentage: 0, color: '#f87171' },
      ];
    }
    const high = Math.min(1, count);
    const low = count > 1 ? 1 : 0;
    const medium = Math.max(count - high - low, 0);
    return [
      { label: 'High Quality', count: high, percentage: toPct(high), color: '#10b981' },
      { label: 'Medium Quality', count: medium, percentage: toPct(medium), color: '#fbbf24' },
      { label: 'Low Quality', count: low, percentage: toPct(low), color: '#f87171' },
    ];
  };

  const baseValue = {
    currentSnapshot: null,
    aggregates: { totalDomains: 0, successRate: 0, avgLeadScore: 0 },
    classification: {},
    uiBuckets: buildBuckets(0),
    deltas: [],
    significantDeltas: [],
    hasPreviousData: false,
    movers: [],
    groupedMovers: { gainers: [], decliners: [] },
    hasMovers: false,
    progress: null,
    isConnected: false,
    progressStats: { percentage: 0, analyzedDomains: 0, totalDomains: 0 },
    recommendations: [],
    isLoading: false,
    isServerData: false,
    error: null,
    features: {
      useServerMetrics: false,
      enableDeltas: false,
      enableMoversPanel: false,
      enableRealtimeProgress: false,
    },
  };

  const MetricsContext = React.createContext(baseValue);

  const MetricsProvider = ({ children, domains = [] }: { children: React.ReactNode; domains?: Array<unknown>; previousDomains?: Array<unknown> }) => {
    const domainCount = Array.isArray(domains) ? domains.length : 0;
    const value = React.useMemo(() => ({
      ...baseValue,
      aggregates: {
        totalDomains: domainCount,
        successRate: domainCount ? 0.75 : 0,
        avgLeadScore: domainCount ? 72 : 0,
      },
      uiBuckets: buildBuckets(domainCount),
      progressStats: {
        percentage: 0,
        analyzedDomains: 0,
        totalDomains: domainCount,
      },
    }), [domainCount]);

    return <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>;
  };

  return {
    MetricsProvider,
    useMetricsContext: () => React.useContext(MetricsContext),
  };
});

// Mock the RTK Query hook
const mockUseGetCampaignEnrichedQuery = jest.fn();
const mockUseGetCampaignDomainsQuery = jest.fn();

jest.mock('@/store/api/campaignApi', () => ({
  useGetCampaignEnrichedQuery: () => mockUseGetCampaignEnrichedQuery(),
  useGetCampaignDomainsQuery: () => mockUseGetCampaignDomainsQuery(),
  campaignApi: {
    reducerPath: 'campaignApi',
    reducer: jest.fn(),
    middleware: jest.fn(() => () => (next: unknown) => (action: unknown) => next(action))
  }
}));

// Create a mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      [campaignApi.reducerPath]: (state = {}) => state
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(campaignApi.middleware as unknown)
  });
};

// Mock data
const mockEnrichedCampaign = {
  campaign: {
    id: 'test-campaign-id',
    name: 'Test Campaign',
    current_phase: 'discovery',
    phase_status: 'in_progress',
    progress_percentage: 45,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T12:00:00Z'
  },
  domains: [
    {
      id: '1',
      domain_name: 'example1.com',
      dns_status: 'ok',
      http_status: 'ok',
      lead_score: 85,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      domain_name: 'example2.com',
      dns_status: 'ok',
      http_status: 'error',
      lead_score: 45,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '3',
      domain_name: 'example3.com',
      dns_status: 'error',
      http_status: 'pending',
      lead_score: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ],
  phaseExecutions: [],
  state: 'running'
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = createMockStore();
  return <Provider store={store}>{children}</Provider>;
};

describe('CampaignOverviewV2 Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetCampaignDomainsQuery.mockReturnValue({
      data: { items: mockEnrichedCampaign.domains },
      isLoading: false,
      error: undefined
    });
  });

  describe('Loading State', () => {
    it('should display loading indicator when data is loading', () => {
      mockUseGetCampaignEnrichedQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: undefined
      });
      mockUseGetCampaignDomainsQuery.mockReturnValue({ data: { items: [] }, isLoading: true, error: undefined });

      render(
        <TestWrapper>
          <CampaignOverviewV2 campaignId="test-id" />
        </TestWrapper>
      );

      expect(screen.getByText('Loading overview...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
    });
  });

  describe('Error State', () => {
    it('should display error message when query fails', () => {
      mockUseGetCampaignEnrichedQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { message: 'Failed to fetch' }
      });
      mockUseGetCampaignDomainsQuery.mockReturnValue({ data: undefined, isLoading: false, error: { message: 'Failed to fetch' } });

      render(
        <TestWrapper>
          <CampaignOverviewV2 campaignId="test-id" />
        </TestWrapper>
      );

      expect(screen.getByText('Failed to load campaign overview')).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    beforeEach(() => {
      mockUseGetCampaignEnrichedQuery.mockReturnValue({
        data: mockEnrichedCampaign,
        isLoading: false,
        error: undefined
      });
      mockUseGetCampaignDomainsQuery.mockReturnValue({
        data: { items: mockEnrichedCampaign.domains },
        isLoading: false,
        error: undefined
      });
    });

    it('should render KPI cards when data is loaded', async () => {
      render(
        <TestWrapper>
          <CampaignOverviewV2 campaignId="test-id" />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check for KPI card labels
        expect(screen.getByText('Total Domains')).toBeInTheDocument();
        expect(screen.getByText('Success Rate')).toBeInTheDocument();
        expect(screen.getByText('Avg Lead Score')).toBeInTheDocument();
        expect(screen.getByText('Runtime')).toBeInTheDocument();
      });
    });

    it('should display correct total domains count', async () => {
      render(
        <TestWrapper>
          <CampaignOverviewV2 campaignId="test-id" />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should show "3" as total domains (from mock data)
        const totalCounts = screen.getAllByText(/^3$/);
        expect(totalCounts.length).toBeGreaterThan(0);
      });
    });

    it('should render pipeline progress visualization', async () => {
      render(
        <TestWrapper>
          <CampaignOverviewV2 campaignId="test-id" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Pipeline Progress')).toBeInTheDocument();
        expect(screen.getByText('3 domains in pipeline')).toBeInTheDocument();
      });
    });

    it('should render classification buckets', async () => {
      render(
        <TestWrapper>
          <CampaignOverviewV2 campaignId="test-id" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Domain Classification')).toBeInTheDocument();
        // Should have classification buckets based on mock data lead scores
        expect(screen.getByText('High Quality')).toBeInTheDocument();
        expect(screen.getByText('Low Quality')).toBeInTheDocument();
      });
    });

    it('should render warning summary', async () => {
      render(
        <TestWrapper>
          <CampaignOverviewV2 campaignId="test-id" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('System Status')).toBeInTheDocument();
        // Should show DNS errors warning based on mock data
        expect(screen.getByText('DNS Resolution Issues')).toBeInTheDocument();
      });
    });

    it('should render configuration summary', async () => {
      render(
        <TestWrapper>
          <CampaignOverviewV2 campaignId="test-id" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Configuration')).toBeInTheDocument();
        expect(screen.getByText('Created')).toBeInTheDocument();
        expect(screen.getByText('Max Domains')).toBeInTheDocument();
        expect(screen.getByText('Pattern')).toBeInTheDocument();
      });
    });
  });

  describe('Empty Data State', () => {
    it('should handle campaign with no domains', async () => {
      const emptyData = {
        ...mockEnrichedCampaign,
        domains: []
      };

      mockUseGetCampaignEnrichedQuery.mockReturnValue({
        data: emptyData,
        isLoading: false,
        error: undefined
      });
      mockUseGetCampaignDomainsQuery.mockReturnValue({ data: { items: [] }, isLoading: false, error: undefined });

      render(
        <TestWrapper>
          <CampaignOverviewV2 campaignId="test-id" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Total Domains')).toBeInTheDocument();
        const zeroValues = screen.getAllByText(/^0$/);
        expect(zeroValues.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseGetCampaignEnrichedQuery.mockReturnValue({
        data: mockEnrichedCampaign,
        isLoading: false,
        error: undefined
      });
      mockUseGetCampaignDomainsQuery.mockReturnValue({
        data: { items: mockEnrichedCampaign.domains },
        isLoading: false,
        error: undefined
      });
    });

    it('should have proper semantic structure', async () => {
      render(
        <TestWrapper>
          <CampaignOverviewV2 campaignId="test-id" />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check for proper heading structure
        const headings = screen.getAllByRole('heading');
        expect(headings.length).toBeGreaterThan(0);
        
        // Check component renders with semantic elements
        // The component uses grid layout instead of list for metrics
        expect(screen.getByText('Total Domains')).toBeInTheDocument();
      });
    });

    it('should provide meaningful loading state for screen readers', () => {
      mockUseGetCampaignEnrichedQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: undefined
      });
      mockUseGetCampaignDomainsQuery.mockReturnValue({ data: undefined, isLoading: true, error: undefined });

      render(
        <TestWrapper>
          <CampaignOverviewV2 campaignId="test-id" />
        </TestWrapper>
      );

      expect(screen.getByText('Loading overview...')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    beforeEach(() => {
      mockUseGetCampaignEnrichedQuery.mockReturnValue({
        data: mockEnrichedCampaign,
        isLoading: false,
        error: undefined
      });
      mockUseGetCampaignDomainsQuery.mockReturnValue({
        data: { items: mockEnrichedCampaign.domains },
        isLoading: false,
        error: undefined
      });
    });

    it('should apply custom className', async () => {
      const { container } = render(
        <TestWrapper>
          <CampaignOverviewV2 campaignId="test-id" className="custom-overview" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-overview');
      });
    });
  });
});