import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhaseStepper, StepPhaseInfo } from '../PhaseStepper';

describe('PhaseStepper', () => {
  const phases: StepPhaseInfo[] = [
    { key: 'discovery', label: 'Discovery', order: 0, configState: 'valid', execState: 'completed' },
    { key: 'validation', label: 'Validation', order: 1, configState: 'missing', execState: 'not_started' },
  ];

  it('renders steps and handles selection', () => {
    const handler = jest.fn();
    render(<PhaseStepper phases={phases} activePhase={'discovery'} onSelect={handler} />);
    expect(screen.getByText(/Discovery/i)).toBeInTheDocument();
    const validation = screen.getByText(/Validation/i);
    fireEvent.click(validation.closest('button')!);
    expect(handler).toHaveBeenCalledWith('validation');
  });
});
