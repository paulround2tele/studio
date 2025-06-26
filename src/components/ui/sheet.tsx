"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

export interface SheetOverlayProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>,
    VariantProps<typeof sheetOverlayVariants> {}

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  hideClose?: boolean
  overlayVariant?: VariantProps<typeof sheetOverlayVariants>['variant']
}

export interface SheetHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sheetHeaderVariants> {}

export interface SheetFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sheetFooterVariants> {}

export interface SheetTitleProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>,
    VariantProps<typeof sheetTitleVariants> {}

export interface SheetDescriptionProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>,
    VariantProps<typeof sheetDescriptionVariants> {}

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  SheetOverlayProps
>(({ className, variant, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(sheetOverlayVariants({ variant }), className)}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetOverlayVariants = cva(
  "fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  {
    variants: {
      variant: {
        default: "bg-black/80",
        light: "bg-black/50",
        dark: "bg-black/90",
        blur: "bg-black/60 backdrop-blur-sm"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        right: "inset-y-0 right-0 h-full border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
      },
      size: {
        sm: "",
        default: "",
        lg: "",
        xl: "",
        full: ""
      },
      variant: {
        default: "",
        elevated: "shadow-xl",
        ghost: "bg-transparent border-0 shadow-none",
        destructive: "border-destructive/50"
      }
    },
    compoundVariants: [
      // Size variants for different sides
      {
        side: ["top", "bottom"],
        size: "sm",
        class: "h-1/4 p-4"
      },
      {
        side: ["top", "bottom"],
        size: "default", 
        class: "h-1/3 p-6"
      },
      {
        side: ["top", "bottom"],
        size: "lg",
        class: "h-1/2 p-8"
      },
      {
        side: ["top", "bottom"],
        size: "xl",
        class: "h-2/3 p-8"
      },
      {
        side: ["top", "bottom"],
        size: "full",
        class: "h-full p-6"
      },
      {
        side: ["left", "right"],
        size: "sm",
        class: "w-80 p-4"
      },
      {
        side: ["left", "right"],
        size: "default",
        class: "w-96 p-6"
      },
      {
        side: ["left", "right"],
        size: "lg",
        class: "w-1/2 p-8"
      },
      {
        side: ["left", "right"],
        size: "xl",
        class: "w-2/3 p-8"
      },
      {
        side: ["left", "right"],
        size: "full",
        class: "w-full p-6"
      }
    ],
    defaultVariants: {
      side: "right",
      size: "default",
      variant: "default"
    },
  }
)

const sheetHeaderVariants = cva(
  "flex flex-col text-center sm:text-left",
  {
    variants: {
      size: {
        sm: "space-y-1",
        default: "space-y-2",
        lg: "space-y-3",
        xl: "space-y-4"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

const sheetFooterVariants = cva(
  "flex flex-col-reverse sm:flex-row sm:justify-end",
  {
    variants: {
      size: {
        sm: "gap-2 sm:gap-2",
        default: "gap-2 sm:gap-2",
        lg: "gap-3 sm:gap-3",
        xl: "gap-4 sm:gap-4"
      },
      alignment: {
        left: "sm:justify-start",
        center: "sm:justify-center", 
        right: "sm:justify-end",
        between: "sm:justify-between"
      }
    },
    defaultVariants: {
      size: "default",
      alignment: "right"
    }
  }
)

const sheetTitleVariants = cva(
  "font-semibold text-foreground leading-none tracking-tight",
  {
    variants: {
      size: {
        sm: "text-base",
        default: "text-lg",
        lg: "text-xl",
        xl: "text-2xl"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

const sheetDescriptionVariants = cva(
  "text-muted-foreground",
  {
    variants: {
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
        xl: "text-lg"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", size, variant, className, children, hideClose = false, overlayVariant, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay variant={overlayVariant} />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side, size, variant }), className)}
      {...props}
    >
      {children}
      {!hideClose && (
        <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      )}
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = React.forwardRef<
  HTMLDivElement,
  SheetHeaderProps
>(({ className, size, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(sheetHeaderVariants({ size }), className)}
    {...props}
  />
))
SheetHeader.displayName = "SheetHeader"

const SheetFooter = React.forwardRef<
  HTMLDivElement,
  SheetFooterProps
>(({ className, size, alignment, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(sheetFooterVariants({ size, alignment }), className)}
    {...props}
  />
))
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  SheetTitleProps
>(({ className, size, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn(sheetTitleVariants({ size }), className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  SheetDescriptionProps
>(({ className, size, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn(sheetDescriptionVariants({ size }), className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
