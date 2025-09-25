"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const bigIntInputVariants = cva(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input",
        error: "border-destructive focus-visible:ring-destructive",
        success: "border-green-500 focus-visible:ring-green-500",
        warning: "border-yellow-500 focus-visible:ring-yellow-500",
      },
      size: {
        sm: "h-8 px-2 text-xs",
        md: "h-10 px-3 text-sm",
        lg: "h-12 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface BigIntInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'size' | 'min' | 'max' | 'defaultValue'>,
    VariantProps<typeof bigIntInputVariants> {
  value?: number | null
  defaultValue?: number | null
  onChange?: (value: number | null) => void
  onValidationChange?: (isValid: boolean, error?: string) => void
  allowNegative?: boolean
  min?: number
  max?: number
  formatDisplay?: boolean
  placeholder?: string
  errorMessage?: string
  helperText?: string
  label?: string
  required?: boolean
}

const BigIntInput = React.forwardRef<HTMLInputElement, BigIntInputProps>(
  ({
    className,
    variant,
    size,
    value,
    defaultValue,
    onChange,
    onValidationChange,
    allowNegative = true,
    min,
    max,
    formatDisplay = true,
    placeholder = "Enter a number...",
    errorMessage,
    helperText,
    label,
    required = false,
    disabled,
    ...props
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState<number | null>(defaultValue || null)
    const [displayValue, setDisplayValue] = React.useState<string>("")
    const [isValid, setIsValid] = React.useState<boolean>(true)
    const [validationError, setValidationError] = React.useState<string>("")
    const [hasInteracted, setHasInteracted] = React.useState<boolean>(false)

    const currentValue = value !== undefined ? value : internalValue

    // Handle initial validation for required field (only set validation state, don't trigger onChange)
    React.useEffect(() => {
      if (required && !currentValue && !hasInteracted) {
        setIsValid(false)
        setValidationError("This field is required")
        // Don't call onValidationChange during initial mount to avoid interfering with user interactions
      }
    }, [required, currentValue, hasInteracted])

    // Initialize display value
    React.useEffect(() => {
      if (currentValue !== null && currentValue !== undefined) {
        const stringValue = currentValue.toString()
        setDisplayValue(formatDisplay ? formatNumber(stringValue) : stringValue)
      } else {
        setDisplayValue("")
      }
    }, [currentValue, formatDisplay])

    const formatNumber = (value: string): string => {
      if (!value || value === "0") return value
      
      // Remove any existing formatting
      const cleanValue = value.replace(/,/g, '')
      
      // Add thousands separators
      return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }

    const parseDisplayValue = (displayValue: string): string => {
      // Remove formatting (commas, spaces)
      return displayValue.replace(/[,\s]/g, '')
    }

    const validateValue = (stringValue: string): { isValid: boolean; error?: string; numberValue?: number } => {
      if (stringValue === "" || stringValue === "-") {
        return { isValid: !required, error: required ? "This field is required" : undefined }
      }

      // Check for valid number format
      if (!/^-?\d+$/.test(stringValue)) {
        return { isValid: false, error: "Please enter a valid number" }
      }

      // Check negative values
      if (!allowNegative && stringValue.startsWith("-")) {
        return { isValid: false, error: "Negative values are not allowed" }
      }

      try {
        const numberValue = Number(stringValue)

        // Check if it's a valid number
        if (isNaN(numberValue) || !isFinite(numberValue)) {
          return { isValid: false, error: "Invalid number" }
        }

        // Check min constraint
        if (min !== undefined && numberValue < min) {
          return {
            isValid: false,
            error: `Value must be at least ${formatDisplay ? formatNumber(min.toString()) : min.toString()}`
          }
        }

        // Check max constraint
        if (max !== undefined && numberValue > max) {
          return {
            isValid: false,
            error: `Value must be at most ${formatDisplay ? formatNumber(max.toString()) : max.toString()}`
          }
        }

        return { isValid: true, numberValue }
      } catch (error) {
        return { isValid: false, error: "Number is too large or invalid" }
      }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasInteracted(true)
      const inputValue = e.target.value
      const cleanValue = parseDisplayValue(inputValue)
      
      // Allow empty input or just minus sign for negative numbers
      if (inputValue === "" || (allowNegative && inputValue === "-")) {
        setDisplayValue(inputValue)
        setIsValid(!required)
        setValidationError(required ? "This field is required" : "")
        
        const newValue = null
        if (value === undefined) {
          setInternalValue(newValue)
        }
        onChange?.(newValue)
        onValidationChange?.(!required, required ? "This field is required" : undefined)
        return
      }

      const validation = validateValue(cleanValue)
      setIsValid(validation.isValid)
      setValidationError(validation.error || "")
      
      // Update display value with formatting
      if (validation.isValid && validation.numberValue !== undefined) {
        setDisplayValue(formatDisplay ? formatNumber(cleanValue) : cleanValue)
        
        const newValue = validation.numberValue
        if (value === undefined) {
          setInternalValue(newValue)
        }
        onChange?.(newValue)
      } else {
        setDisplayValue(inputValue)
        
        const newValue = null
        if (value === undefined) {
          setInternalValue(newValue)
        }
        onChange?.(newValue)
      }
      
      onValidationChange?.(validation.isValid, validation.error)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Re-format display value on blur if valid
      if (isValid && currentValue !== null && currentValue !== undefined) {
        const stringValue = currentValue.toString()
        setDisplayValue(formatDisplay ? formatNumber(stringValue) : stringValue)
      }
      props.onBlur?.(e)
    }

    const computedVariant = !isValid || errorMessage ? "error" : variant

    return (
      <div className="w-full">
        {label && (
          <label className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block",
            !isValid || errorMessage ? "text-destructive" : "text-foreground"
          )}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        <input
          type="text"
          className={cn(bigIntInputVariants({ variant: computedVariant, size }), className)}
          ref={ref}
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!isValid || !!errorMessage}
          aria-describedby={
            (validationError || errorMessage) 
              ? `${props.id || 'bigint-input'}-error`
              : helperText 
                ? `${props.id || 'bigint-input'}-helper`
                : undefined
          }
          {...props}
        />
        
        {(helperText || validationError || errorMessage) && (
          <div className="mt-1 space-y-1">
            {helperText && !validationError && !errorMessage && (
              <p 
                id={`${props.id || 'bigint-input'}-helper`}
                className="text-xs text-muted-foreground"
              >
                {helperText}
              </p>
            )}
            
            {(validationError || errorMessage) && (
              <p 
                id={`${props.id || 'bigint-input'}-error`}
                className="text-xs text-destructive"
              >
                {errorMessage || validationError}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)

BigIntInput.displayName = "BigIntInput"

export { BigIntInput }
