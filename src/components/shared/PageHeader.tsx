
import type { LucideIcon } from 'lucide-react';
import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
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
            className="flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
            aria-label="Go back"
          >
            ←
          </button>
        )}
        {Icon && <Icon className="h-7 w-7 text-primary" />}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          {description && <p className="text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>
      {actionButtons && <div className="flex gap-2 self-end sm:self-auto">{actionButtons}</div>}
    </div>
  );
}
