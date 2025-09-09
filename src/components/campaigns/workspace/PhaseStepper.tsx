"use client";
import React from 'react';
import { cn } from '@/lib/utils';
import StatusBadge, { StatusVariant } from './StatusBadge';

export interface StepPhaseInfo {
  key: string;                // canonical key (discovery | validation | extraction | analysis)
  label: string;              // display label
  order: number;              // ordering
  configState: string;        // raw config state (valid|missing|pending...)
  execState: string;          // raw execution state (running|failed|completed|not_started...)
}

export interface PhaseStepperProps {
  phases: StepPhaseInfo[];
  activePhase?: string;
  onSelect?: (phaseKey: string) => void;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  condensed?: boolean; // smaller labels for tight spaces
}

// Map raw config+exec to a StatusVariant for the badge under each step
function deriveVariant(p: StepPhaseInfo): StatusVariant {
  if (p.execState === 'failed') return 'failed';
  if (p.execState === 'running') return 'running';
  if (p.execState === 'completed') return 'completed';
  if (p.configState === 'valid') return 'configured';
  if (p.execState === 'paused') return 'paused';
  if (p.configState === 'missing') return 'missing';
  return 'idle';
}

export const PhaseStepper: React.FC<PhaseStepperProps> = ({ phases, activePhase, onSelect, orientation = 'horizontal', className, condensed = false }) => {
  const sorted = React.useMemo(() => [...phases].sort((a,b)=>a.order - b.order), [phases]);
  const vertical = orientation === 'vertical';

  return (
    <nav aria-label="Pipeline phases" className={cn(vertical ? 'flex flex-col gap-4' : 'flex items-stretch gap-6', className)} data-phase-stepper>
      {sorted.map((p, idx) => {
        const active = p.key === activePhase;
        const badgeVariant = deriveVariant(p);
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onSelect?.(p.key)}
            className={cn(
              'group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md transition-colors',
              vertical ? 'flex items-start gap-3 text-left' : 'flex flex-col items-center gap-1',
              active && 'ring-1 ring-primary/70 bg-primary/5'
            )}
            aria-current={active ? 'step' : undefined}
            aria-label={`Phase ${idx+1}: ${p.label}. Status ${p.execState}`}
          >
            <div className={cn('flex items-center justify-center rounded-full border font-semibold transition-colors',
              condensed ? 'h-7 w-7 text-[11px]' : 'h-8 w-8 text-[12px]',
              active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground',
              badgeVariant === 'failed' && !active && 'border-red-400',
              badgeVariant === 'completed' && !active && 'border-green-400',
            )}>{idx+1}</div>
            <div className={cn(vertical ? 'flex flex-col gap-1' : 'flex flex-col items-center gap-1')}> 
              <span className={cn('capitalize font-medium', condensed ? 'text-[11px]' : 'text-xs', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')}>{p.label}</span>
              <StatusBadge variant={badgeVariant} compact titleText={`Config: ${p.configState} / Exec: ${p.execState}`}>{badgeVariant}</StatusBadge>
            </div>
            { !vertical && idx < sorted.length -1 && (
              <span className="absolute top-1/2 -right-3 w-6 h-px bg-border/60 group-hover:bg-border" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default PhaseStepper;
