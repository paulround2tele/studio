/**
 * Pipeline Phases Hook
 * Maps campaign phases to pipeline visualization segments
 */

import { useMemo } from 'react';

export interface PipelinePhase {
  key: string;
  label: string;
  order: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

export interface PipelineState {
  phases: PipelinePhase[];
  currentPhase: string | null;
  completedPhases: string[];
}

/**
 * Hook to map campaign phase data to pipeline visualization
 */
export function usePipelinePhases(
  currentPhase?: string,
  phaseExecutions?: Record<string, any>
): PipelineState {
  return useMemo(() => {
    // Standard phase mapping (Generation, DNS, HTTP/Keyword, Analysis, Leads)
    const standardPhases = [
      { key: 'discovery', label: 'Generation', order: 1 },
      { key: 'validation', label: 'DNS', order: 2 },
      { key: 'extraction', label: 'HTTP / Keyword', order: 3 },
      { key: 'analysis', label: 'Analysis', order: 4 },
      { key: 'leads', label: 'Leads', order: 5 }, // Synthetic final stage
    ];

    const completedPhases: string[] = [];
    
    // Determine completed phases from phase executions
    if (phaseExecutions) {
      Object.entries(phaseExecutions).forEach(([phase, execution]) => {
        if (execution?.status === 'completed') {
          completedPhases.push(phase);
        }
      });
    }

    // Map phases with status
    const phases: PipelinePhase[] = standardPhases.map(phase => {
      let status: PipelinePhase['status'] = 'pending';
      
      if (completedPhases.includes(phase.key)) {
        status = 'completed';
      } else if (currentPhase === phase.key) {
        status = 'active';
      } else if (phaseExecutions?.[phase.key]?.status === 'failed') {
        status = 'failed';
      }

      return {
        ...phase,
        status,
      };
    });

    return {
      phases,
      currentPhase: currentPhase || null,
      completedPhases,
    };
  }, [currentPhase, phaseExecutions]);
}