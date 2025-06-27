import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  Toast, 
  ToastProvider, 
  ToastViewport, 
  ToastTitle, 
  ToastDescription, 
  ToastClose, 
  ToastAction 
} from '../toast';

const ToastWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    <ToastViewport />
    {children}
  </ToastProvider>
);

describe('Toast Component Tests', () => {
  test('renders with default props', () => {
    render(
      <ToastWrapper>
        <Toast open data-testid="toast">
          <ToastTitle>Test Toast</ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    
    const toast = screen.getByTestId('toast');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveClass('border');
    expect(toast).toHaveClass('bg-background');
  });

  test('supports different variants', () => {
    const { rerender } = render(
      <ToastWrapper>
        <Toast variant="destructive" open data-testid="toast">
          <ToastTitle>Error Toast</ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    
    let toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('border-destructive');
    expect(toast).toHaveClass('bg-destructive');

    rerender(
      <ToastWrapper>
        <Toast variant="success" open data-testid="toast">
          <ToastTitle>Success Toast</ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    
    toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('border-green-500');
    expect(toast).toHaveClass('bg-green-50');

    rerender(
      <ToastWrapper>
        <Toast variant="warning" open data-testid="toast">
          <ToastTitle>Warning Toast</ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    
    toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('border-yellow-500');
    expect(toast).toHaveClass('bg-yellow-50');

    rerender(
      <ToastWrapper>
        <Toast variant="info" open data-testid="toast">
          <ToastTitle>Info Toast</ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    
    toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('border-blue-500');
    expect(toast).toHaveClass('bg-blue-50');
  });

  test('supports different sizes', () => {
    const { rerender } = render(
      <ToastWrapper>
        <Toast size="sm" open data-testid="toast">
          <ToastTitle>Small Toast</ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    
    let toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('p-3');
    expect(toast).toHaveClass('text-xs');

    rerender(
      <ToastWrapper>
        <Toast size="lg" open data-testid="toast">
          <ToastTitle>Large Toast</ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    
    toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('p-6');
    expect(toast).toHaveClass('text-base');
  });

  test('shows default icons when showIcon is true', () => {
    const { rerender } = render(
      <ToastWrapper>
        <Toast variant="success" showIcon open data-testid="toast">
          <ToastTitle>Success</ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    
    expect(screen.getByText('✓')).toBeInTheDocument();

    rerender(
      <ToastWrapper>
        <Toast variant="destructive" showIcon open data-testid="toast">
          <ToastTitle>Error</ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    
    expect(screen.getByText('✕')).toBeInTheDocument();

    rerender(
      <ToastWrapper>
        <Toast variant="warning" showIcon open data-testid="toast">
          <ToastTitle>Warning</ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    
    expect(screen.getByText('⚠')).toBeInTheDocument();

    rerender(
      <ToastWrapper>
        <Toast variant="info" showIcon open data-testid="toast">
          <ToastTitle>Info</ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    
    expect(screen.getByText('ℹ')).toBeInTheDocument();
  });

  test('supports custom icon', () => {
    render(
      <ToastWrapper>
        <Toast showIcon icon={<span data-testid="custom-icon">🎉</span>} open data-testid="toast">
          <ToastTitle>Custom Icon</ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    expect(screen.getByText('🎉')).toBeInTheDocument();
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLLIElement>();
    render(
      <ToastWrapper>
        <Toast ref={ref} open data-testid="toast">
          <ToastTitle>Ref Toast</ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    expect(ref.current).toBeInstanceOf(HTMLLIElement);
  });

  test('applies custom className', () => {
    render(
      <ToastWrapper>
        <Toast className="custom-toast-class" open data-testid="toast">
          <ToastTitle>Custom Class</ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    
    const toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('custom-toast-class');
  });
});

describe('ToastTitle Component Tests', () => {
  test('renders title correctly', () => {
    render(
      <ToastWrapper>
        <Toast open>
          <ToastTitle data-testid="toast-title">Important Message</ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    
    const title = screen.getByTestId('toast-title');
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Important Message');
    expect(title).toHaveClass('text-sm');
    expect(title).toHaveClass('font-semibold');
  });

  test('applies custom className to title', () => {
    render(
      <ToastWrapper>
        <Toast open>
          <ToastTitle className="custom-title-class" data-testid="toast-title">
            Custom Title
          </ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    
    const title = screen.getByTestId('toast-title');
    expect(title).toHaveClass('custom-title-class');
  });
});

describe('ToastDescription Component Tests', () => {
  test('renders description correctly', () => {
    render(
      <ToastWrapper>
        <Toast open>
          <ToastDescription data-testid="toast-description">
            This is a detailed description of the toast message.
          </ToastDescription>
        </Toast>
      </ToastWrapper>
    );
    
    const description = screen.getByTestId('toast-description');
    expect(description).toBeInTheDocument();
    expect(description).toHaveTextContent('This is a detailed description of the toast message.');
    expect(description).toHaveClass('text-sm');
    expect(description).toHaveClass('opacity-90');
  });

  test('applies custom className to description', () => {
    render(
      <ToastWrapper>
        <Toast open>
          <ToastDescription className="custom-description-class" data-testid="toast-description">
            Custom Description
          </ToastDescription>
        </Toast>
      </ToastWrapper>
    );
    
    const description = screen.getByTestId('toast-description');
    expect(description).toHaveClass('custom-description-class');
  });
});

describe('ToastClose Component Tests', () => {
  test('renders close button correctly', () => {
    render(
      <ToastWrapper>
        <Toast open>
          <ToastTitle>Test Toast</ToastTitle>
          <ToastClose data-testid="toast-close" />
        </Toast>
      </ToastWrapper>
    );
    
    const closeButton = screen.getByTestId('toast-close');
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveClass('absolute');
    expect(closeButton).toHaveClass('right-2');
    expect(closeButton).toHaveClass('top-2');
  });

  test('close button is clickable', () => {
    const handleClose = jest.fn();
    render(
      <ToastWrapper>
        <Toast open onOpenChange={handleClose}>
          <ToastTitle>Test Toast</ToastTitle>
          <ToastClose data-testid="toast-close" />
        </Toast>
      </ToastWrapper>
    );
    
    const closeButton = screen.getByTestId('toast-close');
    fireEvent.click(closeButton);
    
    expect(handleClose).toHaveBeenCalledWith(false);
  });

  test('applies custom className to close button', () => {
    render(
      <ToastWrapper>
        <Toast open>
          <ToastTitle>Test Toast</ToastTitle>
          <ToastClose className="custom-close-class" data-testid="toast-close" />
        </Toast>
      </ToastWrapper>
    );
    
    const closeButton = screen.getByTestId('toast-close');
    expect(closeButton).toHaveClass('custom-close-class');
  });
});

describe('ToastAction Component Tests', () => {
  test('renders action button correctly', () => {
    render(
      <ToastWrapper>
        <Toast open>
          <ToastTitle>Test Toast</ToastTitle>
          <ToastAction altText="Retry action" data-testid="toast-action">
            Retry
          </ToastAction>
        </Toast>
      </ToastWrapper>
    );
    
    const actionButton = screen.getByTestId('toast-action');
    expect(actionButton).toBeInTheDocument();
    expect(actionButton).toHaveTextContent('Retry');
    expect(actionButton).toHaveClass('inline-flex');
    expect(actionButton).toHaveClass('h-8');
  });

  test('action button is clickable', () => {
    const handleAction = jest.fn();
    render(
      <ToastWrapper>
        <Toast open>
          <ToastTitle>Test Toast</ToastTitle>
          <ToastAction 
            altText="Retry action" 
            onClick={handleAction}
            data-testid="toast-action"
          >
            Retry
          </ToastAction>
        </Toast>
      </ToastWrapper>
    );
    
    const actionButton = screen.getByTestId('toast-action');
    fireEvent.click(actionButton);
    
    expect(handleAction).toHaveBeenCalled();
  });

  test('applies custom className to action button', () => {
    render(
      <ToastWrapper>
        <Toast open>
          <ToastTitle>Test Toast</ToastTitle>
          <ToastAction 
            className="custom-action-class" 
            altText="Custom action"
            data-testid="toast-action"
          >
            Action
          </ToastAction>
        </Toast>
      </ToastWrapper>
    );
    
    const actionButton = screen.getByTestId('toast-action');
    expect(actionButton).toHaveClass('custom-action-class');
  });
});

describe('ToastViewport Component Tests', () => {
  test('renders viewport correctly', () => {
    render(
      <ToastProvider>
        <ToastViewport data-testid="toast-viewport" />
      </ToastProvider>
    );
    
    const viewport = screen.getByTestId('toast-viewport');
    expect(viewport).toBeInTheDocument();
    expect(viewport).toHaveClass('fixed');
    expect(viewport).toHaveClass('top-0');
    expect(viewport).toHaveClass('z-[100]');
  });

  test('applies custom className to viewport', () => {
    render(
      <ToastProvider>
        <ToastViewport className="custom-viewport-class" data-testid="toast-viewport" />
      </ToastProvider>
    );
    
    const viewport = screen.getByTestId('toast-viewport');
    expect(viewport).toHaveClass('custom-viewport-class');
  });
});

describe('Toast Accessibility Tests', () => {
  test('has proper aria attributes', () => {
    render(
      <ToastWrapper>
        <Toast open role="status" aria-live="polite" data-testid="toast">
          <ToastTitle>Accessible Toast</ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    
    const toast = screen.getByTestId('toast');
    expect(toast).toHaveAttribute('role', 'status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  test('close button has proper accessibility', () => {
    render(
      <ToastWrapper>
        <Toast open>
          <ToastTitle>Test Toast</ToastTitle>
          <ToastClose aria-label="Close notification" data-testid="toast-close" />
        </Toast>
      </ToastWrapper>
    );
    
    const closeButton = screen.getByTestId('toast-close');
    expect(closeButton).toHaveAttribute('aria-label', 'Close notification');
  });

  test('action button has proper accessibility', () => {
    render(
      <ToastWrapper>
        <Toast open>
          <ToastTitle>Test Toast</ToastTitle>
          <ToastAction altText="Retry the action" data-testid="toast-action">
            Retry
          </ToastAction>
        </Toast>
      </ToastWrapper>
    );
    
    const actionButton = screen.getByTestId('toast-action');
    expect(actionButton).toBeInTheDocument();
  });
});

describe('Complex Toast Scenarios', () => {
  test('renders complete toast with all components', () => {
    render(
      <ToastWrapper>
        <Toast variant="success" size="lg" showIcon open data-testid="toast">
          <ToastTitle>Operation Successful</ToastTitle>
          <ToastDescription>
            Your changes have been saved successfully.
          </ToastDescription>
          <ToastAction altText="View details">
            View
          </ToastAction>
          <ToastClose />
        </Toast>
      </ToastWrapper>
    );
    
    expect(screen.getByText('Operation Successful')).toBeInTheDocument();
    expect(screen.getByText('Your changes have been saved successfully.')).toBeInTheDocument();
    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument(); // Success icon
  });

  test('combines variant and size correctly', () => {
    render(
      <ToastWrapper>
        <Toast variant="warning" size="sm" open data-testid="toast">
          <ToastTitle>Small Warning</ToastTitle>
        </Toast>
      </ToastWrapper>
    );
    
    const toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('border-yellow-500');
    expect(toast).toHaveClass('p-3');
    expect(toast).toHaveClass('text-xs');
  });
});
