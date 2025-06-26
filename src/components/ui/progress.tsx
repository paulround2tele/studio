"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const progressVariants = cva(
  "relative w-full overflow-hidden rounded-full bg-secondary",
  {
    variants: {
      size: {
        default: "h-4",
        sm: "h-2",
        lg: "h-6"
      },
      variant: {
        default: "bg-secondary",
        muted: "bg-muted",
        outline: "bg-transparent border border-input"
      }
    },
    defaultVariants: {
      size: "default",
      variant: "default"
    }
  }
)

const progressIndicatorVariants = cva(
  "h-full w-full flex-1 transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-primary",
        destructive: "bg-destructive",
        success: "bg-green-500",
        warning: "bg-yellow-500",
        info: "bg-blue-500"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  indicatorVariant?: VariantProps<typeof progressIndicatorVariants>["variant"];
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, size, variant, indicatorVariant = "default", showValue, formatValue, ...props }, ref) => {
  const displayValue = value || 0;
  const formattedValue = formatValue ? formatValue(displayValue) : `${Math.round(displayValue)}%`;
  
  return (
    <div className="w-full">
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(progressVariants({ size, variant }), className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(progressIndicatorVariants({ variant: indicatorVariant }))}
          style={{ transform: `translateX(-${100 - displayValue}%)` }}
        />
      </ProgressPrimitive.Root>
      {showValue && (
        <div className="mt-1 text-sm text-muted-foreground text-right">
          {formattedValue}
        </div>
      )}
    </div>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress, progressVariants }
