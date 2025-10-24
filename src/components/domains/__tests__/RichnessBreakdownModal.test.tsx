import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RichnessBreakdownModal from '../RichnessBreakdownModal';
import { RichnessBadge } from '../RichnessBadge';

const features = {
  richness: {
    score: 0.8123,
    version: 2,
    prominence_norm: 0.45,
    diversity_norm: 0.62,
    enrichment_norm: 0.58,
    applied_bonus: 0.10,
    applied_deductions_total: 0.04,
    stuffing_penalty: 0.00,
    repetition_index: 0.03,
    anchor_share: 0.21,
  },
  keywords: {
    unique_count: 5,
    hits_total: 9,
    weight_sum: 12.3,
    top3: ['a','b','c'],
    signal_distribution: { a:3, b:2 }
  },
  microcrawl: { gain_ratio: 0.24 }
} as unknown;

describe('RichnessBreakdownModal', () => {
  test('renders bars and toggles JSON', () => {
    const onClose = jest.fn();
    render(<RichnessBreakdownModal open onClose={onClose} domain="example.com" features={features} />);
    expect(screen.getByTestId('richness-breakdown-modal')).toBeInTheDocument();
    expect(screen.getByTestId('richness-metric-prominence_norm')).toBeInTheDocument();
    const toggle = screen.getByTestId('richness-breakdown-toggle-json');
    fireEvent.click(toggle);
    expect(screen.getByTestId('richness-breakdown-raw-json')).toBeInTheDocument();
  });

  test('badge click opens modal', () => {
    render(<RichnessBadge features={features} domain="example.com" />);
    fireEvent.click(screen.getByTestId('richness-badge'));
    expect(screen.getByTestId('richness-breakdown-modal')).toBeInTheDocument();
  });

  test('badge keyboard activation (Enter)', () => {
    render(<RichnessBadge features={features} domain="example.com" />);
    const badge = screen.getByTestId('richness-badge');
    badge.focus();
    fireEvent.keyDown(badge, { key: 'Enter' });
    expect(screen.getByTestId('richness-breakdown-modal')).toBeInTheDocument();
  });

  test('metric info tooltip appears on focus', () => {
    const onClose = jest.fn();
    render(<RichnessBreakdownModal open onClose={onClose} domain="example.com" features={features} />);
    const info = screen.getByTestId('richness-metric-info-prominence_norm');
    info.focus();
    // focusing within group should reveal description block (group-focus-within)
    const desc = screen.getByTestId('richness-metric-desc-prominence_norm');
    expect(desc).toHaveTextContent(/prominence/i);
  });

  test('metric info tooltip accessible via title attribute', () => {
    const onClose = jest.fn();
    render(<RichnessBreakdownModal open onClose={onClose} domain="example.com" features={features} />);
    const info = screen.getByTestId('richness-metric-info-diversity_norm');
    expect(info).toHaveAttribute('title');
  });
});
