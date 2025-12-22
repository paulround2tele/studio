/**
 * DomainActionsExport - Export dialog for selected domains
 * 
 * Features:
 * - Export to CSV or JSON
 * - Client-side generation (no backend endpoint)
 * - Includes all domain data + features
 * - Respects current selection
 * 
 * ARCHITECTURE:
 * - Export is client-side only (no backend endpoint exists)
 * - Exports from domains already loaded in memory
 * - For large exports (all matching), would need backend support
 * 
 * @see Phase 7.4 Actions & Export
 */

'use client';

import React, { useCallback, useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { DomainRow } from '@/types/explorer/state';

// ============================================================================
// TYPES
// ============================================================================

export type ExportFormat = 'csv' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  includeFeatures: boolean;
  filename?: string;
}

export interface DomainActionsExportProps {
  /** Domains to export (selected domains) */
  domains: DomainRow[];
  /** Number of selected domains */
  selectionCount: number;
  /** Campaign ID for filename */
  campaignId: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/**
 * Convert domains to CSV string
 */
function domainsToCSV(domains: DomainRow[], includeFeatures: boolean): string {
  // Define columns
  const baseColumns = [
    'id',
    'domain',
    'dns_status',
    'http_status',
    'lead_status',
    'dns_reason',
    'http_reason',
    'created_at',
  ];

  const featureColumns = includeFeatures ? [
    'richness_score',
    'keywords_unique',
    'keywords_total',
    'keywords_top3',
    'microcrawl_gain',
  ] : [];

  const columns = [...baseColumns, ...featureColumns];

  // Build header row
  const header = columns.join(',');

  // Build data rows
  const rows = domains.map(d => {
    const baseValues = [
      escapeCSV(d.id ?? ''),
      escapeCSV(d.domain ?? ''),
      escapeCSV(d.dnsStatus ?? ''),
      escapeCSV(d.httpStatus ?? ''),
      escapeCSV(d.leadStatus ?? ''),
      escapeCSV(d.dnsReason ?? ''),
      escapeCSV(d.httpReason ?? ''),
      escapeCSV(d.createdAt ?? ''),
    ];

    const featureValues = includeFeatures ? [
      d.features?.richness?.score?.toString() ?? '',
      d.features?.keywords?.unique_count?.toString() ?? '',
      d.features?.keywords?.hits_total?.toString() ?? '',
      escapeCSV(d.features?.keywords?.top3?.join('; ') ?? ''),
      d.features?.microcrawl?.gain_ratio?.toString() ?? '',
    ] : [];

    return [...baseValues, ...featureValues].join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Escape CSV value
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convert domains to JSON string
 */
function domainsToJSON(domains: DomainRow[], includeFeatures: boolean): string {
  const data = domains.map(d => {
    const base = {
      id: d.id,
      domain: d.domain,
      dnsStatus: d.dnsStatus,
      httpStatus: d.httpStatus,
      leadStatus: d.leadStatus,
      dnsReason: d.dnsReason,
      httpReason: d.httpReason,
      createdAt: d.createdAt,
    };

    if (includeFeatures && d.features) {
      return {
        ...base,
        features: d.features,
      };
    }

    return base;
  });

  return JSON.stringify(data, null, 2);
}

/**
 * Trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Export dialog for selected domains
 */
export function DomainActionsExport({
  domains,
  selectionCount,
  campaignId,
  disabled = false,
  className,
}: DomainActionsExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [includeFeatures, setIncludeFeatures] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (domains.length === 0) return;

    setIsExporting(true);
    setError(null);

    try {
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `domains-${campaignId}-${timestamp}.${format}`;

      // Generate content
      const content = format === 'csv'
        ? domainsToCSV(domains, includeFeatures)
        : domainsToJSON(domains, includeFeatures);

      // Determine MIME type
      const mimeType = format === 'csv'
        ? 'text/csv;charset=utf-8'
        : 'application/json;charset=utf-8';

      // Trigger download
      downloadFile(content, filename, mimeType);

      // Close dialog on success
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [domains, format, includeFeatures, campaignId]);

  const isDisabled = disabled || selectionCount === 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2", className)}
          disabled={isDisabled}
          data-testid="domain-actions-export-button"
        >
          <Download className="h-4 w-4" />
          Export
          {selectionCount > 0 && (
            <span className="text-xs text-muted-foreground">
              ({selectionCount})
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent data-testid="domain-actions-export-dialog">
        <DialogHeader>
          <DialogTitle>Export Domains</DialogTitle>
          <DialogDescription>
            Export {selectionCount.toLocaleString()} selected {selectionCount === 1 ? 'domain' : 'domains'} to a file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format selection */}
          <div className="space-y-2">
            <Label htmlFor="export-format">Format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
            >
              <SelectTrigger id="export-format" data-testid="export-format-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV (Spreadsheet)
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    JSON (Developer)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Include features toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="include-features">Include Features</Label>
              <p className="text-xs text-muted-foreground">
                Richness, keywords, microcrawl data
              </p>
            </div>
            <Button
              variant={includeFeatures ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIncludeFeatures(!includeFeatures)}
              data-testid="export-include-features"
            >
              {includeFeatures ? 'Included' : 'Excluded'}
            </Button>
          </div>

          {/* Error display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || domains.length === 0}
            data-testid="export-confirm-button"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

DomainActionsExport.displayName = 'DomainActionsExport';
