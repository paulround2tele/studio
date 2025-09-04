"use client";
import React from 'react';
import { usePhaseReadiness } from '@/hooks/usePhaseReadiness';

export const PhaseStepper: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const { phases } = usePhaseReadiness(campaignId);
  return (
    <div className="flex flex-wrap gap-4 items-center text-xs">
      {phases.map((p, idx) => (
        <div key={p.phase} className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className={`rounded-full h-6 w-6 flex items-center justify-center border text-[10px] font-semibold ${p.blocked ? 'border-amber-500 bg-amber-50' : p.configured ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>{idx+1}</span>
            <span className="capitalize">{p.phase}</span>
          </div>
          {idx < phases.length -1 && <span className="opacity-40">→</span>}
        </div>
      ))}
    </div>
  );
};