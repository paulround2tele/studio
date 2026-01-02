"use client";

import React, { memo, useMemo } from 'react';
import Badge from '@/components/ta/ui/badge/Badge';
import { AlertCircleIcon, CheckCircleIcon, ClockIcon, PauseIcon } from '@/icons';
import type { CampaignResponse as Campaign } from '@/lib/api-client/models';
type CampaignCurrentPhaseEnum = 'discovery' | 'validation' | 'extraction' | 'analysis' | 'enrichment';
type CampaignPhaseStatusEnum = 'not_started' | 'configured' | 'running' | 'paused' | 'completed' | 'failed';
import { normalizeStatus, getStatusColor } from '@/lib/utils/statusMapping';
import { normalizeToApiPhase } from '@/lib/utils/phaseNames';
import { getPhaseDisplayName as getCanonicalPhaseDisplayName } from '@/lib/utils/phaseMapping';

// Inline TailAdmin-style progress bar component
const ProgressBar: React.FC<{ value: number; className?: string }> = ({ value, className }) => (
  <div className={`w-full bg-gray-200 rounded-full dark:bg-gray-700 ${className || ''}`}>
    <div
      className="h-2 rounded-full bg-brand-500 transition-all duration-300"
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);

// Helper function to map status colors to TailAdmin badge colors
type BadgeColor = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'light' | 'dark';
function getBadgeColor(statusColor: string): BadgeColor {
  if (statusColor.includes('green') || statusColor.includes('success')) return 'success';
  if (statusColor.includes('red') || statusColor.includes('error')) return 'error';
  if (statusColor.includes('yellow') || statusColor.includes('warning')) return 'warning';
  if (statusColor.includes('blue') || statusColor.includes('info')) return 'info';
  return 'light';
}

interface CampaignProgressMonitorProps {
  campaign: Campaign;
  onCampaignUpdate?: (updatedCampaign: Partial<Campaign>) => void;
  onDomainReceived?: (domain: string) => void;
}

// PhaseInfo reserved for future use

interface ProgressInfo {
  phase: CampaignCurrentPhaseEnum;
  status: CampaignPhaseStatusEnum;
  progress: number;
  icon: React.ReactNode;
  statusColor: string;
  normalizedStatus: string;
}

/**
 * Campaign Progress Monitor Component
 * 
 * Displays campaign progress and phase information.
 * Realtime via SSE: Server-Sent Events will power real-time updates (WebSocket removed).
 */
const CampaignProgressMonitor = memo(({
  campaign,
  onCampaignUpdate: _onCampaignUpdate,
  onDomainReceived: _onDomainReceived
}: CampaignProgressMonitorProps): React.ReactElement => {
  
  // Campaign key for tracking
  const campaignKey = useMemo(() => ({
    id: campaign?.id || '',
    currentPhase: (campaign?.currentPhase || 'discovery') as CampaignCurrentPhaseEnum,
    status: (campaign?.status || 'draft') as CampaignPhaseStatusEnum,
  }), [campaign?.id, campaign?.currentPhase, campaign?.status]);

  // Progress calculation logic
  const progressInfo = useMemo((): ProgressInfo => {
  const phase = campaignKey.currentPhase as CampaignCurrentPhaseEnum;
  const status = campaignKey.status as CampaignPhaseStatusEnum;
  const progress = campaign?.progress?.percentComplete || 0;
    
    const normalizedStatus = normalizeStatus(status);
    const statusColor = getStatusColor(normalizedStatus);
    
    // Status icons
    let icon: React.ReactNode;
    switch (normalizedStatus as 'completed' | 'failed' | 'in_progress' | 'paused' | 'draft' | 'running' | 'cancelled') {
      case 'completed':
        icon = <CheckCircleIcon className="h-4 w-4" />;
        break;
      case 'failed':
        icon = <AlertCircleIcon className="h-4 w-4" />;
        break;
      case 'in_progress':
        icon = <ClockIcon className="h-4 w-4" />;
        break;
      case 'paused':
        icon = <PauseIcon className="h-4 w-4" />;
        break;
      default:
        icon = <ClockIcon className="h-4 w-4" />;
    }

    return {
      phase,
      status,
      progress,
      normalizedStatus,
      statusColor,
      icon
    };
  }, [campaignKey.currentPhase, campaignKey.status, campaign?.progress?.percentComplete]);

  // Phase display names
  const getPhaseDisplayName = (phase: CampaignCurrentPhaseEnum): string => {
    const normalized = normalizeToApiPhase(phase.toLowerCase());
    return normalized ? getCanonicalPhaseDisplayName(normalized) : String(phase);
  };

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h3 className="flex items-center justify-between text-lg font-semibold text-gray-800 dark:text-white/90">
          Campaign Progress
          <div className="flex items-center gap-2">
            {/* Connection status indicator - shows polling mode during RTK consolidation */}
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Polling
            </span>
          </div>
        </h3>
      </div>
      <div className="p-5 space-y-4">
        {/* Current Phase */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {progressInfo.icon}
            <span className="font-medium text-gray-800 dark:text-white/90">
              {getPhaseDisplayName(progressInfo.phase)}
            </span>
          </div>
          <Badge 
            color={getBadgeColor(progressInfo.statusColor)}
            size="sm"
          >
            {progressInfo.normalizedStatus}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Progress</span>
            <span className="font-medium">{progressInfo.progress.toFixed(1)}%</span>
          </div>
          <ProgressBar 
            value={progressInfo.progress} 
            className="h-2"
          />
        </div>

        {/* Campaign Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Campaign ID</span>
            <p className="font-mono text-xs">{campaignKey.id.slice(-8)}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Status</span>
            <p className="font-medium">{progressInfo.status}</p>
          </div>
        </div>

        {/* Real-time Notice */}
        <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-3">
          📡 Real-time updates via Server-Sent Events coming soon.
          <br />
          Currently using periodic refresh for progress updates.
        </div>
      </div>
    </div>
  );
});

CampaignProgressMonitor.displayName = 'CampaignProgressMonitor';

export default CampaignProgressMonitor;
