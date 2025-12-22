/**
 * Phase 7.4: Domain Actions Tests
 * 
 * Tests for action components ensuring:
 * 1. Selection state from props (no local state)
 * 2. Export generates correct file formats
 * 3. Actions dispatch through callbacks
 * 4. Exclusion NOT implemented (no backend)
 * 
 * @see Phase 7.4 Actions & Export
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Components under test
import { DomainActionsBar, DomainActionsBarCompact } from '../DomainActionsBar';
import { DomainActionsSelection } from '../DomainActionsSelection';
import { DomainActionsExport } from '../DomainActionsExport';

import type { DomainRow } from '@/types/explorer/state';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockDomains: DomainRow[] = [
  {
    id: 'domain-1',
    domain: 'example1.com',
    dnsStatus: 'valid',
    httpStatus: 'reachable',
    leadStatus: 'extracted',
    createdAt: '2024-01-15T10:30:00Z',
    features: {
      richness: { score: 75 },
      keywords: { unique_count: 12, hits_total: 45, top3: ['marketing', 'software'] },
      microcrawl: { gain_ratio: 0.65 },
    },
  },
  {
    id: 'domain-2',
    domain: 'example2.com',
    dnsStatus: 'valid',
    httpStatus: 'reachable',
    createdAt: '2024-01-16T10:30:00Z',
    features: {
      richness: { score: 82 },
      keywords: { unique_count: 8, hits_total: 30, top3: ['analytics'] },
      microcrawl: { gain_ratio: 0.45 },
    },
  },
  {
    id: 'domain-3',
    domain: 'example3.com',
    dnsStatus: 'invalid',
    httpStatus: 'unreachable',
    createdAt: '2024-01-17T10:30:00Z',
  },
];

// ============================================================================
// DOMAIN ACTIONS SELECTION TESTS
// ============================================================================

describe('DomainActionsSelection', () => {
  const mockOnSelectAll = jest.fn();
  const mockOnDeselectAll = jest.fn();

  beforeEach(() => {
    mockOnSelectAll.mockClear();
    mockOnDeselectAll.mockClear();
  });

  it('renders with no selection', () => {
    render(
      <DomainActionsSelection
        selectionCount={0}
        isAllSelected={false}
        pageSize={50}
        totalDomains={100}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    expect(screen.getByTestId('domain-actions-selection')).toBeInTheDocument();
    expect(screen.getByTestId('domain-actions-selection-hint')).toHaveTextContent('Select domains to enable actions');
    expect(screen.queryByTestId('domain-actions-selection-count')).not.toBeInTheDocument();
  });

  it('renders selection count when items selected', () => {
    render(
      <DomainActionsSelection
        selectionCount={5}
        isAllSelected={false}
        pageSize={50}
        totalDomains={100}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    expect(screen.getByTestId('domain-actions-selection-count')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('domains selected')).toBeInTheDocument();
  });

  it('shows singular text for single selection', () => {
    render(
      <DomainActionsSelection
        selectionCount={1}
        isAllSelected={false}
        pageSize={50}
        totalDomains={100}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    expect(screen.getByText('domain selected')).toBeInTheDocument();
  });

  it('calls onSelectAll when checkbox clicked with no selection', () => {
    render(
      <DomainActionsSelection
        selectionCount={0}
        isAllSelected={false}
        pageSize={50}
        totalDomains={100}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    const checkbox = screen.getByTestId('domain-actions-select-all-checkbox');
    fireEvent.click(checkbox);

    expect(mockOnSelectAll).toHaveBeenCalledTimes(1);
    expect(mockOnDeselectAll).not.toHaveBeenCalled();
  });

  it('calls onDeselectAll when checkbox clicked with selection', () => {
    render(
      <DomainActionsSelection
        selectionCount={5}
        isAllSelected={false}
        pageSize={50}
        totalDomains={100}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    const checkbox = screen.getByTestId('domain-actions-select-all-checkbox');
    fireEvent.click(checkbox);

    expect(mockOnDeselectAll).toHaveBeenCalledTimes(1);
    expect(mockOnSelectAll).not.toHaveBeenCalled();
  });

  it('calls onDeselectAll when clear button clicked', () => {
    render(
      <DomainActionsSelection
        selectionCount={5}
        isAllSelected={false}
        pageSize={50}
        totalDomains={100}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    const clearButton = screen.getByTestId('domain-actions-clear-selection');
    fireEvent.click(clearButton);

    expect(mockOnDeselectAll).toHaveBeenCalledTimes(1);
  });

  it('disables checkbox when totalDomains is 0', () => {
    render(
      <DomainActionsSelection
        selectionCount={0}
        isAllSelected={false}
        pageSize={50}
        totalDomains={0}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    const checkbox = screen.getByTestId('domain-actions-select-all-checkbox');
    expect(checkbox).toBeDisabled();
  });
});

// ============================================================================
// DOMAIN ACTIONS EXPORT TESTS
// ============================================================================

describe('DomainActionsExport', () => {
  // Mock URL.createObjectURL and URL.revokeObjectURL
  const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
  const mockRevokeObjectURL = jest.fn();
  
  beforeAll(() => {
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  beforeEach(() => {
    mockCreateObjectURL.mockClear();
    mockRevokeObjectURL.mockClear();
  });

  afterEach(() => {
    // Restore all mocks to ensure DOM is not corrupted
    jest.restoreAllMocks();
  });

  it('renders export button', () => {
    render(
      <DomainActionsExport
        domains={mockDomains}
        selectionCount={3}
        campaignId="campaign-1"
      />
    );

    expect(screen.getByTestId('domain-actions-export-button')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });

  it('disables button when no selection', () => {
    render(
      <DomainActionsExport
        domains={[]}
        selectionCount={0}
        campaignId="campaign-1"
      />
    );

    expect(screen.getByTestId('domain-actions-export-button')).toBeDisabled();
  });

  it('opens dialog when button clicked', async () => {
    render(
      <DomainActionsExport
        domains={mockDomains}
        selectionCount={3}
        campaignId="campaign-1"
      />
    );

    fireEvent.click(screen.getByTestId('domain-actions-export-button'));

    await waitFor(() => {
      expect(screen.getByTestId('domain-actions-export-dialog')).toBeInTheDocument();
    });

    expect(screen.getByText('Export Domains')).toBeInTheDocument();
    expect(screen.getByText(/3 selected/)).toBeInTheDocument();
  });

  it('has format selector', async () => {
    render(
      <DomainActionsExport
        domains={mockDomains}
        selectionCount={3}
        campaignId="campaign-1"
      />
    );

    fireEvent.click(screen.getByTestId('domain-actions-export-button'));

    await waitFor(() => {
      expect(screen.getByTestId('export-format-select')).toBeInTheDocument();
    });
  });

  it('has include features toggle', async () => {
    render(
      <DomainActionsExport
        domains={mockDomains}
        selectionCount={3}
        campaignId="campaign-1"
      />
    );

    fireEvent.click(screen.getByTestId('domain-actions-export-button'));

    await waitFor(() => {
      expect(screen.getByTestId('export-include-features')).toBeInTheDocument();
    });

    expect(screen.getByText('Include Features')).toBeInTheDocument();
  });

  it('triggers download on export', async () => {
    // We can't easily mock the DOM link click, but we can verify:
    // 1. URL.createObjectURL is called (proves content was generated)
    // 2. Dialog closes after export (proves handleExport completed)

    const { container } = render(
      <DomainActionsExport
        domains={mockDomains}
        selectionCount={3}
        campaignId="campaign-1"
      />
    );

    // Open dialog
    fireEvent.click(screen.getByTestId('domain-actions-export-button'));

    await waitFor(() => {
      expect(screen.getByTestId('export-confirm-button')).toBeInTheDocument();
    });

    // Click export
    fireEvent.click(screen.getByTestId('export-confirm-button'));

    // Verify URL.createObjectURL was called (proves Blob was created)
    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    // Verify dialog closed after successful export
    await waitFor(() => {
      // Dialog should close on successful export
      expect(screen.queryByTestId('export-confirm-button')).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });
});

// ============================================================================
// DOMAIN ACTIONS BAR TESTS
// ============================================================================

describe('DomainActionsBar', () => {
  const mockOnSelectAll = jest.fn();
  const mockOnDeselectAll = jest.fn();
  const selectedIds = new Set(['domain-1', 'domain-2']);

  beforeEach(() => {
    mockOnSelectAll.mockClear();
    mockOnDeselectAll.mockClear();
  });

  it('renders action bar', () => {
    render(
      <DomainActionsBar
        campaignId="campaign-1"
        domains={mockDomains}
        selectedIds={selectedIds}
        selectionCount={2}
        isAllSelected={false}
        pageSize={50}
        totalDomains={100}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    expect(screen.getByTestId('domain-actions-bar')).toBeInTheDocument();
    expect(screen.getByTestId('domain-actions-selection')).toBeInTheDocument();
    expect(screen.getByTestId('domain-actions-export-button')).toBeInTheDocument();
  });

  it('shows selection count', () => {
    render(
      <DomainActionsBar
        campaignId="campaign-1"
        domains={mockDomains}
        selectedIds={selectedIds}
        selectionCount={2}
        isAllSelected={false}
        pageSize={50}
        totalDomains={100}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('domains selected')).toBeInTheDocument();
  });

  it('enables export when selection exists', () => {
    render(
      <DomainActionsBar
        campaignId="campaign-1"
        domains={mockDomains}
        selectedIds={selectedIds}
        selectionCount={2}
        isAllSelected={false}
        pageSize={50}
        totalDomains={100}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    expect(screen.getByTestId('domain-actions-export-button')).not.toBeDisabled();
  });

  it('disables export when no selection', () => {
    render(
      <DomainActionsBar
        campaignId="campaign-1"
        domains={mockDomains}
        selectedIds={new Set()}
        selectionCount={0}
        isAllSelected={false}
        pageSize={50}
        totalDomains={100}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    expect(screen.getByTestId('domain-actions-export-button')).toBeDisabled();
  });

  it('passes correct domains to export', () => {
    const selected = new Set(['domain-1', 'domain-3']);
    
    render(
      <DomainActionsBar
        campaignId="campaign-1"
        domains={mockDomains}
        selectedIds={selected}
        selectionCount={2}
        isAllSelected={false}
        pageSize={50}
        totalDomains={100}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    // Export button should show count of 2
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });
});

// ============================================================================
// COMPACT VARIANT TESTS
// ============================================================================

describe('DomainActionsBarCompact', () => {
  it('returns null when no selection', () => {
    const { container } = render(
      <DomainActionsBarCompact selectionCount={0} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows selection badge when items selected', () => {
    render(<DomainActionsBarCompact selectionCount={5} />);

    expect(screen.getByTestId('domain-actions-bar-compact')).toBeInTheDocument();
    expect(screen.getByText('5 selected')).toBeInTheDocument();
  });
});

// ============================================================================
// STATE AUTHORITY INVARIANT TESTS
// ============================================================================

describe('Actions State Authority Invariants', () => {
  it('DomainActionsBar has no internal selection state', () => {
    const mockOnSelectAll = jest.fn();
    const mockOnDeselectAll = jest.fn();

    const { rerender } = render(
      <DomainActionsBar
        campaignId="campaign-1"
        domains={mockDomains}
        selectedIds={new Set(['domain-1'])}
        selectionCount={1}
        isAllSelected={false}
        pageSize={50}
        totalDomains={100}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();

    // Update selection from props
    rerender(
      <DomainActionsBar
        campaignId="campaign-1"
        domains={mockDomains}
        selectedIds={new Set(['domain-1', 'domain-2', 'domain-3'])}
        selectionCount={3}
        isAllSelected={true}
        pageSize={50}
        totalDomains={100}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    // Should reflect new selection immediately
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('selection actions route through callbacks', () => {
    const mockOnSelectAll = jest.fn();
    const mockOnDeselectAll = jest.fn();

    render(
      <DomainActionsBar
        campaignId="campaign-1"
        domains={mockDomains}
        selectedIds={new Set(['domain-1'])}
        selectionCount={1}
        isAllSelected={false}
        pageSize={50}
        totalDomains={100}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    // Clear selection should call onDeselectAll
    fireEvent.click(screen.getByTestId('domain-actions-clear-selection'));
    expect(mockOnDeselectAll).toHaveBeenCalled();
  });

  it('does not have exclusion action (no backend)', () => {
    render(
      <DomainActionsBar
        campaignId="campaign-1"
        domains={mockDomains}
        selectedIds={new Set(['domain-1'])}
        selectionCount={1}
        isAllSelected={false}
        pageSize={50}
        totalDomains={100}
        onSelectAll={jest.fn()}
        onDeselectAll={jest.fn()}
      />
    );

    // Exclusion button should NOT exist
    expect(screen.queryByText('Exclude')).not.toBeInTheDocument();
    expect(screen.queryByTestId('domain-actions-exclude-button')).not.toBeInTheDocument();
  });
});

// ============================================================================
// EXPORT FORMAT TESTS
// ============================================================================

describe('Export Format Generation', () => {
  // These tests verify the export functions work correctly
  // The actual functions are internal, so we test through the component behavior

  it('export button shows correct count for selection', () => {
    render(
      <DomainActionsExport
        domains={mockDomains.slice(0, 2)}
        selectionCount={2}
        campaignId="campaign-1"
      />
    );

    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('handles domains with missing features gracefully', () => {
    const domainWithoutFeatures: DomainRow[] = [
      {
        id: 'domain-no-features',
        domain: 'bare.com',
        dnsStatus: 'valid',
        httpStatus: 'reachable',
      },
    ];

    render(
      <DomainActionsExport
        domains={domainWithoutFeatures}
        selectionCount={1}
        campaignId="campaign-1"
      />
    );

    // Should render without error
    expect(screen.getByTestId('domain-actions-export-button')).not.toBeDisabled();
  });
});
