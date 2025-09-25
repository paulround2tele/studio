"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
// No longer using branded types - working with regular numbers

const bigIntDisplayVariants = cva(
  "inline-flex items-center font-mono",
  {
    variants: {
      variant: {
        default: "text-foreground",
        muted: "text-muted-foreground",
        success: "text-green-600 dark:text-green-400",
        warning: "text-yellow-600 dark:text-yellow-400",
        destructive: "text-destructive",
        accent: "text-accent-foreground",
      },
      size: {
        xs: "text-xs",
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
        xl: "text-xl",
        "2xl": "text-2xl",
      },
      weight: {
        normal: "font-normal",
        medium: "font-medium",
        semibold: "font-semibold",
        bold: "font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      weight: "normal",
    },
  }
)

export interface BigIntDisplayProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof bigIntDisplayVariants> {
  value: number | null | undefined
  formatWithCommas?: boolean
  prefix?: string
  suffix?: string
  fallback?: React.ReactNode
  showSign?: boolean
  abbreviate?: boolean
  abbreviateThreshold?: number
  precision?: number
  animate?: boolean
  copyable?: boolean
  tooltip?: string
}

const BigIntDisplay = React.forwardRef<HTMLSpanElement, BigIntDisplayProps>(
  ({
    className,
    variant,
    size,
    weight,
    value,
    formatWithCommas = true,
    prefix = "",
    suffix = "",
    fallback = "—",
    showSign = false,
    abbreviate = false,
    abbreviateThreshold = 1000000, // 1M
    precision = 1,
    animate = false,
    copyable = false,
    tooltip,
    ...props
  }, ref) => {
    const [copied, setCopied] = React.useState(false)

    const formatNumber = (numStr: string): string => {
      if (!formatWithCommas) return numStr
      
      // Handle negative numbers
      const isNegative = numStr.startsWith('-')
      const absNumStr = isNegative ? numStr.slice(1) : numStr
      
      // Add commas
      const formatted = absNumStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      
      return isNegative ? `-${formatted}` : formatted
    }

    const abbreviateNumber = (numStr: string): string => {
      if (!abbreviate) return numStr
      
      const num = Number(numStr)
      const absNum = Math.abs(num)
      const isNegative = num < 0
      
      const units = [
        { value: 1000000000000000000, symbol: "Q" }, // Quintillion
        { value: 1000000000000000, symbol: "P" },    // Quadrillion
        { value: 1000000000000, symbol: "T" },       // Trillion
        { value: 1000000000, symbol: "B" },          // Billion
        { value: 1000000, symbol: "M" },             // Million
        { value: 1000, symbol: "K" },                // Thousand
      ]
      
      if (absNum < abbreviateThreshold) {
        return formatNumber(numStr)
      }
      
      for (const unit of units) {
        if (absNum >= unit.value) {
          let result = absNum / unit.value
          
          // Round to specified precision
          const multiplier = Math.pow(10, precision)
          result = Math.round(result * multiplier) / multiplier
          
          const formatted = result.toFixed(precision).replace(/\.?0+$/, '')
          return `${isNegative ? '-' : ''}${formatted}${unit.symbol}`
        }
      }
      
      return formatNumber(numStr)
    }

    const addSign = (numStr: string): string => {
      if (!showSign || numStr.startsWith('-')) return numStr
      return `+${numStr}`
    }

    const handleCopy = async () => {
      if (!value || !copyable) return
      
      try {
        await navigator.clipboard.writeText(value.toString())
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }

    const renderContent = () => {
      if (value === null || value === undefined) {
        return fallback
      }

      const stringValue = value.toString()
      const processedValue = addSign(formatNumber(abbreviateNumber(stringValue)))
      
      return (
        <>
          {prefix && <span className="text-muted-foreground">{prefix} </span>}
          <span className={cn("select-all", animate && "transition-all duration-200")}>
            {processedValue}
          </span>
          {suffix && <span className="text-muted-foreground"> {suffix}</span>}
        </>
      )
    }

    const displayElement = (
      <span
        ref={ref}
        className={cn(
          bigIntDisplayVariants({ variant, size, weight }),
          copyable && "cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors",
          copied && "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
          className
        )}
        onClick={copyable ? handleCopy : undefined}
        role={copyable ? "button" : undefined}
        tabIndex={copyable ? 0 : undefined}
        onKeyDown={copyable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleCopy()
          }
        } : undefined}
        aria-label={copyable ? `Copy value: ${value ?? 'No value'}` : undefined}
        title={tooltip || (copyable && copied ? "Copied!" : copyable ? "Click to copy" : undefined)}
        {...props}
      >
        {renderContent()}
        {copyable && copied && (
          <span className="ml-1 text-xs text-green-600 dark:text-green-400">
            ✓
          </span>
        )}
      </span>
    )

    return displayElement
  }
)

BigIntDisplay.displayName = "BigIntDisplay"

// Preset components for common use cases
const CountDisplay = React.forwardRef<HTMLSpanElement, Omit<BigIntDisplayProps, 'formatWithCommas' | 'abbreviate'>>(
  (props, ref) => (
    <BigIntDisplay 
      ref={ref}
      formatWithCommas
      abbreviate
      abbreviateThreshold={10000}
      {...props} 
    />
  )
)
CountDisplay.displayName = "CountDisplay"

const CurrencyDisplay = React.forwardRef<HTMLSpanElement, Omit<BigIntDisplayProps, 'formatWithCommas'> & { prefix?: string }>(
  ({ prefix = "$", ...props }, ref) => (
    <BigIntDisplay 
      ref={ref}
      prefix={prefix}
      formatWithCommas
      {...props} 
    />
  )
)
CurrencyDisplay.displayName = "CurrencyDisplay"

const PercentageDisplay = React.forwardRef<HTMLSpanElement, Omit<BigIntDisplayProps, 'formatWithCommas'> & { suffix?: string }>(
  ({ suffix = "%", ...props }, ref) => (
    <BigIntDisplay 
      ref={ref}
      suffix={suffix}
      {...props} 
    />
  )
)
PercentageDisplay.displayName = "PercentageDisplay"

export { 
  BigIntDisplay, 
  CountDisplay, 
  CurrencyDisplay, 
  PercentageDisplay 
}
