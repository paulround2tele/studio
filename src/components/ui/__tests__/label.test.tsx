import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Label } from '../label';

describe('Label Component Tests', () => {
  test('renders with default props', () => {
    render(<Label htmlFor="test-input">Test Label</Label>);
    const label = screen.getByText('Test Label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass('text-sm');
    expect(label).toHaveClass('font-medium');
    expect(label).toHaveAttribute('for', 'test-input');
  });

  test('displays required indicator when required prop is true', () => {
    render(<Label required>Required Field</Label>);
    const label = screen.getByText('Required Field');
    const requiredIndicator = screen.getByLabelText('required');
    
    expect(label).toBeInTheDocument();
    expect(requiredIndicator).toBeInTheDocument();
    expect(requiredIndicator).toHaveTextContent('*');
    expect(requiredIndicator).toHaveClass('text-destructive');
  });

  test('applies error styling when error prop is true', () => {
    render(<Label error>Error Label</Label>);
    const label = screen.getByText('Error Label');
    expect(label).toHaveClass('text-destructive');
  });

  test('supports different variants', () => {
    const { rerender } = render(<Label variant="muted">Muted Label</Label>);
    let label = screen.getByText('Muted Label');
    expect(label).toHaveClass('text-muted-foreground');

    rerender(<Label variant="accent">Accent Label</Label>);
    label = screen.getByText('Accent Label');
    expect(label).toHaveClass('text-accent-foreground');
  });

  test('supports different sizes', () => {
    const { rerender } = render(<Label size="sm">Small Label</Label>);
    let label = screen.getByText('Small Label');
    expect(label).toHaveClass('text-xs');

    rerender(<Label size="lg">Large Label</Label>);
    label = screen.getByText('Large Label');
    expect(label).toHaveClass('text-base');
  });

  test('supports different font weights', () => {
    const { rerender } = render(<Label weight="normal">Normal Weight</Label>);
    let label = screen.getByText('Normal Weight');
    expect(label).toHaveClass('font-normal');

    rerender(<Label weight="bold">Bold Weight</Label>);
    label = screen.getByText('Bold Weight');
    expect(label).toHaveClass('font-bold');
  });

  test('error prop overrides variant prop', () => {
    render(<Label variant="muted" error>Error Override</Label>);
    const label = screen.getByText('Error Override');
    expect(label).toHaveClass('text-destructive');
    expect(label).not.toHaveClass('text-muted-foreground');
  });

  test('combines required and error states', () => {
    render(<Label required error>Required Error Field</Label>);
    const label = screen.getByText('Required Error Field');
    const requiredIndicator = screen.getByLabelText('required');
    
    expect(label).toHaveClass('text-destructive');
    expect(requiredIndicator).toBeInTheDocument();
    expect(requiredIndicator).toHaveClass('text-destructive');
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLLabelElement>();
    render(<Label ref={ref}>Ref Test</Label>);
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });

  test('applies custom className', () => {
    render(<Label className="custom-class">Custom Class</Label>);
    const label = screen.getByText('Custom Class');
    expect(label).toHaveClass('custom-class');
  });

  test('supports multiple variant combinations', () => {
    render(
      <Label 
        variant="accent" 
        size="lg" 
        weight="bold" 
        required
      >
        Complex Label
      </Label>
    );
    const label = screen.getByText('Complex Label');
    const requiredIndicator = screen.getByLabelText('required');
    
    expect(label).toHaveClass('text-accent-foreground');
    expect(label).toHaveClass('text-base');
    expect(label).toHaveClass('font-bold');
    expect(requiredIndicator).toBeInTheDocument();
  });

  test('maintains accessibility attributes', () => {
    render(<Label htmlFor="input-id">Accessible Label</Label>);
    const label = screen.getByText('Accessible Label');
    expect(label).toHaveAttribute('for', 'input-id');
  });

  test('supports disabled state styling through peer classes', () => {
    render(
      <div>
        <Label htmlFor="disabled-input">Disabled Input Label</Label>
        <input id="disabled-input" disabled className="peer" />
      </div>
    );
    const label = screen.getByText('Disabled Input Label');
    expect(label).toHaveClass('peer-disabled:cursor-not-allowed');
    expect(label).toHaveClass('peer-disabled:opacity-70');
  });
});
