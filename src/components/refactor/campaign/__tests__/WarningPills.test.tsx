/**
 * Tests for WarningPills Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WarningPills } from '../WarningPills';
import type { WarningPillData } from '../WarningPills';

const mockWarnings: WarningPillData[] = [
  {
    type: 'stuffing',
    count: 15,
    severity: 'high'
  },
  {
    type: 'repetition',
    count: 8,
    severity: 'medium'
  },
  {
    type: 'anchor',
    count: 3,
    severity: 'low',
    active: true
  }
];

describe('WarningPills', () => {
  it('renders warning pills with data', () => {
    render(<WarningPills warnings={mockWarnings} />);
    
    expect(screen.getByText('Stuffing')).toBeInTheDocument();
    expect(screen.getByText('Repetition')).toBeInTheDocument();
    expect(screen.getByText('Anchor')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders no warnings state correctly', () => {
    render(<WarningPills warnings={[]} showClean={true} />);
    
    expect(screen.getByText('No Warnings')).toBeInTheDocument();
  });

  it('hides clean pill when showClean is false', () => {
    render(<WarningPills warnings={[]} showClean={false} />);
    
    expect(screen.queryByText('No Warnings')).not.toBeInTheDocument();
  });

  it('handles pill click events', () => {
    const onPillClick = jest.fn();
    render(<WarningPills warnings={mockWarnings} onPillClick={onPillClick} />);
    
    const stuffingPill = screen.getByText('Stuffing').closest('span');
    if (stuffingPill) {
      fireEvent.click(stuffingPill);
      expect(onPillClick).toHaveBeenCalledWith('stuffing');
    }
  });

  it('renders detailed variant correctly', () => {
    render(<WarningPills warnings={mockWarnings} variant="detailed" />);
    
    expect(screen.getByText('Stuffing')).toBeInTheDocument();
    expect(screen.getByText('(15)')).toBeInTheDocument();
    expect(screen.getByText('(8)')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });

  it('renders compact variant correctly', () => {
    render(<WarningPills warnings={mockWarnings} variant="compact" />);
    
    // In compact mode, only counts should be shown
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows active state correctly', () => {
    render(<WarningPills warnings={mockWarnings} />);
    
    const anchorPill = screen.getByText('Anchor').closest('[data-active="true"], .ring-2, .ring-blue-500');
    // The active state adds ring classes to the Badge component
    expect(anchorPill).toBeTruthy();
    
    // Alternative: check if the active warning has the ring classes via className matching
    const anchorBadge = screen.getByText('Anchor').parentElement;
    expect(anchorBadge?.className).toMatch(/ring-2.*ring-blue-500|ring-blue-500.*ring-2/);
  });

  it('sorts pills by severity and count', () => {
    const unsortedWarnings: WarningPillData[] = [
      { type: 'general', count: 20, severity: 'low' },
      { type: 'stuffing', count: 5, severity: 'critical' },
      { type: 'repetition', count: 10, severity: 'high' }
    ];
    
    render(<WarningPills warnings={unsortedWarnings} />);
    
    const pills = screen.getAllByRole('generic').filter(el => 
      el.textContent?.includes('Stuffing') || 
      el.textContent?.includes('Repetition') || 
      el.textContent?.includes('General')
    );
    
    // Critical should come first (Stuffing), then high (Repetition), then low (General)
    expect(pills[0]).toHaveTextContent('Stuffing');
  });
});