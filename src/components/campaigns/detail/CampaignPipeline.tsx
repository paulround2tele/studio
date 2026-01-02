"use client";

import React from "react";

// TailAdmin inline SVG icons
const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.6667 5L7.50004 14.1667L3.33337 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 18.3333C14.6024 18.3333 18.3334 14.6023 18.3334 9.99992C18.3334 5.39755 14.6024 1.66659 10 1.66659C5.39765 1.66659 1.66669 5.39755 1.66669 9.99992C1.66669 14.6023 5.39765 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M10 5V10L13.3333 11.6667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PauseIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.33331 3.33325H5.83331V16.6666H8.33331V3.33325Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14.1667 3.33325H11.6667V16.6666H14.1667V3.33325Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 18.3333C14.6024 18.3333 18.3334 14.6023 18.3334 9.99992C18.3334 5.39755 14.6024 1.66659 10 1.66659C5.39765 1.66659 1.66669 5.39755 1.66669 9.99992C1.66669 14.6023 5.39765 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12.5 7.5L7.5 12.5M7.5 7.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LoaderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
  </svg>
);

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
  completed: <CheckIcon className="w-4 h-4" />,
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
