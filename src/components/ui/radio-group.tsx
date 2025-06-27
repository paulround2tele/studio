"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Circle } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const radioGroupVariants = cva("grid", {
  variants: {
    direction: {
      vertical: "gap-2",
      horizontal: "grid-flow-col gap-4"
    },
    spacing: {
      tight: "gap-1",
      normal: "gap-2", 
      loose: "gap-4"
    }
  },
  defaultVariants: {
    direction: "vertical",
    spacing: "normal"
  }
})

const radioGroupItemVariants = cva(
  "aspect-square rounded-full border ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "border-primary text-primary data-[state=checked]:border-primary",
        destructive: "border-destructive text-destructive data-[state=checked]:border-destructive",
        outline: "border-input text-foreground data-[state=checked]:border-primary data-[state=checked]:text-primary",
        ghost: "border-transparent text-muted-foreground data-[state=checked]:border-primary data-[state=checked]:text-primary"
      },
      size: {
        default: "h-4 w-4",
        sm: "h-3 w-3",
        lg: "h-5 w-5"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface RadioGroupProps
  extends Omit<React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>, "orientation">,
    VariantProps<typeof radioGroupVariants> {
  error?: boolean;
}

export interface RadioGroupItemProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>,
    VariantProps<typeof radioGroupItemVariants> {
  error?: boolean;
}

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(({ className, direction, spacing, error, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn(radioGroupVariants({ direction, spacing }), className)}
      {...props}
      ref={ref}
    />
  )
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(({ className, variant, size, error, ...props }, ref) => {
  const computedVariant = error ? "destructive" : variant;
  
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(radioGroupItemVariants({ variant: computedVariant, size }), className)}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className={cn(
          "fill-current text-current",
          size === "sm" ? "h-1.5 w-1.5" :
          size === "lg" ? "h-3 w-3" :
          "h-2.5 w-2.5"
        )} />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

export { RadioGroup, RadioGroupItem, radioGroupVariants, radioGroupItemVariants }
