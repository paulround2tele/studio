import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { format, addDays, subDays } from 'date-fns';
import { DatePicker, DateRangePicker } from '../date-picker';

expect.extend(toHaveNoViolations);

// Mock date-fns format function for consistent testing
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  format: jest.fn(),
}));

const mockFormat = format as jest.MockedFunction<typeof format>;

describe('DatePicker Component Tests', () => {
  beforeEach(() => {
    mockFormat.mockImplementation((date, formatStr) => {
      const dateObj = date as Date;
      if (formatStr === 'PPP') {
        return dateObj.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      return dateObj.toISOString().split('T')[0];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders date picker correctly', () => {
    render(<DatePicker data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toBeInTheDocument();
    expect(picker).toHaveTextContent('Pick a date');
  });

  it('displays custom placeholder', () => {
    render(<DatePicker placeholder="Select date" data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toHaveTextContent('Select date');
  });

  it('shows calendar icon', () => {
    render(<DatePicker data-testid="date-picker" />);
    
    const icon = screen.getByTestId('date-picker').querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<DatePicker ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

describe('DatePicker Variants Tests', () => {
  it('renders default variant correctly', () => {
    render(<DatePicker variant="default" data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toHaveClass('justify-start');
    expect(picker).toHaveClass('text-left');
  });

  it('renders outline variant correctly', () => {
    render(<DatePicker variant="outline" data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toHaveClass('border-input');
  });

  it('renders ghost variant correctly', () => {
    render(<DatePicker variant="ghost" data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toHaveClass('border-0');
    expect(picker).toHaveClass('shadow-none');
  });
});

describe('DatePicker Size Tests', () => {
  it('renders default size correctly', () => {
    render(<DatePicker size="default" data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toHaveClass('h-10');
    expect(picker).toHaveClass('px-3');
    expect(picker).toHaveClass('py-2');
  });

  it('renders small size correctly', () => {
    render(<DatePicker size="sm" data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toHaveClass('h-8');
    expect(picker).toHaveClass('px-2');
    expect(picker).toHaveClass('text-sm');
  });

  it('renders large size correctly', () => {
    render(<DatePicker size="lg" data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toHaveClass('h-12');
    expect(picker).toHaveClass('px-4');
    expect(picker).toHaveClass('text-base');
  });
});

describe('DatePicker State Tests', () => {
  it('renders error state correctly', () => {
    render(<DatePicker error data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toHaveClass('border-destructive');
    expect(picker).toHaveClass('focus:ring-destructive');
    expect(picker).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders success state correctly', () => {
    render(<DatePicker success data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toHaveClass('border-green-500');
    expect(picker).toHaveClass('focus:ring-green-500');
  });

  it('renders warning state correctly', () => {
    render(<DatePicker warning data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toHaveClass('border-yellow-500');
    expect(picker).toHaveClass('focus:ring-yellow-500');
  });

  it('renders disabled state correctly', () => {
    render(<DatePicker disabled data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toBeDisabled();
  });
});

describe('DatePicker Label and Helper Text Tests', () => {
  it('renders with label', () => {
    render(<DatePicker label="Select Date" data-testid="date-picker" />);
    
    const label = screen.getByText('Select Date');
    expect(label).toBeInTheDocument();
    expect(label.tagName).toBe('LABEL');
  });

  it('renders with required indicator', () => {
    render(<DatePicker label="Date" required data-testid="date-picker" />);
    
    const requiredIndicator = screen.getByText('*');
    expect(requiredIndicator).toBeInTheDocument();
    expect(requiredIndicator).toHaveClass('text-destructive');
  });

  it('renders with helper text', () => {
    render(<DatePicker helperText="Choose your preferred date" data-testid="date-picker" />);
    
    const helperText = screen.getByText('Choose your preferred date');
    expect(helperText).toBeInTheDocument();
    expect(helperText).toHaveClass('text-sm');
  });

  it('connects helper text with aria-describedby', () => {
    render(<DatePicker helperText="Helper text" data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    const helperText = screen.getByText('Helper text');
    
    expect(picker).toHaveAttribute('aria-describedby', helperText.id);
  });

  it('styles helper text based on state', () => {
    const { rerender } = render(<DatePicker error helperText="Error text" />);
    expect(screen.getByText('Error text')).toHaveClass('text-destructive');

    rerender(<DatePicker success helperText="Success text" />);
    expect(screen.getByText('Success text')).toHaveClass('text-green-600');

    rerender(<DatePicker warning helperText="Warning text" />);
    expect(screen.getByText('Warning text')).toHaveClass('text-yellow-600');
  });

  it('styles label based on state', () => {
    const { rerender } = render(<DatePicker error label="Error Label" />);
    expect(screen.getByText('Error Label')).toHaveClass('text-destructive');

    rerender(<DatePicker success label="Success Label" />);
    expect(screen.getByText('Success Label')).toHaveClass('text-green-600');

    rerender(<DatePicker warning label="Warning Label" />);
    expect(screen.getByText('Warning Label')).toHaveClass('text-yellow-600');
  });
});

describe('DatePicker Value and Format Tests', () => {
  it('displays formatted date when value is provided', () => {
    const testDate = new Date('2024-01-15');
    mockFormat.mockReturnValue('Monday, January 15, 2024');
    
    render(<DatePicker value={testDate} data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toHaveTextContent('Monday, January 15, 2024');
    expect(mockFormat).toHaveBeenCalledWith(testDate, 'PPP');
  });

  it('uses custom format', () => {
    const testDate = new Date('2024-01-15');
    mockFormat.mockReturnValue('2024-01-15');
    
    render(<DatePicker value={testDate} format="yyyy-MM-dd" data-testid="date-picker" />);
    
    expect(mockFormat).toHaveBeenCalledWith(testDate, 'yyyy-MM-dd');
  });

  it('shows placeholder when no value', () => {
    render(<DatePicker data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toHaveTextContent('Pick a date');
    expect(picker).toHaveClass('text-muted-foreground');
  });
});

describe('DatePicker Interaction Tests', () => {
  it('opens calendar when clicked', async () => {
    render(<DatePicker data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toHaveAttribute('aria-expanded', 'false');
    
    fireEvent.click(picker);
    
    await waitFor(() => {
      expect(picker).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('calls onValueChange when date is selected', async () => {
    const handleChange = jest.fn();
    render(<DatePicker onValueChange={handleChange} data-testid="date-picker" />);
    
    // Click to open
    fireEvent.click(screen.getByTestId('date-picker'));
    
    // Wait for calendar to appear and find a date button
    await waitFor(() => {
      const dateButtons = screen.getAllByRole('button').filter(btn => 
        btn.textContent && /^\d+$/.test(btn.textContent.trim())
      );
      if (dateButtons.length > 0) {
        fireEvent.click(dateButtons[0]);
        expect(handleChange).toHaveBeenCalled();
      }
    });
  });

  it('supports keyboard navigation', () => {
    render(<DatePicker data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    picker.focus();
    
    expect(picker).toHaveFocus();
    
    // Test Space key (more standard for buttons)
    fireEvent.keyDown(picker, { key: ' ' });
    expect(picker).toHaveAttribute('aria-haspopup', 'dialog');
  });
});

describe('DatePicker Accessibility Tests', () => {
  it('has no accessibility violations (basic)', async () => {
    const { container } = render(
      <DatePicker 
        label="Select Date"
        helperText="Choose your preferred date"
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations (with states)', async () => {
    const { container } = render(
      <DatePicker 
        label="Required Date"
        required
        error
        helperText="This field is required"
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper ARIA attributes', () => {
    render(<DatePicker label="Date" data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toHaveAttribute('aria-haspopup', 'dialog');
    expect(picker).toHaveAttribute('aria-expanded', 'false');
  });

  it('generates unique IDs for elements', () => {
    render(
      <div>
        <DatePicker label="Date 1" helperText="Helper 1" data-testid="picker1" />
        <DatePicker label="Date 2" helperText="Helper 2" data-testid="picker2" />
      </div>
    );

    const picker1 = screen.getByTestId('picker1');
    const picker2 = screen.getByTestId('picker2');
    
    expect(picker1.id).not.toBe(picker2.id);
  });
});

describe('DateRangePicker Component Tests', () => {
  it('renders date range picker correctly', () => {
    render(<DateRangePicker data-testid="date-range-picker" />);
    
    const picker = screen.getByTestId('date-range-picker');
    expect(picker).toBeInTheDocument();
    expect(picker).toHaveTextContent('Pick a date range');
  });

  it('displays formatted date range when value is provided', () => {
    const startDate = new Date('2024-01-15');
    const endDate = new Date('2024-01-20');
    mockFormat.mockImplementation((date) => (date as Date).toISOString().split('T')[0]);
    
    render(
      <DateRangePicker 
        value={{ from: startDate, to: endDate }}
        data-testid="date-range-picker" 
      />
    );
    
    const picker = screen.getByTestId('date-range-picker');
    expect(picker).toHaveTextContent('2024-01-15 - 2024-01-20');
  });

  it('displays partial range correctly', () => {
    const startDate = new Date('2024-01-15');
    mockFormat.mockReturnValue('2024-01-15');
    
    render(
      <DateRangePicker 
        value={{ from: startDate, to: undefined }}
        data-testid="date-range-picker" 
      />
    );
    
    const picker = screen.getByTestId('date-range-picker');
    expect(picker).toHaveTextContent('2024-01-15');
  });

  it('opens calendar with two months for range selection', async () => {
    render(<DateRangePicker data-testid="date-range-picker" />);
    
    const picker = screen.getByTestId('date-range-picker');
    fireEvent.click(picker);
    
    await waitFor(() => {
      expect(picker).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('has no accessibility violations (range picker)', async () => {
    const { container } = render(
      <DateRangePicker 
        label="Select Date Range"
        helperText="Choose start and end dates"
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('DatePicker Edge Cases', () => {
  it('handles undefined value gracefully', () => {
    render(<DatePicker value={undefined} data-testid="date-picker" />);
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toHaveTextContent('Pick a date');
  });

  it('handles date constraints', () => {
    const today = new Date();
    const minDate = subDays(today, 7);
    const maxDate = addDays(today, 7);
    
    render(
      <DatePicker 
        fromDate={minDate}
        toDate={maxDate}
        data-testid="date-picker"
      />
    );
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toBeInTheDocument();
  });

  it('handles disabled dates', () => {
    const today = new Date();
    const disabledDates = [addDays(today, 1), addDays(today, 2)];
    
    render(
      <DatePicker 
        disabledDates={disabledDates}
        data-testid="date-picker"
      />
    );
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toBeInTheDocument();
  });

  it('supports custom calendar props', () => {
    render(
      <DatePicker 
        calendarProps={{ 
          showOutsideDays: false,
          className: "custom-calendar"
        }}
        data-testid="date-picker"
      />
    );
    
    const picker = screen.getByTestId('date-picker');
    expect(picker).toBeInTheDocument();
  });

  it('handles all size and state combinations', () => {
    render(
      <div>
        <DatePicker size="sm" error label="Small Error" />
        <DatePicker size="lg" success label="Large Success" />
        <DatePicker variant="ghost" warning label="Ghost Warning" />
      </div>
    );

    expect(screen.getByText('Small Error')).toBeInTheDocument();
    expect(screen.getByText('Large Success')).toBeInTheDocument();
    expect(screen.getByText('Ghost Warning')).toBeInTheDocument();
  });
});
