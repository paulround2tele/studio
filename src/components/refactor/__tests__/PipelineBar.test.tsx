/**
 * Tests for PipelineBar component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PipelineBar from '../shared/PipelineBar';
import type { PipelineSegment } from '../types';

// Mock segments for testing
const mockSegments: PipelineSegment[] = [
  {
    phase: 'DNS OK',
    status: 'completed',
    count: 150,
    percentage: 50,
    color: '#10b981'
  },
  {
    phase: 'HTTP OK',
    status: 'completed',
    count: 90,
    percentage: 30,
    color: '#10b981'
  },
  {
    phase: 'DNS Error',
    status: 'failed',
    count: 30,
    percentage: 10,
    color: '#ef4444'
  },
  {
    phase: 'HTTP Pending',
    status: 'in_progress',
    count: 30,
    percentage: 10,
    color: '#f59e0b'
  }
];

describe('PipelineBar Component', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<PipelineBar segments={mockSegments} />);
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('should display "No data" message when segments array is empty', () => {
      render(<PipelineBar segments={[]} />);
      expect(screen.getByText('No data')).toBeInTheDocument();
      expect(screen.getByText('No pipeline data available')).toBeInTheDocument();
    });

    it('should display "No data" message when total count is zero', () => {
      const zeroCountSegments = mockSegments.map(s => ({ ...s, count: 0 }));
      render(<PipelineBar segments={zeroCountSegments} />);
      expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('should render all segments with non-zero counts', () => {
      render(<PipelineBar segments={mockSegments} />);
      
      // Check that each segment is represented
      expect(screen.getByText('DNS OK')).toBeInTheDocument();
      expect(screen.getByText('HTTP OK')).toBeInTheDocument();
      expect(screen.getByText('DNS Error')).toBeInTheDocument();
      expect(screen.getByText('HTTP Pending')).toBeInTheDocument();
    });

    it('should display segment counts', () => {
      render(<PipelineBar segments={mockSegments} />);
      
      // Find specific count elements within the pipeline bar component
      expect(screen.getByText('(150)')).toBeInTheDocument();
      expect(screen.getByText('(90)')).toBeInTheDocument();
      // Be more specific about which (30) we're looking for by using getAllByText
      const thirtyCountElements = screen.getAllByText('(30)');
      expect(thirtyCountElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should hide labels when showLabels is false', () => {
      render(<PipelineBar segments={mockSegments} showLabels={false} />);
      
      expect(screen.queryByText('DNS OK')).not.toBeInTheDocument();
      expect(screen.queryByText('HTTP OK')).not.toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument(); // Bar should still be there
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<PipelineBar segments={mockSegments} />);
      
      const progressBar = screen.getByRole('list');
      expect(progressBar).toHaveAttribute('aria-label', 'Campaign pipeline progress');
    });

    it('should have accessible segment titles', () => {
      render(<PipelineBar segments={mockSegments} />);
      
      // Check that segments have proper aria-label attributes
      const dnsOkSegment = screen.getByLabelText('DNS OK: 150 domains (50%)');
      expect(dnsOkSegment).toBeInTheDocument();
      
      const httpOkSegment = screen.getByLabelText('HTTP OK: 90 domains (30%)');
      expect(httpOkSegment).toBeInTheDocument();
    });
  });

  describe('Visual Properties', () => {
    it('should apply custom height', () => {
      const { container } = render(<PipelineBar segments={mockSegments} height={16} />);
      
      const progressBar = container.querySelector('[role="list"]');
      expect(progressBar).toHaveStyle('height: 16px');
    });

    it('should apply default height when not specified', () => {
      const { container } = render(<PipelineBar segments={mockSegments} />);
      
      const progressBar = container.querySelector('[role="list"]');
      expect(progressBar).toHaveStyle('height: 8px');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <PipelineBar segments={mockSegments} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('should handle segments with very small percentages', () => {
      const smallSegments: PipelineSegment[] = [
        {
          phase: 'Tiny Segment',
          status: 'completed',
          count: 1,
          percentage: 0.1,
          color: '#10b981'
        },
        {
          phase: 'Large Segment',
          status: 'completed',
          count: 999,
          percentage: 99.9,
          color: '#f59e0b'
        }
      ];

      render(<PipelineBar segments={smallSegments} />);
      
      // Tiny segment should still appear in labels but not visible in bar (< 0.5% threshold)
      expect(screen.getByText('Tiny Segment')).toBeInTheDocument();
      expect(screen.getByText('Large Segment')).toBeInTheDocument();
      
      // But tiny segment should have very small visual representation
      expect(screen.getByText('(1)')).toBeInTheDocument();
      expect(screen.getByText('(999)')).toBeInTheDocument();
    });

    it('should handle duplicate phase names', () => {
      const duplicateSegments: PipelineSegment[] = [
        {
          phase: 'DNS OK',
          status: 'completed',
          count: 100,
          percentage: 50,
          color: '#10b981'
        },
        {
          phase: 'DNS OK',
          status: 'completed',
          count: 100,
          percentage: 50,
          color: '#10b981'
        }
      ];

      render(<PipelineBar segments={duplicateSegments} />);
      
      // Both segments should render with unique keys
      const dnsOkElements = screen.getAllByText('DNS OK');
      expect(dnsOkElements).toHaveLength(2);
    });

    it('should handle segments with zero percentage but non-zero count', () => {
      const zeroPercentSegments: PipelineSegment[] = [
        {
          phase: 'Zero Percent',
          status: 'completed',
          count: 1,
          percentage: 0,
          color: '#10b981'
        }
      ];

      render(<PipelineBar segments={zeroPercentSegments} />);
      
      // Should still display in labels even if not visible in bar
      expect(screen.getByText('Zero Percent')).toBeInTheDocument();
      expect(screen.getByText('(1)')).toBeInTheDocument();
    });
  });

  describe('Color Application', () => {
    it('should apply correct colors to segments', () => {
      const { container } = render(<PipelineBar segments={mockSegments} />);
      
      // Check that segments have correct background colors
      const segments = container.querySelectorAll('[role="list"] > div');
      
      expect(segments[0]).toHaveStyle('background-color: #10b981');
      expect(segments[1]).toHaveStyle('background-color: #10b981');
      expect(segments[2]).toHaveStyle('background-color: #ef4444');
      expect(segments[3]).toHaveStyle('background-color: #f59e0b');
    });

    it('should apply colors to legend indicators', () => {
      const { container } = render(<PipelineBar segments={mockSegments} />);
      
      // Check legend color indicators
      const colorIndicators = container.querySelectorAll('.w-3.h-3.rounded-full');
      
      expect(colorIndicators[0]).toHaveStyle('background-color: #10b981');
      expect(colorIndicators[1]).toHaveStyle('background-color: #10b981');
      expect(colorIndicators[2]).toHaveStyle('background-color: #ef4444');
      expect(colorIndicators[3]).toHaveStyle('background-color: #f59e0b');
    });
  });
});