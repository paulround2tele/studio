/**
 * LeadResultsPanel Unit Tests
 * 
 * Tests for:
 * - Domain score column rendering and sorting
 * - Row click behavior opening drawer
 * - Drawer error and skeleton states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { LeadResultsPanel } from '../LeadResultsPanel';
import type { DomainListItem } from '@/lib/api-client/models/domain-list-item';

// Mock the campaignApi hook
jest.mock('@/store/api/campaignApi', () => ({
  useGetCampaignDomainScoreBreakdownQuery: jest.fn(),
}));

import { useGetCampaignDomainScoreBreakdownQuery } from '@/store/api/campaignApi';

const mockUseGetCampaignDomainScoreBreakdownQuery = useGetCampaignDomainScoreBreakdownQuery as jest.Mock;

// Create a mock store
const createMockStore = () => configureStore({
  reducer: {
    // Minimal reducer for testing
    test: (state = {}) => state,
  },
});

// Helper to render with providers
const renderWithProviders = (ui: React.ReactElement) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      {ui}
    </Provider>
  );
};

// Mock domain data with scores
const mockDomains: DomainListItem[] = [
  {
    id: '1',
    domain: 'high-score.com',
    domainScore: 92,
    leadScore: 85,
    leadStatus: 'match',
    dnsStatus: 'ok',
    httpStatus: 'ok',
    createdAt: new Date().toISOString(),
    features: {
      keywords: { top3: ['insurance', 'coverage', 'premium'], unique_count: 5 },
      richness: { score: 78 },
    },
  },
  {
    id: '2',
    domain: 'medium-score.com',
    domainScore: 65,
    leadScore: 55,
    leadStatus: 'match',
    dnsStatus: 'ok',
    httpStatus: 'ok',
    createdAt: new Date().toISOString(),
    features: {
      keywords: { top3: ['quotes', 'rates'], unique_count: 3 },
      richness: { score: 45 },
    },
  },
  {
    id: '3',
    domain: 'low-score.com',
    domainScore: 35,
    leadScore: 25,
    leadStatus: 'match',  // Changed to match so it shows in table
    dnsStatus: 'ok',
    httpStatus: 'ok',
    createdAt: new Date().toISOString(),
    features: {
      keywords: { top3: [], unique_count: 0 },
      richness: { score: 20 },
    },
  },
  {
    id: '4',
    domain: 'no-score.com',
    domainScore: undefined,
    leadStatus: 'match',  // Changed to match so it shows in table
    dnsStatus: 'ok',
    httpStatus: 'ok',
    createdAt: new Date().toISOString(),
  },
];

describe('LeadResultsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: return loading state
    mockUseGetCampaignDomainScoreBreakdownQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  describe('Domain Score Column', () => {
    it('renders Score column header', () => {
      renderWithProviders(
        <LeadResultsPanel
          domains={mockDomains}
          campaignId="test-campaign"
        />
      );

      expect(screen.getByText('Score')).toBeInTheDocument();
    });

    it('displays domain scores correctly', () => {
      renderWithProviders(
        <LeadResultsPanel
          domains={mockDomains}
          campaignId="test-campaign"
        />
      );

      // Check high score (92)
      expect(screen.getByText('92')).toBeInTheDocument();
      
      // Check medium score (65)
      expect(screen.getByText('65')).toBeInTheDocument();
    });

    it('displays dash for domains without scores', () => {
      renderWithProviders(
        <LeadResultsPanel
          domains={mockDomains}
          campaignId="test-campaign"
        />
      );

      // Find the dash character for no-score domain
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThan(0);
    });

    it('applies correct color coding for score ranges', () => {
      renderWithProviders(
        <LeadResultsPanel
          domains={mockDomains}
          campaignId="test-campaign"
        />
      );

      // High score (92) should have emerald color class
      const highScoreEl = screen.getByText('92');
      expect(highScoreEl.className).toContain('emerald');

      // Medium score (65) should have amber color class
      const mediumScoreEl = screen.getByText('65');
      expect(mediumScoreEl.className).toContain('amber');
    });
  });

  describe('Score Sorting', () => {
    it('sorts by score descending by default', () => {
      renderWithProviders(
        <LeadResultsPanel
          domains={mockDomains}
          campaignId="test-campaign"
        />
      );

      // Get all table rows (excluding header)
      const rows = screen.getAllByRole('button');
      
      // First row should be highest score
      expect(rows[0]).toHaveAttribute('aria-label', 'View details for high-score.com');
    });

    it('toggles sort direction when Score header is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <LeadResultsPanel
          domains={mockDomains}
          campaignId="test-campaign"
        />
      );

      const scoreHeader = screen.getByText('Score').closest('th');
      expect(scoreHeader).toBeInTheDocument();
      
      // Click to toggle sort
      await user.click(scoreHeader!);

      // Should now show ascending indicator
      const sortIndicator = scoreHeader?.querySelector('svg');
      // After first click on already-sorted column, direction should change
      expect(sortIndicator).toBeInTheDocument();
    });
  });

  describe('Row Click Behavior', () => {
    it('rows are clickable with correct role', () => {
      renderWithProviders(
        <LeadResultsPanel
          domains={mockDomains}
          campaignId="test-campaign"
        />
      );

      // Each row has an aria-label "View details for <domain>"
      const rows = screen.getAllByRole('button', { name: /View details for/i });
      expect(rows.length).toBe(mockDomains.length);
    });

    it('rows have aria-label for accessibility', () => {
      renderWithProviders(
        <LeadResultsPanel
          domains={mockDomains}
          campaignId="test-campaign"
        />
      );

      const firstRow = screen.getByRole('button', { name: /View details for high-score.com/i });
      expect(firstRow).toBeInTheDocument();
    });

    it('rows support keyboard focus', () => {
      renderWithProviders(
        <LeadResultsPanel
          domains={mockDomains}
          campaignId="test-campaign"
        />
      );

      const firstRow = screen.getByRole('button', { name: /View details for high-score.com/i });
      expect(firstRow).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Empty and Loading States', () => {
    it('shows loading spinner when isLoading is true', () => {
      renderWithProviders(
        <LeadResultsPanel
          domains={[]}
          isLoading={true}
          campaignId="test-campaign"
        />
      );

      expect(screen.getByText('Updating...')).toBeInTheDocument();
    });

    it('shows empty state message when no domains', () => {
      renderWithProviders(
        <LeadResultsPanel
          domains={[]}
          campaignId="test-campaign"
        />
      );

      expect(screen.getByText(/Lead results will appear/i)).toBeInTheDocument();
    });

    it('displays error message when error prop is provided', () => {
      renderWithProviders(
        <LeadResultsPanel
          domains={mockDomains}
          error="Failed to load domains"
          campaignId="test-campaign"
        />
      );

      expect(screen.getByText('Failed to load domains')).toBeInTheDocument();
    });
  });

  describe('Status Counts Display', () => {
    it('shows lead status aggregates', () => {
      renderWithProviders(
        <LeadResultsPanel
          domains={mockDomains}
          aggregates={{
            match: 2,
            pending: 1,
            noMatch: 1,
            error: 0,
            timeout: 0,
          }}
          campaignId="test-campaign"
        />
      );

      // Should display the counts - use getAllByText since "Matches" appears in header and content
      const matchesElements = screen.getAllByText('Matches');
      expect(matchesElements.length).toBeGreaterThan(0);
    });
  });

  describe('Clickable Score Column', () => {
    it('renders score as a clickable button', () => {
      renderWithProviders(
        <LeadResultsPanel
          domains={mockDomains}
          campaignId="test-campaign"
        />
      );

      // Each score should be clickable (except dashes)
      const scoreButtons = screen.getAllByRole('button', { name: /View score breakdown/i });
      expect(scoreButtons.length).toBeGreaterThan(0);
    });

    it('has tooltip explaining score click behavior', () => {
      renderWithProviders(
        <LeadResultsPanel
          domains={mockDomains}
          campaignId="test-campaign"
        />
      );

      // Score buttons should have title attribute
      const scoreButton = screen.getByRole('button', { name: /View score breakdown for high-score.com/i });
      expect(scoreButton).toHaveAttribute('title', 'Click to view score breakdown');
    });
  });

  describe('Expandable Domain Lists', () => {
    const domainsWithRejected: DomainListItem[] = [
      ...mockDomains,
      {
        id: '5',
        domain: 'rejected-domain.com',
        domainScore: 30,
        leadStatus: 'no_match',  // Use underscore format to match backend
        dnsStatus: 'ok',
        httpStatus: 'ok',
        createdAt: new Date().toISOString(),
        features: {
          keywords: { top3: ['test'], unique_count: 1 },
        },
      },
      {
        id: '6',
        domain: 'no-keywords-domain.com',
        domainScore: undefined,
        leadStatus: 'pending',
        dnsStatus: 'ok',
        httpStatus: 'ok',
        createdAt: new Date().toISOString(),
        // No keywords data
      },
    ];

    it('shows Additional Results section when rejected domains exist', () => {
      renderWithProviders(
        <LeadResultsPanel
          domains={domainsWithRejected}
          campaignId="test-campaign"
        />
      );

      expect(screen.getByText('Additional Results')).toBeInTheDocument();
    });

    it('shows Rejected by Scoring expandable list when rejected domains exist', () => {
      renderWithProviders(
        <LeadResultsPanel
          domains={domainsWithRejected}
          campaignId="test-campaign"
        />
      );

      // Should show the rejected header with expandable list
      const rejectedHeader = screen.getByRole('button', { name: /rejected by scoring/i });
      expect(rejectedHeader).toBeInTheDocument();
    });

    it('expandable list is collapsed by default', () => {
      renderWithProviders(
        <LeadResultsPanel
          domains={domainsWithRejected}
          campaignId="test-campaign"
        />
      );

      // The rejected domain should not be visible until expanded
      const rejectedHeader = screen.getByRole('button', { name: /rejected by scoring/i });
      expect(rejectedHeader).toBeInTheDocument();
      
      // Check aria-expanded is false (collapsed)
      expect(rejectedHeader).toHaveAttribute('aria-expanded', 'false');
    });

    it('clicking expandable header toggles visibility', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <LeadResultsPanel
          domains={domainsWithRejected}
          campaignId="test-campaign"
        />
      );

      const rejectedHeader = screen.getByRole('button', { name: /rejected by scoring/i });
      
      // Click to expand
      await user.click(rejectedHeader);
      
      // After expanding, the rejected domain should be visible
      await waitFor(() => {
        expect(screen.getByText('rejected-domain.com')).toBeInTheDocument();
      });
    });
  });
});
