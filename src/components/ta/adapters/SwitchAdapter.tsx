"use client";
import React, { forwardRef, useId } from "react";

/**
 * SwitchAdapter - Controlled switch component matching TailAdmin visuals.
 * 
 * Supports:
 * - Controlled usage: checked + onChange
 * - react-hook-form Controller pattern
 * - ref forwarding
 * 
 * Does NOT modify business logic.
 */

export interface SwitchAdapterProps {
  /** Whether the switch is checked */
  checked: boolean;
  /** Called when checked state changes */
  onChange: (checked: boolean) => void;
  /** Label text to display next to switch */
  label?: string;
  /** Whether the switch is disabled */
  disabled?: boolean;
  /** Color theme */
  color?: "blue" | "gray";
  /** Additional className for the container */
  className?: string;
  /** Name attribute for form submission */
  name?: string;
  /** ID for the input element */
  id?: string;
  /** Aria label for accessibility */
  "aria-label"?: string;
}

const SwitchAdapter = forwardRef<HTMLInputElement, SwitchAdapterProps>(
  (
    {
      checked,
      onChange,
      label,
      disabled = false,
      color = "blue",
      className = "",
      name,
      id,
      "aria-label": ariaLabel,
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!disabled) {
        onChange(e.target.checked);
      }
    };

    // Color schemes matching TailAdmin Switch
    const switchColors =
      color === "blue"
        ? {
            background: checked
              ? "bg-brand-500"
              : "bg-gray-200 dark:bg-white/10",
            knob: checked
              ? "translate-x-full bg-white"
              : "translate-x-0 bg-white",
          }
        : {
            background: checked
              ? "bg-gray-800 dark:bg-white/10"
              : "bg-gray-200 dark:bg-white/10",
            knob: checked
              ? "translate-x-full bg-white"
              : "translate-x-0 bg-white",
          };

    return (
      <label
        htmlFor={inputId}
        className={`flex cursor-pointer select-none items-center gap-3 text-sm font-medium ${
          disabled ? "text-gray-400 cursor-not-allowed" : "text-gray-700 dark:text-gray-400"
        } ${className}`}
      >
        {/* Hidden checkbox for form submission and accessibility */}
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          name={name}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          aria-label={ariaLabel || label}
        />

        {/* Visual switch */}
        <div className="relative">
          <div
            className={`block transition duration-150 ease-linear h-6 w-11 rounded-full ${
              disabled
                ? "bg-gray-100 pointer-events-none dark:bg-gray-800"
                : switchColors.background
            }`}
          />
          <div
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow-theme-sm duration-150 ease-linear transform ${switchColors.knob}`}
          />
        </div>

        {/* Label text */}
        {label}
      </label>
    );
  }
);

SwitchAdapter.displayName = "SwitchAdapter";

export default SwitchAdapter;
