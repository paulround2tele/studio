// File: src/components/SSEDebugPanel.tsx
import React, { useState, useEffect } from 'react';
import { useCampaignSSE } from '../hooks/useCampaignSSE';
import { SSEEvent } from '../hooks/useSSE';

interface SSEDebugPanelProps {
  campaignId?: string;
  maxEvents?: number;
  className?: string;
}

interface LogEntry {
  timestamp: string;
  event: SSEEvent;
  level: 'info' | 'success' | 'warning' | 'error';
}

export function SSEDebugPanel({ 
  campaignId, 
  maxEvents = 50, 
  className = '' 
}: SSEDebugPanelProps) {
  const [eventLog, setEventLog] = useState<LogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<string>('');

  const { 
    isConnected, 
    error, 
    lastProgress, 
    lastEvent, 
    reconnect, 
    disconnect,
    reconnectAttempts 
  } = useCampaignSSE({
    campaignId,
    events: {
      onProgress: (cId, progress) => {
        addLogEntry({
          timestamp: new Date().toISOString(),
          event: {
            event: 'campaign_progress',
            data: progress,
            timestamp: new Date().toISOString(),
            campaign_id: cId,
          },
          level: 'info',
        });
      },
      onPhaseStarted: (cId, event) => {
        addLogEntry({
          timestamp: new Date().toISOString(),
          event: {
            event: 'phase_started',
            data: event,
            timestamp: new Date().toISOString(),
            campaign_id: cId,
          },
          level: 'info',
        });
      },
      onPhaseCompleted: (cId, event) => {
        addLogEntry({
          timestamp: new Date().toISOString(),
          event: {
            event: 'phase_completed',
            data: event,
            timestamp: new Date().toISOString(),
            campaign_id: cId,
          },
          level: 'success',
        });
      },
      onPhaseFailed: (cId, event) => {
        addLogEntry({
          timestamp: new Date().toISOString(),
          event: {
            event: 'phase_failed',
            data: event,
            timestamp: new Date().toISOString(),
            campaign_id: cId,
          },
          level: 'error',
        });
      },
      onError: (cId, errorMsg) => {
        addLogEntry({
          timestamp: new Date().toISOString(),
          event: {
            event: 'error',
            data: { error: errorMsg },
            timestamp: new Date().toISOString(),
            campaign_id: cId,
          },
          level: 'error',
        });
      },
    },
  });

  const addLogEntry = (entry: LogEntry) => {
    setEventLog(prev => {
      const newLog = [entry, ...prev];
      return newLog.slice(0, maxEvents);
    });
  };

  // Add general event logging
  useEffect(() => {
    if (lastEvent) {
      addLogEntry({
        timestamp: new Date().toISOString(),
        event: lastEvent,
        level: lastEvent.event === 'error' ? 'error' : 
               lastEvent.event === 'phase_completed' ? 'success' :
               lastEvent.event === 'phase_failed' ? 'error' : 'info',
      });
    }
  }, [lastEvent]);

  const filteredEvents = eventLog.filter(entry => 
    !filter || 
    entry.event.event.toLowerCase().includes(filter.toLowerCase()) ||
    JSON.stringify(entry.event.data).toLowerCase().includes(filter.toLowerCase())
  );

  const getStatusIcon = () => {
    if (error) return '❌';
    if (isConnected) return '✅';
    return '🔄';
  };

  const getStatusText = () => {
    if (error) return `Error: ${error}`;
    if (isConnected) return 'Connected';
    return 'Connecting...';
  };

  const getEventLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`border rounded-lg bg-white shadow-sm ${className}`}>
      {/* Header */}
      <div 
        className="p-4 border-b cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <span className="text-lg">{getStatusIcon()}</span>
          <div>
            <h3 className="font-medium text-gray-900">
              SSE Debug Panel {campaignId && `(Campaign: ${campaignId})`}
            </h3>
            <p className="text-sm text-gray-500">{getStatusText()}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {reconnectAttempts > 0 && (
            <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
              Reconnects: {reconnectAttempts}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Controls */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={reconnect}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reconnect
            </button>
            <button
              onClick={disconnect}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              Disconnect
            </button>
            <button
              onClick={() => setEventLog([])}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear Log
            </button>
            <input
              type="text"
              placeholder="Filter events..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1 text-sm border rounded flex-1 min-w-[200px]"
            />
          </div>

          {/* Current Progress Display */}
          {lastProgress && (
            <div className="mb-4 p-3 bg-gray-50 rounded border">
              <h4 className="font-medium text-gray-900 mb-2">Current Progress</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Phase: <span className="font-mono">{lastProgress.current_phase}</span></div>
                <div>Status: <span className="font-mono">{lastProgress.status}</span></div>
                <div>Progress: <span className="font-mono">{lastProgress.progress_pct.toFixed(1)}%</span></div>
                <div>Items: <span className="font-mono">{lastProgress.items_processed}/{lastProgress.items_total}</span></div>
              </div>
              {lastProgress.message && (
                <div className="mt-2 text-sm text-gray-600">{lastProgress.message}</div>
              )}
            </div>
          )}

          {/* Event Log */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h4 className="font-medium text-gray-900 sticky top-0 bg-white">
              Event Log ({filteredEvents.length}/{eventLog.length})
            </h4>
            {filteredEvents.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                {filter ? 'No events match the filter' : 'No events received yet'}
              </div>
            ) : (
              filteredEvents.map((entry, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border text-sm ${getEventLevelColor(entry.level)}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium">{entry.event.event}</span>
                    <span className="text-xs opacity-75">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {entry.event.campaign_id && (
                    <div className="text-xs opacity-75 mb-1">
                      Campaign: {entry.event.campaign_id}
                    </div>
                  )}
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(entry.event.data, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
