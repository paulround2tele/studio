import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BigIntInput } from '../bigint-input';

// Helper functions for testing (replacing legacy branded types)
const createSafeBigInt = (value: string | number | bigint) => {
  if (typeof value === 'string') {
    if (!/^-?\d+$/.test(value)) {
      throw new Error('Invalid number format');
    }
    return BigInt(value);
  }
  if (typeof value === 'number') {
    return BigInt(Math.floor(value));
  }
  if (typeof value === 'bigint') {
    return value;
  }
  throw new Error('Invalid value type');
};

const safeBigIntToString = (value: bigint | null | undefined) => value?.toString() || '';
const isSafeBigInt = (value: any) => typeof value === 'bigint';

describe('BigIntInput Component Tests', () => {
  test('renders with default props', () => {
    render(<BigIntInput data-testid="bigint-input" />);
    
    const input = screen.getByTestId('bigint-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('border-input');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('placeholder', 'Enter a number...');
  });

  test('supports different variants', () => {
    const { rerender } = render(<BigIntInput variant="error" data-testid="bigint-input" />);
    let input = screen.getByTestId('bigint-input');
    expect(input).toHaveClass('border-destructive');

    rerender(<BigIntInput variant="success" data-testid="bigint-input" />);
    input = screen.getByTestId('bigint-input');
    expect(input).toHaveClass('border-green-500');

    rerender(<BigIntInput variant="warning" data-testid="bigint-input" />);
    input = screen.getByTestId('bigint-input');
    expect(input).toHaveClass('border-yellow-500');
  });

  test('supports different sizes', () => {
    const { rerender } = render(<BigIntInput size="sm" data-testid="bigint-input" />);
    let input = screen.getByTestId('bigint-input');
    expect(input).toHaveClass('h-8');
    expect(input).toHaveClass('text-xs');

    rerender(<BigIntInput size="lg" data-testid="bigint-input" />);
    input = screen.getByTestId('bigint-input');
    expect(input).toHaveClass('h-12');
    expect(input).toHaveClass('text-base');
  });

  test('handles controlled value', () => {
    const mockValue = 12345;
    const handleChange = jest.fn();
    
    render(
      <BigIntInput
        value={mockValue}
        onChange={handleChange}
        data-testid="bigint-input"
      />
    );
    
    const input = screen.getByTestId('bigint-input');
    expect(input).toHaveValue('12,345'); // Should be formatted by default
  });

  test('handles uncontrolled input with default value', () => {
    const mockDefaultValue = 67890;
    
    render(
      <BigIntInput
        defaultValue={mockDefaultValue}
        data-testid="bigint-input"
      />
    );
    
    const input = screen.getByTestId('bigint-input');
    expect(input).toHaveValue('67,890');
  });

  test('validates number input', () => {
    const handleChange = jest.fn();
    const handleValidation = jest.fn();
    
    render(
      <BigIntInput 
        onChange={handleChange}
        onValidationChange={handleValidation}
        data-testid="bigint-input" 
      />
    );
    
    const input = screen.getByTestId('bigint-input');
    
    // Valid number
    fireEvent.change(input, { target: { value: '123' } });
    expect(handleValidation).toHaveBeenCalledWith(true, undefined);
    
    // Invalid number (letters)
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(handleValidation).toHaveBeenCalledWith(false, 'Please enter a valid number');
  });

  test('handles negative numbers when allowed', () => {
    const handleChange = jest.fn();
    
    render(
      <BigIntInput 
        allowNegative={true}
        onChange={handleChange}
        data-testid="bigint-input" 
      />
    );
    
    const input = screen.getByTestId('bigint-input');
    fireEvent.change(input, { target: { value: '-123' } });
    
    expect(input).toHaveValue('-123');
  });

  test('rejects negative numbers when not allowed', () => {
    const handleValidation = jest.fn();
    
    render(
      <BigIntInput 
        allowNegative={false}
        onValidationChange={handleValidation}
        data-testid="bigint-input" 
      />
    );
    
    const input = screen.getByTestId('bigint-input');
    fireEvent.change(input, { target: { value: '-123' } });
    
    expect(handleValidation).toHaveBeenCalledWith(false, 'Negative values are not allowed');
  });

  test('validates min and max constraints', () => {
    const min = 10;
    const max = 100;
    const handleValidation = jest.fn();
    
    render(
      <BigIntInput
        min={min}
        max={max}
        onValidationChange={handleValidation}
        data-testid="bigint-input"
      />
    );
    
    const input = screen.getByTestId('bigint-input');
    
    // Below min
    fireEvent.change(input, { target: { value: '5' } });
    expect(handleValidation).toHaveBeenCalledWith(false, 'Value must be at least 10');
    
    // Above max
    fireEvent.change(input, { target: { value: '150' } });
    expect(handleValidation).toHaveBeenCalledWith(false, 'Value must be at most 100');
    
    // Valid range
    fireEvent.change(input, { target: { value: '50' } });
    expect(handleValidation).toHaveBeenCalledWith(true, undefined);
  });

  test('handles required validation', () => {
    const handleValidation = jest.fn();
    
    render(
      <BigIntInput 
        required={true}
        onValidationChange={handleValidation}
        data-testid="bigint-input" 
      />
    );
    
    const input = screen.getByTestId('bigint-input');
    
    // First add a valid input
    fireEvent.change(input, { target: { value: '123' } });
    expect(handleValidation).toHaveBeenCalledWith(true, undefined);
    
    // Clear the mock
    handleValidation.mockClear();
    
    // Then clear the input (this should trigger required validation)
    fireEvent.change(input, { target: { value: '' } });
    expect(handleValidation).toHaveBeenCalledWith(false, 'This field is required');
  });

  test('formats display value on blur', () => {
    render(<BigIntInput formatDisplay={true} data-testid="bigint-input" />);
    
    const input = screen.getByTestId('bigint-input');
    
    // Enter unformatted value
    fireEvent.change(input, { target: { value: '1234567' } });
    expect(input).toHaveValue('1,234,567');
    
    // Blur should maintain formatting
    fireEvent.blur(input);
    expect(input).toHaveValue('1,234,567');
  });

  test('disables formatting when formatDisplay is false', () => {
    render(<BigIntInput formatDisplay={false} data-testid="bigint-input" />);
    
    const input = screen.getByTestId('bigint-input');
    fireEvent.change(input, { target: { value: '1234567' } });
    
    expect(input).toHaveValue('1234567'); // No commas
  });

  test('displays label when provided', () => {
    render(<BigIntInput label="Count" data-testid="bigint-input" />);
    
    expect(screen.getByText('Count')).toBeInTheDocument();
  });

  test('displays required indicator', () => {
    render(<BigIntInput label="Count" required={true} data-testid="bigint-input" />);
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  test('displays helper text', () => {
    render(<BigIntInput helperText="Enter a large number" data-testid="bigint-input" />);
    
    expect(screen.getByText('Enter a large number')).toBeInTheDocument();
  });

  test('displays error message', () => {
    render(<BigIntInput errorMessage="Invalid input" data-testid="bigint-input" />);
    
    expect(screen.getByText('Invalid input')).toBeInTheDocument();
    
    const input = screen.getByTestId('bigint-input');
    expect(input).toHaveClass('border-destructive');
  });

  test('supports disabled state', () => {
    render(<BigIntInput disabled data-testid="bigint-input" />);
    
    const input = screen.getByTestId('bigint-input');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:cursor-not-allowed');
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<BigIntInput ref={ref} data-testid="bigint-input" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  test('applies custom className', () => {
    render(<BigIntInput className="custom-class" data-testid="bigint-input" />);
    
    const input = screen.getByTestId('bigint-input');
    expect(input).toHaveClass('custom-class');
  });

  test('handles custom placeholder', () => {
    render(<BigIntInput placeholder="Enter count..." data-testid="bigint-input" />);
    
    const input = screen.getByTestId('bigint-input');
    expect(input).toHaveAttribute('placeholder', 'Enter count...');
  });

  test('has proper accessibility attributes', () => {
    render(
      <BigIntInput 
        label="Count"
        helperText="Helper"
        errorMessage="Error"
        required
        id="count-input"
        data-testid="bigint-input" 
      />
    );
    
    const input = screen.getByTestId('bigint-input');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'count-input-error');
  });
});

describe('BigIntInput Edge Cases', () => {
  test('handles very large numbers', () => {
    const handleChange = jest.fn();
    
    render(
      <BigIntInput 
        onChange={handleChange}
        data-testid="bigint-input" 
      />
    );
    
    const input = screen.getByTestId('bigint-input');
    const largeNumber = '9223372036854775807'; // Max int64
    
    fireEvent.change(input, { target: { value: largeNumber } });
    expect(input).toHaveValue('9,223,372,036,854,775,807');
  });

  test('handles empty string input', () => {
    const handleChange = jest.fn();
    
    render(
      <BigIntInput 
        onChange={handleChange}
        data-testid="bigint-input" 
      />
    );
    
    const input = screen.getByTestId('bigint-input');
    
    // First add some value
    fireEvent.change(input, { target: { value: '123' } });
    expect(handleChange).toHaveBeenCalledWith(123);
    
    // Clear the mock to isolate the empty string test
    handleChange.mockClear();
    
    // Then clear the input
    fireEvent.change(input, { target: { value: '' } });
    
    expect(handleChange).toHaveBeenCalledWith(null);
  });

  test('handles minus sign only input', () => {
    render(<BigIntInput allowNegative={true} data-testid="bigint-input" />);
    
    const input = screen.getByTestId('bigint-input');
    fireEvent.change(input, { target: { value: '-' } });
    
    expect(input).toHaveValue('-');
  });

  test('handles decimal input (should reject)', () => {
    const handleValidation = jest.fn();
    
    render(
      <BigIntInput 
        onValidationChange={handleValidation}
        data-testid="bigint-input" 
      />
    );
    
    const input = screen.getByTestId('bigint-input');
    fireEvent.change(input, { target: { value: '123.45' } });
    
    expect(handleValidation).toHaveBeenCalledWith(false, 'Please enter a valid number');
  });
});
