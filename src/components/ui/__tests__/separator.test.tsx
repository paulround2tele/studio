import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Separator } from '../separator';

describe('Separator Component Tests', () => {
  test('renders with default props', () => {
    render(<Separator data-testid="separator" />);
    const separator = screen.getByTestId('separator');
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveClass('bg-border');
    expect(separator).toHaveAttribute('data-orientation', 'horizontal');
  });

  test('supports vertical orientation', () => {
    render(<Separator orientation="vertical" data-testid="separator" />);
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveAttribute('data-orientation', 'vertical');
  });

  test('supports different variants', () => {
    const { rerender } = render(<Separator variant="muted" data-testid="separator" />);
    let separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('bg-muted');

    rerender(<Separator variant="accent" data-testid="separator" />);
    separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('bg-accent');

    rerender(<Separator variant="destructive" data-testid="separator" />);
    separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('bg-destructive');
  });

  test('supports different sizes', () => {
    const { rerender } = render(<Separator size="thin" data-testid="separator" />);
    let separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('data-[orientation=horizontal]:h-[0.5px]');

    rerender(<Separator size="thick" data-testid="separator" />);
    separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('data-[orientation=horizontal]:h-[2px]');
  });

  test('supports spacing options', () => {
    const { rerender } = render(<Separator spacing="sm" data-testid="separator" />);
    let separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('my-2');

    rerender(<Separator spacing="md" data-testid="separator" />);
    separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('my-4');

    rerender(<Separator spacing="lg" data-testid="separator" />);
    separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('my-6');
  });

  test('supports vertical spacing', () => {
    const { rerender } = render(<Separator orientation="vertical" spacing="sm" data-testid="separator" />);
    let separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('mx-2');

    rerender(<Separator orientation="vertical" spacing="md" data-testid="separator" />);
    separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('mx-4');
  });

  test('renders with label for horizontal separators', () => {
    render(<Separator label="or" data-testid="separator" />);
    const label = screen.getByText('or');
    const separator = screen.getByTestId('separator');
    
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass('text-muted-foreground');
    expect(separator).toBeInTheDocument();
  });

  test('does not render label for vertical separators', () => {
    render(<Separator orientation="vertical" label="or" data-testid="separator" />);
    const label = screen.queryByText('or');
    const separator = screen.getByTestId('separator');
    
    expect(label).not.toBeInTheDocument();
    expect(separator).toBeInTheDocument();
  });

  test('combines label with spacing', () => {
    render(
      <div data-testid="container">
        <Separator label="or" spacing="md" data-testid="separator" />
      </div>
    );
    const container = screen.getByTestId('container');
    const labelContainer = container.querySelector('.relative.flex.items-center');
    
    expect(labelContainer).toHaveClass('my-4');
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Separator ref={ref} data-testid="separator" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  test('applies custom className', () => {
    render(<Separator className="custom-class" data-testid="separator" />);
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('custom-class');
  });

  test('supports decorative and non-decorative modes', () => {
    const { rerender } = render(<Separator decorative={true} data-testid="separator" />);
    let separator = screen.getByTestId('separator');
    expect(separator).toHaveAttribute('role', 'none');

    rerender(<Separator decorative={false} data-testid="separator" />);
    separator = screen.getByTestId('separator');
    expect(separator).toHaveAttribute('role', 'separator');
  });

  test('maintains accessibility attributes', () => {
    render(<Separator orientation="vertical" decorative={false} data-testid="separator" />);
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveAttribute('role', 'separator');
    expect(separator).toHaveAttribute('data-orientation', 'vertical');
  });

  test('combines variant and size correctly', () => {
    render(<Separator variant="primary" size="thick" data-testid="separator" />);
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('bg-primary');
    expect(separator).toHaveClass('data-[orientation=horizontal]:h-[2px]');
  });

  test('handles compound variants correctly', () => {
    render(<Separator size="thin" orientation="vertical" data-testid="separator" />);
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('data-[orientation=vertical]:w-[0.5px]');
  });
});
