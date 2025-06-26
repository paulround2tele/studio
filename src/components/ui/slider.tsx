"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const sliderVariants = cva(
  "relative flex w-full touch-none select-none items-center",
  {
    variants: {
      size: {
        sm: "[&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[data-orientation=horizontal]]:h-1",
        md: "[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[data-orientation=horizontal]]:h-2",
        lg: "[&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[data-orientation=horizontal]]:h-3",
      },
      variant: {
        default: "",
        destructive: "[&_.slider-range]:bg-destructive [&_[role=slider]]:border-destructive",
        success: "[&_.slider-range]:bg-green-500 [&_[role=slider]]:border-green-500",
        warning: "[&_.slider-range]:bg-yellow-500 [&_[role=slider]]:border-yellow-500",
      }
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
)

const sliderTrackVariants = cva(
  "relative w-full grow overflow-hidden rounded-full bg-secondary",
  {
    variants: {
      size: {
        sm: "h-1",
        md: "h-2",
        lg: "h-3",
      }
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const sliderRangeVariants = cva(
  "absolute h-full bg-primary slider-range",
  {
    variants: {
      variant: {
        default: "bg-primary",
        destructive: "bg-destructive",
        success: "bg-green-500",
        warning: "bg-yellow-500",
      }
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const sliderThumbVariants = cva(
  "block rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "h-3 w-3",
        md: "h-5 w-5",
        lg: "h-6 w-6",
      },
      variant: {
        default: "border-primary",
        destructive: "border-destructive",
        success: "border-green-500",
        warning: "border-yellow-500",
      }
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
)

export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
    VariantProps<typeof sliderVariants> {
  showValue?: boolean
  showLabels?: boolean
  showMarks?: boolean
  marks?: Array<{ value: number; label?: string }>
  formatValue?: (value: number) => string
  orientation?: "horizontal" | "vertical"
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ 
  className, 
  size, 
  variant, 
  showValue = false,
  showLabels = false,
  showMarks = false,
  marks = [],
  formatValue = (value: number) => value.toString(),
  orientation = "horizontal",
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  ...props 
}, ref) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || [min])
  const currentValue = value || internalValue

  const handleValueChange = React.useCallback((newValue: number[]) => {
    if (!value) {
      setInternalValue(newValue)
    }
    props.onValueChange?.(newValue)
  }, [value, props.onValueChange])

  return (
    <div className={cn("w-full", orientation === "vertical" && "h-48")}>
      {showLabels && (
        <div className={cn(
          "flex justify-between text-sm text-muted-foreground mb-2",
          orientation === "vertical" && "flex-col h-full mb-0 mr-2 w-8"
        )}>
          <span>{formatValue(min)}</span>
          <span>{formatValue(max)}</span>
        </div>
      )}
      
      <div className={cn("relative", orientation === "vertical" && "flex")}>
        <SliderPrimitive.Root
          ref={ref}
          className={cn(sliderVariants({ size, variant }), className)}
          orientation={orientation}
          min={min}
          max={max}
          step={step}
          value={currentValue}
          defaultValue={defaultValue}
          onValueChange={handleValueChange}
          {...props}
        >
          <SliderPrimitive.Track 
            className={cn(
              sliderTrackVariants({ size }),
              orientation === "vertical" && "h-full w-2"
            )}
          >
            <SliderPrimitive.Range 
              className={sliderRangeVariants({ variant })} 
            />
          </SliderPrimitive.Track>
          
          {showMarks && marks.map((mark) => (
            <div
              key={mark.value}
              className={cn(
                "absolute w-1 h-1 bg-muted-foreground/50 rounded-full",
                orientation === "horizontal" 
                  ? "top-1/2 -translate-y-1/2" 
                  : "left-1/2 -translate-x-1/2"
              )}
              style={{
                [orientation === "horizontal" ? "left" : "bottom"]: 
                  `${((mark.value - min) / (max - min)) * 100}%`
              }}
            >
              {mark.label && (
                <span className={cn(
                  "absolute text-xs text-muted-foreground whitespace-nowrap",
                  orientation === "horizontal" 
                    ? "top-full mt-1 left-1/2 -translate-x-1/2"
                    : "left-full ml-2 top-1/2 -translate-y-1/2"
                )}>
                  {mark.label}
                </span>
              )}
            </div>
          ))}
          
          <SliderPrimitive.Thumb 
            className={sliderThumbVariants({ size, variant })}
            aria-label="Slider thumb"
          />
        </SliderPrimitive.Root>
        
        {showValue && currentValue && (
          <div className={cn(
            "text-sm font-medium text-center mt-2",
            orientation === "vertical" && "ml-2 mt-0"
          )}>
            {Array.isArray(currentValue) 
              ? currentValue.map(formatValue).join(" - ") 
              : formatValue(currentValue as number)
            }
          </div>
        )}
      </div>
    </div>
  )
})

Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
