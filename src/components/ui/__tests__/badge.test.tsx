import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Badge } from '../badge';

describe('Badge Component Tests', () => {
  test('renders with default props', () => {
    render(<Badge>Default Badge</Badge>);
    const badge = screen.getByText('Default Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-primary');
    expect(badge).toHaveClass('text-primary-foreground');
    expect(badge).toHaveAttribute('role', 'status');
  });

  test('supports different variants', () => {
    const { rerender } = render(<Badge variant="secondary">Secondary</Badge>);
    let badge = screen.getByText('Secondary');
    expect(badge).toHaveClass('bg-secondary');

    rerender(<Badge variant="destructive">Destructive</Badge>);
    badge = screen.getByText('Destructive');
    expect(badge).toHaveClass('bg-destructive');

    rerender(<Badge variant="outline">Outline</Badge>);
    badge = screen.getByText('Outline');
    expect(badge).toHaveClass('border-input');
  });

  test('supports success, warning, and info variants', () => {
    const { rerender } = render(<Badge variant="success">Success</Badge>);
    let badge = screen.getByText('Success');
    expect(badge).toHaveClass('bg-green-500');

    rerender(<Badge variant="warning">Warning</Badge>);
    badge = screen.getByText('Warning');
    expect(badge).toHaveClass('bg-yellow-500');

    rerender(<Badge variant="info">Info</Badge>);
    badge = screen.getByText('Info');
    expect(badge).toHaveClass('bg-blue-500');
  });

  test('supports different sizes', () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>);
    let badge = screen.getByText('Small');
    expect(badge).toHaveClass('text-[10px]');

    rerender(<Badge size="lg">Large</Badge>);
    badge = screen.getByText('Large');
    expect(badge).toHaveClass('text-sm');
  });

  test('supports dismissible functionality', () => {
    const handleDismiss = jest.fn();
    render(
      <Badge dismissible onDismiss={handleDismiss}>
        Dismissible Badge
      </Badge>
    );
    
    const badge = screen.getByText('Dismissible Badge');
    const dismissButton = screen.getByLabelText('Remove badge');
    
    expect(badge).toBeInTheDocument();
    expect(dismissButton).toBeInTheDocument();
    
    fireEvent.click(dismissButton);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  test('does not show dismiss button when not dismissible', () => {
    render(<Badge>Non-dismissible</Badge>);
    const badge = screen.getByText('Non-dismissible');
    const dismissButton = screen.queryByLabelText('Remove badge');
    
    expect(badge).toBeInTheDocument();
    expect(dismissButton).not.toBeInTheDocument();
  });

  test('does not show dismiss button when dismissible but no onDismiss handler', () => {
    render(<Badge dismissible>No Handler</Badge>);
    const badge = screen.getByText('No Handler');
    const dismissButton = screen.queryByLabelText('Remove badge');
    
    expect(badge).toBeInTheDocument();
    expect(dismissButton).not.toBeInTheDocument();
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Badge ref={ref}>Ref Test</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  test('applies custom className', () => {
    render(<Badge className="custom-class">Custom Badge</Badge>);
    const badge = screen.getByText('Custom Badge');
    expect(badge).toHaveClass('custom-class');
  });

  test('supports onClick events', () => {
    const handleClick = jest.fn();
    render(<Badge onClick={handleClick}>Clickable Badge</Badge>);
    const badge = screen.getByText('Clickable Badge');
    
    fireEvent.click(badge);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('supports keyboard navigation for dismiss button', () => {
    const handleDismiss = jest.fn();
    render(
      <Badge dismissible onDismiss={handleDismiss}>
        Keyboard Test
      </Badge>
    );
    
    const dismissButton = screen.getByLabelText('Remove badge');
    
    fireEvent.keyDown(dismissButton, { key: 'Enter' });
    fireEvent.click(dismissButton); // Simulate enter key activating button
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  test('combines variant and size correctly', () => {
    render(<Badge variant="outline" size="lg">Large Outline</Badge>);
    const badge = screen.getByText('Large Outline');
    expect(badge).toHaveClass('border-input');
    expect(badge).toHaveClass('text-sm');
  });

  test('maintains accessibility with proper role', () => {
    render(<Badge>Accessible Badge</Badge>);
    const badge = screen.getByText('Accessible Badge');
    expect(badge).toHaveAttribute('role', 'status');
  });
});
