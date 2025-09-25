"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const tooltipContentVariants = cva(
  "z-50 overflow-hidden rounded-md px-3 py-1.5 text-sm shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  {
    variants: {
      variant: {
        default: "border bg-popover text-popover-foreground",
        inverse: "bg-primary text-primary-foreground border-primary",
        secondary: "bg-secondary text-secondary-foreground border-secondary",
        success: "bg-green-100 text-green-900 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800",
        warning: "bg-yellow-100 text-yellow-900 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-800",
        destructive: "bg-destructive text-destructive-foreground border-destructive",
        outline: "bg-background text-foreground border-2",
      },
      size: {
        sm: "px-2 py-1 text-xs",
        default: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
    VariantProps<typeof tooltipContentVariants> {}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, sideOffset = 4, variant, size, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(tooltipContentVariants({ variant, size }), className)}
    data-testid="tooltip-content"
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// Arrow component for enhanced tooltip appearance
const TooltipArrow = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Arrow>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Arrow> & {
    variant?: "default" | "inverse" | "secondary" | "success" | "warning" | "destructive" | "outline"
  }
>(({ className, variant = "default", ...props }, ref) => (
  <TooltipPrimitive.Arrow
    ref={ref}
    className={cn(
      "fill-current",
      {
        "text-popover": variant === "default",
        "text-primary": variant === "inverse",
        "text-secondary": variant === "secondary", 
        "text-green-100 dark:text-green-900": variant === "success",
        "text-yellow-100 dark:text-yellow-900": variant === "warning",
        "text-destructive": variant === "destructive",
        "text-background": variant === "outline",
      },
      className
    )}
    {...props}
  />
))
TooltipArrow.displayName = "TooltipArrow"

// Compound Tooltip component for easier usage
export interface SimpleTooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  variant?: "default" | "inverse" | "secondary" | "success" | "warning" | "destructive" | "outline"
  size?: "sm" | "default" | "lg"
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
  showArrow?: boolean
  delayDuration?: number
  className?: string
  contentClassName?: string
  disabled?: boolean
}

const SimpleTooltip = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  SimpleTooltipProps
>(({ 
  content, 
  children, 
  variant = "default", 
  size = "default", 
  side = "top", 
  sideOffset = 4,
  showArrow = false,
  delayDuration = 700,
  className,
  contentClassName,
  disabled = false,
  ...props 
}, ref) => {
  if (disabled) {
    return <>{children}</>
  }

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild className={className}>
          {children}
        </TooltipTrigger>
        <TooltipContent
          ref={ref}
          variant={variant}
          size={size}
          side={side}
          sideOffset={sideOffset}
          className={contentClassName}
          {...props}
        >
          {content}
          {showArrow && <TooltipArrow variant={variant} />}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})
SimpleTooltip.displayName = "SimpleTooltip"

export { 
  Tooltip, 
  TooltipTrigger, 
  TooltipContent, 
  TooltipProvider, 
  TooltipArrow,
  SimpleTooltip,
  tooltipContentVariants 
}
