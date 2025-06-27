"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const popoverContentVariants = cva(
  "z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  {
    variants: {
      size: {
        sm: "w-48 p-2",
        default: "w-72 p-4",
        lg: "w-96 p-6",
        xl: "w-[480px] p-8",
        auto: "w-auto p-4",
        full: "w-full p-4",
      },
      variant: {
        default: "border-border bg-popover text-popover-foreground",
        elevated: "border-border bg-background text-foreground shadow-lg",
        minimal: "border-transparent bg-background/80 text-foreground backdrop-blur-sm",
        accent: "border-accent bg-accent text-accent-foreground",
        destructive: "border-destructive/50 bg-destructive text-destructive-foreground",
        success: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
        warning: "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface PopoverContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>,
    VariantProps<typeof popoverContentVariants> {}

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ className, size, variant, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(popoverContentVariants({ size, variant }), className)}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

const PopoverArrow = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Arrow>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Arrow>
>(({ className, ...props }, ref) => (
  <PopoverPrimitive.Arrow
    ref={ref}
    className={cn("fill-popover", className)}
    {...props}
  />
))
PopoverArrow.displayName = PopoverPrimitive.Arrow.displayName

const PopoverClose = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Close>
>(({ className, ...props }, ref) => (
  <PopoverPrimitive.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
      className
    )}
    {...props}
  />
))
PopoverClose.displayName = PopoverPrimitive.Close.displayName

// Compound component for simple usage
interface SimplePopoverProps {
  trigger: React.ReactNode
  children: React.ReactNode
  size?: VariantProps<typeof popoverContentVariants>["size"]
  variant?: VariantProps<typeof popoverContentVariants>["variant"]
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

const SimplePopover = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  SimplePopoverProps
>(({
  trigger,
  children,
  size = "default",
  variant = "default",
  align = "center",
  side = "bottom",
  sideOffset = 4,
  open,
  onOpenChange,
  className,
  ...props
}, ref) => (
  <Popover open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger asChild>
      {trigger}
    </PopoverTrigger>
    <PopoverContent
      ref={ref}
      size={size}
      variant={variant}
      align={align}
      side={side}
      sideOffset={sideOffset}
      className={className}
      {...props}
    >
      {children}
    </PopoverContent>
  </Popover>
))
SimplePopover.displayName = "SimplePopover"

export { 
  Popover, 
  PopoverTrigger, 
  PopoverContent, 
  PopoverAnchor, 
  PopoverArrow, 
  PopoverClose, 
  SimplePopover,
  popoverContentVariants 
}
