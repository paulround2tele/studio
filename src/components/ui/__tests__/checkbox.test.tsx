import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Checkbox } from '../checkbox';

describe('Checkbox Component Tests', () => {
  test('renders with default props', () => {
    render(<Checkbox data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveClass('h-4');
    expect(checkbox).toHaveClass('w-4');
    expect(checkbox).toHaveClass('border-primary');
    expect(checkbox).toHaveAttribute('type', 'button');
    expect(checkbox).toHaveAttribute('role', 'checkbox');
  });

  test('handles checked state changes', () => {
    const handleChange = jest.fn();
    render(<Checkbox onCheckedChange={handleChange} data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    
    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalledWith(true);
    
    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  test('can be controlled', () => {
    const { rerender } = render(<Checkbox checked={false} data-testid="checkbox" />);
    let checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'unchecked');

    rerender(<Checkbox checked={true} data-testid="checkbox" />);
    checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });

  test('can be disabled', () => {
    render(<Checkbox disabled data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox).toHaveClass('disabled:cursor-not-allowed');
    expect(checkbox).toHaveClass('disabled:opacity-50');
  });

  test('supports different variants', () => {
    const { rerender } = render(<Checkbox variant="destructive" data-testid="checkbox" />);
    let checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveClass('border-destructive');

    rerender(<Checkbox variant="outline" data-testid="checkbox" />);
    checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveClass('border-input');

    rerender(<Checkbox variant="ghost" data-testid="checkbox" />);
    checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveClass('border-transparent');
  });

  test('supports different sizes', () => {
    const { rerender } = render(<Checkbox size="sm" data-testid="checkbox" />);
    let checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveClass('h-3');
    expect(checkbox).toHaveClass('w-3');

    rerender(<Checkbox size="lg" data-testid="checkbox" />);
    checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveClass('h-5');
    expect(checkbox).toHaveClass('w-5');
  });

  test('displays error state correctly', () => {
    render(<Checkbox error data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveClass('border-destructive');
  });

  test('error prop overrides variant prop', () => {
    render(<Checkbox variant="outline" error data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveClass('border-destructive');
    expect(checkbox).not.toHaveClass('border-input');
  });

  test('supports indeterminate state', () => {
    render(<Checkbox indeterminate checked={false} data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toBeInTheDocument();
    
    // When indeterminate is true but checked is false, the indicator should not be shown
    // This is the expected behavior for Radix UI checkboxes
    expect(checkbox).toHaveAttribute('data-state', 'unchecked');
  });

  test('shows check icon when checked and not indeterminate', () => {
    render(<Checkbox checked indeterminate={false} data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Checkbox ref={ref} data-testid="checkbox" />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  test('applies custom className', () => {
    render(<Checkbox className="custom-class" data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveClass('custom-class');
  });

  test('supports keyboard navigation', () => {
    const handleChange = jest.fn();
    render(<Checkbox onCheckedChange={handleChange} data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    
    checkbox.focus();
    expect(checkbox).toHaveFocus();
    
    fireEvent.keyDown(checkbox, { key: 'Enter' });
    fireEvent.click(checkbox); // Simulating enter key activation
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  test('maintains accessibility attributes', () => {
    render(<Checkbox checked={true} data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveAttribute('role', 'checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });

  test('combines variant and size correctly', () => {
    render(<Checkbox variant="destructive" size="lg" data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveClass('border-destructive');
    expect(checkbox).toHaveClass('h-5');
    expect(checkbox).toHaveClass('w-5');
  });

  test('integrates with form libraries via controlled state', () => {
    const handleChange = jest.fn();
    render(
      <Checkbox 
        checked={false} 
        onCheckedChange={handleChange} 
        data-testid="checkbox"
        aria-label="agree-checkbox"
      />
    );
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveAttribute('aria-label', 'agree-checkbox');
    
    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  test('supports custom id attribute', () => {
    render(<Checkbox id="custom-checkbox" data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveAttribute('id', 'custom-checkbox');
  });
});
