"use client";
import React, { forwardRef } from "react";

/**
 * RangeAdapter - Styled range input matching TailAdmin visuals.
 * 
 * Supports:
 * - Controlled usage: value + onChange
 * - react-hook-form Controller pattern
 * - ref forwarding
 * 
 * Does NOT modify business logic.
 */

export interface RangeAdapterProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  /** Current value */
  value: number;
  /** Called when value changes */
  onChange: (value: number) => void;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Whether to show value label */
  showValue?: boolean;
  /** Format function for value display */
  formatValue?: (value: number) => string;
  /** Label text */
  label?: string;
  /** Whether the slider is disabled */
  disabled?: boolean;
  /** Additional className for the container */
  className?: string;
}

const RangeAdapter = forwardRef<HTMLInputElement, RangeAdapterProps>(
  (
    {
      value,
      onChange,
      min = 0,
      max = 100,
      step = 1,
      showValue = false,
      formatValue = (v) => String(v),
      label,
      disabled = false,
      className = "",
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    };

    // Calculate percentage for track fill
    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div className={`w-full ${className}`}>
        {/* Label and value display */}
        {(label || showValue) && (
          <div className="mb-2 flex items-center justify-between">
            {label && (
              <label className="text-sm font-medium text-gray-700 dark:text-gray-400">
                {label}
              </label>
            )}
            {showValue && (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
                {formatValue(value)}
              </span>
            )}
          </div>
        )}

        {/* Range input with TailAdmin styling */}
        <div className="relative">
          <input
            ref={ref}
            type="range"
            value={value}
            onChange={handleChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={`
              w-full h-2 appearance-none cursor-pointer rounded-full
              bg-gray-200 dark:bg-gray-700
              focus:outline-none focus:ring-2 focus:ring-brand-500/20
              disabled:cursor-not-allowed disabled:opacity-50
              
              /* Track styling */
              [&::-webkit-slider-runnable-track]:h-2
              [&::-webkit-slider-runnable-track]:rounded-full
              
              /* Thumb styling - webkit */
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-brand-500
              [&::-webkit-slider-thumb]:shadow-md
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-webkit-slider-thumb]:mt-[-6px]
              
              /* Thumb styling - moz */
              [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-brand-500
              [&::-moz-range-thumb]:border-none
              [&::-moz-range-thumb]:shadow-md
              [&::-moz-range-thumb]:cursor-pointer
              
              /* Track fill - moz */
              [&::-moz-range-progress]:bg-brand-500
              [&::-moz-range-progress]:rounded-full
              [&::-moz-range-progress]:h-2
            `}
            style={{
              background: `linear-gradient(to right, rgb(var(--color-brand-500)) 0%, rgb(var(--color-brand-500)) ${percentage}%, rgb(229 231 235) ${percentage}%, rgb(229 231 235) 100%)`,
            }}
            {...props}
          />
        </div>

        {/* Min/Max labels */}
        <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{formatValue(min)}</span>
          <span>{formatValue(max)}</span>
        </div>
      </div>
    );
  }
);

RangeAdapter.displayName = "RangeAdapter";

export default RangeAdapter;
