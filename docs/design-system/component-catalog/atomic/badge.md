# Badge Component

## Overview

The `Badge` component is a compact status indicator that displays labels, counts, or statuses. It supports multiple visual variants, sizes, and optional dismissible functionality, making it perfect for tags, notifications, status indicators, and categorization.

## Import

```typescript
import { Badge } from '@/components/ui/badge'
```

## Basic Usage

```tsx
// Simple badge
<Badge>New</Badge>

// Status indicators
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Error</Badge>

// Dismissible badge
<Badge 
  dismissible 
  onDismiss={() => console.log('Badge dismissed')}
>
  Removable Tag
</Badge>

// With count
<Badge variant="secondary">99+</Badge>
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'secondary' \| 'destructive' \| 'outline' \| 'success' \| 'warning' \| 'info'` | `'default'` | Visual style variant |
| `size` | `'default' \| 'sm' \| 'lg'` | `'default'` | Size of the badge |
| `dismissible` | `boolean` | `false` | Whether badge can be dismissed |
| `onDismiss` | `() => void` | `undefined` | Callback when badge is dismissed |
| `className` | `string` | `undefined` | Additional CSS classes |

### Extends

All standard HTML div props:
- `onClick`
- `onMouseEnter`
- `onMouseLeave`
- `title`
- `role` (defaults to "status")

## Variants

### Default
```tsx
<Badge>Default</Badge>
```

### Secondary
```tsx
<Badge variant="secondary">Secondary</Badge>
```

### Destructive
```tsx
<Badge variant="destructive">Error</Badge>
```

### Outline
```tsx
<Badge variant="outline">Outline</Badge>
```

### Success
```tsx
<Badge variant="success">Success</Badge>
```

### Warning
```tsx
<Badge variant="warning">Warning</Badge>
```

### Info
```tsx
<Badge variant="info">Info</Badge>
```

## Sizes

### Small
```tsx
<Badge size="sm">Small</Badge>
```

### Default
```tsx
<Badge size="default">Default</Badge>
```

### Large
```tsx
<Badge size="lg">Large</Badge>
```

## Common Use Cases

### Status Indicators

```tsx
function UserStatus({ status }: { status: 'online' | 'offline' | 'busy' | 'away' }) {
  const variants = {
    online: 'success',
    offline: 'secondary',
    busy: 'destructive',
    away: 'warning'
  } as const

  return (
    <Badge variant={variants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}
```

### Notification Counts

```tsx
function NotificationBadge({ count }: { count: number }) {
  if (count === 0) return null

  return (
    <Badge variant="destructive" size="sm">
      {count > 99 ? '99+' : count}
    </Badge>
  )
}

// Usage in navigation
function NavItem() {
  return (
    <div className="relative">
      <Button variant="ghost">Messages</Button>
      <Badge 
        variant="destructive" 
        size="sm"
        className="absolute -top-1 -right-1"
      >
        3
      </Badge>
    </div>
  )
}
```

### Tag System

```tsx
function TagList({ tags, onRemoveTag }: { 
  tags: string[], 
  onRemoveTag: (tag: string) => void 
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          dismissible
          onDismiss={() => onRemoveTag(tag)}
        >
          {tag}
        </Badge>
      ))}
    </div>
  )
}
```

### Feature Flags

```tsx
function FeatureFlag({ enabled, label }: { enabled: boolean, label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span>{label}</span>
      <Badge variant={enabled ? "success" : "secondary"}>
        {enabled ? "Enabled" : "Disabled"}
      </Badge>
    </div>
  )
}
```

## Advanced Patterns

### Interactive Badge

```tsx
function ClickableBadge({ 
  children, 
  onClick, 
  ...props 
}: BadgeProps & { onClick?: () => void }) {
  return (
    <Badge
      {...props}
      className={cn(
        "cursor-pointer transition-transform hover:scale-105",
        props.className
      )}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      {children}
    </Badge>
  )
}
```

### Badge with Icon

```tsx
import { Check, X, AlertTriangle } from 'lucide-react'

function StatusBadge({ status }: { status: 'success' | 'error' | 'warning' }) {
  const config = {
    success: { variant: 'success', icon: Check, label: 'Success' },
    error: { variant: 'destructive', icon: X, label: 'Error' },
    warning: { variant: 'warning', icon: AlertTriangle, label: 'Warning' }
  } as const

  const { variant, icon: Icon, label } = config[status]

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}
```

### Animated Badge

```tsx
function AnimatedBadge({ 
  children, 
  animate = false,
  ...props 
}: BadgeProps & { animate?: boolean }) {
  return (
    <Badge
      {...props}
      className={cn(
        animate && "animate-pulse",
        props.className
      )}
    >
      {children}
    </Badge>
  )
}

// Usage for new notifications
<AnimatedBadge variant="destructive" animate={hasNewNotifications}>
  {notificationCount}
</AnimatedBadge>
```

## Accessibility

### Features
- **Semantic Role**: Uses `role="status"` by default for screen readers
- **Keyboard Navigation**: Focusable when interactive
- **ARIA Labels**: Proper labeling for dismiss buttons
- **Color Independence**: Information isn't conveyed by color alone
- **Focus Management**: Clear focus indicators

### Best Practices

```tsx
// Provide context for screen readers
<Badge aria-label={`${count} unread messages`}>
  {count}
</Badge>

// Use descriptive text
<Badge variant="success">
  Payment Successful
</Badge>

// Ensure sufficient contrast
<Badge 
  variant="outline"
  className="border-2 text-foreground" // Enhanced contrast
>
  Important
</Badge>

// Group related badges
<div 
  role="group" 
  aria-label="User permissions"
  className="flex gap-2"
>
  <Badge variant="success">Admin</Badge>
  <Badge variant="secondary">Editor</Badge>
</div>
```

## Performance

### Optimizations
- **Memoized Variants**: CVA variants are computed once and cached
- **Efficient Rendering**: Minimal DOM structure with optimal React patterns
- **Event Delegation**: Efficient event handling for dismiss functionality
- **CSS-based Animations**: Hardware-accelerated hover effects

### Best Practices

```tsx
// Memoize for dynamic lists
const MemoizedBadge = React.memo(Badge)

// Optimize dismissible badges
const OptimizedTagList = ({ tags, onRemove }: { 
  tags: string[], 
  onRemove: (tag: string) => void 
}) => {
  const handleRemove = useCallback((tag: string) => {
    onRemove(tag)
  }, [onRemove])

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <MemoizedBadge
          key={tag}
          variant="outline"
          dismissible
          onDismiss={() => handleRemove(tag)}
        >
          {tag}
        </MemoizedBadge>
      ))}
    </div>
  )
}
```

## Styling

### CSS Variables
The component uses CSS custom properties for theming:

```css
:root {
  --primary: 222.2 84% 4.9%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --ring: 222.2 84% 4.9%;
}
```

### Custom Styling

```tsx
// Custom colors
<Badge 
  className="bg-purple-500 text-white hover:bg-purple-600" 
  variant="outline"
>
  Custom Purple
</Badge>

// Gradient badge
<Badge 
  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0"
>
  Gradient
</Badge>

// Rounded variant
<Badge className="rounded-lg">
  Rounded
</Badge>
```

## Testing

### Test Examples

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Badge } from '@/components/ui/badge'

test('renders badge with text', () => {
  render(<Badge>Test Badge</Badge>)
  expect(screen.getByText('Test Badge')).toBeInTheDocument()
})

test('handles dismiss functionality', async () => {
  const user = userEvent.setup()
  const handleDismiss = jest.fn()
  
  render(
    <Badge dismissible onDismiss={handleDismiss}>
      Dismissible Badge
    </Badge>
  )
  
  await user.click(screen.getByLabelText('Remove badge'))
  expect(handleDismiss).toHaveBeenCalledTimes(1)
})

test('applies correct variant styles', () => {
  render(<Badge variant="success">Success Badge</Badge>)
  expect(screen.getByText('Success Badge')).toHaveClass('bg-green-500')
})

test('has proper accessibility attributes', () => {
  render(<Badge>Status Badge</Badge>)
  expect(screen.getByText('Status Badge')).toHaveAttribute('role', 'status')
})
```

## Migration Guide

### From Legacy Badges

```tsx
// Before (legacy badge)
<span className="badge badge-primary">
  Primary
</span>

// After (new Badge component)
<Badge variant="default">Primary</Badge>
```

### Breaking Changes
- CSS classes are now handled via `variant` prop instead of multiple class names
- Dismissible functionality is built-in instead of requiring custom implementation
- Size variations use `size` prop instead of CSS classes

### Migration Checklist
- [ ] Replace `className="badge badge-*"` with `variant` prop
- [ ] Update size classes to use `size` prop
- [ ] Replace custom dismiss buttons with `dismissible` and `onDismiss` props
- [ ] Update color variations to use new variant names
- [ ] Ensure proper ARIA attributes are in place

## Related Components

- [Button](./button.md) - For interactive actions
- [Alert](./alert.md) - For larger status messages  
- [Toast](./toast.md) - For temporary notifications
- [Label](./label.md) - For form field labels
- [Card](../molecular/card.md) - For grouped content with badges
