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
  useFormField
} from '../form';
import { Input } from '../input';
import { Button } from '../button';

// Test form component for testing
const TestForm = ({ onSubmit = jest.fn(), defaultValues = { email: '', password: '' } }) => {
  const form = useForm({ defaultValues });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} data-testid="test-form">
        <FormField
          control={form.control}
          name="email"
          rules={{ required: "Email is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Enter email" {...field} data-testid="email-input" />
              </FormControl>
              <FormDescription>
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
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter password" {...field} data-testid="password-input" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" data-testid="submit-button">Submit</Button>
      </form>
    </Form>
  );
};

// Component to test useFormField hook
const FormFieldTestComponent = () => {
  const fieldState = useFormField();
  return (
    <div data-testid="form-field-state">
      <span data-testid="field-name">{fieldState.name}</span>
      <span data-testid="field-id">{fieldState.id}</span>
      <span data-testid="form-item-id">{fieldState.formItemId}</span>
      <span data-testid="form-description-id">{fieldState.formDescriptionId}</span>
      <span data-testid="form-message-id">{fieldState.formMessageId}</span>
      <span data-testid="field-error">{fieldState.error ? 'true' : 'false'}</span>
    </div>
  );
};

describe('Form Component Tests', () => {
  test('renders complete form with all elements', () => {
    render(<TestForm />);
    
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
    expect(screen.getByText("We'll never share your email.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  test('handles form validation correctly', async () => {
    const handleSubmit = jest.fn();
    render(<TestForm onSubmit={handleSubmit} />);
    
    const submitButton = screen.getByTestId('submit-button');
    
    // Submit empty form
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
    
    // Form should not be submitted
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  test('validates password length', async () => {
    render(<TestForm />);
    
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');
    
    // Fill in valid email but short password
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  test('submits form with valid data', async () => {
    const handleSubmit = jest.fn();
    render(<TestForm onSubmit={handleSubmit} />);
    
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');
    
    // Fill in valid data
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      }, expect.any(Object));
    });
  });

  test('supports default values', () => {
    render(<TestForm defaultValues={{ email: 'default@example.com', password: '' }} />);
    
    const emailInput = screen.getByTestId('email-input');
    expect(emailInput).toHaveValue('default@example.com');
  });
});

describe('FormField Component Tests', () => {
  test('renders FormField with all child components', () => {
    render(<TestForm />);
    
    // Check that all form components are rendered
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByText("We'll never share your email.")).toBeInTheDocument();
  });

  test('displays error messages correctly', async () => {
    render(<TestForm />);
    
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      const errorMessages = screen.getAllByText(/required/);
      expect(errorMessages).toHaveLength(2);
    });
  });
});

describe('FormItem Component Tests', () => {
  test('provides unique IDs for form elements', () => {
    const TestFormItem = () => {
      const form = useForm();
      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="test"
            render={() => (
              <FormItem>
                <FormFieldTestComponent />
              </FormItem>
            )}
          />
        </Form>
      );
    };

    render(<TestFormItem />);
    
    const fieldName = screen.getByTestId('field-name');
    const fieldId = screen.getByTestId('field-id');
    const formItemId = screen.getByTestId('form-item-id');
    
    expect(fieldName).toHaveTextContent('test');
    // React 18+ uses different ID patterns, just check it starts with :r and ends with :
    expect(fieldId.textContent).toMatch(/^:r/);
    expect(fieldId.textContent).toMatch(/:$/);
    expect(formItemId.textContent).toMatch(/:r.*-form-item$/);
  });

  test('applies custom className', () => {
    const TestFormItemCustomClass = () => {
      const form = useForm();
      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="test"
            render={() => (
              <FormItem className="custom-form-item" data-testid="form-item">
                <div>Test content</div>
              </FormItem>
            )}
          />
        </Form>
      );
    };

    render(<TestFormItemCustomClass />);
    
    expect(screen.getByTestId('form-item')).toHaveClass('custom-form-item');
    expect(screen.getByTestId('form-item')).toHaveClass('space-y-2');
  });
});

describe('FormLabel Component Tests', () => {
  test('renders label correctly', () => {
    render(<TestForm />);
    
    const emailLabel = screen.getByText('Email');
    expect(emailLabel.tagName).toBe('LABEL');
  });

  test('applies error styling when field has error', async () => {
    render(<TestForm />);
    
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      const emailLabel = screen.getByText('Email');
      expect(emailLabel).toHaveClass('text-destructive');
    });
  });
});

describe('FormControl Component Tests', () => {
  test('provides correct accessibility attributes', () => {
    render(<TestForm />);
    
    const emailInput = screen.getByTestId('email-input');
    
    // Check aria attributes
    expect(emailInput).toHaveAttribute('aria-describedby');
    expect(emailInput).toHaveAttribute('id');
  });

  test('updates aria-invalid when field has error', async () => {
    render(<TestForm />);
    
    const emailInput = screen.getByTestId('email-input');
    const submitButton = screen.getByTestId('submit-button');
    
    // Initially should not be invalid
    expect(emailInput).toHaveAttribute('aria-invalid', 'false');
    
    // Submit to trigger validation
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });
  });
});

describe('FormDescription Component Tests', () => {
  test('renders description text', () => {
    render(<TestForm />);
    
    const description = screen.getByText("We'll never share your email.");
    expect(description.tagName).toBe('P');
    expect(description).toHaveClass('text-sm');
    expect(description).toHaveClass('text-muted-foreground');
  });

  test('has correct ID for accessibility', () => {
    render(<TestForm />);
    
    const description = screen.getByText("We'll never share your email.");
    expect(description).toHaveAttribute('id');
    expect(description.id).toMatch(/-form-item-description$/);
  });
});

describe('FormMessage Component Tests', () => {
  test('displays error messages', async () => {
    render(<TestForm />);
    
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      const errorMessage = screen.getByText('Email is required');
      expect(errorMessage.tagName).toBe('P');
      expect(errorMessage).toHaveClass('text-destructive');
    });
  });

  test('has correct ID for accessibility', async () => {
    render(<TestForm />);
    
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      const errorMessage = screen.getByText('Email is required');
      expect(errorMessage).toHaveAttribute('id');
      expect(errorMessage.id).toMatch(/-form-item-message$/);
    });
  });

  test('does not render when no error', () => {
    render(<TestForm defaultValues={{ email: 'test@example.com', password: 'password123' }} />);
    
    // Error messages should not be present
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
    expect(screen.queryByText('Password is required')).not.toBeInTheDocument();
  });
});

describe('useFormField Hook Tests', () => {
  test('throws error when used outside FormField', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    const TestComponent = () => {
      useFormField();
      return <div>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow();
    
    console.error = originalError;
  });

  test('provides correct field state', () => {
    const TestFormField = () => {
      const form = useForm();
      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="testField"
            render={() => (
              <FormItem>
                <FormFieldTestComponent />
              </FormItem>
            )}
          />
        </Form>
      );
    };

    render(<TestFormField />);
    
    expect(screen.getByTestId('field-name')).toHaveTextContent('testField');
    expect(screen.getByTestId('field-error')).toHaveTextContent('false');
  });
});

describe('Form Accessibility Tests', () => {
  test('form has proper ARIA relationships', () => {
    render(<TestForm />);
    
    const emailInput = screen.getByTestId('email-input');
    const emailLabel = screen.getByText('Email');
    const description = screen.getByText("We'll never share your email.");
    
    // Label should be associated with input
    expect(emailInput.id).toBeTruthy();
    expect(emailLabel).toHaveAttribute('for', emailInput.id);
    
    // Input should be described by description
    const describedBy = emailInput.getAttribute('aria-describedby');
    expect(describedBy).toContain(description.id);
  });

  test('error messages are properly announced', async () => {
    render(<TestForm />);
    
    const emailInput = screen.getByTestId('email-input');
    const submitButton = screen.getByTestId('submit-button');
    
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      const errorMessage = screen.getByText('Email is required');
      const describedBy = emailInput.getAttribute('aria-describedby');
      expect(describedBy).toContain(errorMessage.id);
    });
  });
});

describe('Form Edge Cases', () => {
  test('handles rapid form submissions', async () => {
    const handleSubmit = jest.fn();
    render(<TestForm onSubmit={handleSubmit} />);
    
    const submitButton = screen.getByTestId('submit-button');
    
    // Rapid clicks
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    
    // Should only trigger validation, not actual submission
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
    
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  test('handles dynamic field validation', async () => {
    const DynamicForm = () => {
      const form = useForm();
      const [showPassword, setShowPassword] = React.useState(false);
      
      return (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(() => {})}>
            <FormField
              control={form.control}
              name="email"
              rules={{ required: "Email is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="email-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              data-testid="toggle-password"
            >
              Toggle Password
            </Button>
            
            {showPassword && (
              <FormField
                control={form.control}
                name="password"
                rules={{ required: "Password is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="password-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <Button type="submit" data-testid="submit-button">Submit</Button>
          </form>
        </Form>
      );
    };

    render(<DynamicForm />);
    
    // Initially no password field
    expect(screen.queryByTestId('password-input')).not.toBeInTheDocument();
    
    // Show password field
    fireEvent.click(screen.getByTestId('toggle-password'));
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    
    // Validate both fields
    fireEvent.click(screen.getByTestId('submit-button'));
    
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });
});
