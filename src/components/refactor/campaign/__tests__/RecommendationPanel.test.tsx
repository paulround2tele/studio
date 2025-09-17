/**
 * Tests for RecommendationPanel Component (Phase 2)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecommendationPanel } from '../RecommendationPanel';
import type { Recommendation } from '@/types/campaignMetrics';

const mockRecommendations: Recommendation[] = [
  {
    id: 'test-info',
    severity: 'info',
    title: 'Information Recommendation',
    detail: 'This is an informational recommendation.',
    rationale: 'This is the rationale for the info recommendation.'
  },
  {
    id: 'test-warn',
    severity: 'warn',
    title: 'Warning Recommendation',
    detail: 'This is a warning recommendation.',
    rationale: 'This is the rationale for the warning recommendation.'
  },
  {
    id: 'test-action',
    severity: 'action',
    title: 'Action Recommendation',
    detail: 'This is an action recommendation.',
    rationale: 'This is the rationale for the action recommendation.'
  }
];

describe('RecommendationPanel', () => {
  it('renders recommendation panel with title', () => {
    render(<RecommendationPanel recommendations={mockRecommendations} />);
    
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
  });

  it('renders all recommendations', () => {
    render(<RecommendationPanel recommendations={mockRecommendations} />);
    
    expect(screen.getByText('Information Recommendation')).toBeInTheDocument();
    expect(screen.getByText('Warning Recommendation')).toBeInTheDocument();
    expect(screen.getByText('Action Recommendation')).toBeInTheDocument();
  });

  it('renders recommendation details and rationale', () => {
    render(<RecommendationPanel recommendations={mockRecommendations} />);
    
    expect(screen.getByText('This is an informational recommendation.')).toBeInTheDocument();
    expect(screen.getByText('This is the rationale for the info recommendation.')).toBeInTheDocument();
  });

  it('applies correct styling for different severity levels', () => {
    render(<RecommendationPanel recommendations={mockRecommendations} />);
    
    // The styling should be applied to the outermost card div that contains the title
    const infoTitle = screen.getByText('Information Recommendation');
    const warnTitle = screen.getByText('Warning Recommendation');
    const actionTitle = screen.getByText('Action Recommendation');
    
    // Find the parent div with the background color class
    const infoCard = infoTitle.closest('.bg-blue-50');
    const warnCard = warnTitle.closest('.bg-yellow-50');
    const actionCard = actionTitle.closest('.bg-orange-50');
    
    expect(infoCard).toBeTruthy();
    expect(warnCard).toBeTruthy();
    expect(actionCard).toBeTruthy();
  });

  it('renders dismiss buttons for each recommendation', () => {
    render(<RecommendationPanel recommendations={mockRecommendations} />);
    
    const dismissButtons = screen.getAllByLabelText('Dismiss recommendation');
    expect(dismissButtons).toHaveLength(3);
  });

  it('dismisses recommendation when dismiss button is clicked', () => {
    render(<RecommendationPanel recommendations={mockRecommendations} />);
    
    const infoRecommendation = screen.getByText('Information Recommendation');
    const dismissButton = infoRecommendation.closest('div')?.querySelector('button[aria-label="Dismiss recommendation"]');
    
    expect(infoRecommendation).toBeInTheDocument();
    
    if (dismissButton) {
      fireEvent.click(dismissButton);
    }
    
    expect(screen.queryByText('Information Recommendation')).not.toBeInTheDocument();
  });

  it('keeps other recommendations after dismissing one', () => {
    render(<RecommendationPanel recommendations={mockRecommendations} />);
    
    const infoRecommendation = screen.getByText('Information Recommendation');
    const dismissButton = infoRecommendation.closest('div')?.querySelector('button[aria-label="Dismiss recommendation"]');
    
    if (dismissButton) {
      fireEvent.click(dismissButton);
    }
    
    expect(screen.queryByText('Information Recommendation')).not.toBeInTheDocument();
    expect(screen.getByText('Warning Recommendation')).toBeInTheDocument();
    expect(screen.getByText('Action Recommendation')).toBeInTheDocument();
  });

  it('renders nothing when no recommendations provided', () => {
    const { container } = render(<RecommendationPanel recommendations={[]} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when all recommendations are dismissed', () => {
    const singleRec = mockRecommendations[0];
    if (!singleRec) return;
    
    render(<RecommendationPanel recommendations={[singleRec]} />);
    
    const dismissButton = screen.getByLabelText('Dismiss recommendation');
    fireEvent.click(dismissButton);
    
    expect(screen.queryByText('Recommendations')).not.toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <RecommendationPanel 
        recommendations={mockRecommendations} 
        className="custom-class"
      />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('maintains dismissal state across re-renders', () => {
    const { rerender } = render(<RecommendationPanel recommendations={mockRecommendations} />);
    
    // Dismiss the first recommendation
    const dismissButtons = screen.getAllByLabelText('Dismiss recommendation');
    const firstDismissButton = dismissButtons[0];
    if (firstDismissButton) {
      fireEvent.click(firstDismissButton);
    }
    
    expect(screen.queryByText('Information Recommendation')).not.toBeInTheDocument();
    
    // Re-render with same props
    rerender(<RecommendationPanel recommendations={mockRecommendations} />);
    
    // Dismissed recommendation should still be hidden
    expect(screen.queryByText('Information Recommendation')).not.toBeInTheDocument();
    expect(screen.getByText('Warning Recommendation')).toBeInTheDocument();
  });

  it('handles single recommendation correctly', () => {
    const singleRecommendation = mockRecommendations[0];
    if (!singleRecommendation) return;
    
    render(<RecommendationPanel recommendations={[singleRecommendation]} />);
    
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Information Recommendation')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Dismiss recommendation')).toHaveLength(1);
  });
});