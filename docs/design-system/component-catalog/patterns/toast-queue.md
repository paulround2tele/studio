# Toast Management Patterns

Advanced toast queue management and notification systems for complex user interactions.

## Overview

Toast management patterns provide sophisticated control over notification display, queuing, prioritization, and user interaction flows. These patterns ensure users receive timely feedback without overwhelming the interface.

## Core Components Integration

- **Toaster**: Toast container and positioning
- **Toast**: Individual notification components
- **Queue Management**: Programmatic toast control
- **Button**: Action triggers and toast interactions

## Basic Queue Management Pattern

```tsx
const useToastQueue = () => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [maxConcurrent, setMaxConcurrent] = useState(3)
  
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString()
    const newToast = { ...toast, id }
    
    setToasts(prev => {
      const updated = [...prev, newToast]
      // Limit concurrent toasts
      if (updated.length > maxConcurrent) {
        return updated.slice(-maxConcurrent)
      }
      return updated
    })
    
    return id
  }, [maxConcurrent])
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])
  
  const clearAllToasts = useCallback(() => {
    setToasts([])
  }, [])
  
  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    setMaxConcurrent
  }
}

const ToastQueueProvider = ({ children }: { children: React.ReactNode }) => {
  const queueMethods = useToastQueue()
  
  return (
    <ToastQueueContext.Provider value={queueMethods}>
      {children}
      <Toaster />
    </ToastQueueContext.Provider>
  )
}
```

## Priority-Based Queue Pattern

```tsx
type ToastPriority = 'low' | 'normal' | 'high' | 'critical'

interface PriorityToast extends Omit<Toast, 'id'> {
  priority: ToastPriority
  category?: string
  persistent?: boolean
}

const usePriorityToastQueue = () => {
  const [toasts, setToasts] = useState<(PriorityToast & { id: string })[]>([])
  
  const priorityOrder: Record<ToastPriority, number> = {
    critical: 4,
    high: 3,
    normal: 2,
    low: 1
  }
  
  const addPriorityToast = useCallback((toast: PriorityToast) => {
    const id = Date.now().toString()
    const newToast = { ...toast, id }
    
    setToasts(prev => {
      const updated = [...prev, newToast]
      
      // Sort by priority, then by timestamp
      return updated.sort((a, b) => {
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return parseInt(b.id) - parseInt(a.id)
      })
    })
    
    // Auto-dismiss non-persistent toasts based on priority
    if (!toast.persistent) {
      const dismissTime = {
        low: 3000,
        normal: 5000,
        high: 8000,
        critical: 0 // Don't auto-dismiss
      }[toast.priority]
      
      if (dismissTime > 0) {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id))
        }, dismissTime)
      }
    }
    
    return id
  }, [])
  
  return { toasts, addPriorityToast }
}
```

## Bulk Operations Pattern

```tsx
const BulkOperationToasts = () => {
  const { toast } = useToast()
  const [operations, setOperations] = useState<{
    id: string
    total: number
    completed: number
    failed: number
    status: 'running' | 'completed' | 'failed'
  }[]>([])
  
  const startBulkOperation = useCallback(async (items: any[], operation: (item: any) => Promise<void>) => {
    const operationId = Date.now().toString()
    const total = items.length
    
    // Initialize operation
    setOperations(prev => [...prev, {
      id: operationId,
      total,
      completed: 0,
      failed: 0,
      status: 'running'
    }])
    
    // Show initial toast
    const toastId = toast({
      title: "Bulk operation started",
      description: `Processing ${total} items...`,
      action: (
        <div className="flex items-center space-x-2">
          <Progress value={0} className="w-20" />
          <span className="text-xs">0%</span>
        </div>
      ),
      duration: Infinity
    })
    
    let completed = 0
    let failed = 0
    
    // Process items
    for (const item of items) {
      try {
        await operation(item)
        completed++
      } catch (error) {
        failed++
      }
      
      // Update progress
      const progress = ((completed + failed) / total) * 100
      setOperations(prev => prev.map(op => 
        op.id === operationId 
          ? { ...op, completed, failed }
          : op
      ))
      
      // Update toast
      toast({
        id: toastId,
        title: "Processing...",
        description: `${completed + failed} of ${total} items processed`,
        action: (
          <div className="flex items-center space-x-2">
            <Progress value={progress} className="w-20" />
            <span className="text-xs">{Math.round(progress)}%</span>
          </div>
        ),
        duration: Infinity
      })
    }
    
    // Final result toast
    const finalStatus = failed === 0 ? 'completed' : 'failed'
    setOperations(prev => prev.map(op => 
      op.id === operationId 
        ? { ...op, status: finalStatus }
        : op
    ))
    
    toast({
      id: toastId,
      title: "Bulk operation complete",
      description: (
        <div className="space-y-1">
          <p>✅ {completed} items processed successfully</p>
          {failed > 0 && <p>❌ {failed} items failed</p>}
        </div>
      ),
      variant: finalStatus === 'completed' ? 'default' : 'destructive',
      action: failed > 0 ? (
        <Button variant="outline" size="sm" onClick={() => retryFailedItems()}>
          Retry Failed
        </Button>
      ) : undefined
    })
  }, [toast])
  
  return { startBulkOperation, operations }
}
```

## Form Validation Toast Pattern

```tsx
const FormValidationToasts = () => {
  const { toast } = useToast()
  
  const showValidationErrors = useCallback((errors: Record<string, string[]>) => {
    const errorCount = Object.keys(errors).length
    const totalErrors = Object.values(errors).flat().length
    
    if (errorCount === 1) {
      // Single field error
      const [field, fieldErrors] = Object.entries(errors)[0]
      toast({
        title: `Error in ${field}`,
        description: fieldErrors[0],
        variant: "destructive",
      })
    } else {
      // Multiple field errors
      toast({
        title: `${errorCount} fields have errors`,
        description: (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {Object.entries(errors).map(([field, fieldErrors]) => (
              <div key={field} className="text-sm">
                <strong>{field}:</strong> {fieldErrors[0]}
              </div>
            ))}
          </div>
        ),
        variant: "destructive",
        duration: 8000, // Longer duration for multiple errors
      })
    }
  }, [toast])
  
  const showFieldSuccess = useCallback((field: string, message?: string) => {
    toast({
      title: "Field updated",
      description: message || `${field} has been updated successfully`,
      variant: "default",
      duration: 2000, // Short duration for field success
    })
  }, [toast])
  
  const showFormSuccess = useCallback((message: string, actions?: React.ReactNode) => {
    toast({
      title: "Success!",
      description: message,
      variant: "default",
      action: actions,
    })
  }, [toast])
  
  return {
    showValidationErrors,
    showFieldSuccess,
    showFormSuccess
  }
}
```

## Real-time Notification Pattern

```tsx
const RealTimeNotifications = () => {
  const { toast } = useToast()
  const [notificationQueue, setNotificationQueue] = useState<any[]>([])
  const [isUserActive, setIsUserActive] = useState(true)
  
  // Track user activity
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    const resetTimeout = () => {
      setIsUserActive(true)
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => setIsUserActive(false), 30000) // 30s of inactivity
    }
    
    window.addEventListener('mousemove', resetTimeout)
    window.addEventListener('keypress', resetTimeout)
    
    return () => {
      window.removeEventListener('mousemove', resetTimeout)
      window.removeEventListener('keypress', resetTimeout)
      clearTimeout(timeoutId)
    }
  }, [])
  
  // WebSocket connection for real-time notifications
  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!)
    
    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data)
      
      if (isUserActive) {
        // Show immediately if user is active
        showNotification(notification)
      } else {
        // Queue notifications if user is inactive
        setNotificationQueue(prev => [...prev, notification])
      }
    }
    
    return () => ws.close()
  }, [isUserActive])
  
  // Show queued notifications when user becomes active
  useEffect(() => {
    if (isUserActive && notificationQueue.length > 0) {
      // Show summary of queued notifications
      if (notificationQueue.length === 1) {
        showNotification(notificationQueue[0])
      } else {
        toast({
          title: `${notificationQueue.length} new notifications`,
          description: "Click to view all notifications",
          action: (
            <Button variant="outline" size="sm" onClick={() => showAllQueued()}>
              View All
            </Button>
          ),
        })
      }
      
      setNotificationQueue([])
    }
  }, [isUserActive, notificationQueue])
  
  const showNotification = (notification: any) => {
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
  
  const showAllQueued = () => {
    notificationQueue.forEach((notification, index) => {
      setTimeout(() => showNotification(notification), index * 500)
    })
  }
}
```

## Contextual Toast Patterns

```tsx
// E-commerce specific toasts
const EcommerceToasts = () => {
  const { toast } = useToast()
  
  const addToCartToast = (product: Product) => {
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
      action: (
        <div className="flex space-x-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/cart">View Cart</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => continueShopping()}>
            Continue Shopping
          </Button>
        </div>
      ),
    })
  }
  
  const orderStatusToast = (order: Order) => {
    const statusMessages = {
      confirmed: "Your order has been confirmed",
      shipped: "Your order has been shipped", 
      delivered: "Your order has been delivered",
      cancelled: "Your order has been cancelled"
    }
    
    toast({
      title: `Order ${order.status}`,
      description: statusMessages[order.status],
      variant: order.status === 'cancelled' ? 'destructive' : 'default',
      action: (
        <Button asChild variant="outline" size="sm">
          <Link to={`/orders/${order.id}`}>View Order</Link>
        </Button>
      ),
    })
  }
  
  return { addToCartToast, orderStatusToast }
}

// Social media specific toasts
const SocialToasts = () => {
  const { toast } = useToast()
  
  const likeNotificationToast = (user: User, content: string) => {
    toast({
      title: "New like",
      description: `${user.name} liked your ${content}`,
      action: (
        <Button asChild variant="outline" size="sm">
          <Link to="/notifications">View All</Link>
        </Button>
      ),
    })
  }
  
  const commentNotificationToast = (user: User, preview: string) => {
    toast({
      title: "New comment",
      description: (
        <div>
          <p className="font-medium">{user.name} commented:</p>
          <p className="text-sm text-muted-foreground">"{preview}"</p>
        </div>
      ),
      action: (
        <Button variant="outline" size="sm" onClick={() => openCommentModal()}>
          Reply
        </Button>
      ),
    })
  }
  
  return { likeNotificationToast, commentNotificationToast }
}
```

## API Reference

### ToastQueue Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `add` | `toast: ToastOptions` | Add toast to queue |
| `remove` | `id: string` | Remove specific toast |
| `clear` | - | Clear all toasts |
| `setMaxConcurrent` | `max: number` | Set max concurrent toasts |
| `setPriority` | `id: string, priority: ToastPriority` | Update toast priority |

### Toast Options Extended

| Option | Type | Description |
|--------|------|-------------|
| `priority` | `'low' \| 'normal' \| 'high' \| 'critical'` | Toast priority level |
| `category` | `string` | Toast category for grouping |
| `persistent` | `boolean` | Prevent auto-dismissal |
| `progress` | `number` | Progress value (0-100) |
| `onDismiss` | `() => void` | Dismissal callback |
| `onAction` | `() => void` | Action button callback |

## Best Practices

### Do's
- Implement priority-based queuing for important notifications
- Group related notifications to avoid spam
- Provide clear actions for actionable toasts
- Use appropriate timeouts based on content importance
- Handle user activity states for better UX

### Don'ts
- Don't overwhelm users with too many simultaneous toasts
- Don't use toasts for critical errors requiring immediate attention
- Don't make toasts the only way to access important information
- Don't ignore user preferences for notification frequency
- Don't forget to handle edge cases like network interruptions

## Related Components

- [Toaster](../organism/toaster.md) - Toast container system
- [Toast](../molecular/toast.md) - Individual notification
- [Button](../atomic/button.md) - Toast actions
- [Progress](../atomic/progress.md) - Operation progress
- [Alert](../atomic/alert.md) - Static alerts
