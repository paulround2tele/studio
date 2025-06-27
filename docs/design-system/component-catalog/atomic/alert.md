# Alert Component

## Overview

The `Alert` component displays important messages, notifications, or system status information to users. It supports multiple variants, sizes, automatic icons, and dismissible functionality. The component follows accessibility best practices with proper ARIA roles and keyboard navigation.

## Import

```typescript
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
```

## Basic Usage

```tsx
// Simple alert
<Alert>
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components to your app using the cli.
  </AlertDescription>
</Alert>

// With variants
<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Your session has expired. Please sign in again.
  </AlertDescription>
</Alert>

// Dismissible alert
<Alert 
  variant="success" 
  dismissible 
  onDismiss={() => console.log('Alert dismissed')}
>
  <AlertTitle>Success!</AlertTitle>
  <AlertDescription>
    Your changes have been saved successfully.
  </AlertDescription>
</Alert>
```

## API Reference

### Alert Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'destructive' \| 'success' \| 'warning' \| 'info'` | `'default'` | Visual style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size of the alert |
| `dismissible` | `boolean` | `false` | Whether alert can be dismissed |
| `onDismiss` | `() => void` | `undefined` | Callback when alert is dismissed |
| `icon` | `React.ReactNode` | `undefined` | Custom icon element |
| `autoIcon` | `boolean` | `true` | Whether to show automatic variant-based icon |
| `className` | `string` | `undefined` | Additional CSS classes |

### Subcomponents

#### AlertTitle
| Prop | Type | Description |
|------|------|-------------|
| `className` | `string` | Additional CSS classes |

#### AlertDescription  
| Prop | Type | Description |
|------|------|-------------|
| `className` | `string` | Additional CSS classes |

### Extends

All standard HTML div props for the main Alert component.

## Variants

### Default
```tsx
<Alert>
  <AlertTitle>Default Alert</AlertTitle>
  <AlertDescription>
    This is a default alert message.
  </AlertDescription>
</Alert>
```

### Destructive (Error)
```tsx
<Alert variant="destructive">
  <AlertTitle>Error Occurred</AlertTitle>
  <AlertDescription>
    Something went wrong. Please try again.
  </AlertDescription>
</Alert>
```

### Success
```tsx
<Alert variant="success">
  <AlertTitle>Success!</AlertTitle>
  <AlertDescription>
    Operation completed successfully.
  </AlertDescription>
</Alert>
```

### Warning
```tsx
<Alert variant="warning">
  <AlertTitle>Warning</AlertTitle>
  <AlertDescription>
    Please review before proceeding.
  </AlertDescription>
</Alert>
```

### Info
```tsx
<Alert variant="info">
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>
    Here's some helpful information.
  </AlertDescription>
</Alert>
```

## Sizes

### Small
```tsx
<Alert size="sm">
  <AlertTitle>Small Alert</AlertTitle>
  <AlertDescription>Compact alert message.</AlertDescription>
</Alert>
```

### Medium (Default)
```tsx
<Alert size="md">
  <AlertTitle>Medium Alert</AlertTitle>
  <AlertDescription>Standard alert message.</AlertDescription>
</Alert>
```

### Large
```tsx
<Alert size="lg">
  <AlertTitle>Large Alert</AlertTitle>
  <AlertDescription>Prominent alert message with more space.</AlertDescription>
</Alert>
```

## Icons

### Automatic Icons
By default, alerts show contextual icons based on their variant:

```tsx
// These automatically get appropriate icons
<Alert variant="destructive" /> // AlertCircle icon
<Alert variant="success" />     // CheckCircle icon  
<Alert variant="warning" />     // AlertTriangle icon
<Alert variant="info" />        // Info icon
```

### Custom Icons
```tsx
import { Heart, Shield } from 'lucide-react'

<Alert icon={<Heart className="h-4 w-4" />}>
  <AlertTitle>Custom Icon</AlertTitle>
  <AlertDescription>
    Alert with custom heart icon.
  </AlertDescription>
</Alert>

// Disable auto icon
<Alert autoIcon={false}>
  <AlertTitle>No Icon</AlertTitle>
  <AlertDescription>
    Alert without any icon.
  </AlertDescription>
</Alert>
```

## Common Use Cases

### Form Validation

```tsx
function FormValidationAlert({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null

  return (
    <Alert variant="destructive">
      <AlertTitle>Validation Errors</AlertTitle>
      <AlertDescription>
        <ul className="list-disc list-inside space-y-1">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
```

### API Response Messages

```tsx
function ApiResponseAlert({ 
  type, 
  message, 
  onDismiss 
}: { 
  type: 'success' | 'error', 
  message: string,
  onDismiss: () => void 
}) {
  return (
    <Alert 
      variant={type === 'error' ? 'destructive' : 'success'}
      dismissible
      onDismiss={onDismiss}
    >
      <AlertTitle>
        {type === 'error' ? 'Error' : 'Success'}
      </AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
```

### System Status

```tsx
function SystemStatusAlert({ 
  status 
}: { 
  status: 'online' | 'maintenance' | 'offline' 
}) {
  const config = {
    online: { variant: 'success', title: 'System Online', message: 'All systems operational' },
    maintenance: { variant: 'warning', title: 'Maintenance Mode', message: 'System under maintenance' },
    offline: { variant: 'destructive', title: 'System Offline', message: 'System currently unavailable' }
  } as const

  const { variant, title, message } = config[status]

  return (
    <Alert variant={variant}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
```

### Feature Announcements

```tsx
function FeatureAnnouncement({ 
  onDismiss 
}: { 
  onDismiss: () => void 
}) {
  return (
    <Alert variant="info" dismissible onDismiss={onDismiss}>
      <AlertTitle>New Feature Available!</AlertTitle>
      <AlertDescription>
        Check out our new dashboard with enhanced analytics and reporting.
        <a href="/features" className="ml-1 underline">
          Learn more
        </a>
      </AlertDescription>
    </Alert>
  )
}
```

## Advanced Patterns

### Alert with Actions

```tsx
function AlertWithActions({ onRetry, onDismiss }: {
  onRetry: () => void
  onDismiss: () => void
}) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Connection Failed</AlertTitle>
      <AlertDescription>
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
```

### Progressive Alert Stack

```tsx
function AlertStack({ alerts }: { alerts: Array<{
  id: string
  variant: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
}> }) {
  const [visibleAlerts, setVisibleAlerts] = useState(alerts)

  const dismissAlert = (id: string) => {
    setVisibleAlerts(prev => prev.filter(alert => alert.id !== id))
  }

  return (
    <div className="space-y-4">
      {visibleAlerts.map(alert => (
        <Alert
          key={alert.id}
          variant={alert.variant === 'error' ? 'destructive' : alert.variant}
          dismissible
          onDismiss={() => dismissAlert(alert.id)}
        >
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  )
}
```

### Timed Alert

```tsx
function TimedAlert({ 
  duration = 5000,
  onDismiss,
  ...props 
}: AlertProps & { duration?: number }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss?.()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  return (
    <Alert dismissible onDismiss={onDismiss} {...props} />
  )
}
```

## Accessibility

### Features
- **ARIA Role**: Uses `role="alert"` for immediate announcement to screen readers
- **Keyboard Navigation**: Dismiss button is keyboard accessible
- **Focus Management**: Proper focus indicators and outline
- **Color Independence**: Information conveyed through icons and text, not just color
- **Screen Reader Support**: Proper heading structure with AlertTitle

### Best Practices

```tsx
// Use semantic structure
<Alert>
  <AlertTitle>Clear, descriptive title</AlertTitle>
  <AlertDescription>
    Detailed message that provides context and next steps.
  </AlertDescription>
</Alert>

// Provide meaningful dismiss labels
<Alert 
  dismissible 
  onDismiss={handleDismiss}
  aria-label="Dismiss success notification"
>
  <AlertTitle>Success</AlertTitle>
  <AlertDescription>Changes saved</AlertDescription>
</Alert>

// Use appropriate variants for semantic meaning
<Alert variant="destructive">  {/* For errors */}
<Alert variant="warning">     {/* For warnings */}
<Alert variant="success">     {/* For confirmations */}
<Alert variant="info">        {/* For information */}
```

## Performance

### Optimizations
- **Memoized Variants**: CVA variants are computed once and cached
- **Efficient Icons**: Icon components are only rendered when needed
- **Minimal Re-renders**: Uses React.forwardRef and stable references
- **CSS-based Animations**: Hardware-accelerated transitions

### Best Practices

```tsx
// Memoize for alert lists
const MemoizedAlert = React.memo(Alert)

// Optimize dismiss handlers
function OptimizedAlertList({ alerts }: { alerts: AlertItem[] }) {
  const handleDismiss = useCallback((id: string) => {
    // Handle dismissal
  }, [])

  return (
    <div className="space-y-4">
      {alerts.map(alert => (
        <MemoizedAlert
          key={alert.id}
          variant={alert.variant}
          dismissible
          onDismiss={() => handleDismiss(alert.id)}
        >
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
        </MemoizedAlert>
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
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --border: 214.3 31.8% 91.4%;
  --destructive: 0 84.2% 60.2%;
  --ring: 222.2 84% 4.9%;
}
```

### Custom Styling

```tsx
// Custom gradient background
<Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
  <AlertTitle>Custom Styled Alert</AlertTitle>
  <AlertDescription>With gradient background</AlertDescription>
</Alert>

// Enhanced spacing
<Alert className="p-6 space-y-3">
  <AlertTitle className="text-lg">Large Title</AlertTitle>
  <AlertDescription className="text-base leading-relaxed">
    Enhanced spacing and typography.
  </AlertDescription>
</Alert>
```

## Testing

### Test Examples

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

test('renders alert with title and description', () => {
  render(
    <Alert>
      <AlertTitle>Test Title</AlertTitle>
      <AlertDescription>Test Description</AlertDescription>
    </Alert>
  )
  
  expect(screen.getByText('Test Title')).toBeInTheDocument()
  expect(screen.getByText('Test Description')).toBeInTheDocument()
  expect(screen.getByRole('alert')).toBeInTheDocument()
})

test('handles dismiss functionality', async () => {
  const user = userEvent.setup()
  const handleDismiss = jest.fn()
  
  render(
    <Alert dismissible onDismiss={handleDismiss}>
      <AlertTitle>Dismissible Alert</AlertTitle>
    </Alert>
  )
  
  await user.click(screen.getByLabelText('Dismiss alert'))
  expect(handleDismiss).toHaveBeenCalledTimes(1)
})

test('shows appropriate icon for variant', () => {
  render(
    <Alert variant="success">
      <AlertTitle>Success</AlertTitle>
    </Alert>
  )
  
  // Check for CheckCircle icon (you may need to test the SVG differently)
  expect(screen.getByRole('alert')).toBeInTheDocument()
})
```

## Migration Guide

### From Legacy Alerts

```tsx
// Before (legacy alert)
<div className="alert alert-danger">
  <strong>Error!</strong> Something went wrong.
</div>

// After (new Alert component)
<Alert variant="destructive">
  <AlertTitle>Error!</AlertTitle>
  <AlertDescription>Something went wrong.</AlertDescription>
</Alert>
```

### Breaking Changes
- Alert content must use `AlertTitle` and `AlertDescription` components
- Icons are handled automatically based on variant
- Dismissible functionality uses props instead of custom buttons

### Migration Checklist
- [ ] Replace `className="alert alert-*"` with `variant` prop
- [ ] Wrap content in `AlertTitle` and `AlertDescription` 
- [ ] Remove custom icons and use `autoIcon` or `icon` prop
- [ ] Replace custom dismiss buttons with `dismissible` and `onDismiss` props
- [ ] Update variant names to match new system

## Related Components

- [Toast](./toast.md) - For temporary notifications
- [Badge](./badge.md) - For status indicators
- [Button](./button.md) - For alert actions
- [Dialog](../molecular/dialog.md) - For modal alerts
- [Card](../molecular/card.md) - For grouped content containers
