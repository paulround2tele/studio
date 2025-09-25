import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-lg bg-card text-card-foreground transition-colors",
  {
    variants: {
      variant: {
        default: "border bg-card shadow-sm",
        elevated: "bg-card shadow-md hover:shadow-lg",
        outlined: "border-2 bg-transparent",
        filled: "bg-muted border-0",
        ghost: "bg-transparent border-0 shadow-none",
      },
      size: {
        compact: "",
        default: "",
        spacious: "",
      },
      interactive: {
        false: "",
        true: "cursor-pointer hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      },
      state: {
        default: "",
        disabled: "opacity-50 cursor-not-allowed",
        selected: "ring-2 ring-ring ring-offset-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
      state: "default",
    },
  }
)

const cardHeaderVariants = cva(
  "flex flex-col space-y-1.5",
  {
    variants: {
      size: {
        compact: "p-4",
        default: "p-6",
        spacious: "p-8",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const cardContentVariants = cva(
  "pt-0",
  {
    variants: {
      size: {
        compact: "p-4 pt-0",
        default: "p-6 pt-0",
        spacious: "p-8 pt-0",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const cardFooterVariants = cva(
  "flex items-center pt-0",
  {
    variants: {
      size: {
        compact: "p-4 pt-0",
        default: "p-6 pt-0",
        spacious: "p-8 pt-0",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const cardTitleVariants = cva(
  "font-semibold leading-none tracking-tight",
  {
    variants: {
      size: {
        compact: "text-lg",
        default: "text-2xl",
        spacious: "text-3xl",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, interactive, state, asChild = false, ...props }, ref) => {
    const Component = asChild ? React.Fragment : "div"
    
    if (asChild) {
      return <>{props.children}</>
    }

    return (
      <Component
        ref={ref}
        className={cn(cardVariants({ variant, size, interactive, state, className }))}
        role={interactive ? "button" : undefined}
        tabIndex={interactive && state !== "disabled" ? 0 : undefined}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

export interface CardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardHeaderVariants> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardHeaderVariants({ size, className }))}
      {...props}
    />
  )
)
CardHeader.displayName = "CardHeader"

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof cardTitleVariants> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, size, as: Component = "h3", ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(cardTitleVariants({ size, className }))}
      {...props}
    />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardContentVariants> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, size, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(cardContentVariants({ size, className }))} 
      {...props} 
    />
  )
)
CardContent.displayName = "CardContent"

export interface CardFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardFooterVariants> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardFooterVariants({ size, className }))}
      {...props}
    />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
