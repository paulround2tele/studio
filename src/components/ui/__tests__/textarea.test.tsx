import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Textarea } from '../textarea';

describe('Textarea Component Tests', () => {
  test('renders with default props', () => {
    render(<Textarea data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveClass('min-h-[80px]'); // md size default
    expect(textarea).toHaveClass('border-input'); // default variant
    expect(textarea).toHaveClass('resize-y'); // vertical resize default
  });

  test('supports different variants', () => {
    const { rerender } = render(<Textarea variant="error" data-testid="textarea" />);
    expect(screen.getByTestId('textarea')).toHaveClass('border-destructive');

    rerender(<Textarea variant="success" data-testid="textarea" />);
    expect(screen.getByTestId('textarea')).toHaveClass('border-green-500');

    rerender(<Textarea variant="warning" data-testid="textarea" />);
    expect(screen.getByTestId('textarea')).toHaveClass('border-yellow-500');
  });

  test('supports different sizes', () => {
    const { rerender } = render(<Textarea size="sm" data-testid="textarea" />);
    expect(screen.getByTestId('textarea')).toHaveClass('min-h-[60px]');

    rerender(<Textarea size="lg" data-testid="textarea" />);
    expect(screen.getByTestId('textarea')).toHaveClass('min-h-[120px]');
  });

  test('supports different resize options', () => {
    const { rerender } = render(<Textarea resize="none" data-testid="textarea" />);
    expect(screen.getByTestId('textarea')).toHaveClass('resize-none');

    rerender(<Textarea resize="horizontal" data-testid="textarea" />);
    expect(screen.getByTestId('textarea')).toHaveClass('resize-x');

    rerender(<Textarea resize="both" data-testid="textarea" />);
    expect(screen.getByTestId('textarea')).toHaveClass('resize');
  });

  test('handles controlled value', () => {
    const handleChange = jest.fn();
    render(
      <Textarea 
        value="test value" 
        onChange={handleChange}
        data-testid="textarea" 
      />
    );
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveValue('test value');
    
    fireEvent.change(textarea, { target: { value: 'new value' } });
    expect(handleChange).toHaveBeenCalled();
  });

  test('displays label when provided', () => {
    render(<Textarea label="Description" data-testid="textarea" />);
    
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  test('displays required indicator', () => {
    render(
      <Textarea 
        label="Description" 
        required={true} 
        data-testid="textarea" 
      />
    );
    
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('*')).toHaveClass('text-destructive');
  });

  test('displays helper text', () => {
    render(
      <Textarea 
        helperText="Please provide a detailed description"
        id="description"
        data-testid="textarea" 
      />
    );
    
    const helperText = screen.getByText('Please provide a detailed description');
    expect(helperText).toBeInTheDocument();
    expect(helperText).toHaveAttribute('id', 'description-helper');
  });

  test('displays error message', () => {
    render(
      <Textarea 
        errorMessage="This field is required"
        id="description"
        data-testid="textarea" 
      />
    );
    
    const textarea = screen.getByTestId('textarea');
    const errorMessage = screen.getByText('This field is required');
    
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveClass('text-destructive');
    expect(errorMessage).toHaveAttribute('id', 'description-error');
    expect(textarea).toHaveClass('border-destructive');
  });

  test('supports disabled state', () => {
    render(<Textarea disabled data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass('disabled:cursor-not-allowed');
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} data-testid="textarea" />);
    
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    expect(ref.current).toBe(screen.getByTestId('textarea'));
  });

  test('applies custom className', () => {
    render(<Textarea className="custom-class" data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('custom-class');
  });

  test('handles custom placeholder', () => {
    render(<Textarea placeholder="Enter description..." data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('placeholder', 'Enter description...');
  });

  test('shows character count when enabled', () => {
    render(
      <Textarea 
        value="Hello world"
        maxLength={100}
        showCount={true}
        data-testid="textarea" 
      />
    );
    
    expect(screen.getByText('11/100')).toBeInTheDocument();
  });

  test('respects maxLength attribute', () => {
    render(<Textarea maxLength={50} data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('maxLength', '50');
  });

  test('has proper accessibility attributes', () => {
    render(
      <Textarea 
        label="Description"
        helperText="Helper"
        errorMessage="Error"
        required
        id="description"
        data-testid="textarea" 
      />
    );
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea).toHaveAttribute('aria-describedby', 'description-helper description-error');
  });

  test('prioritizes error over helper in aria-describedby when both present', () => {
    render(
      <Textarea 
        helperText="Helper text"
        errorMessage="Error message"
        id="description"
        data-testid="textarea" 
      />
    );
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('aria-describedby', 'description-helper description-error');
  });
});

describe('Textarea Edge Cases', () => {
  test('handles empty value correctly', () => {
    render(
      <Textarea 
        value=""
        maxLength={100}
        showCount={true}
        data-testid="textarea" 
      />
    );
    
    expect(screen.getByText('0/100')).toBeInTheDocument();
  });

  test('handles undefined value correctly', () => {
    render(
      <Textarea 
        maxLength={100}
        showCount={true}
        data-testid="textarea" 
      />
    );
    
    expect(screen.getByText('0/100')).toBeInTheDocument();
  });

  test('does not show count when showCount is false', () => {
    render(
      <Textarea 
        value="Hello world"
        maxLength={100}
        showCount={false}
        data-testid="textarea" 
      />
    );
    
    expect(screen.queryByText('11/100')).not.toBeInTheDocument();
  });

  test('does not show count when maxLength is not set', () => {
    render(
      <Textarea 
        value="Hello world"
        showCount={true}
        data-testid="textarea" 
      />
    );
    
    expect(screen.queryByText(/\/$/)).not.toBeInTheDocument();
  });
});
