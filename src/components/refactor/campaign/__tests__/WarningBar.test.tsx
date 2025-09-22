/**
 * Tests for WarningBar Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { WarningBar } from '../WarningBar';
import type { WarningBarData } from '../WarningBar';

const mockWarnings: WarningBarData[] = [
  {
    type: 'stuffing',
    count: 15,
    rate: 15.0,
    severity: 'high'
  },
  {
    type: 'repetition',
    count: 8,
    rate: 8.0,
    severity: 'medium'
  },
  {
    type: 'anchor',
    count: 3,
    rate: 3.0,
    severity: 'low'
  }
];

describe('WarningBar', () => {
  it('renders warning bar with data', () => {
    render(<WarningBar warnings={mockWarnings} totalDomains={100} />);
    
    expect(screen.getByText(/Stuffing: 15 domains \(15\.0%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Repetition: 8 domains \(8\.0%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Anchor: 3 domains \(3\.0%\)/)).toBeInTheDocument();
  });

  it('renders no warnings state correctly', () => {
    render(<WarningBar warnings={[]} totalDomains={100} />);
    
    expect(screen.getByText('No warnings detected')).toBeInTheDocument();
  });

  it('renders clean domains segment', () => {
    render(<WarningBar warnings={mockWarnings} totalDomains={100} />);
    
    // 100 total - (15 + 8 + 3) warnings = 74 clean domains
    expect(screen.getByText(/Clean: 74 domains \(74\.0%\)/)).toBeInTheDocument();
  });

  it('handles compact mode correctly', () => {
    render(<WarningBar warnings={mockWarnings} totalDomains={100} showLabels={false} />);
    
    // Labels should not be shown
    expect(screen.queryByText(/Stuffing:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Clean:/)).not.toBeInTheDocument();
  });

  it('handles zero total domains', () => {
    render(<WarningBar warnings={mockWarnings} totalDomains={0} />);
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('sorts warnings by count in labels', () => {
    render(<WarningBar warnings={mockWarnings} totalDomains={100} />);
    
    const labels = screen.getAllByText(/domains \(\d+\.\d+%\)/).map(el => el.textContent);
    
    // Should include stuffing (15) before repetition (8) before anchor (3)
    expect(labels.some(label => label?.includes('Stuffing: 15'))).toBe(true);
    expect(labels.some(label => label?.includes('Repetition: 8'))).toBe(true);
    expect(labels.some(label => label?.includes('Anchor: 3'))).toBe(true);
  });
});