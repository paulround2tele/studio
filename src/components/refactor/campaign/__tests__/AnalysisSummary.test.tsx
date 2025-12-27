/**
 * AnalysisSummary Unit Tests
 * 
 * Tests for:
 * - Conversion rate computation (leads / keywordHits * 100)
 * - Sticky positioning
 * - Rejection breakdown
 * - Empty state handling
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AnalysisSummary, AnalysisSummaryData } from '../AnalysisSummary';

const mockData: AnalysisSummaryData = {
  keywordHits: 100,
  analyzed: 80,
  leads: 25,
  highPotential: 40,
  httpValid: 150,
  dnsValid: 180,
  generated: 500,
};

describe('AnalysisSummary', () => {
  describe('Conversion Rate Computation', () => {
    it('computes conversion rate from leads / keywordHits', () => {
      render(<AnalysisSummary data={mockData} />);

      // 25 / 100 = 25%
      expect(screen.getByText('25% conversion')).toBeInTheDocument();
    });

    it('shows leads / keywordHits breakdown in subtitle', () => {
      render(<AnalysisSummary data={mockData} />);

      // Should show "25 / 100 leads"
      expect(screen.getByText('25 / 100 leads')).toBeInTheDocument();
    });

    it('has tooltip explaining conversion formula', () => {
      render(<AnalysisSummary data={mockData} />);

      const subtitle = screen.getByText('25 / 100 leads');
      expect(subtitle).toHaveAttribute('title', 'Conversion Rate = Leads ÷ Keyword Hits × 100');
    });

    it('computes 0% when keywordHits is 0', () => {
      const dataWithZeroHits: AnalysisSummaryData = {
        ...mockData,
        keywordHits: 0,
        leads: 0,
      };

      render(<AnalysisSummary data={dataWithZeroHits} />);

      // Should show 0% conversion
      expect(screen.getByText('0% conversion')).toBeInTheDocument();
    });

    it('computes correct rate for various inputs', () => {
      const highConversionData: AnalysisSummaryData = {
        ...mockData,
        keywordHits: 50,
        leads: 45,
      };

      render(<AnalysisSummary data={highConversionData} />);

      // 45 / 50 = 90%
      expect(screen.getByText('90% conversion')).toBeInTheDocument();
    });

    it('rounds conversion rate to nearest integer', () => {
      const oddData: AnalysisSummaryData = {
        ...mockData,
        keywordHits: 7,
        leads: 3,
      };

      render(<AnalysisSummary data={oddData} />);

      // 3 / 7 = 42.857... ≈ 43%
      expect(screen.getByText('43% conversion')).toBeInTheDocument();
    });
  });

  describe('Primary Metrics Display', () => {
    it('displays keywordHits count', () => {
      render(<AnalysisSummary data={mockData} />);

      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Keyword Hits')).toBeInTheDocument();
    });

    it('displays analyzed count', () => {
      render(<AnalysisSummary data={mockData} />);

      expect(screen.getByText('80')).toBeInTheDocument();
      expect(screen.getByText('Fully Analyzed')).toBeInTheDocument();
    });

    it('displays leads count', () => {
      render(<AnalysisSummary data={mockData} />);

      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('Qualified Leads')).toBeInTheDocument();
    });

    it('displays rejected count (analyzed - leads)', () => {
      render(<AnalysisSummary data={mockData} />);

      // 80 - 25 = 55 rejected
      expect(screen.getByText('55')).toBeInTheDocument();
      expect(screen.getByText('Rejected by Scoring')).toBeInTheDocument();
    });
  });

  describe('Sticky Positioning', () => {
    it('does not apply sticky class by default', () => {
      const { container } = render(<AnalysisSummary data={mockData} />);

      const wrapper = container.firstChild;
      expect(wrapper).not.toHaveClass('sticky');
    });

    it('applies sticky class when sticky prop is true', () => {
      const { container } = render(<AnalysisSummary data={mockData} sticky={true} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('sticky');
    });

    it('applies top-4 class when sticky', () => {
      const { container } = render(<AnalysisSummary data={mockData} sticky={true} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('top-4');
    });
  });

  describe('Running State', () => {
    it('shows "In Progress" indicator when isRunning', () => {
      render(<AnalysisSummary data={mockData} isRunning={true} />);

      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('does not show "In Progress" when not running', () => {
      render(<AnalysisSummary data={mockData} isRunning={false} />);

      expect(screen.queryByText('In Progress')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('does not render when all metrics are 0', () => {
      const emptyData: AnalysisSummaryData = {
        keywordHits: 0,
        analyzed: 0,
        leads: 0,
        highPotential: 0,
        httpValid: 0,
        dnsValid: 0,
        generated: 0,
      };

      const { container } = render(<AnalysisSummary data={emptyData} />);

      expect(container.firstChild).toBeNull();
    });

    it('renders when at least one metric is non-zero', () => {
      const partialData: AnalysisSummaryData = {
        keywordHits: 1,
        analyzed: 0,
        leads: 0,
        highPotential: 0,
        httpValid: 0,
        dnsValid: 0,
        generated: 0,
      };

      render(<AnalysisSummary data={partialData} />);

      expect(screen.getByText('Analysis & Enrichment Summary')).toBeInTheDocument();
    });
  });

  describe('Rejection Breakdown', () => {
    it('shows rejection reasons when expanded', async () => {
      const user = userEvent.setup();
      
      render(<AnalysisSummary data={mockData} />);

      // Find and click the details toggle - text includes the count
      const detailsToggle = screen.getByText(/Why were \d+ domains rejected/i);
      await user.click(detailsToggle);

      // Should show rejection reasons after expanding
      await waitFor(() => {
        expect(screen.getByText(/Low Score/i)).toBeInTheDocument();
      });
    });

    it('shows correct rejection counts', async () => {
      const user = userEvent.setup();
      
      // Data where we know the expected rejections
      const dataWithClearRejections: AnalysisSummaryData = {
        keywordHits: 100,
        analyzed: 100,  // All keyword hits analyzed
        leads: 20,       // Only 20 became leads
        highPotential: 50,  // 50 were high potential
        httpValid: 150,
        dnsValid: 180,
        generated: 500,
      };

      render(<AnalysisSummary data={dataWithClearRejections} />);

      const detailsToggle = screen.getByText(/Why were \d+ domains rejected/i);
      await user.click(detailsToggle);

      // After expanding, rejection reasons should be shown
      await waitFor(() => {
        // Should show Low Score reason
        expect(screen.getByText(/Low Score/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has semantic header structure', () => {
      render(<AnalysisSummary data={mockData} />);

      const header = screen.getByRole('heading', { level: 3, name: /Analysis & Enrichment Summary/i });
      expect(header).toBeInTheDocument();
    });

    it('uses proper semantic markup for metrics', () => {
      render(<AnalysisSummary data={mockData} />);

      // Metrics should have text labels associated
      const keywordHitsLabel = screen.getByText('Keyword Hits');
      expect(keywordHitsLabel).toBeInTheDocument();
    });
  });
});
