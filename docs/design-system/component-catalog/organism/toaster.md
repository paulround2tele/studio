# Toaster

Toast notification system for displaying temporary messages and alerts to users.

## Overview

The Toaster component manages the display and positioning of toast notifications. It provides a centralized system for showing multiple toasts with various positioning options, limits, animations, and queue management.

## Import

```typescript
import { 
  Toaster,
  showToast,
  ToastQueue
} from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
```

## Basic Usage

```tsx
// Add Toaster to your app root
function App() {
  return (
    <div>
      {/* Your app content */}
      <Toaster />
    </div>
  )
}

// Using the toast hook
function MyComponent() {
  const { toast } = useToast()
  
  const showNotification = () => {
    toast({
      title: "Success!",
      description: "Your action was completed successfully.",
      variant: "default",
    })
  }
  
  return (
    <Button onClick={showNotification}>
      Show Toast
    </Button>
  )
}
```

## Positioning Options

```tsx
// Bottom right (default)
<Toaster position="bottom-right" />

// Top center
<Toaster position="top-center" />

// Top left
<Toaster position="top-left" />

// Top right
<Toaster position="top-right" />

// Bottom left
<Toaster position="bottom-left" />

// Bottom center
<Toaster position="bottom-center" />
```

## Configuration Options

```tsx
// Custom configuration
<Toaster
  position="top-right"
  limit={3}              // Max visible toasts
  duration={4000}        // Toast duration in ms
  expand={false}         // Expand all toasts
  richColors={true}      // Enhanced styling
  closeButton={true}     // Show close buttons
/>
```

## Toast Variants

```tsx
const { toast } = useToast()

// Success toast
toast({
  title: "Success",
  description: "Operation completed successfully",
  variant: "default",
})

// Error toast
toast({
  title: "Error",
  description: "Something went wrong",
  variant: "destructive",
})

// Warning toast
toast({
  title: "Warning", 
  description: "Please check your input",
  variant: "warning",
})

// Info toast
toast({
  title: "Info",
  description: "New update available",
  variant: "info",
})
```

## Advanced Examples

### Action Buttons

```tsx
const { toast } = useToast()

const showUndoToast = () => {
  toast({
    title: "Item deleted",
    description: "The item has been moved to trash",
    action: (
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => {
          // Undo logic
          console.log("Undoing action...")
        }}
      >
        Undo
      </Button>
    ),
  })
}
```

### Progress Toast

```tsx
const [progress, setProgress] = useState(0)

const showProgressToast = () => {
  const toastId = Date.now().toString()
  
  toast({
    id: toastId,
    title: "Uploading file...",
    description: (
      <div className="space-y-2">
        <Progress value={progress} className="w-full" />
        <p className="text-xs text-muted-foreground">{progress}% complete</p>
      </div>
    ),
    duration: Infinity, // Don't auto-dismiss
  })
  
  // Simulate progress
  const interval = setInterval(() => {
    setProgress(prev => {
      if (prev >= 100) {
        clearInterval(interval)
        // Update toast to success
        toast({
          id: toastId,
          title: "Upload complete!",
          description: "Your file has been uploaded successfully.",
          variant: "default",
        })
        return 100
      }
      return prev + 10
    })
  }, 500)
}
```

### Form Validation Toasts

```tsx
const validateForm = (formData: FormData) => {
  const errors = []
  
  if (!formData.email) {
    errors.push("Email is required")
  }
  
  if (!formData.password) {
    errors.push("Password is required")
  }
  
  if (errors.length > 0) {
    toast({
      title: "Validation Error",
      description: (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <p key={index} className="text-sm">• {error}</p>
          ))}
        </div>
      ),
      variant: "destructive",
    })
    return false
  }
  
  return true
}
```

### API Response Toasts

```tsx
const saveData = async (data: any) => {
  const loadingToastId = Date.now().toString()
  
  // Show loading toast
  toast({
    id: loadingToastId,
    title: "Saving...",
    description: "Please wait while we save your changes",
    duration: Infinity,
  })
  
  try {
    await api.save(data)
    
    // Success toast
    toast({
      id: loadingToastId,
      title: "Saved successfully",
      description: "Your changes have been saved",
      variant: "default",
    })
  } catch (error) {
    // Error toast
    toast({
      id: loadingToastId,
      title: "Save failed",
      description: "Failed to save changes. Please try again.",
      variant: "destructive",
      action: (
        <Button variant="outline" size="sm" onClick={() => saveData(data)}>
          Retry
        </Button>
      ),
    })
  }
}
```

### Bulk Operation Toasts

```tsx
const processBulkItems = async (items: any[]) => {
  const results = { success: 0, failed: 0 }
  
  for (const item of items) {
    try {
      await processItem(item)
      results.success++
    } catch (error) {
      results.failed++
    }
  }
  
  // Summary toast
  toast({
    title: "Bulk operation complete",
    description: (
      <div className="space-y-1">
        <p>✅ {results.success} items processed successfully</p>
        {results.failed > 0 && (
          <p>❌ {results.failed} items failed</p>
        )}
      </div>
    ),
    variant: results.failed > 0 ? "warning" : "default",
  })
}
```

### Real-time Notifications

```tsx
const useRealTimeNotifications = () => {
  const { toast } = useToast()
  
  useEffect(() => {
    const eventSource = new EventSource('/api/notifications')
    
    eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data)
      
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type,
        action: notification.actionUrl ? (
          <Button asChild variant="outline" size="sm">
            <a href={notification.actionUrl}>View</a>
          </Button>
        ) : undefined,
      })
    }
    
    return () => eventSource.close()
  }, [toast])
}
```

### Queue Management

```tsx
const toastQueue = ToastQueue.getInstance()

// Add multiple toasts to queue
const showMultipleToasts = () => {
  const messages = [
    "First notification",
    "Second notification", 
    "Third notification",
    "Fourth notification",
  ]
  
  messages.forEach((message, index) => {
    setTimeout(() => {
      toast({
        title: `Message ${index + 1}`,
        description: message,
      })
    }, index * 1000) // Stagger notifications
  })
}

// Clear all toasts
const clearAllToasts = () => {
  toastQueue.clear()
}
```

## Toast Patterns

### E-commerce Actions

```tsx
// Add to cart
const addToCart = (product: Product) => {
  toast({
    title: "Added to cart",
    description: `${product.name} has been added to your cart`,
    action: (
      <Button asChild variant="outline" size="sm">
        <Link to="/cart">View Cart</Link>
      </Button>
    ),
  })
}

// Order confirmation
const orderPlaced = (orderId: string) => {
  toast({
    title: "Order placed successfully",
    description: `Order #${orderId} has been confirmed`,
    action: (
      <Button asChild variant="outline" size="sm">
        <Link to={`/orders/${orderId}`}>Track Order</Link>
      </Button>
    ),
  })
}
```

### Social Actions

```tsx
// Like notification
const showLikeNotification = (username: string) => {
  toast({
    title: "New like",
    description: `${username} liked your post`,
    action: (
      <Button asChild variant="outline" size="sm">
        <Link to="/notifications">View All</Link>
      </Button>
    ),
  })
}

// Comment notification
const showCommentNotification = (username: string, preview: string) => {
  toast({
    title: "New comment",
    description: (
      <div>
        <p className="font-medium">{username} commented:</p>
        <p className="text-sm text-muted-foreground">"{preview}"</p>
      </div>
    ),
  })
}
```

## API Reference

### Toaster Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `'top-left' \| 'top-center' \| 'top-right' \| 'bottom-left' \| 'bottom-center' \| 'bottom-right'` | `'bottom-right'` | Toast position |
| `limit` | `number` | `5` | Max visible toasts |
| `duration` | `number` | `5000` | Default toast duration (ms) |
| `expand` | `boolean` | `false` | Expand all toasts |
| `richColors` | `boolean` | `false` | Enhanced color styling |
| `closeButton` | `boolean` | `true` | Show close buttons |

### Toast Options

| Option | Type | Description |
|--------|------|-------------|
| `id` | `string` | Unique toast identifier |
| `title` | `string` | Toast title |
| `description` | `React.ReactNode` | Toast content |
| `variant` | `'default' \| 'destructive' \| 'warning' \| 'info'` | Toast style |
| `action` | `React.ReactNode` | Action button |
| `duration` | `number` | Custom duration |

### useToast Hook

```tsx
const { toast, dismiss } = useToast()

// Show toast
toast({
  title: "Title",
  description: "Description",
})

// Dismiss specific toast
dismiss(toastId)

// Dismiss all toasts
dismiss()
```

## Accessibility

- ARIA live regions for screen reader announcements
- Keyboard navigation support (Tab, Enter, Escape)
- Focus management when toasts appear/disappear
- Proper contrast ratios for all variants
- Screen reader friendly content structure

## Best Practices

### Do's
- Use toasts for non-critical, temporary feedback
- Keep messages concise and actionable
- Use appropriate variants for different message types
- Provide clear action buttons when needed
- Limit the number of simultaneous toasts

### Don'ts
- Don't use toasts for critical errors requiring immediate attention
- Don't make toasts the only way to access important information
- Don't use toasts for complex forms or multi-step processes
- Don't overwhelm users with too many notifications
- Don't make toast content too verbose

## Design Tokens

```css
/* Toast positioning */
--toast-offset: 1rem;
--toast-gap: 0.5rem;

/* Toast animations */
--toast-duration-enter: 200ms;
--toast-duration-exit: 150ms;
--toast-timing: cubic-bezier(0.16, 1, 0.3, 1);

/* Toast stacking */
--toast-z-index: 100;
--toast-stack-offset: 4px;
--toast-stack-scale: 0.95;
```

## Related Components

- [Toast](../molecular/toast.md) - Individual toast component
- [Alert](../atomic/alert.md) - Static alert messages
- [Dialog](./dialog.md) - Modal dialogs
- [Button](../atomic/button.md) - Toast actions
