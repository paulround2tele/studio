// src/components/ui/button-v2.tsx
// Optimized Button component - Phase 1 Migration
// Focus: Performance, Stability, Bundle Size Reduction

"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Optimized button variants with reduced class string length
 * Performance improvement: Shorter class names = smaller bundle
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Optimized LoadingSpinner component
 * Performance improvement: Inline SVG instead of imported icon
 */
const LoadingSpinner = React.memo(() => (
  <svg 
    className="h-4 w-4 animate-spin" 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle 
      className="opacity-25" 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      strokeWidth="4"
    />
    <path 
      className="opacity-75" 
      fill="currentColor" 
      d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
))
LoadingSpinner.displayName = "LoadingSpinner"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  loadingText?: string
}

/**
 * Optimized Button component with performance improvements:
 * 1. Memoized loading spinner to prevent re-renders
 * 2. Optimized disabled state handling
 * 3. Reduced re-renders with useMemo for className
 * 4. Better TypeScript performance with explicit interfaces
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    isLoading = false, 
    loadingText = "Loading...", 
    children, 
    disabled, 
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"

    // Performance optimization: Memoize className to prevent unnecessary recalculations
    const computedClassName = React.useMemo(
      () => cn(buttonVariants({ variant, size, className })),
      [variant, size, className]
    )

    // Performance optimization: Memoize disabled state
    const isDisabled = React.useMemo(
      () => isLoading || disabled,
      [isLoading, disabled]
    )

    // Development-only validation with minimal runtime impact
    if (process.env.NODE_ENV === 'development' && asChild && React.Children.count(children) !== 1) {
      console.error(`Button with asChild=true requires exactly one React element child, but received ${React.Children.count(children)} children.`)
    }

    // Performance optimization: Memoize button content to prevent unnecessary re-renders
    const buttonContent = React.useMemo(() => {
      if (isLoading) {
        return (
          <>
            <LoadingSpinner />
            <span>{loadingText}</span>
          </>
        )
      }
      return children
    }, [isLoading, loadingText, children])

    return (
      <Comp
        className={computedClassName}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        {...props}
      >
        {buttonContent}
      </Comp>
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }
