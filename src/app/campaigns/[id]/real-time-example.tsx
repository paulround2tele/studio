// File: src/app/campaigns/[id]/real-time-example.tsx
'use client';

import React from 'react';
import { CampaignProgressMonitor } from '../../../components/CampaignProgressMonitor';
import { SSEDebugPanel } from '../../../components/SSEDebugPanel';

interface RealTimeExampleProps {
  campaignId: string;
}

/**
 * Example component demonstrating SSE integration for real-time campaign monitoring
 * This shows how absurdly simple it is to add real-time features with proper architecture
 */
export function RealTimeExample({ campaignId }: RealTimeExampleProps) {
  const [notifications, setNotifications] = React.useState<string[]>([]);

  const addNotification = (message: string) => {
    setNotifications(prev => [
      `${new Date().toLocaleTimeString()}: ${message}`,
      ...prev.slice(0, 9) // Keep last 10 notifications
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Production Progress Monitor */}
      <CampaignProgressMonitor
        campaignId={campaignId}
        onProgressUpdate={(progress) => {
          console.log('📊 Progress Update:', progress);
          addNotification(`Progress: ${progress.progress_pct.toFixed(1)}% - ${progress.current_phase}`);
        }}
        onPhaseCompleted={(phase, results) => {
          console.log('✅ Phase Completed:', phase, results);
          addNotification(`✅ Phase "${phase}" completed successfully`);
        }}
        onError={(error) => {
          console.error('❌ Campaign Error:', error);
          addNotification(`❌ Error: ${error}`);
        }}
        showDebugInfo={false}
        className="border-2 border-blue-200"
      />

      {/* Notifications Panel */}
      {notifications.length > 0 && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Recent Activity</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {notifications.map((notification, index) => (
              <div key={index} className="text-sm text-gray-600 font-mono">
                {notification}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debug Panel (for development) */}
      <SSEDebugPanel
        campaignId={campaignId}
        maxEvents={20}
        className="border-dashed border-gray-300"
      />

      {/* Implementation Notes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">🎯 SSE Implementation Highlights</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Automatic Reconnection:</strong> Handles network drops gracefully</li>
          <li>• <strong>Event Filtering:</strong> Campaign-specific or global event streams</li>
          <li>• <strong>Type Safety:</strong> Fully typed event handlers and progress updates</li>
          <li>• <strong>Performance:</strong> Efficient connection management with keep-alive</li>
          <li>• <strong>Production Ready:</strong> Error handling, retry logic, and cleanup</li>
          <li>• <strong>Developer Experience:</strong> Debug panel for real-time monitoring</li>
        </ul>
      </div>
    </div>
  );
}
