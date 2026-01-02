"use client";
import React from "react";

/**
 * TabsAdapter - Controlled tabs component matching TailAdmin visuals.
 * 
 * Supports controlled value/onChange pattern for integration with forms or state.
 * 
 * Does NOT modify business logic.
 */

export interface TabItem {
  /** Unique value for this tab */
  value: string;
  /** Display label for the tab button */
  label: string;
  /** Content to render when tab is active */
  content: React.ReactNode;
  /** Whether this tab is disabled */
  disabled?: boolean;
  /** Icon to display before label */
  icon?: React.ReactNode;
}

export interface TabsAdapterProps {
  /** Array of tab items */
  tabs: TabItem[];
  /** Currently selected tab value */
  value: string;
  /** Called when selected tab changes */
  onChange: (value: string) => void;
  /** Additional className for the container */
  className?: string;
  /** Variant styling */
  variant?: "underline" | "pills";
}

const TabsAdapter: React.FC<TabsAdapterProps> = ({
  tabs,
  value,
  onChange,
  className = "",
  variant = "underline",
}) => {
  const activeTab = tabs.find((tab) => tab.value === value);

  // Base button classes
  const baseButtonClasses =
    "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20";

  // Variant-specific classes
  const variantClasses = {
    underline: {
      container: "border-b border-gray-200 dark:border-gray-700",
      button: "border-b-2 -mb-px",
      active:
        "border-brand-500 text-brand-600 dark:text-brand-400",
      inactive:
        "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300",
      disabled: "cursor-not-allowed opacity-50",
    },
    pills: {
      container: "gap-2",
      button: "rounded-lg",
      active:
        "bg-brand-500 text-white dark:bg-brand-600",
      inactive:
        "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
      disabled: "cursor-not-allowed opacity-50",
    },
  };

  const styles = variantClasses[variant];

  return (
    <div className={className}>
      {/* Tab buttons */}
      <div
        className={`flex ${styles.container}`}
        role="tablist"
        aria-orientation="horizontal"
      >
        {tabs.map((tab) => {
          const isActive = tab.value === value;
          const isDisabled = tab.disabled;

          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.value}`}
              tabIndex={isActive ? 0 : -1}
              disabled={isDisabled}
              onClick={() => !isDisabled && onChange(tab.value)}
              className={`
                ${baseButtonClasses}
                ${styles.button}
                ${isActive ? styles.active : styles.inactive}
                ${isDisabled ? styles.disabled : ""}
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div
        role="tabpanel"
        id={`tabpanel-${value}`}
        aria-labelledby={`tab-${value}`}
        className="mt-4"
      >
        {activeTab?.content}
      </div>
    </div>
  );
};

export default TabsAdapter;
