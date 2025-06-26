import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border bg-background px-3 py-2 text-base text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 md:text-sm",
  {
    variants: {
      variant: {
        default: "border-input bg-input",
        destructive: "border-destructive/50 text-destructive focus-visible:ring-destructive",
        outline: "border-input bg-transparent",
        ghost: "border-transparent bg-transparent shadow-none"
      },
      inputSize: {
        default: "h-10",
        sm: "h-9 px-2.5 text-sm",
        lg: "h-12 px-4"
      }
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default"
    }
  }
)

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {
  error?: boolean;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", variant, inputSize, error, helperText, ...props }, ref) => {
    const computedVariant = error ? "destructive" : variant;
    
    return (
      <div className="space-y-1">
        <input
          type={type}
          className={cn(
            inputVariants({ variant: computedVariant, inputSize }),
            className
          )}
          ref={ref}
          aria-invalid={error}
          aria-describedby={helperText ? `${props.id}-helper` : undefined}
          {...props}
        />
        {helperText && (
          <p
            id={`${props.id}-helper`}
            className={cn(
              "text-sm",
              error ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
