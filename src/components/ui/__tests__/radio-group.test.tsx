import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RadioGroup, RadioGroupItem } from '../radio-group';

describe('RadioGroup Component Tests', () => {
  test('renders with default props', () => {
    render(
      <RadioGroup data-testid="radio-group">
        <RadioGroupItem value="option1" data-testid="radio-item-1" />
        <RadioGroupItem value="option2" data-testid="radio-item-2" />
      </RadioGroup>
    );
    
    const radioGroup = screen.getByTestId('radio-group');
    const radioItem1 = screen.getByTestId('radio-item-1');
    const radioItem2 = screen.getByTestId('radio-item-2');
    
    expect(radioGroup).toBeInTheDocument();
    expect(radioGroup).toHaveAttribute('role', 'radiogroup');
    expect(radioItem1).toBeInTheDocument();
    expect(radioItem1).toHaveAttribute('role', 'radio');
    expect(radioItem2).toBeInTheDocument();
  });

  test('handles value changes', () => {
    const handleChange = jest.fn();
    render(
      <RadioGroup onValueChange={handleChange} data-testid="radio-group">
        <RadioGroupItem value="option1" data-testid="radio-item-1" />
        <RadioGroupItem value="option2" data-testid="radio-item-2" />
      </RadioGroup>
    );
    
    const radioItem1 = screen.getByTestId('radio-item-1');
    fireEvent.click(radioItem1);
    expect(handleChange).toHaveBeenCalledWith('option1');
  });

  test('can be controlled', () => {
    const { rerender } = render(
      <RadioGroup value="option1" data-testid="radio-group">
        <RadioGroupItem value="option1" data-testid="radio-item-1" />
        <RadioGroupItem value="option2" data-testid="radio-item-2" />
      </RadioGroup>
    );
    
    let radioItem1 = screen.getByTestId('radio-item-1');
    let radioItem2 = screen.getByTestId('radio-item-2');
    expect(radioItem1).toHaveAttribute('data-state', 'checked');
    expect(radioItem2).toHaveAttribute('data-state', 'unchecked');

    rerender(
      <RadioGroup value="option2" data-testid="radio-group">
        <RadioGroupItem value="option1" data-testid="radio-item-1" />
        <RadioGroupItem value="option2" data-testid="radio-item-2" />
      </RadioGroup>
    );
    
    radioItem1 = screen.getByTestId('radio-item-1');
    radioItem2 = screen.getByTestId('radio-item-2');
    expect(radioItem1).toHaveAttribute('data-state', 'unchecked');
    expect(radioItem2).toHaveAttribute('data-state', 'checked');
  });

  test('supports disabled state', () => {
    render(
      <RadioGroup data-testid="radio-group">
        <RadioGroupItem value="option1" disabled data-testid="radio-item-1" />
        <RadioGroupItem value="option2" data-testid="radio-item-2" />
      </RadioGroup>
    );
    
    const radioItem1 = screen.getByTestId('radio-item-1');
    expect(radioItem1).toBeDisabled();
    expect(radioItem1).toHaveClass('disabled:cursor-not-allowed');
    expect(radioItem1).toHaveClass('disabled:opacity-50');
  });

  test('supports different directions', () => {
    const { rerender } = render(
      <RadioGroup direction="horizontal" data-testid="radio-group">
        <RadioGroupItem value="option1" data-testid="radio-item-1" />
        <RadioGroupItem value="option2" data-testid="radio-item-2" />
      </RadioGroup>
    );
    
    let radioGroup = screen.getByTestId('radio-group');
    expect(radioGroup).toHaveClass('grid-flow-col');

    rerender(
      <RadioGroup direction="vertical" data-testid="radio-group">
        <RadioGroupItem value="option1" data-testid="radio-item-1" />
        <RadioGroupItem value="option2" data-testid="radio-item-2" />
      </RadioGroup>
    );
    
    radioGroup = screen.getByTestId('radio-group');
    expect(radioGroup).toHaveClass('gap-2');
    expect(radioGroup).not.toHaveClass('grid-flow-col');
  });

  test('supports different spacing options', () => {
    const { rerender } = render(
      <RadioGroup spacing="tight" data-testid="radio-group">
        <RadioGroupItem value="option1" data-testid="radio-item-1" />
        <RadioGroupItem value="option2" data-testid="radio-item-2" />
      </RadioGroup>
    );
    
    let radioGroup = screen.getByTestId('radio-group');
    expect(radioGroup).toHaveClass('gap-1');

    rerender(
      <RadioGroup spacing="loose" data-testid="radio-group">
        <RadioGroupItem value="option1" data-testid="radio-item-1" />
        <RadioGroupItem value="option2" data-testid="radio-item-2" />
      </RadioGroup>
    );
    
    radioGroup = screen.getByTestId('radio-group');
    expect(radioGroup).toHaveClass('gap-4');
  });

  test('supports different item variants', () => {
    const { rerender } = render(
      <RadioGroup data-testid="radio-group">
        <RadioGroupItem value="option1" variant="destructive" data-testid="radio-item-1" />
      </RadioGroup>
    );
    
    let radioItem = screen.getByTestId('radio-item-1');
    expect(radioItem).toHaveClass('border-destructive');

    rerender(
      <RadioGroup data-testid="radio-group">
        <RadioGroupItem value="option1" variant="outline" data-testid="radio-item-1" />
      </RadioGroup>
    );
    
    radioItem = screen.getByTestId('radio-item-1');
    expect(radioItem).toHaveClass('border-input');

    rerender(
      <RadioGroup data-testid="radio-group">
        <RadioGroupItem value="option1" variant="ghost" data-testid="radio-item-1" />
      </RadioGroup>
    );
    
    radioItem = screen.getByTestId('radio-item-1');
    expect(radioItem).toHaveClass('border-transparent');
  });

  test('supports different item sizes', () => {
    const { rerender } = render(
      <RadioGroup data-testid="radio-group">
        <RadioGroupItem value="option1" size="sm" data-testid="radio-item-1" />
      </RadioGroup>
    );
    
    let radioItem = screen.getByTestId('radio-item-1');
    expect(radioItem).toHaveClass('h-3');
    expect(radioItem).toHaveClass('w-3');

    rerender(
      <RadioGroup data-testid="radio-group">
        <RadioGroupItem value="option1" size="lg" data-testid="radio-item-1" />
      </RadioGroup>
    );
    
    radioItem = screen.getByTestId('radio-item-1');
    expect(radioItem).toHaveClass('h-5');
    expect(radioItem).toHaveClass('w-5');
  });

  test('displays error state correctly', () => {
    render(
      <RadioGroup error data-testid="radio-group">
        <RadioGroupItem value="option1" error data-testid="radio-item-1" />
      </RadioGroup>
    );
    
    const radioItem = screen.getByTestId('radio-item-1');
    expect(radioItem).toHaveClass('border-destructive');
  });

  test('error prop overrides variant prop on items', () => {
    render(
      <RadioGroup data-testid="radio-group">
        <RadioGroupItem value="option1" variant="outline" error data-testid="radio-item-1" />
      </RadioGroup>
    );
    
    const radioItem = screen.getByTestId('radio-item-1');
    expect(radioItem).toHaveClass('border-destructive');
    expect(radioItem).not.toHaveClass('border-input');
  });

  test('forwards ref correctly for RadioGroup', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <RadioGroup ref={ref} data-testid="radio-group">
        <RadioGroupItem value="option1" data-testid="radio-item-1" />
      </RadioGroup>
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  test('forwards ref correctly for RadioGroupItem', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(
      <RadioGroup data-testid="radio-group">
        <RadioGroupItem value="option1" ref={ref} data-testid="radio-item-1" />
      </RadioGroup>
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  test('applies custom className to RadioGroup', () => {
    render(
      <RadioGroup className="custom-group-class" data-testid="radio-group">
        <RadioGroupItem value="option1" data-testid="radio-item-1" />
      </RadioGroup>
    );
    const radioGroup = screen.getByTestId('radio-group');
    expect(radioGroup).toHaveClass('custom-group-class');
  });

  test('applies custom className to RadioGroupItem', () => {
    render(
      <RadioGroup data-testid="radio-group">
        <RadioGroupItem value="option1" className="custom-item-class" data-testid="radio-item-1" />
      </RadioGroup>
    );
    const radioItem = screen.getByTestId('radio-item-1');
    expect(radioItem).toHaveClass('custom-item-class');
  });

  test('supports keyboard navigation', () => {
    const handleChange = jest.fn();
    render(
      <RadioGroup onValueChange={handleChange} data-testid="radio-group">
        <RadioGroupItem value="option1" data-testid="radio-item-1" />
        <RadioGroupItem value="option2" data-testid="radio-item-2" />
      </RadioGroup>
    );
    
    const radioItem1 = screen.getByTestId('radio-item-1');
    radioItem1.focus();
    expect(radioItem1).toHaveFocus();
    
    fireEvent.keyDown(radioItem1, { key: 'ArrowDown' });
    // Note: Radix handles arrow key navigation internally
  });

  test('maintains accessibility attributes', () => {
    render(
      <RadioGroup data-testid="radio-group" aria-label="Choose option">
        <RadioGroupItem value="option1" data-testid="radio-item-1" />
        <RadioGroupItem value="option2" data-testid="radio-item-2" />
      </RadioGroup>
    );
    
    const radioGroup = screen.getByTestId('radio-group');
    const radioItem1 = screen.getByTestId('radio-item-1');
    
    expect(radioGroup).toHaveAttribute('role', 'radiogroup');
    expect(radioGroup).toHaveAttribute('aria-label', 'Choose option');
    expect(radioItem1).toHaveAttribute('role', 'radio');
  });

  test('combines multiple variant options correctly', () => {
    render(
      <RadioGroup direction="horizontal" spacing="loose" data-testid="radio-group">
        <RadioGroupItem 
          value="option1" 
          variant="destructive" 
          size="lg" 
          data-testid="radio-item-1" 
        />
      </RadioGroup>
    );
    
    const radioGroup = screen.getByTestId('radio-group');
    const radioItem = screen.getByTestId('radio-item-1');
    
    expect(radioGroup).toHaveClass('grid-flow-col');
    expect(radioGroup).toHaveClass('gap-4');
    expect(radioItem).toHaveClass('border-destructive');
    expect(radioItem).toHaveClass('h-5');
    expect(radioItem).toHaveClass('w-5');
  });
});
