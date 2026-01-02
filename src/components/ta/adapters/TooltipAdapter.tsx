"use client";
import React from "react";

/**
 * TooltipAdapter - Lightweight CSS-only tooltip matching TailAdmin visuals.
 * 
 * Uses hover/focus to show tooltip. No third-party libraries.
 * 
 * Does NOT modify business logic.
 */

export interface TooltipAdapterProps {
  /** Content to display in the tooltip */
  content: React.ReactNode;
  /** Element that triggers the tooltip */
  children: React.ReactNode;
  /** Position of the tooltip relative to trigger */
  position?: "top" | "bottom" | "left" | "right";
  /** Delay before showing tooltip (ms) - CSS transition */
  delayMs?: number;
  /** Additional className for the wrapper */
  className?: string;
  /** Whether tooltip is disabled */
  disabled?: boolean;
}

const TooltipAdapter: React.FC<TooltipAdapterProps> = ({
  content,
  children,
  position = "top",
  className = "",
  disabled = false,
}) => {
  if (disabled || !content) {
    return <>{children}</>;
  }

  // Position classes for tooltip placement
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  // Arrow position classes
  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-gray-800 border-x-transparent border-b-transparent",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 border-x-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-gray-800 border-y-transparent border-r-transparent",
    right:
      "right-full top-1/2 -translate-y-1/2 border-r-gray-800 border-y-transparent border-l-transparent",
  };

  return (
    <div className={`group relative inline-flex ${className}`}>
      {children}
      <div
        className={`
          pointer-events-none absolute z-50 ${positionClasses[position]}
          scale-95 opacity-0 transition-all duration-150
          group-hover:scale-100 group-hover:opacity-100
          group-focus-within:scale-100 group-focus-within:opacity-100
        `}
        role="tooltip"
      >
        <div className="whitespace-nowrap rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-gray-700">
          {content}
        </div>
        {/* Arrow */}
        <div
          className={`absolute h-0 w-0 border-4 ${arrowClasses[position]}`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export default TooltipAdapter;
