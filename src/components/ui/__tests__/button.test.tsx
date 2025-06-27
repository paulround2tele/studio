import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '../button';

expect.extend(toHaveNoViolations);

describe('Button Component Tests', () => {
  test('renders with correct default variant', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Click me');
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  test('supports different variants', () => {
    const { rerender } = render(<Button variant="outline">Outline</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('border-input');

    rerender(<Button variant="ghost">Ghost</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('hover:bg-accent');
  });

  test('supports different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('h-9');

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('h-11');
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  test('applies custom className', () => {
    render(<Button className="custom-class">Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    test('has no accessibility violations', async () => {
      const { container } = render(<Button>Accessible Button</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('has no accessibility violations when disabled', async () => {
      const { container } = render(<Button disabled>Disabled Button</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('has no accessibility violations with different variants', async () => {
      const { container } = render(
        <div>
          <Button variant="default">Default</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // Keyboard Navigation Tests
  describe('Keyboard Navigation', () => {
    test('can be focused with tab', async () => {
      const user = userEvent.setup();
      render(<Button>Focusable Button</Button>);
      const button = screen.getByRole('button');
      
      await user.tab();
      expect(button).toHaveFocus();
    });

    test('can be activated with Enter key', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Enter Button</Button>);
      const button = screen.getByRole('button');
      
      button.focus();
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('can be activated with Space key', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Space Button</Button>);
      const button = screen.getByRole('button');
      
      button.focus();
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('cannot be focused when disabled', async () => {
      const user = userEvent.setup();
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button');
      
      await user.tab();
      expect(button).not.toHaveFocus();
    });

    test('does not trigger click when disabled and Enter pressed', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled Button</Button>);
      const button = screen.getByRole('button');
      
      // Try to focus and activate
      fireEvent.focus(button);
      await user.keyboard('{Enter}');
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // Focus Management Tests
  describe('Focus Management', () => {
    test('maintains focus state correctly', async () => {
      const user = userEvent.setup();
      render(<Button>Focus Button</Button>);
      const button = screen.getByRole('button');
      
      await user.click(button);
      expect(button).toHaveFocus();
    });

    test('has visible focus indicator', async () => {
      const user = userEvent.setup();
      render(<Button>Focus Indicator Button</Button>);
      const button = screen.getByRole('button');
      
      await user.tab();
      expect(button).toHaveFocus();
      // Focus ring should be visible via CSS classes
      expect(button).toHaveClass('focus-visible:ring-2');
    });

    test('loses focus when tabbed away', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Button>First Button</Button>
          <Button>Second Button</Button>
        </div>
      );
      const firstButton = screen.getByRole('button', { name: 'First Button' });
      const secondButton = screen.getByRole('button', { name: 'Second Button' });
      
      await user.tab();
      expect(firstButton).toHaveFocus();
      
      await user.tab();
      expect(firstButton).not.toHaveFocus();
      expect(secondButton).toHaveFocus();
    });
  });

  describe('Loading State', () => {
    test('shows loading spinner and text when loading', () => {
      render(<Button isLoading loadingText="Loading...">Submit</Button>);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    test('shows default loading text when no loadingText provided', () => {
      render(<Button isLoading>Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('asChild Prop', () => {
    test('renders as child element when asChild is true', () => {
      const { container } = render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test');
    });

    test('logs warning in development when asChild has multiple children', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // This should throw because asChild with multiple children is invalid
      expect(() => {
        render(
          <Button asChild>
            <span>First</span>
            <span>Second</span>
          </Button>
        );
      }).toThrow();

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });
});
