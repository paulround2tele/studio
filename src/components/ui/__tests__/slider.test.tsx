import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Slider } from '../slider';

describe('Slider Component Tests', () => {
  test('renders with default props', () => {
    render(<Slider data-testid="slider" />);
    
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-valuenow', '0');
  });

  test('supports different sizes', () => {
    const { rerender } = render(<Slider size="sm" data-testid="slider" />);
    let slider = screen.getByTestId('slider');
    expect(slider).toHaveClass('[&_[role=slider]]:h-3');
    expect(slider).toHaveClass('[&_[role=slider]]:w-3');

    rerender(<Slider size="lg" data-testid="slider" />);
    slider = screen.getByTestId('slider');
    expect(slider).toHaveClass('[&_[role=slider]]:h-6');
    expect(slider).toHaveClass('[&_[role=slider]]:w-6');
  });

  test('supports different variants', () => {
    const { rerender } = render(<Slider variant="destructive" data-testid="slider" />);
    let slider = screen.getByTestId('slider');
    expect(slider).toHaveClass('[&_.slider-range]:bg-destructive');

    rerender(<Slider variant="success" data-testid="slider" />);
    slider = screen.getByTestId('slider');
    expect(slider).toHaveClass('[&_.slider-range]:bg-green-500');

    rerender(<Slider variant="warning" data-testid="slider" />);
    slider = screen.getByTestId('slider');
    expect(slider).toHaveClass('[&_.slider-range]:bg-yellow-500');
  });

  test('supports controlled value', () => {
    const handleChange = jest.fn();
    render(
      <Slider 
        value={[50]} 
        onValueChange={handleChange}
        data-testid="slider" 
      />
    );
    
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  test('supports default value', () => {
    render(<Slider defaultValue={[25]} data-testid="slider" />);
    
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '25');
  });

  test('supports custom min, max, and step', () => {
    render(
      <Slider 
        min={10} 
        max={200} 
        step={5} 
        defaultValue={[50]}
        data-testid="slider" 
      />
    );
    
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '10');
    expect(slider).toHaveAttribute('aria-valuemax', '200');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  test('shows value when showValue is true', () => {
    render(<Slider showValue defaultValue={[75]} data-testid="slider" />);
    
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  test('shows labels when showLabels is true', () => {
    render(<Slider showLabels min={0} max={100} data-testid="slider" />);
    
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  test('supports custom formatValue function', () => {
    const formatValue = (value: number) => `${value}%`;
    render(
      <Slider 
        showValue 
        defaultValue={[50]} 
        formatValue={formatValue}
        data-testid="slider" 
      />
    );
    
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  test('shows marks when showMarks is true', () => {
    const marks = [
      { value: 0, label: 'Start' },
      { value: 50, label: 'Middle' },
      { value: 100, label: 'End' }
    ];
    
    render(
      <Slider 
        showMarks 
        marks={marks} 
        data-testid="slider" 
      />
    );
    
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Middle')).toBeInTheDocument();
    expect(screen.getByText('End')).toBeInTheDocument();
  });

  test('supports vertical orientation', () => {
    render(<Slider orientation="vertical" data-testid="slider" />);
    
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('data-orientation', 'vertical');
  });

  test('handles value changes correctly', () => {
    const handleChange = jest.fn();
    
    render(
      <Slider 
        onValueChange={handleChange}
        defaultValue={[0]}
        data-testid="slider" 
      />
    );
    
    const slider = screen.getByRole('slider');
    
    // Simulate keyboard interaction
    fireEvent.click(slider);
    fireEvent.keyDown(slider, { key: 'ArrowRight', code: 'ArrowRight' });
    
    expect(handleChange).toHaveBeenCalled();
  });

  test('supports disabled state', () => {
    render(<Slider disabled data-testid="slider" />);
    
    const slider = screen.getByRole('slider');
    // Radix sets data-disabled instead of aria-disabled
    expect(slider).toHaveAttribute('data-disabled');
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(<Slider ref={ref} data-testid="slider" />);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  test('applies custom className', () => {
    render(<Slider className="custom-slider-class" data-testid="slider" />);
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveClass('custom-slider-class');
  });

  test('handles multiple values (range)', () => {
    const handleChange = jest.fn();
    render(
      <Slider 
        value={[20, 80]} 
        onValueChange={handleChange}
        showValue
        data-testid="slider" 
      />
    );
    
    expect(screen.getByText('20 - 80')).toBeInTheDocument();
  });

  test('combines size and variant correctly', () => {
    render(
      <Slider 
        size="lg" 
        variant="destructive" 
        data-testid="slider" 
      />
    );
    
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveClass('[&_[role=slider]]:h-6');
    expect(slider).toHaveClass('[&_.slider-range]:bg-destructive');
  });

  test('vertical orientation with labels', () => {
    render(
      <Slider 
        orientation="vertical" 
        showLabels 
        min={0} 
        max={100}
        data-testid="slider" 
      />
    );
    
    const labels = screen.getByText('0').parentElement;
    expect(labels).toHaveClass('flex-col');
  });

  test('vertical orientation with value display', () => {
    render(
      <Slider 
        orientation="vertical" 
        showValue 
        defaultValue={[30]}
        data-testid="slider" 
      />
    );
    
    // Just verify the value is displayed for vertical orientation
    const valueText = screen.getByText('30');
    expect(valueText).toBeInTheDocument();
  });
});

describe('Slider Accessibility Tests', () => {
  test('has proper aria attributes', () => {
    render(
      <Slider 
        min={0} 
        max={100} 
        defaultValue={[50]}
        data-testid="slider" 
      />
    );
    
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  test('thumb has descriptive aria-label', () => {
    render(<Slider data-testid="slider" />);
    
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-label', 'Slider thumb');
  });

  test('supports keyboard navigation', () => {
    const handleChange = jest.fn();
    
    render(
      <Slider 
        defaultValue={[50]} 
        onValueChange={handleChange}
        data-testid="slider" 
      />
    );
    
    const slider = screen.getByRole('slider');
    fireEvent.click(slider);
    
    // Test arrow key navigation
    fireEvent.keyDown(slider, { key: 'ArrowRight', code: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'ArrowLeft', code: 'ArrowLeft' });
    fireEvent.keyDown(slider, { key: 'Home', code: 'Home' });
    fireEvent.keyDown(slider, { key: 'End', code: 'End' });
    
    expect(handleChange).toHaveBeenCalledTimes(4);
  });

  test('supports focus management', () => {
    render(<Slider data-testid="slider" />);
    
    const slider = screen.getByRole('slider');
    fireEvent.focus(slider);
    
    // Check that the slider can receive focus
    expect(slider).toHaveAttribute('tabindex', '0');
  });
});
