"use client";
import React, { forwardRef } from "react";

/**
 * TextAreaAdapter - Thin translation layer from shadcn Textarea API to TailAdmin visuals.
 * 
 * Supports:
 * - Controlled usage: value + onChange
 * - react-hook-form register: {...register("fieldName")}
 * - ref forwarding for focus management
 * 
 * Does NOT modify business logic or form validation.
 */

export interface TextAreaAdapterProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  /** Error state - shows error styling */
  error?: boolean;
  /** Hint text displayed below textarea */
  hint?: string;
  /** react-hook-form compatible onChange */
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
}

const TextAreaAdapter = forwardRef<HTMLTextAreaElement, TextAreaAdapterProps>(
  (
    {
      className = "",
      disabled = false,
      error = false,
      hint,
      rows = 3,
      ...props
    },
    ref
  ) => {
    // Base TailAdmin textarea styles
    let textareaClasses = `w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden ${className}`;

    // State-based styling (matches TailAdmin TextArea exactly)
    if (disabled) {
      textareaClasses += ` bg-gray-100 opacity-50 text-gray-500 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700`;
    } else if (error) {
      textareaClasses += ` bg-transparent text-gray-400 border-gray-300 focus:border-error-300 focus:ring-3 focus:ring-error-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-error-800`;
    } else {
      textareaClasses += ` bg-transparent text-gray-400 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800`;
    }

    return (
      <div className="relative">
        <textarea
          ref={ref}
          rows={rows}
          disabled={disabled}
          className={textareaClasses}
          {...props}
        />
        {hint && (
          <p
            className={`mt-2 text-sm ${
              error ? "text-error-500" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

TextAreaAdapter.displayName = "TextAreaAdapter";

export default TextAreaAdapter;
