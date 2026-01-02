"use client";
import React, { forwardRef } from "react";

/**
 * SelectAdapter - Thin translation layer from shadcn Select API to TailAdmin visuals.
 * 
 * Supports:
 * - Controlled usage: value + onChange
 * - react-hook-form Controller: value + onChange (string-based)
 * - react-hook-form register: {...register("fieldName")}
 * - ref forwarding
 * 
 * Does NOT modify business logic or form validation.
 */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectAdapterProps
  extends Omit<
    React.SelectHTMLAttributes<globalThis.HTMLSelectElement>,
    "onChange" | "value"
  > {
  /** Array of options to display */
  options: SelectOption[];
  /** Currently selected value */
  value?: string;
  /** Placeholder text when no value selected */
  placeholder?: string;
  /** Change handler - receives value string for Controller compatibility */
  onChange?: (value: string) => void;
  /** Error state - shows error styling */
  error?: boolean;
  /** Hint text displayed below select */
  hint?: string;
}

const SelectAdapter = forwardRef<globalThis.HTMLSelectElement, SelectAdapterProps>(
  (
    {
      options,
      value = "",
      placeholder = "Select an option",
      onChange,
      className = "",
      disabled = false,
      error = false,
      hint,
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<globalThis.HTMLSelectElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

    // Base TailAdmin select styles
    let selectClasses = `h-11 w-full appearance-none rounded-lg border px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 ${className}`;

    // State-based styling
    if (disabled) {
      selectClasses += ` bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700`;
    } else if (error) {
      selectClasses += ` border-error-500 focus:border-error-300 focus:ring-error-500/10 dark:border-error-500`;
    } else {
      selectClasses += ` border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-brand-800`;
    }

    // Text color based on value presence
    selectClasses += value
      ? " text-gray-800 dark:text-white/90"
      : " text-gray-400 dark:text-gray-400";

    return (
      <div className="relative">
        <select
          ref={ref}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={selectClasses}
          {...props}
        >
          <option
            value=""
            disabled
            className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
          >
            {placeholder}
          </option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
            >
              {option.label}
            </option>
          ))}
        </select>
        {/* Dropdown arrow icon */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <svg
            className="h-5 w-5 text-gray-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        {hint && (
          <p
            className={`mt-1.5 text-xs ${
              error ? "text-error-500" : "text-gray-500"
            }`}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

SelectAdapter.displayName = "SelectAdapter";

export default SelectAdapter;
