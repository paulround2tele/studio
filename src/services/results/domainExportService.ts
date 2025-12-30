/**
 * Domain Export Service (Phase 5)
 * 
 * Exports domain data from Results Mode to CSV and JSON formats.
 * Uses only backend-authoritative data - no client recomputation.
 * Supports: qualified leads, rejected domains (by reason), no-keywords domains.
 */

import type { DomainListItem } from '@/lib/api-client/models/domain-list-item';
import type { DomainRejectionReasonEnum } from '@/lib/api-client/models/domain-rejection-reason-enum';

// ============================================================================
// Types
// ============================================================================

export interface ExportOptions {
  format: 'csv' | 'json';
  filename?: string;
  includeHeaders?: boolean;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  rowCount: number;
  format: 'csv' | 'json';
}

export interface DomainExportRow {
  domain: string;
  rejectionReason: string;
  domainScore: number | null;
  leadScore: number | null;
  dnsStatus: string | null;
  httpStatus: string | null;
  dnsReason: string | null;
  httpReason: string | null;
  createdAt: string | null;
}

// CSV column definitions - authoritative list
export const CSV_COLUMNS: readonly (keyof DomainExportRow)[] = [
  'domain',
  'rejectionReason',
  'domainScore',
  'leadScore',
  'dnsStatus',
  'httpStatus',
  'dnsReason',
  'httpReason',
  'createdAt',
] as const;

export const CSV_HEADERS: readonly string[] = [
  'Domain',
  'Rejection Reason',
  'Domain Score',
  'Lead Score',
  'DNS Status',
  'HTTP Status',
  'DNS Reason',
  'HTTP Reason',
  'Created At',
] as const;

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform a DomainListItem to an export row.
 * Only uses fields directly from the backend response.
 */
export function transformToExportRow(item: DomainListItem): DomainExportRow {
  return {
    domain: item.domain ?? '',
    rejectionReason: item.rejectionReason ?? 'unknown',
    domainScore: item.domainScore ?? null,
    leadScore: item.leadScore ?? null,
    dnsStatus: item.dnsStatus ?? null,
    httpStatus: item.httpStatus ?? null,
    dnsReason: item.dnsReason ?? null,
    httpReason: item.httpReason ?? null,
    createdAt: item.createdAt ?? null,
  };
}

/**
 * Transform multiple DomainListItems to export rows.
 */
export function transformToExportRows(items: DomainListItem[]): DomainExportRow[] {
  return items.map(transformToExportRow);
}

// ============================================================================
// CSV Export
// ============================================================================

/**
 * Escape a value for CSV format.
 * Wraps in quotes if contains comma, quote, or newline.
 */
function escapeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // If contains special characters, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert export rows to CSV string.
 */
export function toCSV(rows: DomainExportRow[], includeHeaders = true): string {
  const lines: string[] = [];

  if (includeHeaders) {
    lines.push(CSV_HEADERS.join(','));
  }

  for (const row of rows) {
    const values = CSV_COLUMNS.map((col) => escapeCSVValue(row[col]));
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

// ============================================================================
// JSON Export
// ============================================================================

/**
 * Convert export rows to JSON string.
 */
export function toJSON(rows: DomainExportRow[]): string {
  return JSON.stringify(rows, null, 2);
}

// ============================================================================
// File Download
// ============================================================================

/**
 * Trigger a browser download of the export data.
 */
export function downloadExport(
  data: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate a filename for the export.
 */
export function generateFilename(
  campaignId: string,
  rejectionReason: DomainRejectionReasonEnum | 'all',
  format: 'csv' | 'json'
): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  const shortId = campaignId.slice(0, 8);
  const reasonLabel = rejectionReason === 'all' ? 'all-domains' : rejectionReason.replace(/_/g, '-');
  return `domains-${shortId}-${reasonLabel}-${timestamp}.${format}`;
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Export domains to file.
 * 
 * @param domains - Array of DomainListItem from backend
 * @param campaignId - Campaign ID for filename
 * @param rejectionReason - Filter label for filename
 * @param options - Export options
 * @returns ExportResult
 */
export function exportDomains(
  domains: DomainListItem[],
  campaignId: string,
  rejectionReason: DomainRejectionReasonEnum | 'all',
  options: ExportOptions
): ExportResult {
  const rows = transformToExportRows(domains);
  const filename = options.filename ?? generateFilename(campaignId, rejectionReason, options.format);

  let data: string;
  let mimeType: string;

  if (options.format === 'csv') {
    data = toCSV(rows, options.includeHeaders ?? true);
    mimeType = 'text/csv;charset=utf-8;';
  } else {
    data = toJSON(rows);
    mimeType = 'application/json;charset=utf-8;';
  }

  downloadExport(data, filename, mimeType);

  return {
    success: true,
    filename,
    rowCount: rows.length,
    format: options.format,
  };
}

// ============================================================================
// Validation Helpers (for tests)
// ============================================================================

/**
 * Validate that an export row has the expected shape.
 */
export function validateExportRowShape(row: unknown): row is DomainExportRow {
  if (typeof row !== 'object' || row === null) {
    return false;
  }
  const obj = row as Record<string, unknown>;
  return (
    typeof obj.domain === 'string' &&
    typeof obj.rejectionReason === 'string' &&
    (typeof obj.domainScore === 'number' || obj.domainScore === null) &&
    (typeof obj.leadScore === 'number' || obj.leadScore === null) &&
    (typeof obj.dnsStatus === 'string' || obj.dnsStatus === null) &&
    (typeof obj.httpStatus === 'string' || obj.httpStatus === null) &&
    (typeof obj.dnsReason === 'string' || obj.dnsReason === null) &&
    (typeof obj.httpReason === 'string' || obj.httpReason === null) &&
    (typeof obj.createdAt === 'string' || obj.createdAt === null)
  );
}

/**
 * Validate CSV has expected columns.
 */
export function validateCSVColumns(csv: string): boolean {
  const firstLine = csv.split('\n')[0];
  if (!firstLine) return false;
  const headers = firstLine.split(',');
  return headers.length === CSV_HEADERS.length &&
    headers.every((h, i) => h === CSV_HEADERS[i]);
}
