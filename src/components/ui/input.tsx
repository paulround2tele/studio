import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Dark mode readable input background; use slightly lighter than panel bg for contrast.
const inputVariants = cva(
  "flex w-full rounded-md border bg-background dark:bg-[hsl(var(--input))] dark:text-[hsl(var(--foreground))] px-3 py-2 text-base text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 md:text-sm",
  {
    variants: {
      variant: {
  default: "border-input bg-input dark:bg-[hsl(var(--input))]",
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
    // Prevent uncontrolled -> controlled warnings by treating fields with onChange as controlled from first paint
    const { value, defaultValue, onChange, id, ...rest } = props as {
      value?: string | number | readonly string[];
      defaultValue?: string | number | readonly string[];
      onChange?: React.ChangeEventHandler<HTMLInputElement>;
      id?: string;
    } & Record<string, unknown>;
  const isControlled = typeof onChange === 'function';
  // react-hook-form register provides onChange & ref without value for uncontrolled mode.
  // We must NOT force a value ('') or typing breaks. Only pass value if explicitly provided.
  const hasExplicitValue = value !== undefined;
    
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
          aria-describedby={helperText ? `${id}-helper` : undefined}
          onChange={onChange}
          {...(hasExplicitValue ? { value } : (!isControlled && defaultValue !== undefined ? { defaultValue } : {}))}
          id={id}
          {...rest}
        />
        {helperText && (
          <p
            id={`${id}-helper`}
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
