# Label Component

## Overview

The `Label` component is a form label built on top of Radix UI's Label primitive, providing semantic form labeling with enhanced accessibility features, visual variants, and required field indicators.

## Import

```typescript
import { Label } from '@/components/ui/label'
```

## Basic Usage

```tsx
// Simple label
<Label htmlFor="email">Email Address</Label>

// Required field indicator
<Label htmlFor="password" required>Password</Label>

// Error state
<Label htmlFor="username" error>Username</Label>

// With input
<div className="space-y-2">
  <Label htmlFor="email">Email Address</Label>
  <Input id="email" type="email" />
</div>
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'destructive' \| 'muted' \| 'accent'` | `'default'` | Visual style variant |
| `size` | `'default' \| 'sm' \| 'lg'` | `'default'` | Text size of the label |
| `weight` | `'default' \| 'normal' \| 'semibold' \| 'bold'` | `'default'` | Font weight |
| `required` | `boolean` | `false` | Shows required indicator (*) |
| `error` | `boolean` | `false` | Applies error styling |
| `htmlFor` | `string` | `undefined` | Associates label with form control |
| `className` | `string` | `undefined` | Additional CSS classes |

### Extends

All standard HTML label props via Radix UI Label primitive:
- `onClick`
- `onMouseDown`
- `onMouseUp`
- `children`

## Variants

### Default
```tsx
<Label>Default Label</Label>
```

### Destructive (Error State)
```tsx
<Label variant="destructive">Error Label</Label>
// Or automatically applied with error prop
<Label error>Error Label</Label>
```

### Muted
```tsx
<Label variant="muted">Muted Label</Label>
```

### Accent
```tsx
<Label variant="accent">Accent Label</Label>
```

## Sizes

### Small
```tsx
<Label size="sm">Small Label</Label>
```

### Default
```tsx
<Label size="default">Default Label</Label>
```

### Large
```tsx
<Label size="lg">Large Label</Label>
```

## Font Weights

### Normal
```tsx
<Label weight="normal">Normal Weight</Label>
```

### Default (Medium)
```tsx
<Label weight="default">Medium Weight</Label>
```

### Semibold
```tsx
<Label weight="semibold">Semibold Label</Label>
```

### Bold
```tsx
<Label weight="bold">Bold Label</Label>
```

## Form Integration

### Basic Form Fields

```tsx
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

function FormField() {
  return (
    <div className="space-y-2">
      <Label htmlFor="username" required>Username</Label>
      <Input 
        id="username" 
        placeholder="Enter username"
        required
      />
    </div>
  )
}
```

### With React Hook Form

```tsx
import { useForm } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

function ContactForm() {
  const { register, handleSubmit, formState: { errors } } = useForm()

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label 
          htmlFor="email" 
          required
          error={!!errors.email}
        >
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          error={!!errors.email}
          {...register('email', { required: 'Email is required' })}
        />
      </div>
    </form>
  )
}
```

### Fieldset Groups

```tsx
function FormFieldset() {
  return (
    <fieldset className="space-y-4">
      <legend>
        <Label size="lg" weight="semibold">Personal Information</Label>
      </legend>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" required>First Name</Label>
          <Input id="firstName" />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lastName" required>Last Name</Label>
          <Input id="lastName" />
        </div>
      </div>
    </fieldset>
  )
}
```

## Accessibility

### Features
- **Semantic Association**: Proper `htmlFor` and form control association
- **Required Indicators**: Clear visual and screen reader indicators
- **Error States**: Accessible error state communication
- **Focus Management**: Works with form control focus patterns
- **Screen Reader Support**: Proper labeling for assistive technology

### Best Practices

```tsx
// Always associate labels with form controls
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />

// Use required indicators
<Label htmlFor="password" required>Password</Label>
<Input id="password" type="password" required />

// Provide clear error states
<Label htmlFor="username" error={hasError}>Username</Label>
<Input id="username" error={hasError} />

// Use descriptive label text
<Label htmlFor="phone">Phone Number (with country code)</Label>
<Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
```

### ARIA Support

```tsx
// The component automatically provides proper ARIA attributes
<Label htmlFor="description">Description</Label>
<textarea 
  id="description" 
  aria-describedby="description-hint"
/>
<p id="description-hint">Optional field for additional details</p>
```

## Performance

### Optimizations
- **Radix UI Foundation**: Built on optimized primitive with minimal overhead
- **Memoized Variants**: CVA variants are computed once and cached
- **Efficient Updates**: Uses `React.forwardRef` for optimal rendering
- **Minimal DOM**: Clean HTML structure without unnecessary elements

### Best Practices

```tsx
// Memoize for complex forms with many fields
const MemoizedLabel = React.memo(Label)

// Use stable references for event handlers
const handleClick = useCallback(() => {
  // Handle label click
}, [])

return <Label onClick={handleClick}>Clickable Label</Label>
```

## Styling

### CSS Variables
The component uses CSS custom properties for theming:

```css
:root {
  --foreground: 222.2 84% 4.9%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --destructive: 0 84.2% 60.2%;
  --accent-foreground: 210 40% 8%;
}
```

### Custom Styling

```tsx
// Custom className
<Label 
  className="text-blue-600 font-bold tracking-wide" 
  htmlFor="special"
>
  Special Label
</Label>

// Conditional styling
<Label 
  className={cn(
    "transition-colors",
    isActive && "text-primary",
    hasError && "text-destructive"
  )}
  htmlFor="conditional"
>
  Conditional Label
</Label>
```

## Common Patterns

### Floating Labels

```tsx
function FloatingLabel({ htmlFor, children }: { htmlFor: string, children: React.ReactNode }) {
  const [focused, setFocused] = useState(false)
  const [hasValue, setHasValue] = useState(false)

  return (
    <div className="relative">
      <Input
        id={htmlFor}
        className="peer pt-6 pb-2"
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false)
          setHasValue(e.target.value.length > 0)
        }}
        onChange={(e) => setHasValue(e.target.value.length > 0)}
      />
      <Label
        htmlFor={htmlFor}
        className={cn(
          "absolute left-3 transition-all duration-200 pointer-events-none",
          focused || hasValue
            ? "top-1 text-xs text-primary"
            : "top-1/2 -translate-y-1/2 text-muted-foreground"
        )}
      >
        {children}
      </Label>
    </div>
  )
}
```

### Inline Labels

```tsx
function InlineCheckbox() {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label 
        htmlFor="terms"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Accept terms and conditions
      </Label>
    </div>
  )
}
```

### Label Groups

```tsx
function LabelGroup() {
  return (
    <div className="space-y-6">
      <div>
        <Label size="lg" weight="bold" className="text-foreground">
          Account Settings
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account preferences
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" required>Email Address</Label>
          <Input id="email" type="email" />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="notifications">Notification Preferences</Label>
          <Select>
            {/* Select options */}
          </Select>
        </div>
      </div>
    </div>
  )
}
```

## Migration Guide

### From Legacy Labels

```tsx
// Before (legacy label)
<label className="form-label required">
  Username *
</label>

// After (new Label component)
<Label htmlFor="username" required>Username</Label>
```

### Breaking Changes
- Required indicator is now handled via `required` prop instead of manual asterisk
- Error styling is handled via `error` prop instead of CSS classes
- Font weight options are standardized via `weight` prop

### Migration Checklist
- [ ] Replace `<label className="form-label">` with `<Label>` component
- [ ] Remove manual asterisk (*) and use `required` prop
- [ ] Replace error CSS classes with `error` prop
- [ ] Update font weight classes to use `weight` prop
- [ ] Ensure proper `htmlFor` associations

## Testing

### Test Examples

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Label } from '@/components/ui/label'

test('renders label with text', () => {
  render(<Label>Test Label</Label>)
  expect(screen.getByText('Test Label')).toBeInTheDocument()
})

test('shows required indicator', () => {
  render(<Label required>Required Field</Label>)
  expect(screen.getByText('*')).toBeInTheDocument()
  expect(screen.getByLabelText('required')).toBeInTheDocument()
})

test('associates with form control', () => {
  render(
    <>
      <Label htmlFor="test-input">Test Label</Label>
      <input id="test-input" />
    </>
  )
  
  const label = screen.getByText('Test Label')
  const input = screen.getByRole('textbox')
  
  expect(label).toHaveAttribute('for', 'test-input')
  expect(input).toHaveAttribute('id', 'test-input')
})

test('applies error styling', () => {
  render(<Label error>Error Label</Label>)
  expect(screen.getByText('Error Label')).toHaveClass('text-destructive')
})
```

## Related Components

- [Input](./input.md) - Text inputs that work with labels
- [Checkbox](./checkbox.md) - Boolean inputs with labels
- [Radio Group](./radio-group.md) - Radio buttons with labels
- [Form](../organism/form.md) - Complete form system
- [Button](./button.md) - Form submission buttons
