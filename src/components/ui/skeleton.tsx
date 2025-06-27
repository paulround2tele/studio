import React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const skeletonVariants = cva(
  "animate-pulse rounded-md bg-muted",
  {
    variants: {
      variant: {
        default: "bg-muted",
        shimmer: "bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer",
        wave: "bg-gradient-to-r from-muted to-muted/30 animate-wave",
        pulse: "bg-muted animate-pulse",
      },
      shape: {
        default: "rounded-md",
        circle: "rounded-full",
        square: "rounded-none",
        rounded: "rounded-lg",
      },
      size: {
        sm: "h-4",
        md: "h-6", 
        lg: "h-8",
        xl: "h-10",
      },
    },
    defaultVariants: {
      variant: "default",
      shape: "default",
      size: "md",
    },
  }
)

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  width?: string | number
  height?: string | number
  lines?: number
  spacing?: "tight" | "normal" | "loose"
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    className, 
    variant, 
    shape, 
    size, 
    width, 
    height, 
    lines, 
    spacing = "normal",
    style,
    ...props 
  }, ref) => {
    // If lines prop is provided, render multiple skeleton lines
    if (lines && lines > 1) {
      const spacingClass = {
        tight: "space-y-1",
        normal: "space-y-2", 
        loose: "space-y-3"
      }[spacing]

      return (
        <div className={cn("w-full", spacingClass)} ref={ref} {...props}>
          {Array.from({ length: lines }, (_, index) => (
            <div
              key={index}
              className={cn(
                skeletonVariants({ variant, shape, size }),
                // Make last line shorter for more realistic text skeleton
                index === lines - 1 && lines > 1 ? "w-3/4" : "w-full",
                className
              )}
              style={{
                width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
                height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
                ...style,
              }}
            />
          ))}
        </div>
      )
    }

    return (
      <div
        className={cn(skeletonVariants({ variant, shape, size }), className)}
        style={{
          width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
          height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
          ...style,
        }}
        ref={ref}
        {...props}
      />
    )
  }
)

Skeleton.displayName = "Skeleton"

// Pre-built skeleton patterns for common use cases
const SkeletonText = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, 'lines'> & { lines?: number }>(
  ({ lines = 3, ...props }, ref) => (
    <Skeleton lines={lines} {...props} ref={ref} />
  )
)
SkeletonText.displayName = "SkeletonText"

const SkeletonAvatar = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, 'shape' | 'size'> & { size?: 'sm' | 'md' | 'lg' | 'xl' }>(
  ({ size = "md", ...props }, ref) => {
    const sizeMap = {
      sm: { width: 32, height: 32 },
      md: { width: 40, height: 40 },
      lg: { width: 48, height: 48 },
      xl: { width: 64, height: 64 },
    }
    
    return (
      <Skeleton 
        shape="circle" 
        width={sizeMap[size].width}
        height={sizeMap[size].height}
        {...props} 
        ref={ref} 
      />
    )
  }
)
SkeletonAvatar.displayName = "SkeletonAvatar"

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div className={cn("space-y-3 p-4", className)} ref={ref} {...props}>
      <div className="flex items-center space-x-4">
        <SkeletonAvatar size="md" />
        <div className="space-y-2 flex-1">
          <Skeleton height={16} width="60%" />
          <Skeleton height={14} width="40%" />
        </div>
      </div>
      <SkeletonText lines={3} spacing="normal" />
    </div>
  )
)
SkeletonCard.displayName = "SkeletonCard"

export { 
  Skeleton, 
  SkeletonText, 
  SkeletonAvatar, 
  SkeletonCard,
  skeletonVariants 
}
