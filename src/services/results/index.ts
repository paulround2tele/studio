/**
 * Results Services
 * 
 * Services for Results Mode functionality including exports.
 */

export {
  // Types
  type ExportOptions,
  type ExportResult,
  type DomainExportRow,
  // Constants
  CSV_COLUMNS,
  CSV_HEADERS,
  // Functions
  transformToExportRow,
  transformToExportRows,
  toCSV,
  toJSON,
  downloadExport,
  generateFilename,
  exportDomains,
  validateExportRowShape,
  validateCSVColumns,
} from './domainExportService';
