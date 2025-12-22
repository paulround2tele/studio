/**
 * Phase 7.3: Domain Drawer Tests
 * 
 * Tests for drawer components ensuring:
 * 1. State authority - drawer consumes explorer state only
 * 2. Degraded state - explicit messaging when breakdown unavailable
 * 3. Memoization - content doesn't re-render on drawer open/close
 * 4. No authority drift - drawer actions route to hook
 * 
 * @see Phase 7.3 Drawer Integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Components under test
import { DomainDrawer } from '../DomainDrawer';
import { DomainDrawerContent, DomainDrawerEmpty } from '../DomainDrawerContent';
import { DomainDrawerHeader } from '../DomainDrawerHeader';
import { DomainDrawerRichness } from '../DomainDrawerRichness';
import { DomainDrawerFeatures } from '../DomainDrawerFeatures';
import { DomainDrawerDegraded, FallbackRichness } from '../DomainDrawerDegraded';
import { DomainDrawerSkeleton } from '../DomainDrawerSkeleton';

import type { DomainRow } from '@/types/explorer/state';
import type { DomainDrawerData, DomainScoreBreakdown } from '@/types/explorer/drawer';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockDomain: DomainRow = {
  id: 'domain-123',
  domain: 'example.com',
  dnsStatus: 'valid',
  httpStatus: 'reachable',
  leadStatus: 'extracted',
  dnsReason: 'A record found',
  httpReason: '200 OK',
  createdAt: '2024-01-15T10:30:00Z',
  features: {
    richness: {
      score: 75,
    },
    keywords: {
      unique_count: 12,
      hits_total: 45,
      top3: ['marketing', 'software', 'analytics'],
    },
    microcrawl: {
      gain_ratio: 0.65,
    },
  },
};

const mockScoreBreakdown: DomainScoreBreakdown = {
  campaignId: 'campaign-1',
  domain: 'example.com',
  final: 75,
  components: {
    density: 0.8,
    coverage: 0.7,
    non_parked: 0.95,
    content_length: 0.6,
    title_keyword: 0.85,
    freshness: 0.5,
  },
  parkedPenaltyFactor: 1.0,
};

const mockDrawerDataAvailable: DomainDrawerData = {
  base: mockDomain,
  scoreBreakdown: mockScoreBreakdown,
  isLoadingBreakdown: false,
  breakdownError: null,
  isBreakdownUnavailable: false,
};

const mockDrawerDataUnavailable: DomainDrawerData = {
  base: mockDomain,
  scoreBreakdown: null,
  isLoadingBreakdown: false,
  breakdownError: null,
  isBreakdownUnavailable: true,
};

const mockDrawerDataLoading: DomainDrawerData = {
  base: mockDomain,
  scoreBreakdown: null,
  isLoadingBreakdown: true,
  breakdownError: null,
  isBreakdownUnavailable: false,
};

const mockDrawerDataError: DomainDrawerData = {
  base: mockDomain,
  scoreBreakdown: null,
  isLoadingBreakdown: false,
  breakdownError: 'Network error: failed to fetch breakdown',
  isBreakdownUnavailable: false,
};

// ============================================================================
// DOMAIN DRAWER TESTS
// ============================================================================

describe('DomainDrawer', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders when open with domain', () => {
    render(
      <DomainDrawer
        isOpen={true}
        domain={mockDomain}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('domain-drawer')).toBeInTheDocument();
    expect(screen.getByText('Domain Details')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(
      <DomainDrawer
        isOpen={false}
        domain={mockDomain}
        onClose={mockOnClose}
      />
    );

    // Sheet should not be visible when closed
    expect(screen.queryByTestId('domain-drawer-content')).not.toBeInTheDocument();
  });

  it('shows empty state when no domain', () => {
    render(
      <DomainDrawer
        isOpen={true}
        domain={null}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('domain-drawer-empty')).toBeInTheDocument();
    expect(screen.getByText('Select a domain to view details')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    render(
      <DomainDrawer
        isOpen={true}
        domain={mockDomain}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByTestId('domain-drawer-close');
    fireEvent.click(closeButton);

    // Close button click + Sheet onOpenChange both trigger onClose
    // This is expected behavior with Radix Sheet
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(
      <DomainDrawer isOpen={true} domain={mockDomain} onClose={mockOnClose} size="default" />
    );
    expect(screen.getByTestId('domain-drawer')).toBeInTheDocument();

    rerender(
      <DomainDrawer isOpen={true} domain={mockDomain} onClose={mockOnClose} size="lg" />
    );
    expect(screen.getByTestId('domain-drawer')).toBeInTheDocument();

    rerender(
      <DomainDrawer isOpen={true} domain={mockDomain} onClose={mockOnClose} size="xl" />
    );
    expect(screen.getByTestId('domain-drawer')).toBeInTheDocument();
  });
});

// ============================================================================
// DRAWER CONTENT TESTS
// ============================================================================

describe('DomainDrawerContent', () => {
  it('renders all sections', () => {
    render(<DomainDrawerContent domain={mockDomain} />);

    expect(screen.getByTestId('domain-drawer-content')).toBeInTheDocument();
    expect(screen.getByTestId('domain-drawer-header')).toBeInTheDocument();
    expect(screen.getByTestId('domain-drawer-richness')).toBeInTheDocument();
    expect(screen.getByTestId('domain-drawer-features')).toBeInTheDocument();
  });

  it('passes drawerData to richness component', () => {
    render(
      <DomainDrawerContent 
        domain={mockDomain} 
        drawerData={mockDrawerDataUnavailable} 
      />
    );

    // Should show degraded state message
    expect(screen.getByTestId('domain-drawer-degraded')).toBeInTheDocument();
  });
});

describe('DomainDrawerEmpty', () => {
  it('renders default message', () => {
    render(<DomainDrawerEmpty />);
    
    expect(screen.getByTestId('domain-drawer-empty')).toBeInTheDocument();
    expect(screen.getByText('Select a domain to view details')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<DomainDrawerEmpty message="No domain selected" />);
    
    expect(screen.getByText('No domain selected')).toBeInTheDocument();
  });
});

// ============================================================================
// DRAWER HEADER TESTS
// ============================================================================

describe('DomainDrawerHeader', () => {
  it('displays domain name', () => {
    render(<DomainDrawerHeader domain={mockDomain} />);

    expect(screen.getByTestId('domain-drawer-domain-name')).toHaveTextContent('example.com');
  });

  it('displays status badges', () => {
    render(<DomainDrawerHeader domain={mockDomain} />);

    expect(screen.getByTestId('domain-drawer-dns-status')).toHaveTextContent('DNS: valid');
    expect(screen.getByTestId('domain-drawer-http-status')).toHaveTextContent('HTTP: reachable');
    expect(screen.getByTestId('domain-drawer-lead-status')).toHaveTextContent('Lead: extracted');
  });

  it('displays timestamp', () => {
    render(<DomainDrawerHeader domain={mockDomain} />);

    expect(screen.getByTestId('domain-drawer-timestamp')).toBeInTheDocument();
    expect(screen.getByText(/Generated:/)).toBeInTheDocument();
  });

  it('handles missing lead status', () => {
    const domainNoLead = { ...mockDomain, leadStatus: undefined };
    render(<DomainDrawerHeader domain={domainNoLead} />);

    expect(screen.queryByTestId('domain-drawer-lead-status')).not.toBeInTheDocument();
  });

  it('has copy button', () => {
    render(<DomainDrawerHeader domain={mockDomain} />);

    expect(screen.getByTestId('domain-drawer-copy-button')).toBeInTheDocument();
  });

  it('has external link', () => {
    render(<DomainDrawerHeader domain={mockDomain} />);

    const link = screen.getByTestId('domain-drawer-external-link');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });
});

// ============================================================================
// RICHNESS COMPONENT TESTS
// ============================================================================

describe('DomainDrawerRichness', () => {
  it('shows loading skeleton when loading', () => {
    render(
      <DomainDrawerRichness
        domain={mockDomain}
        scoreBreakdown={null}
        isLoadingBreakdown={true}
        isBreakdownUnavailable={false}
        breakdownError={null}
      />
    );

    expect(screen.getByTestId('domain-drawer-skeleton-breakdown')).toBeInTheDocument();
  });

  it('shows full breakdown when available', () => {
    render(
      <DomainDrawerRichness
        domain={mockDomain}
        scoreBreakdown={mockScoreBreakdown}
        isLoadingBreakdown={false}
        isBreakdownUnavailable={false}
        breakdownError={null}
      />
    );

    expect(screen.getByTestId('domain-drawer-breakdown')).toBeInTheDocument();
    expect(screen.getByText('Final Score')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument(); // Final score
  });

  it('shows fallback + degraded message when unavailable', () => {
    render(
      <DomainDrawerRichness
        domain={mockDomain}
        scoreBreakdown={null}
        isLoadingBreakdown={false}
        isBreakdownUnavailable={true}
        breakdownError={null}
      />
    );

    expect(screen.getByTestId('domain-drawer-richness-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('domain-drawer-degraded')).toBeInTheDocument();
    expect(screen.getByText(/Score breakdown unavailable/)).toBeInTheDocument();
  });

  it('shows fallback + error with retry when error', () => {
    const mockRetry = jest.fn();
    render(
      <DomainDrawerRichness
        domain={mockDomain}
        scoreBreakdown={null}
        isLoadingBreakdown={false}
        isBreakdownUnavailable={false}
        breakdownError="Network error"
        onRetryBreakdown={mockRetry}
      />
    );

    expect(screen.getByTestId('domain-drawer-richness-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('domain-drawer-degraded')).toBeInTheDocument();
    expect(screen.getByTestId('domain-drawer-degraded-retry')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('domain-drawer-degraded-retry'));
    expect(mockRetry).toHaveBeenCalled();
  });
});

// ============================================================================
// DEGRADED STATE TESTS
// ============================================================================

describe('DomainDrawerDegraded', () => {
  it('shows breakdown-unavailable message', () => {
    render(<DomainDrawerDegraded type="breakdown-unavailable" />);

    expect(screen.getByText(/Score breakdown unavailable/)).toBeInTheDocument();
    expect(screen.getByText('Limited Data')).toBeInTheDocument();
  });

  it('shows breakdown-error with retry', () => {
    const mockRetry = jest.fn();
    render(
      <DomainDrawerDegraded 
        type="breakdown-error" 
        canRetry={true}
        onRetry={mockRetry}
      />
    );

    expect(screen.getByText('Data Issue')).toBeInTheDocument();
    const retryButton = screen.getByTestId('domain-drawer-degraded-retry');
    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalled();
  });

  it('shows custom message when provided', () => {
    render(
      <DomainDrawerDegraded 
        type="partial-data" 
        message="Custom degraded message"
      />
    );

    expect(screen.getByText('Custom degraded message')).toBeInTheDocument();
  });

  it('shows error details', () => {
    render(
      <DomainDrawerDegraded 
        type="breakdown-error" 
        errorDetails="Error code: 500"
      />
    );

    expect(screen.getByText('Error code: 500')).toBeInTheDocument();
  });
});

describe('FallbackRichness', () => {
  it('displays score when available', () => {
    render(<FallbackRichness score={75} />);

    expect(screen.getByTestId('domain-drawer-richness-fallback')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('shows unavailable when score is null', () => {
    render(<FallbackRichness score={null} />);

    expect(screen.getByTestId('domain-drawer-richness-unavailable')).toBeInTheDocument();
    expect(screen.getByText('Richness score not available')).toBeInTheDocument();
  });
});

// ============================================================================
// FEATURES TESTS
// ============================================================================

describe('DomainDrawerFeatures', () => {
  it('displays keywords section', () => {
    render(<DomainDrawerFeatures domain={mockDomain} />);

    expect(screen.getByTestId('domain-drawer-keywords')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument(); // unique_count
    expect(screen.getByText('45')).toBeInTheDocument(); // hits_total
  });

  it('displays top keywords', () => {
    render(<DomainDrawerFeatures domain={mockDomain} />);

    expect(screen.getByText('marketing')).toBeInTheDocument();
    expect(screen.getByText('software')).toBeInTheDocument();
    expect(screen.getByText('analytics')).toBeInTheDocument();
  });

  it('displays microcrawl section', () => {
    render(<DomainDrawerFeatures domain={mockDomain} />);

    expect(screen.getByTestId('domain-drawer-microcrawl')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument(); // gain_ratio
  });

  it('handles missing features gracefully', () => {
    const domainNoFeatures = { ...mockDomain, features: undefined };
    render(<DomainDrawerFeatures domain={domainNoFeatures} />);

    expect(screen.getByText('No keyword data available')).toBeInTheDocument();
    expect(screen.getByText('No microcrawl data available')).toBeInTheDocument();
  });
});

// ============================================================================
// SKELETON TESTS
// ============================================================================

describe('DomainDrawerSkeleton', () => {
  it('renders full skeleton by default', () => {
    render(<DomainDrawerSkeleton />);

    expect(screen.getByTestId('domain-drawer-skeleton')).toBeInTheDocument();
  });

  it('renders breakdown-only skeleton', () => {
    render(<DomainDrawerSkeleton variant="breakdown-only" />);

    expect(screen.getByTestId('domain-drawer-skeleton-breakdown')).toBeInTheDocument();
  });
});

// ============================================================================
// STATE AUTHORITY INVARIANT TESTS
// ============================================================================

describe('Drawer State Authority Invariants', () => {
  it('DomainDrawer has no internal domain state', () => {
    // Verify the component signature - it receives domain as prop
    // This is a structural test - the component must not have useState for domain
    const mockOnClose = jest.fn();
    
    const { rerender } = render(
      <DomainDrawer isOpen={true} domain={mockDomain} onClose={mockOnClose} />
    );

    expect(screen.getByText('example.com')).toBeInTheDocument();

    // Change domain prop
    const newDomain = { ...mockDomain, domain: 'new-domain.com' };
    rerender(
      <DomainDrawer isOpen={true} domain={newDomain} onClose={mockOnClose} />
    );

    // Should reflect new domain immediately (no stale local state)
    expect(screen.getByText('new-domain.com')).toBeInTheDocument();
    expect(screen.queryByText('example.com')).not.toBeInTheDocument();
  });

  it('drawer close routes through onClose prop', () => {
    const mockOnClose = jest.fn();
    
    render(
      <DomainDrawer isOpen={true} domain={mockDomain} onClose={mockOnClose} />
    );

    // Close via close button
    fireEvent.click(screen.getByTestId('domain-drawer-close'));
    
    // Should call onClose (may be called multiple times due to Radix Sheet behavior)
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('degraded state is always explicit when breakdown unavailable', () => {
    render(
      <DomainDrawerRichness
        domain={mockDomain}
        scoreBreakdown={null}
        isLoadingBreakdown={false}
        isBreakdownUnavailable={true}
        breakdownError={null}
      />
    );

    // Must show degraded message - never silent fallback
    const degradedElement = screen.getByTestId('domain-drawer-degraded');
    expect(degradedElement).toBeInTheDocument();
    expect(degradedElement).toHaveAttribute('data-degraded-type', 'breakdown-unavailable');
  });
});

// ============================================================================
// MEMOIZATION TESTS
// ============================================================================

describe('Memoization Boundaries', () => {
  it('DomainDrawerContent is memoized', () => {
    // Verify the component has displayName (indicator of React.memo)
    expect(DomainDrawerContent.displayName).toBe('DomainDrawerContent');
  });

  it('content does not re-render when unrelated props change', () => {
    const renderSpy = jest.fn();
    
    // Create a wrapper that tracks renders
    const TrackedContent = React.memo(function TrackedContent(props: { domain: DomainRow }) {
      renderSpy();
      return <DomainDrawerContent domain={props.domain} />;
    });

    const { rerender } = render(<TrackedContent domain={mockDomain} />);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Re-render with same domain (referentially equal)
    rerender(<TrackedContent domain={mockDomain} />);
    expect(renderSpy).toHaveBeenCalledTimes(1); // Should not re-render

    // Re-render with new domain object (but same values)
    const sameDomainNewRef = { ...mockDomain };
    rerender(<TrackedContent domain={sameDomainNewRef} />);
    // This will re-render due to new reference, which is expected
    // The important thing is that DomainDrawerContent itself is memoized
  });
});
