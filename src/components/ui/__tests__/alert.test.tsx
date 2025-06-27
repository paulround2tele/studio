import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Alert, AlertTitle, AlertDescription } from '../alert';
import { AlertCircle } from 'lucide-react';

describe('Alert Component Tests', () => {
  test('renders with default props', () => {
    render(
      <Alert data-testid="alert">
        <AlertTitle>Alert Title</AlertTitle>
        <AlertDescription>Alert description</AlertDescription>
      </Alert>
    );
    
    const alert = screen.getByTestId('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveClass('p-4'); // md size default
    expect(alert).toHaveClass('bg-background'); // default variant
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
    expect(screen.getByText('Alert description')).toBeInTheDocument();
  });

  test('supports different variants', () => {
    const { rerender } = render(
      <Alert variant="destructive" data-testid="alert">
        <AlertTitle>Error</AlertTitle>
      </Alert>
    );
    expect(screen.getByTestId('alert')).toHaveClass('border-destructive/50');
    expect(screen.getByTestId('alert')).toHaveClass('text-destructive');

    rerender(
      <Alert variant="success" data-testid="alert">
        <AlertTitle>Success</AlertTitle>
      </Alert>
    );
    expect(screen.getByTestId('alert')).toHaveClass('border-green-500/50');
    expect(screen.getByTestId('alert')).toHaveClass('text-green-700');

    rerender(
      <Alert variant="warning" data-testid="alert">
        <AlertTitle>Warning</AlertTitle>
      </Alert>
    );
    expect(screen.getByTestId('alert')).toHaveClass('border-yellow-500/50');
    expect(screen.getByTestId('alert')).toHaveClass('text-yellow-700');

    rerender(
      <Alert variant="info" data-testid="alert">
        <AlertTitle>Info</AlertTitle>
      </Alert>
    );
    expect(screen.getByTestId('alert')).toHaveClass('border-blue-500/50');
    expect(screen.getByTestId('alert')).toHaveClass('text-blue-700');
  });

  test('supports different sizes', () => {
    const { rerender } = render(
      <Alert size="sm" data-testid="alert">
        <AlertTitle>Small Alert</AlertTitle>
      </Alert>
    );
    expect(screen.getByTestId('alert')).toHaveClass('p-3');

    rerender(
      <Alert size="lg" data-testid="alert">
        <AlertTitle>Large Alert</AlertTitle>
      </Alert>
    );
    expect(screen.getByTestId('alert')).toHaveClass('p-6');
  });

  test('displays auto icons for different variants', () => {
    const { rerender } = render(
      <Alert variant="destructive" data-testid="alert">
        <AlertTitle>Error</AlertTitle>
      </Alert>
    );
    // Check if icon is present (lucide icons render as SVG)
    expect(screen.getByTestId('alert').querySelector('svg')).toBeInTheDocument();

    rerender(
      <Alert variant="success" data-testid="alert">
        <AlertTitle>Success</AlertTitle>
      </Alert>
    );
    expect(screen.getByTestId('alert').querySelector('svg')).toBeInTheDocument();

    rerender(
      <Alert variant="warning" data-testid="alert">
        <AlertTitle>Warning</AlertTitle>
      </Alert>
    );
    expect(screen.getByTestId('alert').querySelector('svg')).toBeInTheDocument();

    rerender(
      <Alert variant="info" data-testid="alert">
        <AlertTitle>Info</AlertTitle>
      </Alert>
    );
    expect(screen.getByTestId('alert').querySelector('svg')).toBeInTheDocument();
  });

  test('supports custom icon', () => {
    render(
      <Alert icon={<AlertCircle data-testid="custom-icon" />} data-testid="alert">
        <AlertTitle>Custom Icon Alert</AlertTitle>
      </Alert>
    );
    
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  test('can disable auto icon', () => {
    render(
      <Alert variant="destructive" autoIcon={false} data-testid="alert">
        <AlertTitle>No Icon Alert</AlertTitle>
      </Alert>
    );
    
    expect(screen.getByTestId('alert').querySelector('svg')).not.toBeInTheDocument();
  });

  test('supports dismissible functionality', () => {
    const handleDismiss = jest.fn();
    
    render(
      <Alert dismissible onDismiss={handleDismiss} data-testid="alert">
        <AlertTitle>Dismissible Alert</AlertTitle>
      </Alert>
    );
    
    const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
    expect(dismissButton).toBeInTheDocument();
    
    fireEvent.click(dismissButton);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  test('dismiss button has proper accessibility', () => {
    render(
      <Alert dismissible onDismiss={() => {}} data-testid="alert">
        <AlertTitle>Dismissible Alert</AlertTitle>
      </Alert>
    );
    
    const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
    expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss alert');
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Alert ref={ref} data-testid="alert">
        <AlertTitle>Ref Alert</AlertTitle>
      </Alert>
    );
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toBe(screen.getByTestId('alert'));
  });

  test('applies custom className', () => {
    render(
      <Alert className="custom-class" data-testid="alert">
        <AlertTitle>Custom Class Alert</AlertTitle>
      </Alert>
    );
    
    const alert = screen.getByTestId('alert');
    expect(alert).toHaveClass('custom-class');
  });

  test('passes through additional props', () => {
    render(
      <Alert data-custom="test-value" data-testid="alert">
        <AlertTitle>Props Alert</AlertTitle>
      </Alert>
    );
    
    const alert = screen.getByTestId('alert');
    expect(alert).toHaveAttribute('data-custom', 'test-value');
  });
});

describe('AlertTitle Component Tests', () => {
  test('renders correctly', () => {
    render(<AlertTitle data-testid="alert-title">Test Title</AlertTitle>);
    
    const title = screen.getByTestId('alert-title');
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H5');
    expect(title).toHaveClass('font-medium');
    expect(title).toHaveTextContent('Test Title');
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLParagraphElement>();
    render(<AlertTitle ref={ref} data-testid="alert-title">Test</AlertTitle>);
    
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    expect(ref.current).toBe(screen.getByTestId('alert-title'));
  });

  test('applies custom className', () => {
    render(
      <AlertTitle className="custom-title-class" data-testid="alert-title">
        Test
      </AlertTitle>
    );
    
    expect(screen.getByTestId('alert-title')).toHaveClass('custom-title-class');
  });
});

describe('AlertDescription Component Tests', () => {
  test('renders correctly', () => {
    render(
      <AlertDescription data-testid="alert-description">
        Test description
      </AlertDescription>
    );
    
    const description = screen.getByTestId('alert-description');
    expect(description).toBeInTheDocument();
    expect(description.tagName).toBe('DIV');
    expect(description).toHaveClass('text-sm');
    expect(description).toHaveTextContent('Test description');
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLParagraphElement>();
    render(
      <AlertDescription ref={ref} data-testid="alert-description">
        Test
      </AlertDescription>
    );
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toBe(screen.getByTestId('alert-description'));
  });

  test('applies custom className', () => {
    render(
      <AlertDescription className="custom-desc-class" data-testid="alert-description">
        Test
      </AlertDescription>
    );
    
    expect(screen.getByTestId('alert-description')).toHaveClass('custom-desc-class');
  });

  test('handles paragraph content correctly', () => {
    render(
      <AlertDescription data-testid="alert-description">
        <p>Paragraph content</p>
      </AlertDescription>
    );
    
    const description = screen.getByTestId('alert-description');
    expect(description).toHaveClass('[&_p]:leading-relaxed');
    expect(screen.getByText('Paragraph content')).toBeInTheDocument();
  });
});

describe('Alert Accessibility Tests', () => {
  test('has proper ARIA role', () => {
    render(
      <Alert data-testid="alert">
        <AlertTitle>Accessible Alert</AlertTitle>
      </Alert>
    );
    
    expect(screen.getByTestId('alert')).toHaveAttribute('role', 'alert');
  });

  test('dismiss button is keyboard accessible', () => {
    const handleDismiss = jest.fn();
    
    render(
      <Alert dismissible onDismiss={handleDismiss} data-testid="alert">
        <AlertTitle>Keyboard Test</AlertTitle>
      </Alert>
    );
    
    const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
    
    // Test Enter key
    dismissButton.focus();
    fireEvent.keyDown(dismissButton, { key: 'Enter', code: 'Enter' });
    
    // Button should be focusable and have proper focus styles
    expect(dismissButton).toHaveClass('focus:ring-2');
  });
});

describe('Alert Edge Cases', () => {
  test('handles empty content', () => {
    render(<Alert autoIcon={false} data-testid="alert" />);
    
    const alert = screen.getByTestId('alert');
    expect(alert).toBeInTheDocument();
    // With autoIcon disabled and no content, the flex-1 div will still be present but empty
    expect(alert.querySelector('.flex-1')).toBeEmptyDOMElement();
  });

  test('works without title or description', () => {
    render(
      <Alert data-testid="alert">
        Just some plain text content
      </Alert>
    );
    
    expect(screen.getByTestId('alert')).toHaveTextContent('Just some plain text content');
  });

  test('handles dismissible without onDismiss prop', () => {
    render(
      <Alert dismissible data-testid="alert">
        <AlertTitle>No Handler Alert</AlertTitle>
      </Alert>
    );
    
    const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
    expect(dismissButton).toBeInTheDocument();
    
    // Should not throw error when clicked
    expect(() => fireEvent.click(dismissButton)).not.toThrow();
  });
});
