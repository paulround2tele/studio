"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "text-foreground",
        destructive: "text-destructive",
        muted: "text-muted-foreground",
        accent: "text-accent-foreground"
      },
      size: {
        default: "text-sm",
        sm: "text-xs",
        lg: "text-base"
      },
      weight: {
        default: "font-medium",
        normal: "font-normal",
        semibold: "font-semibold",
        bold: "font-bold"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      weight: "default"
    }
  }
)

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {
  required?: boolean;
  error?: boolean;
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, variant, size, weight, required, error, children, ...props }, ref) => {
  const computedVariant = error ? "destructive" : variant;
  
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(labelVariants({ variant: computedVariant, size, weight }), className)}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-destructive" aria-label="required">
          *
        </span>
      )}
    </LabelPrimitive.Root>
  );
})
Label.displayName = LabelPrimitive.Root.displayName

export { Label, labelVariants }
