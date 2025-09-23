import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhaseStepper, StepPhaseInfo } from '../PhaseStepper';

describe('PhaseStepper keyboard navigation', () => {
  const phases: StepPhaseInfo[] = [
    { key: 'discovery', label: 'Discovery', order: 0, configState: 'valid', execState: 'idle' },
    { key: 'validation', label: 'Validation', order: 1, configState: 'missing', execState: 'idle' },
    { key: 'extraction', label: 'Extraction', order: 2, configState: 'missing', execState: 'idle' },
  ];

  it('moves focus with arrow keys and activates with Enter', () => {
    const onSelect = jest.fn();
  render(<PhaseStepper phases={phases} onPhaseSelect={onSelect} />);
  const first = screen.getByRole('button', { name: /Phase 1: Discovery/i });
  first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    const second = screen.getByRole('button', { name: /Phase 2: Validation/i });
  // Focus effect runs after paint
  expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('validation');
  });

  it('wraps focus with End/Home keys', () => {
    const onSelect = jest.fn();
  render(<PhaseStepper phases={phases} onPhaseSelect={onSelect} />);
  const first = screen.getByRole('button', { name: /Phase 1: Discovery/i });
  first.focus();
    fireEvent.keyDown(first, { key: 'End' });
    const last = screen.getByRole('button', { name: /Phase 3: Extraction/i });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: 'Home' });
    expect(document.activeElement).toBe(first);
  });
});
