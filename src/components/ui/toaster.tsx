"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { cn } from "@/lib/utils"

const toasterVariants = cva(
  "",
  {
    variants: {
      position: {
        "top-left": "top-0 left-0",
        "top-center": "top-0 left-1/2 -translate-x-1/2",
        "top-right": "top-0 right-0",
        "bottom-left": "bottom-0 left-0",
        "bottom-center": "bottom-0 left-1/2 -translate-x-1/2", 
        "bottom-right": "bottom-0 right-0",
      },
      maxToasts: {
        1: "",
        3: "",
        5: "",
        10: "",
        unlimited: ""
      }
    },
    defaultVariants: {
      position: "bottom-right",
      maxToasts: 5
    }
  }
)

interface ToasterProps extends VariantProps<typeof toasterVariants> {
  className?: string
  limit?: number
  expand?: boolean
  richColors?: boolean
  closeButton?: boolean
  duration?: number
}

export function Toaster({ 
  className,
  position = "bottom-right",
  limit = 5,
  expand = false,
  richColors = false,
  closeButton = true,
  duration = 5000,
  ...props 
}: ToasterProps) {
  const { toasts } = useToast()
  
  // Limit the number of toasts displayed
  const limitedToasts = React.useMemo(() => {
    if (limit && limit > 0) {
      return toasts.slice(0, limit)
    }
    return toasts
  }, [toasts, limit])

  // Calculate positioning classes
  const positionClasses = React.useMemo(() => {
    const baseClasses = "fixed z-[100] flex max-h-screen w-full p-4 md:max-w-[420px]"
    
    switch (position) {
      case "top-left":
        return `${baseClasses} top-0 left-0 flex-col`
      case "top-center":
        return `${baseClasses} top-0 left-1/2 -translate-x-1/2 flex-col`
      case "top-right":
        return `${baseClasses} top-0 right-0 flex-col`
      case "bottom-left":
        return `${baseClasses} bottom-0 left-0 flex-col-reverse`
      case "bottom-center":
        return `${baseClasses} bottom-0 left-1/2 -translate-x-1/2 flex-col-reverse`
      case "bottom-right":
      default:
        return `${baseClasses} bottom-0 right-0 flex-col-reverse`
    }
  }, [position])

  if (limitedToasts.length === 0) {
    return null
  }

  return (
    <ToastProvider duration={duration}>
      <div className={cn(positionClasses, className)}>
        {limitedToasts.map(function ({ id, title, description, action, variant, ...toastProps }, index) {
          const isExpanded = expand || index < 3
          const offset = expand ? 0 : Math.max(0, index - 2) * 4
          
          return (
            <Toast 
              key={id} 
              variant={richColors ? variant : "default"}
              showIcon={richColors}
              className={cn(
                "transition-all duration-300 ease-in-out",
                !isExpanded && "scale-95 opacity-60",
                offset > 0 && `translate-y-${offset}`
              )}
              style={{
                zIndex: limitedToasts.length - index,
                transform: offset > 0 ? `translateY(${offset}px)` : undefined
              }}
              {...toastProps}
            >
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
              {closeButton && <ToastClose />}
            </Toast>
          )
        })}
      </div>
      <ToastViewport className="hidden" />
    </ToastProvider>
  )
}

// Simple toast notifications for common use cases
interface SimpleToastProps {
  message: string
  type?: "success" | "error" | "warning" | "info"
  duration?: number
  action?: React.ReactNode
}

export function showToast({ message, type = "info", duration, action }: SimpleToastProps) {
  // This would typically use the toast hook but for demonstration
  console.log(`Toast: ${type} - ${message}`)
}

// Toast Queue Manager for complex scenarios
export interface ToastQueueItem { id: string; props: Record<string, unknown>; timestamp: number }

export class ToastQueue {
  private static instance: ToastQueue
  private queue: ToastQueueItem[] = []
  private maxConcurrent = 3

  static getInstance(): ToastQueue {
    if (!ToastQueue.instance) {
      ToastQueue.instance = new ToastQueue()
    }
    return ToastQueue.instance
  }

  add(toast: { id: string; props: Record<string, unknown> }) {
    this.queue.push({ ...toast, timestamp: Date.now() })
    return this.queue.length
  }

  remove(id: string) {
    this.queue = this.queue.filter(toast => toast.id !== id)
    return this.queue.length
  }

  clear() {
    this.queue = []
  }

  getQueue() {
    return [...this.queue] // Return copy to prevent external mutation
  }

  setMaxConcurrent(max: number) {
    this.maxConcurrent = Math.max(1, max)
  }

  getMaxConcurrent() {
    return this.maxConcurrent
  }

  // Process queue synchronously for testing purposes
  processQueueSync() {
    const canProcess = Math.min(this.maxConcurrent, this.queue.length)
    
    if (canProcess > 0) {
      const toastsToProcess = this.queue.splice(0, canProcess)
      return toastsToProcess
    }
    
    return []
  }

  private getActiveToasts(): string[] {
    // This would ideally get active toasts from the toast context
    // For now, we'll simulate based on recent additions
    const now = Date.now()
    return this.queue
      .filter(t => now - t.timestamp < 5000) // Assume 5s default duration
      .map(t => t.id)
  }
}
