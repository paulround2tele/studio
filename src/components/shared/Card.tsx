import React from "react";

/**
 * TailAdmin Card Component - FROZEN LAYOUT PRIMITIVE
 * 
 * ⚠️ UI CONTRACT: This is the ONLY allowed way to build card-based layouts.
 * Do not create ad-hoc card styling on pages. Match TailAdmin demo exactly.
 * 
 * Patterns from https://demo.tailadmin.com/basic-tables:
 * - Card: rounded-2xl border shadow-sm
 * - Header: px-6 py-5 border-b with clear visual separation
 * - Body: No border-t when using header (header has border-b)
 * - Table headers: bg-gray-100 for stronger contrast
 */

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

// Main Card container - TailAdmin uses subtle shadow
export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {children}
    </div>
  );
}

// Card Header - TailAdmin has strong border-b separation
export function CardHeader({ children, className = "", actions }: CardHeaderProps) {
  return (
    <div className={`px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between ${className}`}>
      <div className="flex-1 min-w-0">{children}</div>
      {actions && <div className="flex items-center gap-2 ml-4 flex-shrink-0">{actions}</div>}
    </div>
  );
}

// Card Title - TailAdmin uses tighter icon+text grouping
export function CardTitle({ children, className = "", icon }: CardTitleProps) {
  return (
    <h3 className={`text-base font-semibold text-gray-800 dark:text-white/90 flex items-center gap-2 ${className}`}>
      {icon && <span className="text-brand-500 flex-shrink-0">{icon}</span>}
      {children}
    </h3>
  );
}

// Card Description - TailAdmin uses more muted subtitle
export function CardDescription({ children, className = "" }: CardDescriptionProps) {
  return (
    <p className={`mt-1 text-sm text-gray-400 dark:text-gray-500 ${className}`}>
      {children}
    </p>
  );
}

// Card Body - No border-t when header exists (header has border-b)
export function CardBody({ children, className = "", noPadding = false }: CardBodyProps) {
  const paddingClass = noPadding ? "" : "p-4 sm:p-6";
  return (
    <div className={`${paddingClass} ${className}`}>
      {children}
    </div>
  );
}

// Card Footer - Subtle background for visual "end" of card
interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div className={`px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/50 ${className}`}>
      {children}
    </div>
  );
}

// Empty State for cards - centered with proper spacing
interface CardEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function CardEmptyState({ icon, title, description, action }: CardEmptyStateProps) {
  return (
    <div className="text-center py-12 px-6">
      {icon && (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-400 dark:text-gray-500 max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ============================================================================
// TABLE CONSTANTS - TailAdmin table-06.html EXACT TOKENS
// Source: tailadmin/.../partials/table/table-06.html
// DO NOT MODIFY without explicit Product approval (Carlo)
// ============================================================================
export const TABLE_HEADER_CLASSES = "bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700";
export const TABLE_HEADER_CELL_CLASSES = "px-5 py-3 sm:px-6 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400";
export const TABLE_BODY_CLASSES = "divide-y divide-gray-100 dark:divide-gray-800";
export const TABLE_BODY_CELL_CLASSES = "px-5 py-4 sm:px-6";
export const TABLE_ROW_CLASSES = "hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors";

// Action button for tables - icon-only with hover emphasis
interface TableActionButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "danger";
  disabled?: boolean;
  title?: string;
}

export function TableActionButton({ icon, onClick, href, variant = "default", disabled, title }: TableActionButtonProps) {
  const baseClasses = "inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1";
  const variantClasses = variant === "danger"
    ? "text-gray-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-500/15 focus:ring-error-500"
    : "text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700 focus:ring-brand-500";
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "";
  
  const className = `${baseClasses} ${variantClasses} ${disabledClasses}`;
  
  if (href) {
    // Return just the className and icon for Link wrapper usage
    return (
      <span className={className} title={title}>
        {icon}
      </span>
    );
  }
  
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      title={title}
    >
      {icon}
    </button>
  );
}

export default Card;
