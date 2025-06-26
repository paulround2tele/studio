"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const datePickerVariants = cva(
  "w-full justify-start text-left font-normal",
  {
    variants: {
      variant: {
        default: "",
        outline: "border-input",
        ghost: "border-0 shadow-none",
      },
      size: {
        default: "h-10 px-3 py-2",
        sm: "h-8 px-2 text-sm",
        lg: "h-12 px-4 text-base",
      },
      state: {
        default: "",
        error: "border-destructive focus:ring-destructive",
        success: "border-green-500 focus:ring-green-500",
        warning: "border-yellow-500 focus:ring-yellow-500",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      state: "default",
    },
  }
)

export interface DatePickerProps
  extends Omit<React.ComponentProps<typeof Button>, "variant" | "size">,
    VariantProps<typeof datePickerVariants> {
  /** Selected date value */
  value?: Date
  /** Callback when date changes */
  onValueChange?: (date: Date | undefined) => void
  /** Placeholder text when no date is selected */
  placeholder?: string
  /** Date format string */
  format?: string
  /** Disabled state */
  disabled?: boolean
  /** Error state */
  error?: boolean
  /** Success state */
  success?: boolean
  /** Warning state */
  warning?: boolean
  /** Helper text */
  helperText?: string
  /** Label for the date picker */
  label?: string
  /** Required indicator */
  required?: boolean
  /** Minimum selectable date */
  fromDate?: Date
  /** Maximum selectable date */
  toDate?: Date
  /** Disabled dates */
  disabledDates?: Date[]
  /** Additional calendar props */
  calendarProps?: React.ComponentProps<typeof Calendar>
}

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  ({
    className,
    variant,
    size,
    state,
    value,
    onValueChange,
    placeholder = "Pick a date",
    format: dateFormat = "PPP",
    disabled = false,
    error = false,
    success = false,
    warning = false,
    helperText,
    label,
    required = false,
    fromDate,
    toDate,
    disabledDates,
    calendarProps,
    ...props
  }, ref) => {
    const [open, setOpen] = React.useState(false)

    // Determine state based on props
    const currentState = error ? "error" : success ? "success" : warning ? "warning" : state

    // Generate unique IDs for accessibility
    const baseId = React.useId()
    const helperId = helperText ? `${baseId}-helper` : undefined

    const handleSelect = (date: Date | undefined) => {
      onValueChange?.(date)
      setOpen(false)
    }

    const disabledMatcher = React.useMemo(() => {
      const matchers = []
      
      if (fromDate) {
        matchers.push({ before: fromDate })
      }
      
      if (toDate) {
        matchers.push({ after: toDate })
      }
      
      if (disabledDates && disabledDates.length > 0) {
        matchers.push(...disabledDates.map(date => ({ 
          from: date, 
          to: date 
        })))
      }
      
      return matchers.length > 0 ? matchers : undefined
    }, [fromDate, toDate, disabledDates])

    return (
      <div className="space-y-1">
        {label && (
          <label 
            htmlFor={baseId}
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              error && "text-destructive",
              success && "text-green-600",
              warning && "text-yellow-600"
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={baseId}
              ref={ref}
              variant="outline"
              className={cn(
                datePickerVariants({ variant, size, state: currentState }),
                !value && "text-muted-foreground",
                className
              )}
              disabled={disabled}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-describedby={helperId}
              aria-invalid={error}
              {...props}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(value, dateFormat) : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleSelect}
              disabled={disabledMatcher}
              initialFocus
              {...calendarProps}
            />
          </PopoverContent>
        </Popover>

        {helperText && (
          <p
            id={helperId}
            className={cn(
              "text-sm",
              error && "text-destructive",
              success && "text-green-600",
              warning && "text-yellow-600",
              !error && !success && !warning && "text-muted-foreground"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
DatePicker.displayName = "DatePicker"

// Range Date Picker Component
export interface DateRangePickerProps
  extends Omit<DatePickerProps, "value" | "onValueChange"> {
  /** Selected date range value */
  value?: { from: Date | undefined; to: Date | undefined }
  /** Callback when date range changes */
  onValueChange?: (range: { from: Date | undefined; to: Date | undefined } | undefined) => void
  /** Placeholder text when no range is selected */
  placeholder?: string
}

const DateRangePicker = React.forwardRef<HTMLButtonElement, DateRangePickerProps>(
  ({
    className,
    variant,
    size,
    state,
    value,
    onValueChange,
    placeholder = "Pick a date range",
    format: dateFormat = "PPP",
    disabled = false,
    error = false,
    success = false,
    warning = false,
    helperText,
    label,
    required = false,
    fromDate,
    toDate,
    disabledDates,
    calendarProps,
    ...props
  }, ref) => {
    const [open, setOpen] = React.useState(false)

    // Determine state based on props
    const currentState = error ? "error" : success ? "success" : warning ? "warning" : state

    // Generate unique IDs for accessibility
    const baseId = React.useId()
    const helperId = helperText ? `${baseId}-helper` : undefined

    const handleSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
      onValueChange?.(range)
      if (range?.from && range?.to) {
        setOpen(false)
      }
    }

    const disabledMatcher = React.useMemo(() => {
      const matchers = []
      
      if (fromDate) {
        matchers.push({ before: fromDate })
      }
      
      if (toDate) {
        matchers.push({ after: toDate })
      }
      
      if (disabledDates && disabledDates.length > 0) {
        matchers.push(...disabledDates.map(date => ({ 
          from: date, 
          to: date 
        })))
      }
      
      return matchers.length > 0 ? matchers : undefined
    }, [fromDate, toDate, disabledDates])

    const formatRange = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
      if (!range?.from) return placeholder
      if (!range.to) return format(range.from, dateFormat)
      return `${format(range.from, dateFormat)} - ${format(range.to, dateFormat)}`
    }

    return (
      <div className="space-y-1">
        {label && (
          <label 
            htmlFor={baseId}
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              error && "text-destructive",
              success && "text-green-600",
              warning && "text-yellow-600"
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={baseId}
              ref={ref}
              variant="outline"
              className={cn(
                datePickerVariants({ variant, size, state: currentState }),
                !value?.from && "text-muted-foreground",
                className
              )}
              disabled={disabled}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-describedby={helperId}
              aria-invalid={error}
              {...props}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatRange(value)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={value}
              onSelect={handleSelect}
              disabled={disabledMatcher}
              numberOfMonths={2}
              initialFocus
              {...calendarProps}
            />
          </PopoverContent>
        </Popover>

        {helperText && (
          <p
            id={helperId}
            className={cn(
              "text-sm",
              error && "text-destructive",
              success && "text-green-600",
              warning && "text-yellow-600",
              !error && !success && !warning && "text-muted-foreground"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
DateRangePicker.displayName = "DateRangePicker"

export { DatePicker, DateRangePicker }
