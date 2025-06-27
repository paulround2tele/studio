# Textarea Component

## Overview

The Textarea component provides a flexible and accessible multi-line text input with support for variants, sizes, resize options, character counting, and validation states. Built with comprehensive styling and state management.

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "error" \| "success" \| "warning"` | `"default"` | Visual style variant |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size of the textarea |
| `resize` | `"none" \| "vertical" \| "horizontal" \| "both"` | `"vertical"` | Resize behavior |
| `label` | `string` | `undefined` | Label text |
| `helperText` | `string` | `undefined` | Helper text |
| `errorMessage` | `string` | `undefined` | Error message (forces error variant) |
| `required` | `boolean` | `false` | Whether field is required |
| `maxLength` | `number` | `undefined` | Maximum character count |
| `showCount` | `boolean` | `false` | Whether to show character counter |
| `disabled` | `boolean` | `false` | Whether textarea is disabled |
| `placeholder` | `string` | `undefined` | Placeholder text |
| `value` | `string` | `undefined` | Controlled value |
| `defaultValue` | `string` | `undefined` | Default value for uncontrolled usage |
| `onChange` | `(e: ChangeEvent<HTMLTextAreaElement>) => void` | `undefined` | Change handler |
| `className` | `string` | `undefined` | Additional CSS classes |

All HTML textarea attributes are also supported.

## Usage Examples

### Basic Usage

```tsx
import { Textarea } from "@/components/ui/textarea"

// Uncontrolled
<Textarea placeholder="Enter your message..." />

// Controlled
const [value, setValue] = useState("")
<Textarea 
  value={value} 
  onChange={(e) => setValue(e.target.value)}
  placeholder="Type here..."
/>
```

### With Label and Helper Text

```tsx
<Textarea
  label="Description"
  helperText="Provide a detailed description of the item"
  placeholder="Enter description..."
  required
/>
```

### Variants

```tsx
{/* Default variant */}
<Textarea variant="default" placeholder="Default style" />

{/* Error variant */}
<Textarea 
  variant="error" 
  errorMessage="This field is required"
  placeholder="Error state"
/>

{/* Success variant */}
<Textarea variant="success" placeholder="Success state" />

{/* Warning variant */}
<Textarea variant="warning" placeholder="Warning state" />
```

### Sizes

```tsx
{/* Small size */}
<Textarea size="sm" placeholder="Small textarea" />

{/* Medium size (default) */}
<Textarea size="md" placeholder="Medium textarea" />

{/* Large size */}
<Textarea size="lg" placeholder="Large textarea" />
```

### Resize Options

```tsx
{/* No resize */}
<Textarea resize="none" placeholder="Fixed size" />

{/* Vertical resize only (default) */}
<Textarea resize="vertical" placeholder="Resize vertically" />

{/* Horizontal resize only */}
<Textarea resize="horizontal" placeholder="Resize horizontally" />

{/* Both directions */}
<Textarea resize="both" placeholder="Resize both ways" />
```

### Character Counter

```tsx
<Textarea
  label="Comment"
  maxLength={500}
  showCount
  placeholder="Share your thoughts..."
  helperText="Maximum 500 characters"
/>
```

### Form Integration

```tsx
const [formData, setFormData] = useState({
  feedback: "",
  notes: ""
})
const [errors, setErrors] = useState({})

<div className="space-y-4">
  <Textarea
    label="Feedback"
    value={formData.feedback}
    onChange={(e) => setFormData(prev => ({ 
      ...prev, 
      feedback: e.target.value 
    }))}
    errorMessage={errors.feedback}
    maxLength={1000}
    showCount
    required
    placeholder="Please provide your feedback..."
  />
  
  <Textarea
    label="Additional Notes"
    value={formData.notes}
    onChange={(e) => setFormData(prev => ({ 
      ...prev, 
      notes: e.target.value 
    }))}
    helperText="Optional additional information"
    placeholder="Any additional notes..."
    size="lg"
  />
</div>
```

### Advanced Example

```tsx
const [message, setMessage] = useState("")
const [isValid, setIsValid] = useState(true)

const handleChange = (e) => {
  const value = e.target.value
  setMessage(value)
  setIsValid(value.length >= 10)
}

<Textarea
  label="Message"
  value={message}
  onChange={handleChange}
  variant={!isValid && message.length > 0 ? "error" : "default"}
  errorMessage={!isValid && message.length > 0 ? "Message must be at least 10 characters" : undefined}
  maxLength={500}
  showCount
  required
  placeholder="Enter your message (minimum 10 characters)..."
  className="min-h-[120px]"
/>
```

## Accessibility

### Features

- **ARIA Support**: Proper ARIA attributes for validation states
- **Label Association**: Automatic label-input association
- **Error Announcement**: Screen reader support for error messages
- **Helper Text**: Accessible helper text with proper relationships
- **Keyboard Navigation**: Standard textarea keyboard behavior

### Best Practices

```tsx
// Always provide labels for form fields
<Textarea
  id="user-bio"
  label="Biography"
  placeholder="Tell us about yourself..."
  required
/>

// Provide clear error messages
<Textarea
  label="Review"
  errorMessage="Review must be at least 20 characters long"
  helperText="Share your experience with this product"
  minLength={20}
  required
/>

// Use helper text to guide users
<Textarea
  label="Support Request"
  helperText="Describe your issue in detail. Include steps to reproduce if applicable."
  placeholder="Describe your issue..."
  maxLength={2000}
  showCount
/>

// Group related textareas with fieldsets
<fieldset>
  <legend className="text-lg font-medium">Contact Information</legend>
  <div className="space-y-4">
    <Textarea
      label="Address"
      placeholder="Enter your full address..."
    />
    <Textarea
      label="Special Instructions"
      placeholder="Any delivery instructions..."
    />
  </div>
</fieldset>
```

## Styling

### CSS Variables

The component uses the following CSS custom properties:

- `--input`: Border color for default variant
- `--ring`: Focus ring color
- `--destructive`: Error state colors
- `--background`: Background color
- `--muted-foreground`: Placeholder and helper text color

### Customization

```tsx
// Custom height
<Textarea 
  className="min-h-[200px]" 
  placeholder="Large text area"
/>

// Custom styling
<Textarea 
  className="border-blue-500 focus-visible:ring-blue-500"
  placeholder="Custom styled"
/>

// Custom character counter position
<div className="relative">
  <Textarea 
    maxLength={100}
    showCount={false}
    className="pr-16"
  />
  <div className="absolute top-2 right-2 text-xs text-gray-500">
    {value.length}/100
  </div>
</div>
```

## Performance

### Optimization Tips

1. **Debounce Input**: For real-time validation or API calls
2. **Memoization**: Wrap in `React.memo` for static textareas
3. **Lazy Validation**: Validate on blur instead of every keystroke

```tsx
// Debounced input handling
const [value, setValue] = useState("")
const [debouncedValue, setDebouncedValue] = useState("")

const debouncedSetValue = useMemo(
  () => debounce(setDebouncedValue, 300),
  []
)

useEffect(() => {
  debouncedSetValue(value)
}, [value, debouncedSetValue])

<Textarea
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Debounced input..."
/>

// Memoized textarea
const MemoizedTextarea = React.memo(({ label, ...props }) => (
  <Textarea label={label} {...props} />
))

// Lazy validation
const [errors, setErrors] = useState({})

const validateField = (value) => {
  if (value.length < 10) {
    return "Must be at least 10 characters"
  }
  return null
}

<Textarea
  onBlur={(e) => {
    const error = validateField(e.target.value)
    setErrors(prev => ({ ...prev, description: error }))
  }}
  errorMessage={errors.description}
/>
```

## Migration Guide

### From HTML Textarea

```tsx
// Before: HTML textarea
<textarea 
  placeholder="Enter text..."
  onChange={(e) => setValue(e.target.value)}
  rows={4}
  cols={50}
/>

// After: UI Textarea
<Textarea
  placeholder="Enter text..."
  onChange={(e) => setValue(e.target.value)}
  className="min-h-[100px]"
/>
```

### From Other Libraries

```tsx
// From Chakra UI
// Before:
// <Textarea 
//   placeholder="Enter text"
//   value={value}
//   onChange={setValue}
//   isInvalid={!!error}
//   errorBorderColor="red.300"
// />

// After:
<Textarea
  placeholder="Enter text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  errorMessage={error}
/>

// From Material-UI
// Before:
// <TextField
//   multiline
//   rows={4}
//   value={value}
//   onChange={setValue}
//   error={!!error}
//   helperText={error || "Helper text"}
// />

// After:
<Textarea
  value={value}
  onChange={(e) => setValue(e.target.value)}
  errorMessage={error}
  helperText={!error ? "Helper text" : undefined}
  className="min-h-[100px]"
/>
```

## Related Components

- **Input**: For single-line text input
- **Form**: For form integration
- **Label**: For standalone labeling
- **Button**: For form submission

## Testing

### Test Scenarios

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Textarea } from '@/components/ui/textarea'

// Basic functionality
test('accepts input', () => {
  const handleChange = jest.fn()
  render(<Textarea onChange={handleChange} />)
  
  const textarea = screen.getByRole('textbox')
  fireEvent.change(textarea, { target: { value: 'test text' } })
  
  expect(handleChange).toHaveBeenCalled()
  expect(textarea.value).toBe('test text')
})

// Character counter
test('shows character counter', () => {
  render(<Textarea maxLength={100} showCount defaultValue="test" />)
  expect(screen.getByText('4/100')).toBeInTheDocument()
})

// Accessibility
test('has proper accessibility attributes', () => {
  render(
    <Textarea
      label="Description"
      helperText="Enter description"
      errorMessage="Required field"
      required
    />
  )
  
  const textarea = screen.getByRole('textbox')
  expect(textarea).toHaveAccessibleName('Description')
  expect(textarea).toHaveAttribute('aria-invalid', 'true')
  expect(textarea).toHaveAttribute('aria-required', 'true')
})

// Error states
test('displays error message', () => {
  render(<Textarea errorMessage="This field is required" />)
  expect(screen.getByText('This field is required')).toBeInTheDocument()
})
```
