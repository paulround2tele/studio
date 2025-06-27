# Checkbox Component

## Overview

The Checkbox component provides a flexible and accessible checkbox input with support for multiple variants, sizes, and states including indeterminate state. Built on Radix UI primitives with styled variants.

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "destructive" \| "outline" \| "ghost"` | `"default"` | Visual style variant |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size of the checkbox |
| `indeterminate` | `boolean` | `false` | Whether checkbox is in indeterminate state |
| `error` | `boolean` | `false` | Whether checkbox is in error state (forces destructive variant) |
| `checked` | `boolean` | `undefined` | Controlled checked state |
| `defaultChecked` | `boolean` | `undefined` | Default checked state for uncontrolled usage |
| `onCheckedChange` | `(checked: boolean) => void` | `undefined` | Callback when checked state changes |
| `disabled` | `boolean` | `false` | Whether checkbox is disabled |
| `className` | `string` | `undefined` | Additional CSS classes |

All Radix UI Checkbox props are also supported.

## Usage Examples

### Basic Usage

```tsx
import { Checkbox } from "@/components/ui/checkbox"

// Uncontrolled
<Checkbox defaultChecked />

// Controlled
const [checked, setChecked] = useState(false)
<Checkbox checked={checked} onCheckedChange={setChecked} />
```

### Variants

```tsx
{/* Default variant */}
<Checkbox variant="default" />

{/* Destructive variant */}
<Checkbox variant="destructive" />

{/* Outline variant */}
<Checkbox variant="outline" />

{/* Ghost variant */}
<Checkbox variant="ghost" />
```

### Sizes

```tsx
{/* Small size */}
<Checkbox size="sm" />

{/* Default size */}
<Checkbox size="default" />

{/* Large size */}
<Checkbox size="lg" />
```

### States

```tsx
{/* Indeterminate state */}
<Checkbox indeterminate />

{/* Error state */}
<Checkbox error />

{/* Disabled state */}
<Checkbox disabled />
```

### Form Integration

```tsx
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">Accept terms and conditions</Label>
</div>

// With form validation
<div className="space-y-2">
  <div className="flex items-center space-x-2">
    <Checkbox 
      id="newsletter" 
      checked={formData.newsletter}
      onCheckedChange={(checked) => 
        setFormData(prev => ({ ...prev, newsletter: checked }))
      }
      error={errors.newsletter}
    />
    <Label htmlFor="newsletter">Subscribe to newsletter</Label>
  </div>
  {errors.newsletter && (
    <p className="text-sm text-destructive">{errors.newsletter}</p>
  )}
</div>
```

## Accessibility

### Features

- **ARIA Support**: Full ARIA compliance via Radix UI primitives
- **Keyboard Navigation**: Space key toggles, Tab navigation
- **Screen Reader**: Proper state announcements (checked/unchecked/indeterminate)
- **Focus Management**: Visible focus indicators with ring styles
- **Label Association**: Supports proper labeling via `htmlFor` attributes

### Best Practices

```tsx
// Always provide labels
<div className="flex items-center space-x-2">
  <Checkbox id="setting1" />
  <Label htmlFor="setting1">Enable notifications</Label>
</div>

// Group related checkboxes
<fieldset>
  <legend className="text-sm font-medium">Preferences</legend>
  <div className="space-y-2">
    <div className="flex items-center space-x-2">
      <Checkbox id="email" />
      <Label htmlFor="email">Email notifications</Label>
    </div>
    <div className="flex items-center space-x-2">
      <Checkbox id="sms" />
      <Label htmlFor="sms">SMS notifications</Label>
    </div>
  </div>
</fieldset>

// Provide clear error messages
<div className="space-y-2">
  <div className="flex items-center space-x-2">
    <Checkbox id="required" error={!!errors.required} />
    <Label htmlFor="required">Required field *</Label>
  </div>
  {errors.required && (
    <p className="text-sm text-destructive" role="alert">
      {errors.required}
    </p>
  )}
</div>
```

## Styling

### CSS Variables

The component uses the following CSS custom properties:

- `--primary`: Default variant colors
- `--destructive`: Error/destructive variant colors
- `--accent`: Outline/ghost variant colors
- `--ring`: Focus ring color
- `--input`: Border color for outline variant

### Customization

```tsx
// Custom styling
<Checkbox 
  className="border-blue-500 data-[state=checked]:bg-blue-500" 
/>

// Size variations
<Checkbox 
  size="lg"
  className="h-6 w-6" // Override size
/>
```

## Performance

### Optimization Tips

1. **Controlled vs Uncontrolled**: Use uncontrolled for simple forms, controlled for complex validation
2. **Debounce Updates**: For frequently changing checkboxes, consider debouncing
3. **Memoization**: Wrap in `React.memo` if parent re-renders frequently

```tsx
// Optimized controlled usage
const MemoizedCheckbox = React.memo(({ checked, onChange, ...props }) => (
  <Checkbox checked={checked} onCheckedChange={onChange} {...props} />
))

// Debounced updates for real-time filtering
const [filters, setFilters] = useState([])
const debouncedSetFilters = useMemo(
  () => debounce(setFilters, 300),
  []
)

<Checkbox 
  onCheckedChange={(checked) => {
    if (checked) {
      debouncedSetFilters(prev => [...prev, filter])
    } else {
      debouncedSetFilters(prev => prev.filter(f => f !== filter))
    }
  }}
/>
```

## Migration Guide

### From HTML Input

```tsx
// Before: HTML checkbox
<input 
  type="checkbox" 
  checked={checked}
  onChange={(e) => setChecked(e.target.checked)}
/>

// After: UI Checkbox
<Checkbox 
  checked={checked}
  onCheckedChange={setChecked}
/>
```

### From Other Libraries

```tsx
// From Chakra UI
// Before:
// <Checkbox isChecked={checked} onChange={setChecked}>Label</Checkbox>

// After:
<div className="flex items-center space-x-2">
  <Checkbox checked={checked} onCheckedChange={setChecked} />
  <Label>Label</Label>
</div>

// From Material-UI
// Before:
// <FormControlLabel 
//   control={<Checkbox checked={checked} onChange={setChecked} />}
//   label="Label"
// />

// After:
<div className="flex items-center space-x-2">
  <Checkbox checked={checked} onCheckedChange={setChecked} />
  <Label>Label</Label>
</div>
```

## Related Components

- **Label**: For proper labeling
- **Form**: For form integration
- **RadioGroup**: For single-selection alternatives
- **Switch**: For toggle alternatives

## Testing

### Test Scenarios

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Checkbox } from '@/components/ui/checkbox'

// Basic functionality
test('toggles on click', () => {
  const handleChange = jest.fn()
  render(<Checkbox onCheckedChange={handleChange} />)
  
  fireEvent.click(screen.getByRole('checkbox'))
  expect(handleChange).toHaveBeenCalledWith(true)
})

// Accessibility
test('is accessible', () => {
  render(
    <div>
      <Checkbox id="test" />
      <label htmlFor="test">Test label</label>
    </div>
  )
  
  const checkbox = screen.getByRole('checkbox')
  expect(checkbox).toHaveAccessibleName('Test label')
})

// Variants
test('applies error state', () => {
  render(<Checkbox error />)
  const checkbox = screen.getByRole('checkbox')
  expect(checkbox).toHaveClass('border-destructive')
})
```
