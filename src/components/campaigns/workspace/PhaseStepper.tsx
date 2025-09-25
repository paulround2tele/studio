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
  onPhaseSelect?: (phaseKey: string) => void;
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

export const PhaseStepper: React.FC<PhaseStepperProps & Omit<React.HTMLAttributes<HTMLElement>, 'onSelect'>> = ({ phases, activePhase, onPhaseSelect, orientation = 'horizontal', className, condensed = false, ...rest }) => {
  const sorted = React.useMemo(() => [...phases].sort((a,b)=>a.order - b.order), [phases]);
  const vertical = orientation === 'vertical';

  // Roving focus index (defaults to activePhase else first)
  const activeIndex = React.useMemo(()=>sorted.findIndex(p=>p.key===activePhase),[sorted, activePhase]);
  const [focusIndex, setFocusIndex] = React.useState(()=> activeIndex > -1 ? activeIndex : 0);
  const prevActiveRef = React.useRef(activePhase);
  React.useEffect(()=>{
    if (activePhase !== prevActiveRef.current) {
      prevActiveRef.current = activePhase;
      if (activeIndex > -1) setFocusIndex(activeIndex);
    }
  }, [activePhase, activeIndex]);

  // Focus element matching focusIndex after updates (roving tab index pattern)
  React.useEffect(()=> {
    const key = sorted[focusIndex]?.key;
    if (!key) return;
    const el = document.querySelector<HTMLButtonElement>(`[data-phase-step='${key}']`);
    if (el && document.activeElement !== el) {
      el.focus();
    }
  }, [focusIndex, sorted]);

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let next = idx;
    if (e.key === 'ArrowRight' || (vertical && e.key === 'ArrowDown')) { next = (idx + 1) % sorted.length; }
    else if (e.key === 'ArrowLeft' || (vertical && e.key === 'ArrowUp')) { next = (idx - 1 + sorted.length) % sorted.length; }
    else if (e.key === 'Home') { next = 0; }
    else if (e.key === 'End') { next = sorted.length -1; }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
  const target = sorted[idx];
  if (target) onPhaseSelect?.(target.key);
      return;
    } else { return; }
    e.preventDefault();
    setFocusIndex(next);
    // Defer focusing until after state update flush
    const key = sorted[next]?.key;
    if (key) {
      setTimeout(()=>{
        const btn = document.querySelector<HTMLButtonElement>(`[data-phase-step='${key}']`);
        btn?.focus();
      }, 0);
    }
  };

  return (
    <nav aria-label="Pipeline phases" className={cn(vertical ? 'flex flex-col gap-4' : 'flex items-stretch gap-6', className)} data-phase-stepper {...rest}>
  {sorted.map((p, idx) => {
        const active = p.key === activePhase;
        const badgeVariant = deriveVariant(p);
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onPhaseSelect?.(p.key)}
            className={cn(
              'group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md transition-colors',
              vertical ? 'flex items-start gap-3 text-left' : 'flex flex-col items-center gap-1',
              active && 'ring-1 ring-primary/70 bg-primary/5'
            )}
            aria-current={active ? 'step' : undefined}
            aria-label={`Phase ${idx+1}: ${p.label}. Status ${p.execState}`}
    role="button"
    data-phase-step={p.key}
    tabIndex={focusIndex === idx ? 0 : -1}
    onKeyDown={(e)=>handleKeyDown(e, idx)}
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
