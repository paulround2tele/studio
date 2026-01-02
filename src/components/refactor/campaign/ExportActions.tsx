/**
 * Export Actions Component (Phase 5)
 * Buttons for exporting JSON/CSV/share bundles
 */

import React, { useState } from 'react';
import { DownloadIcon, FileTextIcon, ShareIcon, AlertCircleIcon, CheckCircleIcon } from '@/icons';
import { cn } from '@/lib/utils';
import { AggregateSnapshot } from '@/types/campaignMetrics';
import { EnhancedRecommendation } from '@/services/campaignMetrics/recommendationsV3Pipeline';
import {
  exportSnapshotsJSON,
  exportSnapshotsCSV,
  generateShareableURL,
  validateExportSize,
  isExportToolsAvailable
} from '@/services/campaignMetrics/exportService';
import { telemetryService } from '@/services/campaignMetrics/telemetryService';

interface ExportActionsProps {
  snapshots: AggregateSnapshot[];
  recommendations?: EnhancedRecommendation[];
  campaignId: string;
  campaignName?: string;
  className?: string;
}

const ExportActions: React.FC<ExportActionsProps> = ({
  snapshots,
  recommendations,
  campaignId,
  campaignName,
  className
}) => {
  const [exporting, setExporting] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // Don't render if export tools are disabled
  if (!isExportToolsAvailable()) {
    return null;
  }

  const handleExportJSON = async () => {
    if (snapshots.length === 0) return;

    setExporting('json');
    try {
      const validation = validateExportSize(snapshots);
      if (!validation.valid) {
        alert(validation.warning || 'Export too large');
        return;
      }

      const filename = `${campaignName || campaignId}-snapshots-${new Date().toISOString().split('T')[0]}.json`;
      exportSnapshotsJSON(snapshots, campaignId, filename);
      
      // Emit telemetry
      telemetryService.emitExportGenerated({
        type: 'json',
        snapshots: snapshots.length,
        sizeMB: validation.size / (1024 * 1024)
      });

      setLastExport('JSON export completed');
      setTimeout(() => setLastExport(null), 3000);
    } catch (error) {
      console.error('JSON export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportCSV = async () => {
    if (snapshots.length === 0) return;

    setExporting('csv');
    try {
      const validation = validateExportSize(snapshots);
      if (!validation.valid) {
        alert(validation.warning || 'Export too large');
        return;
      }

      const filename = `${campaignName || campaignId}-snapshots-${new Date().toISOString().split('T')[0]}.csv`;
      exportSnapshotsCSV(snapshots, campaignId, filename);
      
      // Emit telemetry
      telemetryService.emitExportGenerated({
        type: 'csv',
        snapshots: snapshots.length,
        sizeMB: validation.size / (1024 * 1024)
      });

      setLastExport('CSV export completed');
      setTimeout(() => setLastExport(null), 3000);
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const handleGenerateShareUrl = async () => {
    if (snapshots.length === 0) return;

    setExporting('share');
    try {
      const validation = validateExportSize(snapshots);
      if (!validation.valid) {
        alert(validation.warning || 'Data too large for sharing');
        return;
      }

      const url = generateShareableURL(snapshots, campaignId, recommendations);
      setShareUrl(url);
      
      // Copy to clipboard if available
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setLastExport('Share URL copied to clipboard');
      } else {
        setLastExport('Share URL generated');
      }

      // Emit telemetry
      telemetryService.emitExportGenerated({
        type: 'bundle',
        snapshots: snapshots.length,
        sizeMB: validation.size / (1024 * 1024)
      });

      setTimeout(() => setLastExport(null), 5000);
    } catch (error) {
      console.error('Share URL generation failed:', error);
      alert('Failed to generate share URL. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const hasData = snapshots.length > 0;
  const validation = hasData ? validateExportSize(snapshots) : { valid: false, size: 0 };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <DownloadIcon className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Export Data
        </h4>
        {hasData && (
          <span className="text-xs text-gray-500">
            {snapshots.length} snapshots
          </span>
        )}
      </div>

      {/* Size Warning */}
      {validation.warning && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <AlertCircleIcon className="w-4 h-4 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            {validation.warning}
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ExportButton
          onClick={handleExportJSON}
          disabled={!hasData || exporting !== null}
          loading={exporting === 'json'}
          icon={<FileTextIcon className="w-4 h-4" />}
          label="JSON"
          description="Structured data"
        />
        
        <ExportButton
          onClick={handleExportCSV}
          disabled={!hasData || exporting !== null}
          loading={exporting === 'csv'}
          icon={<DownloadIcon className="w-4 h-4" />}
          label="CSV"
          description="Spreadsheet format"
        />
        
        <ExportButton
          onClick={handleGenerateShareUrl}
          disabled={!hasData || exporting !== null}
          loading={exporting === 'share'}
          icon={<ShareIcon className="w-4 h-4" />}
          label="Share"
          description="Shareable link"
        />
      </div>

      {/* Status Messages */}
      {lastExport && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <CheckCircleIcon className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-800 dark:text-green-200">
            {lastExport}
          </span>
        </div>
      )}

      {/* Share URL Display */}
      {shareUrl && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Share URL:
          </label>
          <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded border text-xs font-mono break-all">
            {shareUrl}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            This URL contains your campaign data and can be shared with others.
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!hasData && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <DownloadIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <div className="text-sm">No snapshots available for export</div>
        </div>
      )}
    </div>
  );
};

// Helper Component

interface ExportButtonProps {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  onClick,
  disabled,
  loading,
  icon,
  label,
  description
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "p-3 border rounded-lg text-left transition-colors",
        "hover:bg-gray-50 dark:hover:bg-gray-700",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        disabled 
          ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {loading ? (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          icon
        )}
        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
          {label}
        </span>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {description}
      </div>
    </button>
  );
};

export default ExportActions;