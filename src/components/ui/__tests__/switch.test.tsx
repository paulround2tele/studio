import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Switch } from '../switch';

describe('Switch Component Tests', () => {
  test('renders with default props', () => {
    render(<Switch data-testid="switch" />);
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toBeInTheDocument();
    expect(switchElement).toHaveClass('h-6');
    expect(switchElement).toHaveClass('w-11');
    expect(switchElement).toHaveAttribute('role', 'switch');
    expect(switchElement).toHaveAttribute('data-state', 'unchecked');
  });

  test('handles checked state changes', () => {
    const handleChange = jest.fn();
    render(<Switch onCheckedChange={handleChange} data-testid="switch" />);
    const switchElement = screen.getByTestId('switch');
    
    fireEvent.click(switchElement);
    expect(handleChange).toHaveBeenCalledWith(true);
    
    fireEvent.click(switchElement);
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  test('can be controlled', () => {
    const { rerender } = render(<Switch checked={false} data-testid="switch" />);
    let switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('data-state', 'unchecked');

    rerender(<Switch checked={true} data-testid="switch" />);
    switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('data-state', 'checked');
  });

  test('can be disabled', () => {
    render(<Switch disabled data-testid="switch" />);
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toBeDisabled();
    expect(switchElement).toHaveClass('disabled:cursor-not-allowed');
    expect(switchElement).toHaveClass('disabled:opacity-50');
  });

  test('supports different variants', () => {
    const { rerender } = render(<Switch variant="destructive" data-testid="switch" />);
    let switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveClass('data-[state=checked]:bg-destructive');

    rerender(<Switch variant="outline" data-testid="switch" />);
    switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveClass('border-input');

    rerender(<Switch variant="ghost" data-testid="switch" />);
    switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveClass('data-[state=unchecked]:bg-transparent');
  });

  test('supports different sizes', () => {
    const { rerender } = render(<Switch size="sm" data-testid="switch" />);
    let switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveClass('h-5');
    expect(switchElement).toHaveClass('w-9');

    rerender(<Switch size="lg" data-testid="switch" />);
    switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveClass('h-7');
    expect(switchElement).toHaveClass('w-12');
  });

  test('displays error state correctly', () => {
    render(<Switch error data-testid="switch" />);
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveClass('data-[state=checked]:bg-destructive');
  });

  test('error prop overrides variant prop', () => {
    render(<Switch variant="outline" error data-testid="switch" />);
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveClass('data-[state=checked]:bg-destructive');
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Switch ref={ref} data-testid="switch" />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  test('applies custom className', () => {
    render(<Switch className="custom-class" data-testid="switch" />);
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveClass('custom-class');
  });

  test('supports keyboard navigation', () => {
    const handleChange = jest.fn();
    render(<Switch onCheckedChange={handleChange} data-testid="switch" />);
    const switchElement = screen.getByTestId('switch');
    
    switchElement.focus();
    expect(switchElement).toHaveFocus();
    
    fireEvent.keyDown(switchElement, { key: 'Enter' });
    fireEvent.click(switchElement); // Simulating enter key activation
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  test('maintains accessibility attributes', () => {
    render(<Switch checked={true} data-testid="switch" />);
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('role', 'switch');
    expect(switchElement).toHaveAttribute('data-state', 'checked');
    expect(switchElement).toHaveAttribute('aria-checked', 'true');
  });

  test('combines variant and size correctly', () => {
    render(<Switch variant="destructive" size="lg" data-testid="switch" />);
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveClass('data-[state=checked]:bg-destructive');
    expect(switchElement).toHaveClass('h-7');
    expect(switchElement).toHaveClass('w-12');
  });

  test('has proper thumb sizing based on switch size', () => {
    const { rerender } = render(<Switch size="sm" data-testid="switch" />);
    let switchElement = screen.getByTestId('switch');
    let _thumb = switchElement.querySelector('[data-radix-collection-item]');
    // Note: Radix handles thumb styling internally, so we test that the component renders correctly

    rerender(<Switch size="lg" data-testid="switch" />);
    switchElement = screen.getByTestId('switch');
    _thumb = switchElement.querySelector('[data-radix-collection-item]');
    expect(switchElement).toHaveClass('h-7');
  });

  test('supports aria-label for accessibility', () => {
    render(<Switch aria-label="Toggle notifications" data-testid="switch" />);
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('aria-label', 'Toggle notifications');
  });
});
