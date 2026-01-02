
import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actionButtons?: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function PageHeader({ 
  title, 
  description, 
  icon: Icon, 
  actionButtons, 
  showBackButton, 
  onBack 
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {showBackButton && onBack && (
          <button 
            onClick={onBack}
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            aria-label="Go back"
          >
            ←
          </button>
        )}
        {Icon && <Icon className="h-7 w-7 text-brand-500" />}
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90 sm:text-3xl">{title}</h1>
          {description && <p className="text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
        </div>
      </div>
      {actionButtons && <div className="flex gap-2 self-end sm:self-auto">{actionButtons}</div>}
    </div>
  );
}
