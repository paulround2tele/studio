# Radio Group Component

## Overview

The Radio Group component provides a set of radio buttons for single selection from multiple options. Built on Radix UI primitives with support for different layouts, variants, sizes, and comprehensive accessibility features.

## API Reference

### RadioGroup (Root)

The root container that manages radio group state.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `undefined` | Controlled selected value |
| `defaultValue` | `string` | `undefined` | Default selected value for uncontrolled usage |
| `onValueChange` | `(value: string) => void` | `undefined` | Callback when selection changes |
| `direction` | `"vertical" \| "horizontal"` | `"vertical"` | Layout direction |
| `spacing` | `"tight" \| "normal" \| "loose"` | `"normal"` | Spacing between items |
| `error` | `boolean` | `false` | Whether group is in error state |
| `disabled` | `boolean` | `false` | Whether entire group is disabled |
| `required` | `boolean` | `false` | Whether selection is required |
| `name` | `string` | `undefined` | Form name attribute |
| `className` | `string` | `undefined` | Additional CSS classes |

### RadioGroupItem

Individual radio button item.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | Required | Unique value for this option |
| `variant` | `"default" \| "destructive" \| "outline" \| "ghost"` | `"default"` | Visual style variant |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size of the radio button |
| `error` | `boolean` | `false` | Whether item is in error state |
| `disabled` | `boolean` | `false` | Whether item is disabled |
| `className` | `string` | `undefined` | Additional CSS classes |

## Usage Examples

### Basic Radio Group

```tsx
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

<RadioGroup defaultValue="option1">
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option1" id="option1" />
    <Label htmlFor="option1">Option 1</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option2" id="option2" />
    <Label htmlFor="option2">Option 2</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option3" id="option3" />
    <Label htmlFor="option3">Option 3</Label>
  </div>
</RadioGroup>
```

### Controlled Radio Group

```tsx
const [value, setValue] = useState<string>("")

<RadioGroup value={value} onValueChange={setValue}>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="small" id="small" />
    <Label htmlFor="small">Small</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="medium" id="medium" />
    <Label htmlFor="medium">Medium</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="large" id="large" />
    <Label htmlFor="large">Large</Label>
  </div>
</RadioGroup>

<p>Selected: {value}</p>
```

### Horizontal Layout

```tsx
<RadioGroup direction="horizontal" defaultValue="yes">
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="yes" id="yes" />
    <Label htmlFor="yes">Yes</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="no" id="no" />
    <Label htmlFor="no">No</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="maybe" id="maybe" />
    <Label htmlFor="maybe">Maybe</Label>
  </div>
</RadioGroup>
```

### Different Variants

```tsx
{/* Default variant */}
<RadioGroup direction="horizontal" defaultValue="default">
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="default" variant="default" />
    <Label>Default</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="outline" variant="outline" />
    <Label>Outline</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="ghost" variant="ghost" />
    <Label>Ghost</Label>
  </div>
</RadioGroup>

{/* Error state */}
<RadioGroup direction="horizontal" error>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="error1" error />
    <Label>Error Option 1</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="error2" error />
    <Label>Error Option 2</Label>
  </div>
</RadioGroup>
```

### Different Sizes

```tsx
<div className="space-y-4">
  <div>
    <h4>Small Size</h4>
    <RadioGroup direction="horizontal" defaultValue="sm1">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="sm1" size="sm" />
        <Label className="text-sm">Small 1</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="sm2" size="sm" />
        <Label className="text-sm">Small 2</Label>
      </div>
    </RadioGroup>
  </div>
  
  <div>
    <h4>Large Size</h4>
    <RadioGroup direction="horizontal" defaultValue="lg1">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="lg1" size="lg" />
        <Label className="text-lg">Large 1</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="lg2" size="lg" />
        <Label className="text-lg">Large 2</Label>
      </div>
    </RadioGroup>
  </div>
</div>
```

### Spacing Options

```tsx
{/* Tight spacing */}
<RadioGroup spacing="tight">
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="tight1" />
    <Label>Tight spacing option 1</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="tight2" />
    <Label>Tight spacing option 2</Label>
  </div>
</RadioGroup>

{/* Loose spacing */}
<RadioGroup spacing="loose">
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="loose1" />
    <Label>Loose spacing option 1</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="loose2" />
    <Label>Loose spacing option 2</Label>
  </div>
</RadioGroup>
```

### With Disabled Options

```tsx
<RadioGroup defaultValue="enabled1">
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="enabled1" id="enabled1" />
    <Label htmlFor="enabled1">Enabled option</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="disabled1" id="disabled1" disabled />
    <Label htmlFor="disabled1" className="opacity-50">Disabled option</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="enabled2" id="enabled2" />
    <Label htmlFor="enabled2">Another enabled option</Label>
  </div>
</RadioGroup>
```

### Form Integration

```tsx
const [formData, setFormData] = useState({
  plan: "",
  frequency: ""
})
const [errors, setErrors] = useState({})

<form className="space-y-6">
  <div>
    <fieldset>
      <legend className="text-sm font-medium mb-3">Choose a plan</legend>
      <RadioGroup 
        value={formData.plan}
        onValueChange={(value) => setFormData(prev => ({ ...prev, plan: value }))}
        error={!!errors.plan}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="basic" id="basic" error={!!errors.plan} />
          <Label htmlFor="basic">Basic Plan - $9/month</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="pro" id="pro" error={!!errors.plan} />
          <Label htmlFor="pro">Pro Plan - $19/month</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="enterprise" id="enterprise" error={!!errors.plan} />
          <Label htmlFor="enterprise">Enterprise Plan - Contact us</Label>
        </div>
      </RadioGroup>
      {errors.plan && (
        <p className="text-sm text-destructive mt-2">{errors.plan}</p>
      )}
    </fieldset>
  </div>
  
  <div>
    <fieldset>
      <legend className="text-sm font-medium mb-3">Billing frequency</legend>
      <RadioGroup 
        direction="horizontal"
        value={formData.frequency}
        onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="monthly" id="monthly" />
          <Label htmlFor="monthly">Monthly</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="yearly" id="yearly" />
          <Label htmlFor="yearly">Yearly (20% off)</Label>
        </div>
      </RadioGroup>
    </fieldset>
  </div>
</form>
```

### Complex Option Layout

```tsx
<RadioGroup defaultValue="premium">
  <div className="space-y-4">
    <div className="flex items-start space-x-3 p-4 border rounded-lg">
      <RadioGroupItem value="free" id="free" className="mt-1" />
      <div className="flex-1">
        <Label htmlFor="free" className="text-base font-medium">Free Plan</Label>
        <p className="text-sm text-muted-foreground">
          Perfect for getting started. Includes basic features.
        </p>
        <ul className="text-sm text-muted-foreground mt-2">
          <li>• Up to 3 projects</li>
          <li>• Basic support</li>
          <li>• 1GB storage</li>
        </ul>
      </div>
    </div>
    
    <div className="flex items-start space-x-3 p-4 border rounded-lg">
      <RadioGroupItem value="premium" id="premium" className="mt-1" />
      <div className="flex-1">
        <Label htmlFor="premium" className="text-base font-medium">Premium Plan</Label>
        <p className="text-sm text-muted-foreground">
          For growing teams. Advanced features included.
        </p>
        <ul className="text-sm text-muted-foreground mt-2">
          <li>• Unlimited projects</li>
          <li>• Priority support</li>
          <li>• 100GB storage</li>
          <li>• Advanced analytics</li>
        </ul>
      </div>
    </div>
  </div>
</RadioGroup>
```

## Accessibility

### Features

- **ARIA Support**: Full ARIA radiogroup implementation via Radix UI
- **Keyboard Navigation**: Arrow keys navigate, Space selects
- **Screen Reader**: Proper role announcements and state changes
- **Focus Management**: Visible focus indicators
- **Label Association**: Proper label-input relationships

### Best Practices

```tsx
// Always use fieldset and legend for groups
<fieldset>
  <legend className="text-sm font-medium">Select your preference</legend>
  <RadioGroup>
    {/* options */}
  </RadioGroup>
</fieldset>

// Provide clear, descriptive labels
<div className="flex items-center space-x-2">
  <RadioGroupItem value="option1" id="option1" />
  <Label htmlFor="option1">
    Clear, descriptive option name
  </Label>
</div>

// Use error states appropriately
<RadioGroup error={!!errors.selection}>
  {/* options with error styling */}
</RadioGroup>
{errors.selection && (
  <p className="text-sm text-destructive" role="alert">
    {errors.selection}
  </p>
)}

// Group related options logically
<fieldset>
  <legend>Shipping Options</legend>
  <RadioGroup>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="standard" id="standard" />
      <Label htmlFor="standard">Standard (5-7 days) - Free</Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="express" id="express" />
      <Label htmlFor="express">Express (2-3 days) - $9.99</Label>
    </div>
  </RadioGroup>
</fieldset>
```

## Styling

### CSS Variables

The component uses the following CSS custom properties:

- `--primary`: Default selection color
- `--destructive`: Error state color
- `--input`: Border color for outline variant
- `--ring`: Focus ring color
- `--muted-foreground`: Ghost variant color

### Customization

```tsx
// Custom radio styling
<RadioGroupItem 
  className="border-blue-500 text-blue-500 data-[state=checked]:border-blue-600"
/>

// Custom layouts
<RadioGroup className="grid grid-cols-3 gap-4">
  {/* options */}
</RadioGroup>

// Custom spacing
<RadioGroup spacing="loose" className="gap-6">
  {/* options */}
</RadioGroup>
```

## Performance

### Optimization Tips

1. **Memoization**: Wrap in `React.memo` for stable option lists
2. **Event Handling**: Use single onChange handler for the group
3. **Rendering**: Avoid re-rendering all options on selection

```tsx
// Memoized radio option
const MemoizedRadioOption = React.memo(({ value, label, ...props }) => (
  <div className="flex items-center space-x-2">
    <RadioGroupItem value={value} id={value} {...props} />
    <Label htmlFor={value}>{label}</Label>
  </div>
))

// Optimized radio group
const OptimizedRadioGroup = ({ options, value, onChange }) => {
  return (
    <RadioGroup value={value} onValueChange={onChange}>
      {options.map(option => (
        <MemoizedRadioOption 
          key={option.value} 
          value={option.value}
          label={option.label}
        />
      ))}
    </RadioGroup>
  )
}
```

## Migration Guide

### From HTML Radio Inputs

```tsx
// Before: HTML radio inputs
<div>
  <input 
    type="radio" 
    name="choice" 
    value="option1" 
    checked={value === "option1"}
    onChange={(e) => setValue(e.target.value)}
  />
  <label>Option 1</label>
</div>

// After: RadioGroup
<RadioGroup value={value} onValueChange={setValue}>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option1" id="option1" />
    <Label htmlFor="option1">Option 1</Label>
  </div>
</RadioGroup>
```

### From Other Libraries

```tsx
// From Chakra UI
// Before:
// <RadioGroup value={value} onChange={setValue}>
//   <Radio value="option1">Option 1</Radio>
// </RadioGroup>

// After:
<RadioGroup value={value} onValueChange={setValue}>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option1" id="option1" />
    <Label htmlFor="option1">Option 1</Label>
  </div>
</RadioGroup>
```

## Related Components

- **Checkbox**: For multi-selection
- **Select**: For dropdown selection
- **Switch**: For binary toggles
- **Tabs**: For content navigation

## Testing

### Test Scenarios

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

// Basic functionality
test('selects option on click', () => {
  const handleChange = jest.fn()
  render(
    <RadioGroup onValueChange={handleChange}>
      <RadioGroupItem value="test" />
    </RadioGroup>
  )
  
  fireEvent.click(screen.getByRole('radio'))
  expect(handleChange).toHaveBeenCalledWith('test')
})

// Keyboard navigation
test('supports keyboard navigation', () => {
  render(
    <RadioGroup>
      <RadioGroupItem value="option1" />
      <RadioGroupItem value="option2" />
    </RadioGroup>
  )
  
  const firstRadio = screen.getAllByRole('radio')[0]
  firstRadio.focus()
  
  fireEvent.keyDown(firstRadio, { key: 'ArrowDown' })
  
  expect(screen.getAllByRole('radio')[1]).toHaveFocus()
})

// Accessibility
test('has proper ARIA attributes', () => {
  render(
    <RadioGroup>
      <RadioGroupItem value="test" />
    </RadioGroup>
  )
  
  expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  expect(screen.getByRole('radio')).toHaveAttribute('value', 'test')
})
```
