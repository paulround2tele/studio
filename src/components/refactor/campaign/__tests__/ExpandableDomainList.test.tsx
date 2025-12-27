/**
 * ExpandableDomainList Unit Tests
 * 
 * Tests for:
 * - Expand/collapse behavior
 * - Domain click handlers
 * - Pagination
 * - Category-specific styling
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ExpandableDomainList } from '../ExpandableDomainList';
import type { DomainListItem } from '@/lib/api-client/models/domain-list-item';

const mockDomains: DomainListItem[] = Array.from({ length: 15 }, (_, i) => ({
  id: `${i + 1}`,
  domain: `domain-${i + 1}.com`,
  domainScore: 30 + (i * 5),
  leadStatus: 'noMatch' as const,
  dnsStatus: 'ok',
  httpStatus: 'ok',
  createdAt: new Date().toISOString(),
  features: {
    keywords: { top3: ['keyword'], unique_count: 1 },
    richness: { score: 20 + i },
  },
}));

describe('ExpandableDomainList', () => {
  const mockOnDomainClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Collapse/Expand Behavior', () => {
    it('is collapsed by default', () => {
      render(
        <ExpandableDomainList
          title="Rejected by Scoring"
          count={5}
          domains={mockDomains.slice(0, 5)}
          category="rejected"
          onRowClick={mockOnDomainClick}
        />
      );

      // Header should be visible with title
      expect(screen.getByText('Rejected by Scoring')).toBeInTheDocument();
      // Count should be visible in badge (displayed as plain number, not "(5)")
      expect(screen.getByText('5')).toBeInTheDocument();
      
      // Content should not be visible when collapsed
      expect(screen.queryByText('domain-1.com')).not.toBeInTheDocument();
    });

    it('expands when header is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <ExpandableDomainList
          title="Rejected by Scoring"
          count={5}
          domains={mockDomains.slice(0, 5)}
          category="rejected"
          onRowClick={mockOnDomainClick}
        />
      );

      const header = screen.getByRole('button', { name: /rejected by scoring/i });
      await user.click(header);

      await waitFor(() => {
        expect(screen.getByText('domain-1.com')).toBeInTheDocument();
      });
    });

    it('collapses when header is clicked again', async () => {
      const user = userEvent.setup();
      
      render(
        <ExpandableDomainList
          title="Rejected by Scoring"
          count={5}
          domains={mockDomains.slice(0, 5)}
          category="rejected"
          onRowClick={mockOnDomainClick}
        />
      );

      const header = screen.getByRole('button', { name: /rejected by scoring/i });
      
      // Expand
      await user.click(header);
      await waitFor(() => {
        expect(screen.getByText('domain-1.com')).toBeInTheDocument();
      });

      // Collapse
      await user.click(header);
      await waitFor(() => {
        expect(screen.queryByText('domain-1.com')).not.toBeInTheDocument();
      });
    });

    it('supports keyboard navigation (Enter key)', async () => {
      const user = userEvent.setup();
      
      render(
        <ExpandableDomainList
          title="Rejected by Scoring"
          count={5}
          domains={mockDomains.slice(0, 5)}
          category="rejected"
          onRowClick={mockOnDomainClick}
        />
      );

      const header = screen.getByRole('button', { name: /rejected by scoring/i });
      header.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('domain-1.com')).toBeInTheDocument();
      });
    });
  });

  describe('Domain Click Handler', () => {
    it('calls onRowClick when a domain row is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <ExpandableDomainList
          title="Rejected by Scoring"
          count={5}
          domains={mockDomains.slice(0, 5)}
          category="rejected"
          onRowClick={mockOnDomainClick}
        />
      );

      // First expand the list
      const header = screen.getByRole('button', { name: /rejected by scoring/i });
      await user.click(header);

      // Then click a domain row (tr elements with role="button")
      await waitFor(() => {
        expect(screen.getByText('domain-1.com')).toBeInTheDocument();
      });
      
      const domainRow = screen.getByText('domain-1.com').closest('tr');
      expect(domainRow).toBeInTheDocument();
      await user.click(domainRow!);

      expect(mockOnDomainClick).toHaveBeenCalledWith(mockDomains[0]);
    });

    it('passes correct domain data to click handler', async () => {
      const user = userEvent.setup();
      
      render(
        <ExpandableDomainList
          title="Rejected by Scoring"
          count={5}
          domains={mockDomains.slice(0, 5)}
          category="rejected"
          onRowClick={mockOnDomainClick}
        />
      );

      const header = screen.getByRole('button', { name: /rejected by scoring/i });
      await user.click(header);

      await waitFor(() => {
        expect(screen.getByText('domain-2.com')).toBeInTheDocument();
      });
      
      const secondDomainRow = screen.getByText('domain-2.com').closest('tr');
      await user.click(secondDomainRow!);

      expect(mockOnDomainClick).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'domain-2.com',
          id: '2',
        })
      );
    });
  });

  describe('Pagination', () => {
    it('shows only first 10 items by default', async () => {
      const user = userEvent.setup();
      
      render(
        <ExpandableDomainList
          title="Rejected by Scoring"
          count={15}
          domains={mockDomains}
          category="rejected"
          onRowClick={mockOnDomainClick}
        />
      );

      const header = screen.getByRole('button', { name: /rejected by scoring/i });
      await user.click(header);

      await waitFor(() => {
        // First 10 should be visible
        expect(screen.getByText('domain-1.com')).toBeInTheDocument();
        expect(screen.getByText('domain-10.com')).toBeInTheDocument();
        // 11th should not be visible initially
        expect(screen.queryByText('domain-11.com')).not.toBeInTheDocument();
      });
    });

    it('shows "Show more" button when more items available', async () => {
      const user = userEvent.setup();
      
      render(
        <ExpandableDomainList
          title="Rejected by Scoring"
          count={15}
          domains={mockDomains}
          category="rejected"
          onRowClick={mockOnDomainClick}
        />
      );

      const header = screen.getByRole('button', { name: /rejected by scoring/i });
      await user.click(header);

      await waitFor(() => {
        expect(screen.getByText(/Show more/i)).toBeInTheDocument();
      });
    });

    it('loads more items when "Show more" is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <ExpandableDomainList
          title="Rejected by Scoring"
          count={15}
          domains={mockDomains}
          category="rejected"
          onRowClick={mockOnDomainClick}
        />
      );

      const header = screen.getByRole('button', { name: /rejected by scoring/i });
      await user.click(header);

      await waitFor(async () => {
        const showMoreBtn = screen.getByText(/Show more/i);
        await user.click(showMoreBtn);
      });

      await waitFor(() => {
        // Now 11th item should be visible
        expect(screen.getByText('domain-11.com')).toBeInTheDocument();
      });
    });
  });

  describe('Category-Specific Styling', () => {
    it('applies rejected category styling to badge', () => {
      render(
        <ExpandableDomainList
          title="Rejected by Scoring"
          count={5}
          domains={mockDomains.slice(0, 5)}
          category="rejected"
          onRowClick={mockOnDomainClick}
        />
      );

      // Check for rose/red styling class in the badge (count display)
      const badge = screen.getByText('5');
      expect(badge.className).toContain('rose');
    });

    it('applies no_keywords category styling to badge', () => {
      render(
        <ExpandableDomainList
          title="No Keywords Found"
          count={5}
          domains={mockDomains.slice(0, 5)}
          category="no_keywords"
          onRowClick={mockOnDomainClick}
        />
      );

      // Check for amber/yellow styling class
      const badge = screen.getByText('5');
      expect(badge.className).toContain('amber');
    });

    it('applies matches category styling to badge', () => {
      render(
        <ExpandableDomainList
          title="Matches"
          count={5}
          domains={mockDomains.slice(0, 5)}
          category="matches"
          onRowClick={mockOnDomainClick}
        />
      );

      // Check for emerald/green styling class
      const badge = screen.getByText('5');
      expect(badge.className).toContain('emerald');
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes on header button', () => {
      render(
        <ExpandableDomainList
          title="Rejected by Scoring"
          count={5}
          domains={mockDomains.slice(0, 5)}
          category="rejected"
          onRowClick={mockOnDomainClick}
        />
      );

      const header = screen.getByRole('button', { name: /rejected by scoring/i });
      expect(header).toHaveAttribute('aria-expanded', 'false');
    });

    it('updates ARIA state when expanded', async () => {
      const user = userEvent.setup();
      
      render(
        <ExpandableDomainList
          title="Rejected by Scoring"
          count={5}
          domains={mockDomains.slice(0, 5)}
          category="rejected"
          onRowClick={mockOnDomainClick}
        />
      );

      const header = screen.getByRole('button', { name: /rejected by scoring/i });
      await user.click(header);

      expect(header).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Empty State', () => {
    it('does not render when domains array is empty', () => {
      const { container } = render(
        <ExpandableDomainList
          title="Rejected by Scoring"
          count={0}
          domains={[]}
          category="rejected"
          onRowClick={mockOnDomainClick}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });
});
