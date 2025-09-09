"use client";
import React from 'react';
import { cn } from '@/lib/utils';

export type StatusVariant = 'missing' | 'configured' | 'running' | 'failed' | 'completed' | 'paused' | 'idle';

const variantStyles: Record<StatusVariant, string> = {
  missing: 'bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-400/10 dark:border-amber-400/40 dark:text-amber-300',
  configured: 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-400/10 dark:border-emerald-400/40 dark:text-emerald-300',
  running: 'bg-blue-50 text-blue-700 border border-blue-300 dark:bg-blue-400/10 dark:border-blue-400/40 dark:text-blue-300 animate-pulse',
  failed: 'bg-red-50 text-red-700 border border-red-300 dark:bg-red-400/10 dark:border-red-400/40 dark:text-red-300',
  completed: 'bg-green-50 text-green-700 border border-green-300 dark:bg-green-400/10 dark:border-green-400/40 dark:text-green-300',
  paused: 'bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-500/10 dark:border-slate-500/40 dark:text-slate-300',
  idle: 'bg-muted text-muted-foreground border border-border/60 dark:bg-muted/30',
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: StatusVariant;
  children?: React.ReactNode;
  titleText?: string;
  compact?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ variant, children, className, titleText, compact = false, ...rest }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md whitespace-nowrap',
        compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        variantStyles[variant],
        className,
      )}
      title={titleText}
      {...rest}
    >
      {children}
    </span>
  );
};

export default StatusBadge;
