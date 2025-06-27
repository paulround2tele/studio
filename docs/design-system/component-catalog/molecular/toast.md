# Toast Component

## Overview

The Toast component provides a notification system for displaying temporary messages to users. Built on Radix UI primitives with support for different variants, actions, and automatic dismissal. Perfect for success messages, errors, warnings, and status updates.

## API Reference

### ToastProvider

Root provider that manages toast notifications.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `duration` | `number` | `5000` | Default duration before auto-dismiss (ms) |
| `swipeDirection` | `"right" \| "left" \| "up" \| "down"` | `"right"` | Swipe direction to dismiss |
| `swipeThreshold` | `number` | `50` | Distance threshold for swipe dismiss |

### Toast

Main toast notification component.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "destructive" \| "success" \| "warning" \| "info"` | `"default"` | Visual style variant |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Toast size |
| `showIcon` | `boolean` | `false` | Whether to show variant icon |
| `icon` | `React.ReactNode` | `undefined` | Custom icon element |
| `duration` | `number` | `5000` | Auto-dismiss duration (ms) |
| `onClose` | `() => void` | `undefined` | Close callback |
| `open` | `boolean` | `undefined` | Controlled open state |
| `onOpenChange` | `(open: boolean) => void` | `undefined` | Open state change handler |

### ToastAction

Action button within toast.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `altText` | `string` | Required | Accessible description of action |
| `onClick` | `() => void` | `undefined` | Click handler |
| `className` | `string` | `undefined` | Additional CSS classes |

### ToastTitle & ToastDescription

Title and description text components.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `undefined` | Additional CSS classes |

## Usage Examples

### Basic Toast

```tsx
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

// Simple usage with hook
<Button onClick={() => toast({
  title: "Success!",
  description: "Your changes have been saved."
})}>
  Show Toast
</Button>
```

### Different Variants

```tsx
// Success toast
<Button onClick={() => toast({
  variant: "success",
  title: "Upload Complete",
  description: "Your file has been uploaded successfully.",
  showIcon: true
})}>
  Success Toast
</Button>

// Error toast
<Button onClick={() => toast({
  variant: "destructive",
  title: "Error",
  description: "Something went wrong. Please try again.",
  showIcon: true
})}>
  Error Toast
</Button>

// Warning toast
<Button onClick={() => toast({
  variant: "warning",
  title: "Warning",
  description: "This action cannot be undone.",
  showIcon: true
})}>
  Warning Toast
</Button>

// Info toast
<Button onClick={() => toast({
  variant: "info",
  title: "Info",
  description: "New features are now available.",
  showIcon: true
})}>
  Info Toast
</Button>
```

### With Actions

```tsx
// Toast with action button
<Button onClick={() => toast({
  title: "New message",
  description: "You have received a new message.",
  action: (
    <ToastAction 
      altText="View message"
      onClick={() => navigateTo('/messages')}
    >
      View
    </ToastAction>
  )
})}>
  Toast with Action
</Button>

// Multiple actions
<Button onClick={() => toast({
  title: "Friend request",
  description: "John Doe wants to connect with you.",
  action: (
    <div className="flex space-x-2">
      <ToastAction 
        altText="Accept request"
        onClick={() => acceptRequest()}
      >
        Accept
      </ToastAction>
      <ToastAction 
        altText="Decline request"
        onClick={() => declineRequest()}
      >
        Decline
      </ToastAction>
    </div>
  )
})}>
  Multiple Actions
</Button>
```

### Custom Duration

```tsx
// Persistent toast (no auto-dismiss)
<Button onClick={() => toast({
  title: "Important Notice",
  description: "Please complete your profile.",
  duration: Infinity
})}>
  Persistent Toast
</Button>

// Quick toast
<Button onClick={() => toast({
  title: "Copied!",
  description: "Text copied to clipboard.",
  duration: 2000
})}>
  Quick Toast
</Button>
```

### Custom Icons

```tsx
import { CheckCircle, AlertTriangle, Info } from "lucide-react"

// Custom success icon
<Button onClick={() => toast({
  title: "Task completed",
  description: "All items have been processed.",
  icon: <CheckCircle className="h-4 w-4 text-green-500" />
})}>
  Custom Icon
</Button>

// Loading toast
<Button onClick={() => toast({
  title: "Processing...",
  description: "Please wait while we process your request.",
  icon: <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
})}>
  Loading Toast
</Button>
```

### Programmatic Control

```tsx
const [toasts, setToasts] = useState([])

const addToast = () => {
  const id = Math.random().toString(36).substr(2, 9)
  const newToast = {
    id,
    title: "New notification",
    description: `Toast ${id}`,
    open: true,
    onOpenChange: (open) => {
      if (!open) {
        setToasts(prev => prev.filter(t => t.id !== id))
      }
    }
  }
  setToasts(prev => [...prev, newToast])
}

const removeToast = (id) => {
  setToasts(prev => prev.filter(t => t.id !== id))
}

// Render toasts
{toasts.map(toast => (
  <Toast key={toast.id} {...toast}>
    <ToastTitle>{toast.title}</ToastTitle>
    <ToastDescription>{toast.description}</ToastDescription>
    <ToastClose />
  </Toast>
))}
```

### Form Submission Feedback

```tsx
const handleSubmit = async (formData) => {
  try {
    await submitForm(formData)
    toast({
      variant: "success",
      title: "Form submitted",
      description: "Your form has been submitted successfully.",
      showIcon: true
    })
  } catch (error) {
    toast({
      variant: "destructive",
      title: "Submission failed",
      description: error.message || "Please try again.",
      showIcon: true,
      action: (
        <ToastAction 
          altText="Retry submission"
          onClick={() => handleSubmit(formData)}
        >
          Retry
        </ToastAction>
      )
    })
  }
}
```

### Bulk Operations

```tsx
const handleBulkDelete = async (items) => {
  const toastId = toast({
    title: `Deleting ${items.length} items...`,
    description: "Please wait while we delete the selected items.",
    duration: Infinity
  })

  try {
    await deleteItems(items)
    
    // Update toast to success
    toast({
      id: toastId,
      variant: "success",
      title: "Items deleted",
      description: `Successfully deleted ${items.length} items.`,
      showIcon: true,
      duration: 5000,
      action: (
        <ToastAction 
          altText="Undo deletion"
          onClick={() => undoDelete(items)}
        >
          Undo
        </ToastAction>
      )
    })
  } catch (error) {
    toast({
      id: toastId,
      variant: "destructive",
      title: "Deletion failed",
      description: "Some items could not be deleted.",
      showIcon: true
    })
  }
}
```

## Accessibility

### Features

- **ARIA Support**: Full ARIA live region implementation
- **Screen Reader**: Automatic announcements for new toasts
- **Keyboard Navigation**: Focus management and dismissal
- **Swipe Gestures**: Touch-friendly dismissal on mobile
- **Semantic Roles**: Proper alert/status roles

### Best Practices

```tsx
// Provide meaningful titles and descriptions
toast({
  title: "Email sent",
  description: "Your message has been sent to john@example.com",
  variant: "success"
})

// Use appropriate variants for context
toast({
  variant: "destructive",
  title: "Validation error",
  description: "Please fill in all required fields.",
  action: (
    <ToastAction altText="Go to first error">
      Fix
    </ToastAction>
  )
})

// Include action alternatives
toast({
  title: "Connection lost",
  description: "Attempting to reconnect...",
  action: (
    <ToastAction altText="Retry connection manually">
      Retry Now
    </ToastAction>
  )
})
```

## Styling

### CSS Variables

The component uses the following CSS custom properties:

- `--background`: Toast background color
- `--foreground`: Text color
- `--border`: Border color
- `--destructive`: Error variant colors
- `--ring`: Focus ring color

### Customization

```tsx
// Custom toast styling
toast({
  title: "Custom toast",
  className: "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
})

// Custom positioning
<ToastViewport className="top-0 left-0 right-auto bottom-auto" />

// Theme-based styling
toast({
  title: "Dark theme toast",
  className: "dark:bg-gray-800 dark:text-white dark:border-gray-700"
})
```

## Performance

### Optimization Tips

1. **Limit Active Toasts**: Prevent toast spam by limiting concurrent toasts
2. **Memory Management**: Clean up dismissed toasts promptly
3. **Debounce Rapid Toasts**: Combine similar toasts

```tsx
// Toast queue management
const MAX_TOASTS = 3
const toastQueue = []

const showToast = (toastData) => {
  if (activeToasts.length >= MAX_TOASTS) {
    toastQueue.push(toastData)
    return
  }
  
  displayToast(toastData)
}

// Debounced toasts
const debouncedToast = useMemo(
  () => debounce((message) => {
    toast({
      title: "Auto-save",
      description: message
    })
  }, 1000),
  []
)

// Cleanup on unmount
useEffect(() => {
  return () => {
    clearAllToasts()
  }
}, [])
```

## Migration Guide

### From Alert Components

```tsx
// Before: Static alert
<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong</AlertDescription>
</Alert>

// After: Toast notification
toast({
  variant: "destructive",
  title: "Error",
  description: "Something went wrong"
})
```

### From Custom Notifications

```tsx
// Before: Custom notification
const showNotification = (message, type) => {
  const notification = document.createElement('div')
  notification.textContent = message
  notification.className = `notification ${type}`
  document.body.appendChild(notification)
  
  setTimeout(() => {
    document.body.removeChild(notification)
  }, 5000)
}

// After: Toast system
toast({
  title: "Notification",
  description: message,
  variant: type === 'error' ? 'destructive' : 'default'
})
```

## Related Components

- **Alert**: For static status messages
- **Dialog**: For modal confirmations
- **Popover**: For contextual information
- **Notification**: For persistent notifications

## Testing

### Test Scenarios

```tsx
import { render, screen } from '@testing-library/react'
import { toast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'

// Basic toast display
test('displays toast message', async () => {
  render(<Toaster />)
  
  toast({
    title: "Test toast",
    description: "This is a test message"
  })
  
  expect(await screen.findByText("Test toast")).toBeInTheDocument()
  expect(screen.getByText("This is a test message")).toBeInTheDocument()
})

// Action functionality
test('executes action on click', async () => {
  const actionHandler = jest.fn()
  
  render(<Toaster />)
  
  toast({
    title: "Test",
    action: (
      <ToastAction altText="Test action" onClick={actionHandler}>
        Click me
      </ToastAction>
    )
  })
  
  const actionButton = await screen.findByText("Click me")
  fireEvent.click(actionButton)
  
  expect(actionHandler).toHaveBeenCalled()
})

// Auto-dismiss
test('auto-dismisses after duration', async () => {
  jest.useFakeTimers()
  
  render(<Toaster />)
  
  toast({
    title: "Auto dismiss",
    duration: 2000
  })
  
  expect(await screen.findByText("Auto dismiss")).toBeInTheDocument()
  
  jest.advanceTimersByTime(2000)
  
  await waitFor(() => {
    expect(screen.queryByText("Auto dismiss")).not.toBeInTheDocument()
  })
  
  jest.useRealTimers()
})
```
