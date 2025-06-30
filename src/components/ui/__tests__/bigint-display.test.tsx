import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BigIntDisplay, CountDisplay, CurrencyDisplay, PercentageDisplay } from '../bigint-display';

// Helper function for testing (replacing legacy branded types)
const safeBigIntToString = (value: number | null | undefined) => value?.toString() || '';

// Mock clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('BigIntDisplay Component Tests', () => {
  beforeEach(() => {
    mockWriteText.mockClear();
  });

  test('renders with default props', () => {
    const mockValue = 12345;
    render(<BigIntDisplay value={mockValue} data-testid="bigint-display" />);
    
    const display = screen.getByTestId('bigint-display');
    expect(display).toBeInTheDocument();
    expect(display).toHaveClass('font-mono');
    expect(display).toHaveTextContent('12,345'); // Default formatting with commas
  });

  test('supports different variants', () => {
    const mockValue = 100;
    const { rerender } = render(
      <BigIntDisplay value={mockValue} variant="success" data-testid="bigint-display" />
    );
    
    let display = screen.getByTestId('bigint-display');
    expect(display).toHaveClass('text-green-600');

    rerender(<BigIntDisplay value={mockValue} variant="destructive" data-testid="bigint-display" />);
    display = screen.getByTestId('bigint-display');
    expect(display).toHaveClass('text-destructive');

    rerender(<BigIntDisplay value={mockValue} variant="warning" data-testid="bigint-display" />);
    display = screen.getByTestId('bigint-display');
    expect(display).toHaveClass('text-yellow-600');

    rerender(<BigIntDisplay value={mockValue} variant="muted" data-testid="bigint-display" />);
    display = screen.getByTestId('bigint-display');
    expect(display).toHaveClass('text-muted-foreground');
  });

  test('supports different sizes', () => {
    const mockValue = 100;
    const { rerender } = render(
      <BigIntDisplay value={mockValue} size="xs" data-testid="bigint-display" />
    );
    
    let display = screen.getByTestId('bigint-display');
    expect(display).toHaveClass('text-xs');

    rerender(<BigIntDisplay value={mockValue} size="xl" data-testid="bigint-display" />);
    display = screen.getByTestId('bigint-display');
    expect(display).toHaveClass('text-xl');

    rerender(<BigIntDisplay value={mockValue} size="2xl" data-testid="bigint-display" />);
    display = screen.getByTestId('bigint-display');
    expect(display).toHaveClass('text-2xl');
  });

  test('supports different weights', () => {
    const mockValue = 100;
    const { rerender } = render(
      <BigIntDisplay value={mockValue} weight="bold" data-testid="bigint-display" />
    );
    
    let display = screen.getByTestId('bigint-display');
    expect(display).toHaveClass('font-bold');

    rerender(<BigIntDisplay value={mockValue} weight="semibold" data-testid="bigint-display" />);
    display = screen.getByTestId('bigint-display');
    expect(display).toHaveClass('font-semibold');
  });

  test('handles null and undefined values', () => {
    const { rerender } = render(
      <BigIntDisplay value={null} data-testid="bigint-display" />
    );
    
    let display = screen.getByTestId('bigint-display');
    expect(display).toHaveTextContent('—'); // Default fallback

    rerender(<BigIntDisplay value={undefined} data-testid="bigint-display" />);
    display = screen.getByTestId('bigint-display');
    expect(display).toHaveTextContent('—');
  });

  test('supports custom fallback', () => {
    render(
      <BigIntDisplay 
        value={null} 
        fallback="No data" 
        data-testid="bigint-display" 
      />
    );
    
    const display = screen.getByTestId('bigint-display');
    expect(display).toHaveTextContent('No data');
  });

  test('formats with commas by default', () => {
    const mockValue = 1234567;
    render(<BigIntDisplay value={mockValue} data-testid="bigint-display" />);
    
    const display = screen.getByTestId('bigint-display');
    expect(display).toHaveTextContent('1,234,567');
  });

  test('disables comma formatting when requested', () => {
    const mockValue = 1234567;
    render(
      <BigIntDisplay
        value={mockValue}
        formatWithCommas={false}
        data-testid="bigint-display"
      />
    );
    
    const display = screen.getByTestId('bigint-display');
    expect(display).toHaveTextContent('1234567');
  });

  test('supports prefix and suffix', () => {
    const mockValue = 100;
    render(
      <BigIntDisplay
        value={mockValue}
        prefix="$"
        suffix=" USD"
        data-testid="bigint-display"
      />
    );
    
    const display = screen.getByTestId('bigint-display');
    expect(display).toHaveTextContent('$ 100 USD');
  });

  test('shows sign when requested', () => {
    const { rerender } = render(
      <BigIntDisplay
        value={100}
        showSign={true}
        data-testid="bigint-display"
      />
    );
    
    let display = screen.getByTestId('bigint-display');
    expect(display).toHaveTextContent('+100');

    // Negative numbers should keep their sign
    rerender(
      <BigIntDisplay
        value={-100}
        showSign={true}
        data-testid="bigint-display"
      />
    );
    
    display = screen.getByTestId('bigint-display');
    expect(display).toHaveTextContent('-100');
  });

  test('abbreviates large numbers', () => {
    const { rerender } = render(
      <BigIntDisplay
        value={1500000}
        abbreviate={true}
        data-testid="bigint-display"
      />
    );
    
    let display = screen.getByTestId('bigint-display');
    expect(display).toHaveTextContent('1.5M');

    rerender(
      <BigIntDisplay
        value={2500000000}
        abbreviate={true}
        data-testid="bigint-display"
      />
    );
    
    display = screen.getByTestId('bigint-display');
    expect(display).toHaveTextContent('2.5B');

    rerender(
      <BigIntDisplay
        value={3750000000000}
        abbreviate={true}
        data-testid="bigint-display"
      />
    );
    
    display = screen.getByTestId('bigint-display');
    expect(display).toHaveTextContent('3.8T');
  });

  test('respects abbreviation threshold', () => {
    const mockValue = 500000; // 500K
    render(
      <BigIntDisplay
        value={mockValue}
        abbreviate={true}
        abbreviateThreshold={1000000} // 1M threshold
        data-testid="bigint-display"
      />
    );
    
    const display = screen.getByTestId('bigint-display');
    expect(display).toHaveTextContent('500,000'); // Should not abbreviate
  });

  test('supports custom precision in abbreviation', () => {
    const mockValue = 1234567;
    render(
      <BigIntDisplay
        value={mockValue}
        abbreviate={true}
        precision={2}
        data-testid="bigint-display"
      />
    );
    
    const display = screen.getByTestId('bigint-display');
    expect(display).toHaveTextContent('1.23M');
  });

  test('supports copy functionality', async () => {
    const mockValue = 12345;
    render(
      <BigIntDisplay
        value={mockValue}
        copyable={true}
        data-testid="bigint-display"
      />
    );
    
    const display = screen.getByTestId('bigint-display');
    expect(display).toHaveClass('cursor-pointer');
    expect(display).toHaveAttribute('role', 'button');
    
    fireEvent.click(display);
    expect(mockWriteText).toHaveBeenCalledWith('12345');
  });

  test('copy functionality with keyboard', async () => {
    const mockValue = 12345;
    render(
      <BigIntDisplay
        value={mockValue}
        copyable={true}
        data-testid="bigint-display"
      />
    );
    
    const display = screen.getByTestId('bigint-display');
    
    fireEvent.keyDown(display, { key: 'Enter' });
    expect(mockWriteText).toHaveBeenCalledWith('12345');
    
    fireEvent.keyDown(display, { key: ' ' });
    expect(mockWriteText).toHaveBeenCalledTimes(2);
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(<BigIntDisplay ref={ref} value={100} data-testid="bigint-display" />);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  test('applies custom className', () => {
    render(
      <BigIntDisplay
        value={100}
        className="custom-class"
        data-testid="bigint-display"
      />
    );
    
    const display = screen.getByTestId('bigint-display');
    expect(display).toHaveClass('custom-class');
  });

  test('supports custom tooltip', () => {
    render(
      <BigIntDisplay
        value={100}
        tooltip="Custom tooltip"
        data-testid="bigint-display"
      />
    );
    
    const display = screen.getByTestId('bigint-display');
    expect(display).toHaveAttribute('title', 'Custom tooltip');
  });
});

describe('CountDisplay Component Tests', () => {
  test('renders with count-specific defaults', () => {
    const mockValue = 15000;
    render(<CountDisplay value={mockValue} data-testid="count-display" />);
    
    const display = screen.getByTestId('count-display');
    expect(display).toHaveTextContent('15K'); // Should abbreviate by default
  });
});

describe('CurrencyDisplay Component Tests', () => {
  test('renders with currency prefix', () => {
    const mockValue = 1000;
    render(<CurrencyDisplay value={mockValue} data-testid="currency-display" />);
    
    const display = screen.getByTestId('currency-display');
    expect(display).toHaveTextContent('$ 1,000');
  });

  test('supports custom currency prefix', () => {
    const mockValue = 1000;
    render(
      <CurrencyDisplay
        value={mockValue}
        prefix="€"
        data-testid="currency-display"
      />
    );
    
    const display = screen.getByTestId('currency-display');
    expect(display).toHaveTextContent('€ 1,000');
  });
});

describe('PercentageDisplay Component Tests', () => {
  test('renders with percentage suffix', () => {
    const mockValue = 85;
    render(<PercentageDisplay value={mockValue} data-testid="percentage-display" />);
    
    const display = screen.getByTestId('percentage-display');
    expect(display).toHaveTextContent('85 %');
  });

  test('supports custom suffix', () => {
    const mockValue = 85;
    render(
      <PercentageDisplay
        value={mockValue}
        suffix=" percent"
        data-testid="percentage-display"
      />
    );
    
    const display = screen.getByTestId('percentage-display');
    expect(display).toHaveTextContent('85 percent');
  });
});

describe('BigIntDisplay Accessibility Tests', () => {
  test('has proper accessibility attributes when copyable', () => {
    const mockValue = 12345;
    render(
      <BigIntDisplay
        value={mockValue}
        copyable={true}
        data-testid="bigint-display"
      />
    );
    
    const display = screen.getByTestId('bigint-display');
    expect(display).toHaveAttribute('role', 'button');
    expect(display).toHaveAttribute('tabindex', '0');
    expect(display).toHaveAttribute('aria-label', 'Copy value: 12345');
  });

  test('supports keyboard interaction for copyable elements', () => {
    const mockValue = 12345;
    render(
      <BigIntDisplay
        value={mockValue}
        copyable={true}
        data-testid="bigint-display"
      />
    );
    
    const display = screen.getByTestId('bigint-display');
    
    // Should handle Enter key
    fireEvent.keyDown(display, { key: 'Enter' });
    expect(mockWriteText).toHaveBeenCalled();
    
    // Should handle Space key
    fireEvent.keyDown(display, { key: ' ' });
    expect(mockWriteText).toHaveBeenCalledTimes(2);
    
    // Should not handle other keys
    fireEvent.keyDown(display, { key: 'Tab' });
    expect(mockWriteText).toHaveBeenCalledTimes(2); // No additional calls
  });
});

describe('BigIntDisplay Edge Cases', () => {
  test('handles very large numbers', () => {
    const largeValue = 9223372036854775807; // Max int64
    render(
      <BigIntDisplay
        value={largeValue}
        abbreviate={true}
        data-testid="bigint-display"
      />
    );
    
    const display = screen.getByTestId('bigint-display');
    expect(display).toHaveTextContent('9.2Q'); // Quintillion
  });

  test('handles negative numbers', () => {
    const { rerender } = render(
      <BigIntDisplay
        value={-1234}
        data-testid="bigint-display"
      />
    );
    
    let display = screen.getByTestId('bigint-display');
    expect(display).toHaveTextContent('-1,234');

    // With abbreviation
    rerender(
      <BigIntDisplay
        value={-1500000}
        abbreviate={true}
        data-testid="bigint-display"
      />
    );
    
    display = screen.getByTestId('bigint-display');
    expect(display).toHaveTextContent('-1.5M');
  });

  test('handles zero value', () => {
    render(<BigIntDisplay value={0} data-testid="bigint-display" />);
    
    const display = screen.getByTestId('bigint-display');
    expect(display).toHaveTextContent('0');
  });
});
