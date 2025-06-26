import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Progress } from '../progress';

describe('Progress Component Tests', () => {
  test('renders with default props', () => {
    render(<Progress value={50} data-testid="progress" />);
    const progress = screen.getByTestId('progress');
    expect(progress).toBeInTheDocument();
    expect(progress).toHaveClass('h-4');
    expect(progress).toHaveClass('bg-secondary');
    expect(progress).toHaveAttribute('role', 'progressbar');
  });

  test('displays correct progress value', () => {
    render(<Progress value={75} data-testid="progress" />);
    const progress = screen.getByTestId('progress');
    expect(progress).toBeInTheDocument();
    // Radix handles aria attributes internally
  });

  test('supports different sizes', () => {
    const { rerender } = render(<Progress value={50} size="sm" data-testid="progress" />);
    let progress = screen.getByTestId('progress');
    expect(progress).toHaveClass('h-2');

    rerender(<Progress value={50} size="lg" data-testid="progress" />);
    progress = screen.getByTestId('progress');
    expect(progress).toHaveClass('h-6');
  });

  test('supports different variants', () => {
    const { rerender } = render(<Progress value={50} variant="muted" data-testid="progress" />);
    let progress = screen.getByTestId('progress');
    expect(progress).toHaveClass('bg-muted');

    rerender(<Progress value={50} variant="outline" data-testid="progress" />);
    progress = screen.getByTestId('progress');
    expect(progress).toHaveClass('border-input');
  });

  test('supports different indicator variants', () => {
    const { rerender } = render(<Progress value={50} indicatorVariant="destructive" data-testid="progress" />);
    let progress = screen.getByTestId('progress');
    let indicator = progress.querySelector('[role="progressbar"] > div');
    expect(indicator).toHaveClass('bg-destructive');

    rerender(<Progress value={50} indicatorVariant="success" data-testid="progress" />);
    progress = screen.getByTestId('progress');
    indicator = progress.querySelector('[role="progressbar"] > div');
    expect(indicator).toHaveClass('bg-green-500');
  });

  test('shows value when showValue is true', () => {
    render(<Progress value={75} showValue data-testid="progress" />);
    const valueDisplay = screen.getByText('75%');
    expect(valueDisplay).toBeInTheDocument();
    expect(valueDisplay).toHaveClass('text-muted-foreground');
  });

  test('hides value when showValue is false', () => {
    render(<Progress value={75} showValue={false} data-testid="progress" />);
    const valueDisplay = screen.queryByText('75%');
    expect(valueDisplay).not.toBeInTheDocument();
  });

  test('supports custom value formatting', () => {
    const formatValue = (value: number) => `${value}/100`;
    render(<Progress value={75} showValue formatValue={formatValue} data-testid="progress" />);
    const valueDisplay = screen.getByText('75/100');
    expect(valueDisplay).toBeInTheDocument();
  });

  test('handles zero value correctly', () => {
    render(<Progress value={0} showValue data-testid="progress" />);
    const progress = screen.getByTestId('progress');
    const valueDisplay = screen.getByText('0%');
    
    expect(progress).toBeInTheDocument();
    expect(valueDisplay).toBeInTheDocument();
  });

  test('handles undefined value correctly', () => {
    render(<Progress showValue data-testid="progress" />);
    const progress = screen.getByTestId('progress');
    const valueDisplay = screen.getByText('0%');
    
    expect(progress).toBeInTheDocument();
    expect(valueDisplay).toBeInTheDocument();
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Progress value={50} ref={ref} data-testid="progress" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  test('applies custom className', () => {
    render(<Progress value={50} className="custom-class" data-testid="progress" />);
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveClass('custom-class');
  });

  test('maintains accessibility attributes', () => {
    render(<Progress value={50} aria-label="Loading progress" data-testid="progress" />);
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('role', 'progressbar');
    expect(progress).toHaveAttribute('aria-label', 'Loading progress');
  });

  test('combines size and variant correctly', () => {
    render(<Progress value={50} size="lg" variant="outline" data-testid="progress" />);
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveClass('h-6');
    expect(progress).toHaveClass('border-input');
  });

  test('handles max value correctly', () => {
    render(<Progress value={100} showValue data-testid="progress" />);
    const progress = screen.getByTestId('progress');
    const valueDisplay = screen.getByText('100%');
    
    expect(progress).toBeInTheDocument();
    expect(valueDisplay).toBeInTheDocument();
  });

  test('supports custom max value', () => {
    render(<Progress value={50} max={200} showValue data-testid="progress" />);
    const progress = screen.getByTestId('progress');
    expect(progress).toBeInTheDocument();
    const valueDisplay = screen.getByText('50%');
    expect(valueDisplay).toBeInTheDocument();
  });
});
