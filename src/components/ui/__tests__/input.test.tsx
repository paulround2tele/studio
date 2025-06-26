import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Input } from '../input';

describe('Input Component Tests', () => {
  test('renders with default props', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('h-10');
    expect(input).toHaveClass('border-input');
  });

  test('handles value changes', () => {
    const handleChange = jest.fn();
    render(<Input placeholder="Type here" onChange={handleChange} />);
    const input = screen.getByPlaceholderText('Type here');
    
    fireEvent.change(input, { target: { value: 'test value' } });
    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('test value');
  });

  test('can be disabled', () => {
    render(<Input disabled placeholder="Disabled input" />);
    const input = screen.getByPlaceholderText('Disabled input');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:cursor-not-allowed');
  });

  test('supports different variants', () => {
    const { rerender } = render(<Input variant="outline" placeholder="Outline" />);
    let input = screen.getByPlaceholderText('Outline');
    expect(input).toHaveClass('bg-transparent');

    rerender(<Input variant="ghost" placeholder="Ghost" />);
    input = screen.getByPlaceholderText('Ghost');
    expect(input).toHaveClass('border-transparent');
  });

  test('supports different sizes', () => {
    const { rerender } = render(<Input inputSize="sm" placeholder="Small" />);
    let input = screen.getByPlaceholderText('Small');
    expect(input).toHaveClass('h-9');

    rerender(<Input inputSize="lg" placeholder="Large" />);
    input = screen.getByPlaceholderText('Large');
    expect(input).toHaveClass('h-12');
  });

  test('displays error state correctly', () => {
    render(<Input error helperText="This field is required" placeholder="Error input" />);
    const input = screen.getByPlaceholderText('Error input');
    const helperText = screen.getByText('This field is required');
    
    expect(input).toHaveClass('border-destructive/50');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(helperText).toHaveClass('text-destructive');
  });

  test('displays helper text without error', () => {
    render(<Input helperText="Enter your email address" placeholder="Email" id="email" />);
    const input = screen.getByPlaceholderText('Email');
    const helperText = screen.getByText('Enter your email address');
    
    expect(input).toHaveAttribute('aria-describedby', 'email-helper');
    expect(helperText).toHaveClass('text-muted-foreground');
    expect(helperText).toHaveAttribute('id', 'email-helper');
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} placeholder="Ref test" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  test('applies custom className', () => {
    render(<Input className="custom-class" placeholder="Custom class" />);
    const input = screen.getByPlaceholderText('Custom class');
    expect(input).toHaveClass('custom-class');
  });

  test('supports different input types', () => {
    const { rerender } = render(<Input type="email" placeholder="Email" />);
    let input = screen.getByPlaceholderText('Email');
    expect(input).toHaveAttribute('type', 'email');

    rerender(<Input type="password" placeholder="Password" />);
    input = screen.getByPlaceholderText('Password');
    expect(input).toHaveAttribute('type', 'password');
  });

  test('handles focus and blur events', () => {
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();
    render(<Input onFocus={handleFocus} onBlur={handleBlur} placeholder="Focus test" />);
    const input = screen.getByPlaceholderText('Focus test');
    
    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);
    
    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  test('supports controlled component pattern', () => {
    const TestComponent = () => {
      const [value, setValue] = React.useState('initial');
      return (
        <Input 
          value={value} 
          onChange={(e) => setValue(e.target.value)}
          placeholder="Controlled input"
        />
      );
    };

    render(<TestComponent />);
    const input = screen.getByPlaceholderText('Controlled input');
    expect(input).toHaveValue('initial');
    
    fireEvent.change(input, { target: { value: 'updated' } });
    expect(input).toHaveValue('updated');
  });
});
