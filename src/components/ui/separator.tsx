"use client"

import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const separatorVariants = cva(
  "shrink-0",
  {
    variants: {
      variant: {
        default: "bg-border",
        muted: "bg-muted",
        accent: "bg-accent",
        destructive: "bg-destructive",
        primary: "bg-primary"
      },
      size: {
        default: "",
        thin: "",
        thick: ""
      }
    },
    compoundVariants: [
      {
        size: "thin",
        className: "data-[orientation=horizontal]:h-[0.5px] data-[orientation=vertical]:w-[0.5px]"
      },
      {
        size: "default", 
        className: "data-[orientation=horizontal]:h-[1px] data-[orientation=vertical]:w-[1px]"
      },
      {
        size: "thick",
        className: "data-[orientation=horizontal]:h-[2px] data-[orientation=vertical]:w-[2px]"
      }
    ],
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface SeparatorProps
  extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>,
    VariantProps<typeof separatorVariants> {
  label?: string;
  spacing?: "none" | "sm" | "md" | "lg";
}

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  SeparatorProps
>(
  (
    { 
      className, 
      orientation = "horizontal", 
      decorative = true, 
      variant, 
      size, 
      label,
      spacing = "none",
      ...props 
    },
    ref
  ) => {
    const spacingClasses = {
      none: "",
      sm: orientation === "horizontal" ? "my-2" : "mx-2",
      md: orientation === "horizontal" ? "my-4" : "mx-4", 
      lg: orientation === "horizontal" ? "my-6" : "mx-6"
    };

    if (label && orientation === "horizontal") {
      return (
        <div className={cn("relative flex items-center", spacingClasses[spacing])}>
          <SeparatorPrimitive.Root
            ref={ref}
            decorative={decorative}
            orientation={orientation}
            className={cn(
              separatorVariants({ variant, size }),
              "w-full",
              className
            )}
            data-orientation={orientation}
            {...props}
          />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
            {label}
          </span>
        </div>
      );
    }

    return (
      <SeparatorPrimitive.Root
        ref={ref}
        decorative={decorative}
        orientation={orientation}
        className={cn(
          separatorVariants({ variant, size }),
          orientation === "horizontal" ? "w-full" : "h-full",
          spacingClasses[spacing],
          className
        )}
        data-orientation={orientation}
        {...props}
      />
    );
  }
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator, separatorVariants }
