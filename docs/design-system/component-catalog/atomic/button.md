# Button Component

## Overview

The Button component is a foundational interactive element that triggers actions when clicked. It's designed with performance optimizations, accessibility features, and multiple variants to suit different use cases.

## Import

```typescript
import { Button } from '@domainflow/ui'
```

## Basic Usage

```tsx
function BasicExample() {
  return (
    <div className="space-x-2">
      <Button>Default Button</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Delete</Button>
    </div>
  )
}
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link'` | `'default'` | Visual style variant |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | `'default'` | Size of the button |
| `asChild` | `boolean` | `false` | Render as child element using Radix Slot |
| `isLoading` | `boolean` | `false` | Show loading spinner and disable interaction |
| `loadingText` | `string` | `'Loading...'` | Text to show when loading |
| `disabled` | `boolean` | `false` | Disable the button |
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | Button content |

### Events

| Event | Type | Description |
|-------|------|-------------|
| `onClick` | `(event: MouseEvent) => void` | Fired when button is clicked |
| `onFocus` | `(event: FocusEvent) => void` | Fired when button receives focus |
| `onBlur` | `(event: FocusEvent) => void` | Fired when button loses focus |

## Variants

### Default
Primary action button with brand colors.

```tsx
<Button variant="default">Save Changes</Button>
```

### Secondary
Secondary actions with muted styling.

```tsx
<Button variant="secondary">Cancel</Button>
```

### Destructive
Dangerous actions requiring user attention.

```tsx
<Button variant="destructive">Delete Account</Button>
```

### Outline
Button with border styling for subtle actions.

```tsx
<Button variant="outline">Learn More</Button>
```

### Ghost
Minimal button for low-priority actions.

```tsx
<Button variant="ghost">Skip</Button>
```

### Link
Button styled as a link.

```tsx
<Button variant="link">Terms of Service</Button>
```

## Sizes

### Small
Compact button for dense layouts.

```tsx
<Button size="sm">Small Button</Button>
```

### Default
Standard button size for most use cases.

```tsx
<Button size="default">Default Button</Button>
```

### Large
Prominent button for important actions.

```tsx
<Button size="lg">Large Button</Button>
```

### Icon
Square button for icon-only actions.

```tsx
<Button size="icon">
  <SearchIcon />
</Button>
```

## States

### Loading State
Shows spinner and prevents interaction during async operations.

```tsx
function LoadingExample() {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSubmit = async () => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsLoading(false)
  }
  
  return (
    <Button 
      isLoading={isLoading} 
      loadingText="Saving..."
      onClick={handleSubmit}
    >
      Save Document
    </Button>
  )
}
```

### Disabled State
Prevents interaction and shows disabled styling.

```tsx
<Button disabled>Disabled Button</Button>
```

## Advanced Usage

### As Child Component
Render button styling on other elements.

```tsx
<Button asChild>
  <Link href="/dashboard">Go to Dashboard</Link>
</Button>
```

### With Icons
Combine with icons for enhanced meaning.

```tsx
function IconButtons() {
  return (
    <div className="space-x-2">
      <Button>
        <PlusIcon />
        Add Item
      </Button>
      
      <Button variant="outline">
        <DownloadIcon />
        Download
      </Button>
      
      <Button size="icon">
        <SearchIcon />
      </Button>
    </div>
  )
}
```

### Form Integration
Use with forms for submission handling.

```tsx
function FormExample() {
  return (
    <form onSubmit={handleSubmit}>
      <Input placeholder="Enter your email" />
      <div className="flex gap-2 mt-4">
        <Button type="submit">Submit</Button>
        <Button type="button" variant="outline">Cancel</Button>
      </div>
    </form>
  )
}
```

## Accessibility

### Keyboard Navigation
- **Enter/Space**: Activates the button
- **Tab**: Moves focus to/from the button

### ARIA Attributes
- `role="button"` (implicit)
- `aria-disabled` when disabled
- `aria-pressed` for toggle buttons (if applicable)

### Screen Reader Support
```tsx
// Provide descriptive text for screen readers
<Button aria-label="Close dialog">
  <XIcon />
</Button>

// Loading state is announced
<Button isLoading loadingText="Processing payment">
  Pay Now
</Button>
```

## Best Practices

### Do's ✅
- Use clear, action-oriented labels
- Choose appropriate variants for context
- Provide loading states for async actions
- Use icon buttons with accessible labels
- Group related buttons logically

### Don'ts ❌
- Don't use too many primary buttons on one page
- Don't make buttons too small to click easily
- Don't use destructive variant for non-destructive actions
- Don't forget to handle loading states
- Don't use unclear or generic labels like "Click here"

## Performance

### Optimizations
- **Memoized Loading Spinner**: Prevents unnecessary re-renders
- **Optimized Class Variance Authority**: Smaller bundle size
- **Efficient Event Handling**: Minimal re-renders on state changes
- **Tree Shaking**: Import only what you need

### Bundle Impact
- **Base Size**: ~2.1KB (minified + gzipped)
- **Dependencies**: Radix UI Slot (~800B)
- **Total Impact**: ~2.9KB

## Testing

### Unit Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@domainflow/ui'

describe('Button Component', () => {
  test('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
  
  test('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
  
  test('shows loading state', () => {
    render(<Button isLoading loadingText="Loading...">Submit</Button>)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
  
  test('is disabled when loading', () => {
    render(<Button isLoading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### Integration Tests
See [Integration Test Suite](../../__tests__/integration.test.tsx) for cross-component testing examples.

## Related Components

- [Form](../organism/form.md) - For form submission buttons
- [Dialog](../molecular/dialog.md) - For dialog action buttons
- [Alert Dialog](../molecular/alert-dialog.md) - For confirmation buttons

## Migration Guide

### From Legacy Button
```typescript
// Legacy
<button className="btn btn-primary">Submit</button>

// New
<Button variant="default">Submit</Button>
```

### Common Patterns
```typescript
// Loading state migration
// Legacy
<button disabled={loading}>
  {loading ? 'Loading...' : 'Submit'}
</button>

// New
<Button isLoading={loading} loadingText="Loading...">
  Submit
</Button>
```

---

**Version**: 1.0.0  
**Last Updated**: June 27, 2025  
**Status**: Production Ready ✅
