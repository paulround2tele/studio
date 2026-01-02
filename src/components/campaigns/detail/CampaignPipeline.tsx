"use client";

import React from "react";
import { CheckLineIcon, ClockIcon, PauseIcon, XCircleIcon, LoaderIcon } from "@/icons";

type PhaseStatus = "pending" | "running" | "paused" | "completed" | "failed" | "skipped";

interface PipelinePhase {
  name: string;
  displayName: string;
  status: PhaseStatus;
  progress?: number;
  processed?: number;
  total?: number;
}

interface CampaignPipelineProps {
  phases: PipelinePhase[];
  currentPhase?: string;
}

const STATUS_ICONS: Record<PhaseStatus, React.ReactNode> = {
  pending: <ClockIcon className="w-4 h-4" />,
  running: <LoaderIcon className="w-4 h-4 animate-spin" />,
  paused: <PauseIcon className="w-4 h-4" />,
  completed: <CheckLineIcon className="w-4 h-4" />,
  failed: <XCircleIcon className="w-4 h-4" />,
  skipped: <ClockIcon className="w-4 h-4" />,
};

const STATUS_COLORS: Record<PhaseStatus, string> = {
  pending: "bg-gray-100 text-gray-500 dark:bg-gray-800",
  running: "bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400",
  paused: "bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400",
  completed: "bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400",
  failed: "bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400",
  skipped: "bg-gray-100 text-gray-400 dark:bg-gray-800",
};

const CONNECTOR_COLORS: Record<PhaseStatus, string> = {
  pending: "bg-gray-200 dark:bg-gray-700",
  running: "bg-brand-200 dark:bg-brand-800",
  paused: "bg-warning-200 dark:bg-warning-800",
  completed: "bg-success-400 dark:bg-success-600",
  failed: "bg-error-200 dark:bg-error-800",
  skipped: "bg-gray-200 dark:bg-gray-700",
};

export function CampaignPipeline({ phases, currentPhase: _currentPhase }: CampaignPipelineProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
        Pipeline Progress
      </h3>
      
      <div className="relative">
        {/* Connector line background */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
        
        {/* Phase steps */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-0">
          {phases.map((phase, index) => (
            <div key={phase.name} className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 relative z-10">
              {/* Status icon */}
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${STATUS_COLORS[phase.status]}`}>
                {STATUS_ICONS[phase.status]}
              </div>
              
              {/* Phase info */}
              <div className="flex-1 sm:text-center sm:mt-2">
                <p className={`text-sm font-medium ${
                  phase.status === "running" 
                    ? "text-brand-600 dark:text-brand-400" 
                    : phase.status === "completed"
                    ? "text-success-600 dark:text-success-400"
                    : "text-gray-700 dark:text-gray-300"
                }`}>
                  {phase.displayName}
                </p>
                
                {phase.status === "running" && phase.progress !== undefined && (
                  <div className="mt-2 w-full max-w-[100px] mx-auto">
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-500 rounded-full transition-all duration-300"
                        style={{ width: `${phase.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {phase.progress.toFixed(0)}%
                    </p>
                  </div>
                )}
                
                {phase.processed !== undefined && phase.total !== undefined && phase.status === "completed" && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {phase.processed.toLocaleString()} / {phase.total.toLocaleString()}
                  </p>
                )}
              </div>
              
              {/* Connector for completed phases (hidden on mobile) */}
              {index < phases.length - 1 && (
                <div className={`hidden sm:block absolute top-5 left-full w-full h-0.5 -translate-y-1/2 ${
                  phase.status === "completed" ? CONNECTOR_COLORS.completed : "bg-transparent"
                }`} style={{ width: 'calc(100% - 40px)', left: '50%', transform: 'translateX(-50%) translateY(-50%)' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Default phases for DomainFlow campaigns
export const DEFAULT_PHASES: PipelinePhase[] = [
  { name: "discovery", displayName: "Discovery", status: "pending" },
  { name: "validation", displayName: "Validation", status: "pending" },
  { name: "extraction", displayName: "Extraction", status: "pending" },
  { name: "analysis", displayName: "Analysis", status: "pending" },
  { name: "enrichment", displayName: "Enrichment", status: "pending" },
];
