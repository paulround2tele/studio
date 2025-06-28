import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import '@testing-library/jest-dom';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormRoot,
  FormSection,
  FormActions,
  FormGroup,
  SimpleForm,
  useFormField
} from '../form';
import { Input } from '../input';
import { Button } from '../button';

// Enhanced test form component with variants
const EnhancedTestForm = ({ 
  variant = "default",
  size = "default", 
  onSubmit = jest.fn(), 
  defaultValues = {} as any,
  loading = false,
  disabled = false
}: {
  variant?: "default" | "card" | "inline" | "modal" | "compact";
  size?: "sm" | "default" | "lg"; 
  onSubmit?: jest.Mock;
  defaultValues?: any;
  loading?: boolean;
  disabled?: boolean;
}) => {
  const form = useForm({ defaultValues });

  return (
    <Form {...form}>
      <FormRoot 
        variant={variant} 
        size={size} 
        loading={loading}
        disabled={disabled}
        onSubmit={form.handleSubmit(onSubmit)} 
        data-testid="enhanced-form"
      >
        <FormSection title="Account Information" description="Enter your account details">
          <FormField
            control={form.control}
            name="email"
            rules={{ required: "Email is required" }}
            render={({ field }) => (
              <FormItem size={size}>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input placeholder="Enter email" {...field} data-testid="email-input" />
                </FormControl>
                <FormDescription variant="hint">
                  We'll never share your email.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            rules={{ 
              required: "Password is required",
              minLength: { value: 6, message: "Password must be at least 6 characters" }
            }}
            render={({ field }) => (
              <FormItem size={size}>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Enter password" {...field} data-testid="password-input" />
                </FormControl>
                <FormMessage variant="error" />
              </FormItem>
            )}
          />
        </FormSection>

        <FormGroup legend="Preferences">
          <FormField
            control={form.control}
            name="notifications"
            render={({ field }) => (
              <FormItem orientation="horizontal">
                <FormLabel>Enable Notifications</FormLabel>
                <FormControl>
                  <Input type="checkbox" {...field} data-testid="notifications-input" />
                </FormControl>
                <FormDescription variant="help">
                  Receive email notifications about important updates.
                </FormDescription>
              </FormItem>
            )}
          />
        </FormGroup>
        
        <FormActions align="right">
          <Button type="button" variant="outline" data-testid="cancel-button">
            Cancel
          </Button>
          <Button type="submit" data-testid="submit-button">
            {loading ? "Loading..." : "Submit"}
          </Button>
        </FormActions>
      </FormRoot>
    </Form>
  );
};

// Test component for SimpleForm
const SimpleFormTest = ({ 
  onSubmit = jest.fn(), 
  onCancel = jest.fn(),
  loading = false 
}) => {
  const form = useForm();

  return (
    <Form {...form}>
      <SimpleForm
        title="Contact Form"
        description="Send us a message"
        submitText="Send Message"
        cancelText="Cancel"
        onSubmit={form.handleSubmit(onSubmit)}
        onCancel={onCancel}
        loading={loading}
        data-testid="simple-form"
      >
        <FormField
          control={form.control}
          name="message"
          rules={{ required: "Message is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Input placeholder="Enter message" {...field} data-testid="message-input" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </SimpleForm>
    </Form>
  );
};

describe('Enhanced Form Component Tests', () => {
  describe('FormRoot Variants', () => {
    test('renders default variant correctly', () => {
      render(<EnhancedTestForm variant="default" />);
      
      const form = screen.getByTestId('enhanced-form');
      expect(form).toHaveClass('space-y-6');
      expect(form).not.toHaveClass('p-6', 'border', 'rounded-lg');
    });

    test('renders card variant correctly', () => {
      render(<EnhancedTestForm variant="card" />);
      
      const form = screen.getByTestId('enhanced-form');
      expect(form).toHaveClass('space-y-6', 'p-6', 'border', 'rounded-lg', 'bg-card');
    });

    test('renders inline variant correctly', () => {
      render(<EnhancedTestForm variant="inline" />);
      
      const form = screen.getByTestId('enhanced-form');
      expect(form).toHaveClass('space-y-0', 'space-x-4', 'flex', 'flex-wrap', 'items-end');
    });

    test('renders modal variant correctly', () => {
      render(<EnhancedTestForm variant="modal" />);
      
      const form = screen.getByTestId('enhanced-form');
      expect(form).toHaveClass('space-y-4', 'max-h-[70vh]', 'overflow-y-auto');
    });

    test('renders compact variant correctly', () => {
      render(<EnhancedTestForm variant="compact" />);
      
      const form = screen.getByTestId('enhanced-form');
      expect(form).toHaveClass('space-y-3');
    });
  });

  describe('FormRoot Sizes', () => {
    test('renders small size correctly', () => {
      render(<EnhancedTestForm size="sm" />);
      
      const form = screen.getByTestId('enhanced-form');
      expect(form).toHaveClass('text-sm');
    });

    test('renders default size correctly', () => {
      render(<EnhancedTestForm size="default" />);
      
      const form = screen.getByTestId('enhanced-form');
      expect(form).not.toHaveClass('text-sm', 'text-lg');
    });

    test('renders large size correctly', () => {
      render(<EnhancedTestForm size="lg" />);
      
      const form = screen.getByTestId('enhanced-form');
      expect(form).toHaveClass('text-lg');
    });
  });

  describe('FormRoot States', () => {
    test('handles loading state correctly', () => {
      render(<EnhancedTestForm loading={true} />);
      
      const form = screen.getByTestId('enhanced-form');
      expect(form).toHaveClass('pointer-events-none', 'opacity-60');
      expect(form).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('handles disabled state correctly', () => {
      render(<EnhancedTestForm disabled={true} />);
      
      const form = screen.getByTestId('enhanced-form');
      expect(form).toHaveClass('pointer-events-none', 'opacity-50');
      expect(form).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('FormSection Component', () => {
    test('renders section with title and description', () => {
      render(<EnhancedTestForm />);
      
      expect(screen.getByText('Account Information')).toBeInTheDocument();
      expect(screen.getByText('Enter your account details')).toBeInTheDocument();
    });

    test('section has proper ARIA attributes', () => {
      render(<EnhancedTestForm />);
      
      const section = screen.getByRole('group', { name: 'Account Information' });
      expect(section).toBeInTheDocument();
      expect(section).toHaveAttribute('aria-labelledby');
    });
  });

  describe('FormGroup Component', () => {
    test('renders fieldset with legend', () => {
      render(<EnhancedTestForm />);
      
      const fieldset = screen.getByRole('group', { name: 'Preferences' });
      expect(fieldset).toBeInTheDocument();
      expect(fieldset).toHaveClass('space-y-4', 'border', 'rounded-lg', 'p-4');
    });
  });

  describe('FormActions Component', () => {
    test('renders actions with proper alignment', () => {
      render(<EnhancedTestForm />);
      
      const cancelButton = screen.getByTestId('cancel-button');
      const submitButton = screen.getByTestId('submit-button');
      const actionsContainer = cancelButton.parentElement;
      
      expect(actionsContainer).toHaveClass('flex', 'gap-2', 'pt-4', 'border-t', 'justify-end');
      expect(cancelButton).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();
    });

    test('supports different alignment options', () => {
      const AlignmentTest = ({ align }: { align: "left" | "center" | "right" | "between" }) => (
        <FormActions align={align} data-testid="actions">
          <Button>Test</Button>
        </FormActions>
      );

      const alignmentClasses = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
        between: 'justify-between'
      };

      Object.entries(alignmentClasses).forEach(([align, className]) => {
        const { unmount } = render(<AlignmentTest align={align as any} />);
        expect(screen.getByTestId('actions')).toHaveClass(className);
        unmount();
      });
    });
  });

  describe('FormItem Variants', () => {
    test('handles different sizes', () => {
      const SizeTest = ({ size }: { size: "sm" | "default" | "lg" }) => (
        <FormItem size={size} data-testid="form-item">
          <div>Test content</div>
        </FormItem>
      );

      const sizeClasses = {
        sm: 'space-y-1',
        default: 'space-y-2',
        lg: 'space-y-3'
      };

      Object.entries(sizeClasses).forEach(([size, className]) => {
        const { unmount } = render(<SizeTest size={size as any} />);
        expect(screen.getByTestId('form-item')).toHaveClass(className);
        unmount();
      });
    });

    test('handles horizontal orientation', () => {
      render(
        <FormItem orientation="horizontal" data-testid="form-item">
          <div>Test content</div>
        </FormItem>
      );
      
      expect(screen.getByTestId('form-item')).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-3', 'gap-4', 'items-start');
    });
  });

  describe('FormDescription Variants', () => {
    test('renders different description variants', () => {
      const variants = ['default', 'hint', 'help', 'warning'] as const;
      
      variants.forEach(variant => {
        const { unmount } = render(
          <FormDescription variant={variant} data-testid={`desc-${variant}`}>
            Test description
          </FormDescription>
        );
        
        const element = screen.getByTestId(`desc-${variant}`);
        expect(element).toBeInTheDocument();
        expect(element).toHaveClass('text-sm');
        unmount();
      });
    });
  });

  describe('FormMessage Variants', () => {
    test('renders different message variants', () => {
      const variants = ['default', 'error', 'success', 'warning', 'info'] as const;
      
      variants.forEach(variant => {
        const { unmount } = render(
          <FormMessage variant={variant} data-testid={`msg-${variant}`}>
            Test message
          </FormMessage>
        );
        
        const element = screen.getByTestId(`msg-${variant}`);
        expect(element).toBeInTheDocument();
        expect(element).toHaveClass('text-sm', 'font-medium');
        unmount();
      });
    });

    test('error messages have proper ARIA attributes', () => {
      const TestWithError = () => {
        const form = useForm();
        const [hasError, setHasError] = React.useState(false);
        
        React.useEffect(() => {
          form.setError('test', { message: 'Test error' });
          setHasError(true);
        }, [form]);

        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              render={() => (
                <FormItem>
                  <FormLabel>Test</FormLabel>
                  <FormControl>
                    <Input data-testid="test-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestWithError />);
      
      const errorMessage = screen.getByText('Test error');
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('SimpleForm Component', () => {
    test('renders complete simple form', () => {
      render(<SimpleFormTest />);
      
      expect(screen.getByText('Contact Form')).toBeInTheDocument();
      expect(screen.getByText('Send us a message')).toBeInTheDocument();
      expect(screen.getByTestId('message-input')).toBeInTheDocument();
      expect(screen.getByText('Send Message')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('handles form submission', async () => {
      const handleSubmit = jest.fn();
      render(<SimpleFormTest onSubmit={handleSubmit} />);
      
      const messageInput = screen.getByTestId('message-input');
      const submitButton = screen.getByText('Send Message');
      
      fireEvent.change(messageInput, { target: { value: 'Test message' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Test message' }),
          expect.any(Object)
        );
      });
    });

    test('handles cancel action', () => {
      const handleCancel = jest.fn();
      render(<SimpleFormTest onCancel={handleCancel} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(handleCancel).toHaveBeenCalled();
    });

    test('shows loading state', () => {
      render(<SimpleFormTest loading={true} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeDisabled();
      expect(screen.getByText('Cancel')).toBeDisabled();
    });

    test('validates required fields', async () => {
      render(<SimpleFormTest />);
      
      const submitButton = screen.getByText('Send Message');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Message is required')).toBeInTheDocument();
      });
    });
  });
});

describe('Form Integration Tests', () => {
  test('complex form workflow with multiple sections', async () => {
    const handleSubmit = jest.fn();
    render(<EnhancedTestForm onSubmit={handleSubmit} />);
    
    // Fill in all required fields
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'password123'
        }),
        expect.any(Object)
      );
    });
  });

  test('form accessibility features', () => {
    render(<EnhancedTestForm />);
    
    // Check ARIA relationships
    const emailInput = screen.getByTestId('email-input');
    const emailDescription = screen.getByText("We'll never share your email.");
    
    expect(emailInput).toHaveAttribute('aria-describedby');
    expect(emailInput.getAttribute('aria-describedby')).toContain(emailDescription.id);
  });

  test('form error handling and announcements', async () => {
    render(<EnhancedTestForm />);
    
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      const errorMessage = screen.getByText('Email is required');
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });
  });

  test('keyboard navigation', () => {
    render(<EnhancedTestForm />);
    
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');
    
    // Tab navigation
    emailInput.focus();
    expect(document.activeElement).toBe(emailInput);
    
    fireEvent.keyDown(emailInput, { key: 'Tab' });
    // Would need more setup for full keyboard navigation testing
  });
});

describe('Form Performance Tests', () => {
  test('form renders efficiently with many fields', () => {
    const start = performance.now();
    
    const LargeForm = () => {
      const form = useForm();
      return (
        <Form {...form}>
          <FormRoot>
            {Array.from({ length: 20 }, (_, i) => (
              <FormField
                key={i}
                control={form.control}
                name={`field_${i}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field {i}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </FormRoot>
        </Form>
      );
    };
    
    render(<LargeForm />);
    
    const end = performance.now();
    expect(end - start).toBeLessThan(100); // Should render quickly
  });

  test('form updates efficiently', async () => {
    const handleSubmit = jest.fn();
    render(<EnhancedTestForm onSubmit={handleSubmit} />);
    
    const emailInput = screen.getByTestId('email-input');
    
    // Rapid updates
    for (let i = 0; i < 10; i++) {
      fireEvent.change(emailInput, { target: { value: `test${i}@example.com` } });
    }
    
    expect(emailInput).toHaveValue('test9@example.com');
  });
});
