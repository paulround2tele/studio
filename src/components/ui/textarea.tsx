"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const textareaVariants = cva(
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "border-input",
        error: "border-destructive focus-visible:ring-destructive",
        success: "border-green-500 focus-visible:ring-green-500",
        warning: "border-yellow-500 focus-visible:ring-yellow-500",
      },
      size: {
        sm: "min-h-[60px] px-2 py-1 text-xs",
        md: "min-h-[80px] px-3 py-2 text-sm",
        lg: "min-h-[120px] px-4 py-3 text-base",
      },
      resize: {
        none: "resize-none",
        vertical: "resize-y",
        horizontal: "resize-x",
        both: "resize",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      resize: "vertical",
    },
  }
)

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textareaVariants> {
  errorMessage?: string
  helperText?: string
  label?: string
  required?: boolean
  maxLength?: number
  showCount?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className,
    variant,
    size,
    resize,
    errorMessage,
    helperText,
    label,
    required = false,
    maxLength,
    showCount = false,
    disabled,
    value,
    ...props
  }, ref) => {
    const currentLength = value ? String(value).length : 0
    const computedVariant = errorMessage ? "error" : variant

    return (
      <div className="w-full">
        {label && (
          <label className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block",
            errorMessage ? "text-destructive" : "text-foreground"
          )}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <textarea
            className={cn(textareaVariants({ variant: computedVariant, size, resize }), className)}
            ref={ref}
            disabled={disabled}
            maxLength={maxLength}
            value={value}
            aria-invalid={!!errorMessage}
            aria-describedby={
              [
                helperText && `${props.id || 'textarea'}-helper`,
                errorMessage && `${props.id || 'textarea'}-error`
              ].filter(Boolean).join(' ') || undefined
            }
            {...props}
          />
          
          {(showCount && maxLength) && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background px-1 rounded">
              {currentLength}/{maxLength}
            </div>
          )}
        </div>
        
        {(helperText || errorMessage) && (
          <div className="mt-1 space-y-1">
            {helperText && !errorMessage && (
              <p 
                id={`${props.id || 'textarea'}-helper`}
                className="text-xs text-muted-foreground"
              >
                {helperText}
              </p>
            )}
            
            {errorMessage && (
              <p 
                id={`${props.id || 'textarea'}-error`}
                className="text-xs text-destructive"
              >
                {errorMessage}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Textarea.displayName = "Textarea"

export { Textarea }
