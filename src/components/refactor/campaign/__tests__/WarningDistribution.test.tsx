/**
 * Tests for WarningDistribution Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { WarningDistribution } from '../WarningDistribution';
import type { WarningData } from '../WarningDistribution';

const mockWarnings: WarningData[] = [
  {
    type: 'stuffing',
    count: 15,
    rate: 15.0,
    severity: 'high',
    domains: ['example1.com', 'example2.com', 'example3.com']
  },
  {
    type: 'repetition',
    count: 8,
    rate: 8.0,
    severity: 'medium',
    domains: ['test1.com', 'test2.com']
  },
  {
    type: 'anchor',
    count: 3,
    rate: 3.0,
    severity: 'low',
    domains: ['anchor1.com']
  }
];

describe('WarningDistribution', () => {
  it('renders warning distribution with data', () => {
    render(<WarningDistribution warnings={mockWarnings} totalDomains={100} />);
    
    expect(screen.getByText('Warning Distribution')).toBeInTheDocument();
    expect(screen.getByText('26 warnings')).toBeInTheDocument();
    expect(screen.getByText('26.0% rate')).toBeInTheDocument();
    
    expect(screen.getByText('Keyword Stuffing')).toBeInTheDocument();
    expect(screen.getByText('Content Repetition')).toBeInTheDocument();
    expect(screen.getByText('Anchor Share Issues')).toBeInTheDocument();
  });

  it('renders no warnings state correctly', () => {
    render(<WarningDistribution warnings={[]} totalDomains={100} />);
    
    expect(screen.getByText('Warning Distribution')).toBeInTheDocument();
    expect(screen.getByText('No warnings detected')).toBeInTheDocument();
    expect(screen.getByText('All domains are passing quality checks')).toBeInTheDocument();
  });

  it('displays warning counts and rates correctly', () => {
    render(<WarningDistribution warnings={mockWarnings} totalDomains={100} />);
    
    // Check individual warning counts
    expect(screen.getByText('15')).toBeInTheDocument(); // stuffing count
    expect(screen.getByText('15.0%')).toBeInTheDocument(); // stuffing rate
    expect(screen.getByText('8')).toBeInTheDocument(); // repetition count
    expect(screen.getByText('8.0%')).toBeInTheDocument(); // repetition rate
  });

  it('shows severity badges correctly', () => {
    render(<WarningDistribution warnings={mockWarnings} totalDomains={100} />);
    
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('low')).toBeInTheDocument();
  });

  it('displays sample domains when available', () => {
    render(<WarningDistribution warnings={mockWarnings} totalDomains={100} />);
    
    expect(screen.getByText(/Examples: example1\.com, example2\.com, example3\.com/)).toBeInTheDocument();
    expect(screen.getByText(/Examples: test1\.com, test2\.com/)).toBeInTheDocument();
  });

  it('handles zero total domains gracefully', () => {
    render(<WarningDistribution warnings={mockWarnings} totalDomains={0} />);
    
    expect(screen.getByText('Warning Distribution')).toBeInTheDocument();
    // Should still show warnings but rates would be calculated differently
  });

  it('generates appropriate narrative for critical warnings', () => {
    const criticalWarnings: WarningData[] = [
      {
        type: 'stuffing',
        count: 50,
        rate: 50.0,
        severity: 'critical'
      }
    ];
    
    render(<WarningDistribution warnings={criticalWarnings} totalDomains={100} />);
    
    expect(screen.getByText(/Critical quality issues detected/)).toBeInTheDocument();
    expect(screen.getByText(/Immediate attention recommended/)).toBeInTheDocument();
  });
});