"use client";
import React, { forwardRef } from "react";

/**
 * InputAdapter - Thin translation layer from shadcn Input API to TailAdmin visuals.
 * 
 * Supports:
 * - Controlled usage: value + onChange
 * - react-hook-form register: {...register("fieldName")}
 * - ref forwarding for focus management
 * 
 * Does NOT modify business logic or form validation.
 */

export interface InputAdapterProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  /** Error state - shows error styling */
  error?: boolean;
  /** Success state - shows success styling */
  success?: boolean;
  /** Hint text displayed below input */
  hint?: string;
  /** react-hook-form compatible onChange */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

const InputAdapter = forwardRef<HTMLInputElement, InputAdapterProps>(
  (
    {
      type = "text",
      className = "",
      disabled = false,
      error = false,
      success = false,
      hint,
      ...props
    },
    ref
  ) => {
    // Base TailAdmin input styles
    let inputClasses = `h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${className}`;

    // State-based styling (matches TailAdmin InputField exactly)
    if (disabled) {
      inputClasses += ` text-gray-500 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700`;
    } else if (error) {
      inputClasses += ` text-error-800 border-error-500 focus:ring-3 focus:ring-error-500/10 dark:text-error-400 dark:border-error-500`;
    } else if (success) {
      inputClasses += ` text-success-500 border-success-400 focus:ring-success-500/10 focus:border-success-300 dark:text-success-400 dark:border-success-500`;
    } else {
      inputClasses += ` bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800`;
    }

    return (
      <div className="relative">
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          className={inputClasses}
          {...props}
        />
        {hint && (
          <p
            className={`mt-1.5 text-xs ${
              error
                ? "text-error-500"
                : success
                ? "text-success-500"
                : "text-gray-500"
            }`}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

InputAdapter.displayName = "InputAdapter";

export default InputAdapter;
