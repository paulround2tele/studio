"use client";
import React from 'react';
import { cn } from '@/lib/utils';

export interface PhasePanelShellProps {
  phaseKey?: string;
  title?: string;
  statusBadges?: React.ReactNode;
  actions?: React.ReactNode;
  alerts?: React.ReactNode; // stacked alerts region
  children?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const PhasePanelShell: React.FC<PhasePanelShellProps> = ({ phaseKey, title, statusBadges, actions, alerts, children, onClose, className }) => {
  return (
    <section
      className={cn(
        'relative rounded-lg border bg-card/60 backdrop-blur-sm p-4 md:p-5 flex flex-col gap-4 min-h-[260px] transition-colors',
        className
      )}
      aria-labelledby={phaseKey ? `phase-panel-${phaseKey}` : undefined}
      data-phase-panel
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h4 id={phaseKey ? `phase-panel-${phaseKey}` : undefined} className="font-semibold text-sm md:text-base flex items-center gap-2">
            {title || (phaseKey ? `${phaseKey} configuration` : 'Phase')}
          </h4>
          {statusBadges && (
            <div className="flex flex-wrap items-center gap-2">{statusBadges}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-2 py-1 border rounded-md bg-transparent hover:bg-muted/60"
            >Close</button>
          )}
        </div>
      </div>
      {alerts && <div className="space-y-2" data-alert-stack>{alerts}</div>}
      <div className="rounded-md border border-dashed bg-background/40 p-3 md:p-4 transition-opacity duration-300 data-[state=enter]:opacity-0 data-[state=entered]:opacity-100" data-phase-form-container>
        {children}
      </div>
    </section>
  );
};

export default PhasePanelShell;
