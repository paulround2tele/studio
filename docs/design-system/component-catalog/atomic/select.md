# Select Component

## Overview

The Select component provides a comprehensive dropdown selection interface built on Radix UI primitives. It includes support for multiple variants, sizes, states, labels, helper text, and accessibility features.

## API Reference

### Select Root

The root container component that manages selection state.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `undefined` | Controlled selected value |
| `defaultValue` | `string` | `undefined` | Default selected value for uncontrolled usage |
| `onValueChange` | `(value: string) => void` | `undefined` | Callback when selection changes |
| `disabled` | `boolean` | `false` | Whether select is disabled |
| `required` | `boolean` | `false` | Whether selection is required |

### SelectTrigger

The trigger button that opens the dropdown.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "destructive" \| "outline" \| "secondary" \| "ghost"` | `"default"` | Visual style variant |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size of the trigger |
| `error` | `boolean` | `false` | Whether in error state |
| `success` | `boolean` | `false` | Whether in success state |
| `warning` | `boolean` | `false` | Whether in warning state |
| `label` | `string` | `undefined` | Label text |
| `helperText` | `string` | `undefined` | Helper/error text |
| `required` | `boolean` | `false` | Whether field is required |
| `className` | `string` | `undefined` | Additional CSS classes |

### SelectContent

The dropdown content container.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size of the content |
| `position` | `"item-aligned" \| "popper"` | `"popper"` | Positioning strategy |
| `className` | `string` | `undefined` | Additional CSS classes |

### SelectItem

Individual selectable items.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | Required | Value when selected |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size of the item |
| `disabled` | `boolean` | `false` | Whether item is disabled |
| `className` | `string` | `undefined` | Additional CSS classes |

## Usage Examples

### Basic Usage

```tsx
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>
```

### Controlled Usage

```tsx
const [value, setValue] = useState<string>("")

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Choose..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="apple">Apple</SelectItem>
    <SelectItem value="banana">Banana</SelectItem>
    <SelectItem value="orange">Orange</SelectItem>
  </SelectContent>
</Select>
```

### With Label and Helper Text

```tsx
<Select>
  <SelectTrigger 
    label="Country"
    helperText="Choose your country of residence"
    required
  >
    <SelectValue placeholder="Select country" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="us">United States</SelectItem>
    <SelectItem value="ca">Canada</SelectItem>
    <SelectItem value="uk">United Kingdom</SelectItem>
  </SelectContent>
</Select>
```

### Variants and Sizes

```tsx
{/* Variants */}
<Select>
  <SelectTrigger variant="outline">
    <SelectValue placeholder="Outline variant" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="item1">Item 1</SelectItem>
  </SelectContent>
</Select>

<Select>
  <SelectTrigger variant="secondary">
    <SelectValue placeholder="Secondary variant" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="item1">Item 1</SelectItem>
  </SelectContent>
</Select>

{/* Sizes */}
<Select>
  <SelectTrigger size="sm">
    <SelectValue placeholder="Small" />
  </SelectTrigger>
  <SelectContent size="sm">
    <SelectItem value="item1" size="sm">Small Item</SelectItem>
  </SelectContent>
</Select>

<Select>
  <SelectTrigger size="lg">
    <SelectValue placeholder="Large" />
  </SelectTrigger>
  <SelectContent size="lg">
    <SelectItem value="item1" size="lg">Large Item</SelectItem>
  </SelectContent>
</Select>
```

### Error States

```tsx
<Select>
  <SelectTrigger 
    error
    label="Required Field"
    helperText="This field is required"
    required
  >
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="item1">Option 1</SelectItem>
    <SelectItem value="item2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### Grouped Options

```tsx
import { SelectGroup, SelectLabel } from "@/components/ui/select"

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select fruit" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Fruits</SelectLabel>
      <SelectItem value="apple">Apple</SelectItem>
      <SelectItem value="banana">Banana</SelectItem>
      <SelectItem value="orange">Orange</SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectGroup>
      <SelectLabel>Vegetables</SelectLabel>
      <SelectItem value="carrot">Carrot</SelectItem>
      <SelectItem value="lettuce">Lettuce</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

### Disabled Options

```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="available">Available Option</SelectItem>
    <SelectItem value="disabled" disabled>
      Disabled Option
    </SelectItem>
    <SelectItem value="another">Another Option</SelectItem>
  </SelectContent>
</Select>
```

## Accessibility

### Features

- **ARIA Support**: Full ARIA compliance via Radix UI primitives
- **Keyboard Navigation**: Arrow keys, Enter/Space selection, Escape closes
- **Screen Reader**: Proper announcements for selected values and states
- **Focus Management**: Logical focus order and visible indicators
- **Label Association**: Proper labeling support

### Best Practices

```tsx
// Always provide meaningful labels
<Select>
  <SelectTrigger label="Preferred Language" required>
    <SelectValue placeholder="Choose language" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="en">English</SelectItem>
    <SelectItem value="es">Spanish</SelectItem>
    <SelectItem value="fr">French</SelectItem>
  </SelectContent>
</Select>

// Provide clear error messages
<Select>
  <SelectTrigger 
    label="Priority Level"
    error={!!errors.priority}
    helperText={errors.priority || "Select task priority"}
    required
  >
    <SelectValue placeholder="Select priority" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="low">Low</SelectItem>
    <SelectItem value="medium">Medium</SelectItem>
    <SelectItem value="high">High</SelectItem>
  </SelectContent>
</Select>

// Group related options logically
<Select>
  <SelectTrigger label="Time Zone">
    <SelectValue placeholder="Select time zone" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>North America</SelectLabel>
      <SelectItem value="est">Eastern (EST)</SelectItem>
      <SelectItem value="cst">Central (CST)</SelectItem>
      <SelectItem value="pst">Pacific (PST)</SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectGroup>
      <SelectLabel>Europe</SelectLabel>
      <SelectItem value="gmt">Greenwich (GMT)</SelectItem>
      <SelectItem value="cet">Central European (CET)</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

## Styling

### CSS Variables

The component uses the following CSS custom properties:

- `--input`: Default border and background colors
- `--ring`: Focus ring color
- `--popover`: Dropdown background
- `--accent`: Hover and selection colors
- `--destructive`: Error state colors

### Customization

```tsx
// Custom trigger styling
<SelectTrigger 
  className="border-blue-500 focus:ring-blue-500"
  variant="outline"
>
  <SelectValue />
</SelectTrigger>

// Custom content styling
<SelectContent className="max-h-80 w-72">
  {/* items */}
</SelectContent>

// Custom item styling
<SelectItem 
  value="special"
  className="text-blue-600 font-medium"
>
  Special Option
</SelectItem>
```

## Performance

### Optimization Tips

1. **Virtual Scrolling**: For large lists, consider implementing virtual scrolling
2. **Memoization**: Wrap in `React.memo` for expensive option lists
3. **Lazy Loading**: Load options dynamically when opened

```tsx
// Memoized options
const MemoizedSelectItem = React.memo(({ value, children }) => (
  <SelectItem value={value}>{children}</SelectItem>
))

// Large option lists
const LargeSelect = ({ options }) => {
  return (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {options.map(option => (
          <MemoizedSelectItem key={option.value} value={option.value}>
            {option.label}
          </MemoizedSelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Dynamic loading
const [options, setOptions] = useState([])
const [isOpen, setIsOpen] = useState(false)

useEffect(() => {
  if (isOpen && options.length === 0) {
    loadOptions().then(setOptions)
  }
}, [isOpen])

<Select onOpenChange={setIsOpen}>
  {/* content */}
</Select>
```

## Migration Guide

### From HTML Select

```tsx
// Before: HTML select
<select value={value} onChange={(e) => setValue(e.target.value)}>
  <option value="">Choose...</option>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</select>

// After: UI Select
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Choose..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
    <SelectItem value="2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### From Other Libraries

```tsx
// From Chakra UI
// Before:
// <Select placeholder="Choose option" value={value} onChange={setValue}>
//   <option value="1">Option 1</option>
// </Select>

// After:
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Choose option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

## Related Components

- **Combobox**: For searchable selections
- **RadioGroup**: For single-selection alternatives
- **Checkbox**: For multi-selection alternatives
- **Form**: For form integration

## Testing

### Test Scenarios

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Basic functionality
test('opens and selects option', async () => {
  const handleChange = jest.fn()
  render(
    <Select onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue placeholder="Choose" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="test">Test Option</SelectItem>
      </SelectContent>
    </Select>
  )
  
  fireEvent.click(screen.getByRole('combobox'))
  fireEvent.click(screen.getByText('Test Option'))
  
  expect(handleChange).toHaveBeenCalledWith('test')
})

// Accessibility
test('has proper ARIA attributes', () => {
  render(
    <Select>
      <SelectTrigger label="Test Select">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="test">Test</SelectItem>
      </SelectContent>
    </Select>
  )
  
  const trigger = screen.getByRole('combobox')
  expect(trigger).toHaveAccessibleName('Test Select')
})
```
