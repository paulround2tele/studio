"use client";
import React from 'react';
import { cn } from '@/lib/utils';

export type AlertTone = 'info' | 'warn' | 'error' | 'success';

const toneStyles: Record<AlertTone, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-400/10 dark:border-blue-400/40 dark:text-blue-300',
  warn: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-400/10 dark:border-amber-400/40 dark:text-amber-300',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-400/10 dark:border-red-400/40 dark:text-red-300',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-400/10 dark:border-emerald-400/40 dark:text-emerald-300',
};

export interface AlertItem {
  id: string;
  tone: AlertTone;
  title?: string;
  message: string;
  dismissible?: boolean;
}

export interface AlertStackProps {
  items: AlertItem[];
  onDismiss?: (id: string) => void;
  className?: string;
}

export const AlertStack: React.FC<AlertStackProps> = ({ items, onDismiss, className }) => {
  if (!items.length) return null;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {items.map(item => (
        <div
          key={item.id}
          className={cn('rounded-md border px-3 py-2 text-xs flex items-start gap-3', toneStyles[item.tone])}
          role={item.tone === 'error' ? 'alert' : 'status'}
        >
          <div className="flex-1 space-y-0.5">
            {item.title && <div className="font-medium leading-tight">{item.title}</div>}
            <div className="leading-snug">{item.message}</div>
          </div>
          {item.dismissible && onDismiss && (
            <button
              onClick={() => onDismiss(item.id)}
              className="shrink-0 text-[10px] px-1.5 py-0.5 rounded hover:bg-background/30 border border-transparent hover:border-border/40"
              aria-label="Dismiss alert"
            >✕</button>
          )}
        </div>
      ))}
    </div>
  );
};

export default AlertStack;
