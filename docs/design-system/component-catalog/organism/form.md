# Form Component

## Overview

The `Form` component provides a comprehensive form system built on React Hook Form, offering structured layouts, validation integration, accessibility features, and multiple composition patterns. It includes both granular components for full control and simplified wrappers for common use cases.

## Import

```typescript
import { 
  Form,
  FormRoot,
  FormSection,
  FormActions,
  FormGroup,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  SimpleForm,
  useFormField
} from '@/components/ui/form'
```

## Basic Usage

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const formSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
})

function BasicForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <FormRoot onSubmit={form.handleSubmit(onSubmit)} variant="card">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter username" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormActions>
          <Button type="submit">Submit</Button>
        </FormActions>
      </FormRoot>
    </Form>
  )
}
```

## API Reference

### Form (FormProvider)
React Hook Form's FormProvider - wrap your form to provide context.

### FormRoot Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'card' \| 'inline' \| 'modal' \| 'compact'` | `'default'` | Form layout variant |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Form text size |
| `loading` | `boolean` | `false` | Show loading state |
| `disabled` | `boolean` | `false` | Disable entire form |

### FormItem Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Item spacing size |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Layout orientation |

### FormDescription Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'hint' \| 'help' \| 'warning'` | `'default'` | Description style |

### FormMessage Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'error' \| 'success' \| 'warning' \| 'info'` | `'default'` | Message style |

### SimpleForm Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSubmit` | `(event: React.FormEvent) => void` | - | Form submission handler |
| `title` | `string` | `undefined` | Form title |
| `description` | `string` | `undefined` | Form description |
| `submitText` | `string` | `'Submit'` | Submit button text |
| `cancelText` | `string` | `'Cancel'` | Cancel button text |
| `onCancel` | `() => void` | `undefined` | Cancel handler |
| `loading` | `boolean` | `false` | Loading state |

## Form Variants

### Default
```tsx
<FormRoot variant="default">
  {/* Clean form without container styling */}
</FormRoot>
```

### Card
```tsx
<FormRoot variant="card">
  {/* Form with card container and padding */}
</FormRoot>
```

### Inline
```tsx
<FormRoot variant="inline">
  {/* Horizontal form layout */}
</FormRoot>
```

### Modal
```tsx
<FormRoot variant="modal">
  {/* Optimized for modal dialogs */}
</FormRoot>
```

### Compact
```tsx
<FormRoot variant="compact">
  {/* Reduced spacing for tight layouts */}
</FormRoot>
```

## Layout Orientations

### Vertical (Default)
```tsx
<FormItem orientation="vertical">
  <FormLabel>Label</FormLabel>
  <FormControl>
    <Input />
  </FormControl>
</FormItem>
```

### Horizontal
```tsx
<FormItem orientation="horizontal">
  <FormLabel>Label</FormLabel>
  <FormControl>
    <Input />
  </FormControl>
</FormItem>
```

## Form Composition

### Form Sections

```tsx
<FormRoot variant="card">
  <FormSection title="Personal Information" description="Basic details about you">
    <FormField name="firstName" render={({ field }) => (
      <FormItem>
        <FormLabel>First Name</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
      </FormItem>
    )} />
    
    <FormField name="lastName" render={({ field }) => (
      <FormItem>
        <FormLabel>Last Name</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
      </FormItem>
    )} />
  </FormSection>
  
  <FormSection title="Contact Information" description="How to reach you">
    <FormField name="email" render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input type="email" {...field} />
        </FormControl>
      </FormItem>
    )} />
  </FormSection>
</FormRoot>
```

### Form Groups

```tsx
<FormGroup legend="Address Information">
  <div className="grid grid-cols-2 gap-4">
    <FormField name="street" render={({ field }) => (
      <FormItem>
        <FormLabel>Street</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
      </FormItem>
    )} />
    
    <FormField name="city" render={({ field }) => (
      <FormItem>
        <FormLabel>City</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
      </FormItem>
    )} />
  </div>
</FormGroup>
```

### Form Actions

```tsx
<FormActions align="between">
  <Button variant="outline" type="button">
    Save Draft
  </Button>
  <div className="space-x-2">
    <Button variant="outline" type="button">
      Cancel
    </Button>
    <Button type="submit">
      Submit
    </Button>
  </div>
</FormActions>
```

## Common Use Cases

### Login Form

```tsx
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

function LoginForm() {
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  })

  return (
    <Form {...form}>
      <SimpleForm
        onSubmit={form.handleSubmit(handleLogin)}
        title="Sign In"
        description="Enter your credentials to access your account"
        submitText="Sign In"
        loading={isLoading}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="your@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </SimpleForm>
    </Form>
  )
}
```

### Multi-Step Form

```tsx
function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(0)
  const form = useForm()

  const steps = [
    { title: "Personal Info", fields: ["firstName", "lastName", "email"] },
    { title: "Address", fields: ["street", "city", "zipCode"] },
    { title: "Review", fields: [] },
  ]

  return (
    <Form {...form}>
      <FormRoot variant="card">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground">
            {steps.map((step, index) => (
              <span 
                key={index}
                className={index <= currentStep ? "text-primary" : ""}
              >
                {step.title}
              </span>
            ))}
          </div>
          <div className="mt-2 bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        {currentStep === 0 && (
          <FormSection title="Personal Information">
            <FormField name="firstName" render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {/* More fields... */}
          </FormSection>
        )}

        {/* Navigation */}
        <FormActions align="between">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          <Button 
            type="button"
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
          >
            {currentStep === steps.length - 1 ? "Submit" : "Next"}
          </Button>
        </FormActions>
      </FormRoot>
    </Form>
  )
}
```

### Dynamic Form

```tsx
function DynamicForm() {
  const { fields, append, remove } = useFieldArray({
    name: "items",
    control: form.control,
  })

  return (
    <Form {...form}>
      <FormRoot variant="card">
        <FormSection 
          title="Items" 
          description="Add multiple items to your order"
        >
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-4 items-end">
              <FormField
                name={`items.${index}.name`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                name={`items.${index}.quantity`}
                render={({ field }) => (
                  <FormItem className="w-24">
                    <FormLabel>Qty</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => remove(index)}
              >
                Remove
              </Button>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ name: "", quantity: 1 })}
          >
            Add Item
          </Button>
        </FormSection>
      </FormRoot>
    </Form>
  )
}
```

## Advanced Patterns

### Form with Auto-Save

```tsx
function AutoSaveForm() {
  const form = useForm()
  const watchedValues = useWatch({ control: form.control })

  useEffect(() => {
    const timer = setTimeout(() => {
      // Auto-save logic
      saveDraft(watchedValues)
    }, 2000)

    return () => clearTimeout(timer)
  }, [watchedValues])

  return (
    <Form {...form}>
      <FormRoot variant="card">
        <div className="flex items-center justify-between mb-4">
          <h2>Document Editor</h2>
          <span className="text-sm text-muted-foreground">
            Auto-saved 2 minutes ago
          </span>
        </div>
        {/* Form fields */}
      </FormRoot>
    </Form>
  )
}
```

### Conditional Fields

```tsx
function ConditionalForm() {
  const form = useForm()
  const accountType = useWatch({ name: "accountType", control: form.control })

  return (
    <Form {...form}>
      <FormRoot variant="card">
        <FormField
          name="accountType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Type</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {accountType === "business" && (
          <FormField
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </FormRoot>
    </Form>
  )
}
```

## Accessibility

### Features
- **ARIA Support**: Proper form field associations and error announcements
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Semantic form structure and labeling
- **Focus Management**: Logical tab order and focus indicators
- **Error Handling**: Live error announcements and clear error messaging

### Best Practices

```tsx
// Use semantic form structure
<FormRoot>
  <FormSection title="Contact Information">
    <FormField name="email" render={({ field }) => (
      <FormItem>
        <FormLabel>Email Address</FormLabel>
        <FormControl>
          <Input type="email" aria-describedby="email-hint" {...field} />
        </FormControl>
        <FormDescription id="email-hint">
          We'll never share your email with anyone else.
        </FormDescription>
        <FormMessage />
      </FormItem>
    )} />
  </FormSection>
</FormRoot>

// Provide clear error messages
<FormMessage>
  Please enter a valid email address (example: user@domain.com)
</FormMessage>

// Use fieldsets for related fields
<FormGroup legend="Billing Address">
  {/* Address fields */}
</FormGroup>
```

## Performance

### Optimizations
- **Form Provider**: Uses React Hook Form's optimized context
- **Controlled Re-renders**: Minimal re-renders with proper field isolation
- **Validation**: Efficient schema-based validation with Zod
- **Memoization**: Components use React.forwardRef for optimal performance

### Best Practices

```tsx
// Optimize large forms with useWatch for specific fields
const specificField = useWatch({ name: "specificField", control })

// Use React.memo for complex form sections
const MemoizedFormSection = React.memo(FormSection)

// Debounce validation for expensive operations
const debouncedValidation = useDebouncedCallback((value) => {
  // Expensive validation
}, 500)
```

## Styling

### CSS Variables
The component uses CSS custom properties for theming:

```css
:root {
  --destructive: 0 84.2% 60.2%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  --card: 0 0% 100%;
  --primary: 222.2 84% 4.9%;
}
```

### Custom Styling

```tsx
// Custom form styling
<FormRoot 
  variant="card" 
  className="max-w-md mx-auto shadow-lg"
>
  {/* Form content */}
</FormRoot>

// Custom field styling
<FormItem className="bg-muted/50 p-4 rounded-lg">
  <FormLabel className="text-lg font-bold">
    Important Field
  </FormLabel>
  <FormControl>
    <Input className="border-2 border-primary" />
  </FormControl>
</FormItem>
```

## Testing

### Test Examples

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form'

function TestForm() {
  const form = useForm()
  return (
    <Form {...form}>
      <FormField
        name="username"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Username</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
          </FormItem>
        )}
      />
    </Form>
  )
}

test('renders form field with label', () => {
  render(<TestForm />)
  expect(screen.getByLabelText('Username')).toBeInTheDocument()
})

test('handles form submission', async () => {
  const user = userEvent.setup()
  const handleSubmit = jest.fn()
  
  render(<FormWithSubmit onSubmit={handleSubmit} />)
  
  await user.type(screen.getByLabelText('Username'), 'testuser')
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  expect(handleSubmit).toHaveBeenCalledWith({ username: 'testuser' })
})
```

## Migration Guide

### From Legacy Forms

```tsx
// Before (legacy form)
<form className="space-y-4">
  <div>
    <label htmlFor="email">Email</label>
    <input id="email" type="email" />
    <span className="error">Error message</span>
  </div>
</form>

// After (new Form component)
<Form {...form}>
  <FormRoot variant="default">
    <FormField
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input type="email" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </FormRoot>
</Form>
```

### Breaking Changes
- Forms now require React Hook Form setup
- Field validation is handled through schema validation
- Error states are managed automatically
- Form structure uses composition pattern

### Migration Checklist
- [ ] Install and configure React Hook Form
- [ ] Set up form schema with validation library (Zod recommended)
- [ ] Replace form elements with Form components
- [ ] Update validation logic to use schema-based validation
- [ ] Implement proper form submission handling
- [ ] Update error handling to use FormMessage component

## Related Components

- [Input](../atomic/input.md) - Text input fields
- [Label](../atomic/label.md) - Form field labels
- [Button](../atomic/button.md) - Form actions
- [Card](../molecular/card.md) - Form containers
- [Alert](../atomic/alert.md) - Form-level messages
