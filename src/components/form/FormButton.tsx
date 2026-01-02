/**
 * FormButton - Local adapter for form submit/button elements
 * 
 * TailAdmin Button lacks `type` prop. This component provides
 * native <button> with TailAdmin Button styling for use in forms.
 * 
 * Use this ONLY inside <form> elements where type="submit" or type="button" is required.
 * For non-form buttons, continue using TailAdmin Button.
 */

import React, { ReactNode } from "react";

interface FormButtonProps {
  children: ReactNode;
  type: "submit" | "button" | "reset";
  variant?: "primary" | "outline";
  size?: "sm" | "md";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

export default function FormButton({
  children,
  type,
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
  className = "",
  startIcon,
  endIcon,
}: FormButtonProps) {
  // Size classes (matches TailAdmin Button)
  const sizeClasses = {
    sm: "px-4 py-3 text-sm",
    md: "px-5 py-3.5 text-sm",
  };

  // Variant classes (matches TailAdmin Button)
  const variantClasses = {
    primary:
      "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
    outline:
      "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-medium gap-2 rounded-lg transition disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {startIcon && <span>{startIcon}</span>}
      {children}
      {endIcon && <span>{endIcon}</span>}
    </button>
  );
}
