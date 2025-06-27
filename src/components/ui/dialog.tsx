"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const dialogOverlayVariants = cva(
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

const dialogContentVariants = cva(
  "fixed left-[50%] top-[50%] z-50 grid translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
  {
    variants: {
      size: {
        sm: "w-full max-w-sm p-4",
        default: "w-full max-w-lg p-6",
        lg: "w-full max-w-2xl p-8",
        xl: "w-full max-w-4xl p-8",
        full: "w-[calc(100vw-2rem)] max-w-none p-6 h-[calc(100vh-2rem)] max-h-none"
      },
      variant: {
        default: "",
        destructive: "border-destructive/50",
        success: "border-green-500/50",
        warning: "border-yellow-500/50"
      }
    },
    defaultVariants: {
      size: "default",
      variant: "default"
    }
  }
)

const dialogHeaderVariants = cva(
  "flex flex-col space-y-1.5 text-center sm:text-left",
  {
    variants: {
      size: {
        sm: "space-y-1",
        default: "space-y-1.5",
        lg: "space-y-2",
        xl: "space-y-3"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

const dialogFooterVariants = cva(
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

const dialogTitleVariants = cva(
  "font-semibold leading-none tracking-tight",
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

const dialogDescriptionVariants = cva(
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

export interface DialogOverlayProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>,
    VariantProps<typeof dialogOverlayVariants> {}

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {}

export interface DialogHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dialogHeaderVariants> {}

export interface DialogFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dialogFooterVariants> {}

export interface DialogTitleProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>,
    VariantProps<typeof dialogTitleVariants> {}

export interface DialogDescriptionProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>,
    VariantProps<typeof dialogDescriptionVariants> {}

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  DialogOverlayProps
>(({ className, variant, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(dialogOverlayVariants({ variant }), className)}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps & { hideClose?: boolean; overlayVariant?: VariantProps<typeof dialogOverlayVariants>['variant'] }
>(({ className, children, size, variant, hideClose = false, overlayVariant, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay variant={overlayVariant} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(dialogContentVariants({ size, variant }), className)}
      aria-modal="true"
      {...props}
    >
      {children}
      {!hideClose && (
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = React.forwardRef<
  HTMLDivElement,
  DialogHeaderProps
>(({ className, size, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(dialogHeaderVariants({ size }), className)}
    {...props}
  />
))
DialogHeader.displayName = "DialogHeader"

const DialogFooter = React.forwardRef<
  HTMLDivElement,
  DialogFooterProps
>(({ className, size, alignment, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(dialogFooterVariants({ size, alignment }), className)}
    {...props}
  />
))
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  DialogTitleProps
>(({ className, size, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(dialogTitleVariants({ size }), className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  DialogDescriptionProps
>(({ className, size, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(dialogDescriptionVariants({ size }), className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  dialogOverlayVariants,
  dialogContentVariants,
  dialogHeaderVariants,
  dialogFooterVariants,
  dialogTitleVariants,
  dialogDescriptionVariants,
}
