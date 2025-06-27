# Input Component

## Overview

The `Input` component is a fundamental form control that provides a versatile text input with built-in validation states, helper text, and multiple visual variants. It's built on top of the native HTML input element with enhanced accessibility and styling.

## Import

```typescript
import { Input } from '@/components/ui/input'
```

## Basic Usage

```tsx
// Simple text input
<Input placeholder="Enter your name" />

// With label (using Label component)
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="your@email.com" />
</div>

// With helper text
<Input 
  placeholder="Username" 
  helperText="Must be at least 3 characters long"
/>

// Error state
<Input 
  placeholder="Username" 
  error={true}
  helperText="Username is required"
/>
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'destructive' \| 'outline' \| 'ghost'` | `'default'` | Visual style variant |
| `inputSize` | `'default' \| 'sm' \| 'lg'` | `'default'` | Size of the input |
| `error` | `boolean` | `false` | Whether the input is in error state |
| `helperText` | `string` | `undefined` | Helper or error text displayed below input |
| `type` | `string` | `'text'` | HTML input type |
| `className` | `string` | `undefined` | Additional CSS classes |

### Extends

All standard HTML input props are supported, including:
- `placeholder`
- `value`
- `defaultValue`
- `onChange`
- `onBlur`
- `onFocus`
- `disabled`
- `required`
- `maxLength`
- `pattern`
- `autoComplete`

## Variants

### Default
```tsx
<Input placeholder="Default input" />
```

### Destructive (Error State)
```tsx
<Input variant="destructive" placeholder="Error state" />
// Or automatically applied with error prop
<Input error={true} placeholder="Error state" />
```

### Outline
```tsx
<Input variant="outline" placeholder="Outline variant" />
```

### Ghost
```tsx
<Input variant="ghost" placeholder="Ghost variant" />
```

## Sizes

### Small
```tsx
<Input inputSize="sm" placeholder="Small input" />
```

### Default
```tsx
<Input inputSize="default" placeholder="Default input" />
```

### Large
```tsx
<Input inputSize="lg" placeholder="Large input" />
```

## Input Types

The component supports all HTML input types:

```tsx
// Text input
<Input type="text" placeholder="Text input" />

// Email input
<Input type="email" placeholder="Email input" />

// Password input
<Input type="password" placeholder="Password input" />

// Number input
<Input type="number" placeholder="Number input" />

// Search input
<Input type="search" placeholder="Search input" />

// URL input
<Input type="url" placeholder="URL input" />

// Tel input
<Input type="tel" placeholder="Phone input" />
```

## Form Integration

### With React Hook Form

```tsx
import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function ContactForm() {
  const { register, handleSubmit, formState: { errors } } = useForm()

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          error={!!errors.email}
          helperText={errors.email?.message as string}
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Invalid email format'
            }
          })}
        />
      </div>
    </form>
  )
}
```

### With Controlled State

```tsx
import { useState } from 'react'
import { Input } from '@/components/ui/input'

function ControlledInput() {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
    setError(e.target.value.length < 3)
  }

  return (
    <Input
      value={value}
      onChange={handleChange}
      placeholder="Type something..."
      error={error}
      helperText={error ? "Must be at least 3 characters" : "Looks good!"}
    />
  )
}
```

## Accessibility

### Features
- **ARIA Support**: Automatic `aria-invalid` when in error state
- **Helper Text Association**: Helper text is properly associated with input using `aria-describedby`
- **Focus Management**: Clear focus indicators with ring-offset pattern
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper labeling and state announcements

### Best Practices

```tsx
// Always provide labels
<div className="space-y-2">
  <Label htmlFor="username">Username *</Label>
  <Input 
    id="username"
    required
    placeholder="Enter username"
    helperText="Username must be unique"
  />
</div>

// Use appropriate input types
<Input type="email" placeholder="Email" /> // Better than type="text"
<Input type="tel" placeholder="Phone" />   // Better than type="text"

// Provide clear error messages
<Input 
  error={hasError}
  helperText={hasError ? "Please enter a valid email address" : undefined}
/>
```

## Performance

### Optimizations
- **Memoized Variants**: CVA variants are computed once and cached
- **Efficient Re-renders**: Uses `React.forwardRef` for ref forwarding without extra wrappers
- **Minimal DOM**: Clean DOM structure without unnecessary wrapper elements
- **CSS-in-JS Optimization**: Uses Tailwind classes for better caching

### Best Practices

```tsx
// Debounce for search inputs
import { useDebouncedCallback } from 'use-debounce'

function SearchInput() {
  const debouncedSearch = useDebouncedCallback((value: string) => {
    // Perform search
  }, 300)

  return (
    <Input
      type="search"
      placeholder="Search..."
      onChange={(e) => debouncedSearch(e.target.value)}
    />
  )
}

// Memoize for complex forms
const MemoizedInput = React.memo(Input)
```

## Styling

### CSS Variables
The component uses CSS custom properties for theming:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
}
```

### Custom Styling

```tsx
// Custom className
<Input 
  className="border-2 border-blue-500 focus:border-blue-700" 
  placeholder="Custom styled"
/>

// Custom CSS
<Input 
  style={{ 
    borderRadius: '8px',
    backgroundColor: '#f8f9fa'
  }}
  placeholder="Custom CSS"
/>
```

## Common Patterns

### Search Input with Icon

```tsx
import { Search } from 'lucide-react'

function SearchWithIcon() {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search..."
        className="pl-10"
      />
    </div>
  )
}
```

### Password Input with Toggle

```tsx
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

function PasswordInput() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative">
      <Input
        type={showPassword ? "text" : "password"}
        placeholder="Password"
        className="pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-full px-3"
        onClick={() => setShowPassword(!showPassword)}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  )
}
```

### File Input

```tsx
function FileInput() {
  return (
    <Input
      type="file"
      className="file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:hover:bg-primary/90"
    />
  )
}
```

## Migration Guide

### From Legacy Input

```tsx
// Before (legacy input)
<input 
  className="form-input" 
  type="text" 
  placeholder="Old input"
/>

// After (new Input component)
<Input placeholder="New input" />
```

### Breaking Changes
- `size` prop renamed to `inputSize` to avoid conflicts with HTML `size` attribute
- Helper text is now managed by the component instead of external elements
- Error styling is handled via `error` prop instead of CSS classes

### Migration Checklist
- [ ] Replace `className="form-input"` with `<Input>` component
- [ ] Update `size` prop to `inputSize`
- [ ] Move helper text into `helperText` prop
- [ ] Replace error CSS classes with `error` prop
- [ ] Ensure proper labeling with `<Label>` component

## Testing

### Test Examples

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

test('renders input with placeholder', () => {
  render(<Input placeholder="Test placeholder" />)
  expect(screen.getByPlaceholderText('Test placeholder')).toBeInTheDocument()
})

test('shows error state', () => {
  render(<Input error={true} helperText="Error message" />)
  expect(screen.getByDisplayValue('')).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByText('Error message')).toBeInTheDocument()
})

test('handles user input', async () => {
  const user = userEvent.setup()
  const handleChange = jest.fn()
  
  render(<Input onChange={handleChange} />)
  
  await user.type(screen.getByRole('textbox'), 'test input')
  expect(handleChange).toHaveBeenCalled()
})
```

## Related Components

- [Label](./label.md) - Form labels with accessibility features
- [Button](./button.md) - For form submission
- [Form](../organism/form.md) - Complete form system
- [Textarea](../organism/textarea.md) - Multi-line text input
- [Select](../organism/select.md) - Dropdown selection
