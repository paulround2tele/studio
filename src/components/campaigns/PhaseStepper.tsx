"use client";
import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { pipelineSelectors } from '@/store/selectors/pipelineSelectors';

export const PhaseStepper: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const selectPhases = React.useMemo(()=>pipelineSelectors.phases(campaignId),[campaignId]);
  const phases = useAppSelector(selectPhases);
  return (
    <div className="flex flex-wrap gap-4 items-center text-xs">
      {phases.map((p, idx) => (
        <div key={p.key} className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className={`rounded-full h-6 w-6 flex items-center justify-center border text-[10px] font-semibold ${p.configState === 'missing' ? 'border-gray-300' : p.execState === 'failed' ? 'border-red-500 bg-red-50' : p.execState === 'completed' ? 'border-green-500 bg-green-50' : 'border-blue-400 bg-blue-50'}`}>{idx+1}</span>
            <span className="capitalize">{p.key}</span>
          </div>
          {idx < phases.length -1 && <span className="opacity-40">→</span>}
        </div>
      ))}
    </div>
  );
};