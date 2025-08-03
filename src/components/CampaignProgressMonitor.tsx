// File: src/components/CampaignProgressMonitor.tsx
import React, { useState, useEffect } from 'react';
import { useCampaignSSE, CampaignProgress } from '../hooks/useCampaignSSE';

interface CampaignProgressMonitorProps {
  campaignId: string;
  initialProgress?: CampaignProgress;
  onProgressUpdate?: (progress: CampaignProgress) => void;
  onPhaseCompleted?: (phase: string, results?: any) => void;
  onError?: (error: string) => void;
  showDebugInfo?: boolean;
  className?: string;
}

export function CampaignProgressMonitor({
  campaignId,
  initialProgress,
  onProgressUpdate,
  onPhaseCompleted,
  onError,
  showDebugInfo = false,
  className = '',
}: CampaignProgressMonitorProps) {
  const [currentProgress, setCurrentProgress] = useState<CampaignProgress | null>(
    initialProgress || null
  );
  const [phaseHistory, setPhaseHistory] = useState<string[]>([]);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());

  const { isConnected, error, reconnect } = useCampaignSSE({
    campaignId,
    events: {
      onProgress: (cId, progress) => {
        setCurrentProgress(progress);
        setLastActivity(new Date());
        onProgressUpdate?.(progress);
      },
      onPhaseStarted: (cId, event) => {
        setPhaseHistory(prev => {
          const newHistory = [...prev];
          if (!newHistory.includes(event.phase)) {
            newHistory.push(event.phase);
          }
          return newHistory;
        });
        setLastActivity(new Date());
      },
      onPhaseCompleted: (cId, event) => {
        setLastActivity(new Date());
        onPhaseCompleted?.(event.phase, event.results);
      },
      onPhaseFailed: (cId, event) => {
        setLastActivity(new Date());
        onError?.(event.error || `Phase ${event.phase} failed`);
      },
      onError: (cId, errorMsg) => {
        setLastActivity(new Date());
        onError?.(errorMsg);
      },
    },
  });

  const getPhaseDisplayName = (phase: string): string => {
    const phaseNames: Record<string, string> = {
      'domain_generation': 'Domain Generation',
      'dns_validation': 'DNS Validation',
      'http_keyword_validation': 'HTTP Validation',
      'analysis': 'Analysis',
    };
    return phaseNames[phase] || phase;
  };

  const getPhaseIcon = (phase: string, isActive: boolean): string => {
    const icons: Record<string, string> = {
      'domain_generation': '🌐',
      'dns_validation': '🔍',
      'http_keyword_validation': '📡',
      'analysis': '📊',
    };
    return isActive ? '⚡' + icons[phase] : icons[phase] || '📋';
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const estimatedTimeRemaining = (): string => {
    if (!currentProgress || currentProgress.progress_pct <= 0) return 'Calculating...';
    
    const remaining = 100 - currentProgress.progress_pct;
    const elapsed = (new Date().getTime() - new Date(currentProgress.timestamp).getTime()) / 1000;
    const rate = currentProgress.progress_pct / elapsed;
    const remainingSeconds = remaining / rate;
    
    if (remainingSeconds < 60) return `~${Math.ceil(remainingSeconds)}s`;
    const remainingMinutes = remainingSeconds / 60;
    if (remainingMinutes < 60) return `~${Math.ceil(remainingMinutes)}m`;
    const remainingHours = remainingMinutes / 60;
    return `~${Math.ceil(remainingHours)}h`;
  };

  return (
    <div className={`border rounded-lg bg-white shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Campaign Progress</h3>
            <p className="text-sm text-gray-500">Campaign ID: {campaignId}</p>
          </div>
          <div className="flex items-center space-x-2">
            {/* Connection Status */}
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-xs text-gray-500">
                {isConnected ? 'Live' : 'Disconnected'}
              </span>
            </div>
            {/* Reconnect Button */}
            {!isConnected && (
              <button
                onClick={reconnect}
                className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Reconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            ⚠️ Connection Error: {error}
          </div>
        )}

        {currentProgress ? (
          <>
            {/* Current Phase */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">
                    {getPhaseIcon(currentProgress.current_phase, true)}
                  </span>
                  <span className="font-medium">
                    {getPhaseDisplayName(currentProgress.current_phase)}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(currentProgress.status)}`}>
                    {currentProgress.status}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {currentProgress.progress_pct.toFixed(1)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(currentProgress.progress_pct, 100)}%` }}
                />
              </div>

              {/* Progress Details */}
              <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Items:</span>{' '}
                  {currentProgress.items_processed.toLocaleString()} / {currentProgress.items_total.toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">ETA:</span>{' '}
                  {estimatedTimeRemaining()}
                </div>
                <div>
                  <span className="font-medium">Last Update:</span>{' '}
                  {formatTimeAgo(lastActivity)}
                </div>
              </div>

              {currentProgress.message && (
                <div className="mt-2 text-sm text-gray-600 italic">
                  {currentProgress.message}
                </div>
              )}
            </div>

            {/* Phase History */}
            {phaseHistory.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Phase Timeline</h4>
                <div className="flex flex-wrap gap-2">
                  {phaseHistory.map((phase, index) => (
                    <div
                      key={phase}
                      className={`flex items-center space-x-1 px-2 py-1 rounded text-sm ${
                        phase === currentProgress.current_phase
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <span>{getPhaseIcon(phase, phase === currentProgress.current_phase)}</span>
                      <span>{getPhaseDisplayName(phase)}</span>
                      {index < phaseHistory.length - 1 && (
                        <span className="text-gray-400">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-2xl mb-2">⏳</div>
            <p>Waiting for campaign progress data...</p>
            <p className="text-xs">Make sure the campaign is running and SSE is connected.</p>
          </div>
        )}

        {/* Debug Info */}
        {showDebugInfo && (
          <div className="mt-4 pt-4 border-t bg-gray-50 rounded p-3">
            <h4 className="font-medium text-gray-900 mb-2">Debug Information</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Connection: {isConnected ? '✅ Connected' : '❌ Disconnected'}</div>
              <div>Last Activity: {lastActivity.toLocaleString()}</div>
              <div>Campaign ID: {campaignId}</div>
              {error && <div className="text-red-600">Error: {error}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
