import React from "react";

/**
 * TailAdmin Card Component
 * Follows TailAdmin patterns exactly:
 * - rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]
 * - Header: px-6 py-5 with border-b
 * - Body: p-4 sm:p-6
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

// Main Card container
export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {children}
    </div>
  );
}

// Card Header - px-6 py-5 with optional border
export function CardHeader({ children, className = "", actions }: CardHeaderProps) {
  return (
    <div className={`px-6 py-5 flex items-center justify-between ${className}`}>
      <div className="flex-1">{children}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// Card Title - text-base font-medium
export function CardTitle({ children, className = "", icon }: CardTitleProps) {
  return (
    <h3 className={`text-base font-medium text-gray-800 dark:text-white/90 flex items-center gap-2 ${className}`}>
      {icon}
      {children}
    </h3>
  );
}

// Card Description - text-sm text-gray-500
export function CardDescription({ children, className = "" }: CardDescriptionProps) {
  return (
    <p className={`mt-1 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
      {children}
    </p>
  );
}

// Card Body - p-4 sm:p-6 with border-t
export function CardBody({ children, className = "", noPadding = false }: CardBodyProps) {
  const paddingClass = noPadding ? "" : "p-4 sm:p-6";
  return (
    <div className={`border-t border-gray-100 dark:border-gray-800 ${paddingClass} ${className}`}>
      {children}
    </div>
  );
}

// Empty State for cards
interface CardEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function CardEmptyState({ icon, title, description, action }: CardEmptyStateProps) {
  return (
    <div className="text-center py-10">
      {icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center text-gray-400 dark:text-gray-500">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-medium text-gray-800 dark:text-white/90">{title}</h3>
      {description && (
        <p className="mt-2 text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default Card;
