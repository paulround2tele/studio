/**
 * Domain Export Service Tests (Phase 5)
 * 
 * Tests for export shape and columns.
 */

import {
  transformToExportRow,
  transformToExportRows,
  toCSV,
  toJSON,
  validateExportRowShape,
  validateCSVColumns,
  CSV_COLUMNS,
  CSV_HEADERS,
  generateFilename,
  type DomainExportRow,
} from '../domainExportService';
import type { DomainListItem } from '@/lib/api-client/models/domain-list-item';
import { DomainRejectionReasonEnum } from '@/lib/api-client/models/domain-rejection-reason-enum';

// ============================================================================
// Test Data
// ============================================================================

const mockDomainListItem: DomainListItem = {
  id: 'domain-123',
  domain: 'example.com',
  createdAt: '2025-01-01T00:00:00Z',
  dnsStatus: 'success',
  httpStatus: 'success',
  leadStatus: 'qualified',
  rejectionReason: DomainRejectionReasonEnum.qualified,
  dnsReason: null,
  httpReason: null,
  domainScore: 85,
  leadScore: 72,
};

const mockDomainWithErrors: DomainListItem = {
  id: 'domain-456',
  domain: 'failed.com',
  createdAt: '2025-01-02T00:00:00Z',
  dnsStatus: 'error',
  httpStatus: null,
  leadStatus: null,
  rejectionReason: DomainRejectionReasonEnum.dns_error,
  dnsReason: 'NXDOMAIN',
  httpReason: null,
  domainScore: undefined,
  leadScore: undefined,
};

const mockDomainMinimal: DomainListItem = {
  domain: 'minimal.com',
};

// ============================================================================
// Transform Tests
// ============================================================================

describe('transformToExportRow', () => {
  it('transforms a complete DomainListItem to export row', () => {
    const row = transformToExportRow(mockDomainListItem);

    expect(row.domain).toBe('example.com');
    expect(row.rejectionReason).toBe('qualified');
    expect(row.domainScore).toBe(85);
    expect(row.leadScore).toBe(72);
    expect(row.dnsStatus).toBe('success');
    expect(row.httpStatus).toBe('success');
    expect(row.dnsReason).toBeNull();
    expect(row.httpReason).toBeNull();
    expect(row.createdAt).toBe('2025-01-01T00:00:00Z');
  });

  it('handles missing optional fields with null/defaults', () => {
    const row = transformToExportRow(mockDomainMinimal);

    expect(row.domain).toBe('minimal.com');
    expect(row.rejectionReason).toBe('unknown');
    expect(row.domainScore).toBeNull();
    expect(row.leadScore).toBeNull();
    expect(row.dnsStatus).toBeNull();
    expect(row.httpStatus).toBeNull();
    expect(row.createdAt).toBeNull();
  });

  it('transforms error domain correctly', () => {
    const row = transformToExportRow(mockDomainWithErrors);

    expect(row.domain).toBe('failed.com');
    expect(row.rejectionReason).toBe('dns_error');
    expect(row.dnsStatus).toBe('error');
    expect(row.dnsReason).toBe('NXDOMAIN');
    expect(row.domainScore).toBeNull();
  });
});

describe('transformToExportRows', () => {
  it('transforms multiple items', () => {
    const rows = transformToExportRows([mockDomainListItem, mockDomainWithErrors]);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.domain).toBe('example.com');
    expect(rows[1]?.domain).toBe('failed.com');
  });

  it('handles empty array', () => {
    const rows = transformToExportRows([]);
    expect(rows).toHaveLength(0);
  });
});

// ============================================================================
// CSV Tests
// ============================================================================

describe('toCSV', () => {
  it('generates CSV with headers', () => {
    const rows = transformToExportRows([mockDomainListItem]);
    const csv = toCSV(rows, true);

    expect(csv).toContain(CSV_HEADERS.join(','));
    expect(csv.split('\n')).toHaveLength(2);
  });

  it('generates CSV without headers', () => {
    const rows = transformToExportRows([mockDomainListItem]);
    const csv = toCSV(rows, false);

    expect(csv).not.toContain(CSV_HEADERS.join(','));
    expect(csv.split('\n')).toHaveLength(1);
  });

  it('has correct number of columns', () => {
    const rows = transformToExportRows([mockDomainListItem]);
    const csv = toCSV(rows, true);
    const lines = csv.split('\n');

    const headerCols = lines[0]?.split(',') ?? [];
    const dataCols = lines[1]?.split(',') ?? [];

    expect(headerCols).toHaveLength(CSV_COLUMNS.length);
    expect(dataCols).toHaveLength(CSV_COLUMNS.length);
  });

  it('escapes values with commas', () => {
    const item: DomainListItem = {
      domain: 'test,domain.com',
      rejectionReason: DomainRejectionReasonEnum.qualified,
    };
    const rows = transformToExportRows([item]);
    const csv = toCSV(rows, false);

    expect(csv).toContain('"test,domain.com"');
  });

  it('escapes values with quotes', () => {
    const item: DomainListItem = {
      domain: 'test"domain.com',
      rejectionReason: DomainRejectionReasonEnum.qualified,
    };
    const rows = transformToExportRows([item]);
    const csv = toCSV(rows, false);

    expect(csv).toContain('"test""domain.com"');
  });

  it('handles null values as empty strings', () => {
    const rows = transformToExportRows([mockDomainMinimal]);
    const csv = toCSV(rows, false);
    const cols = csv.split(',');

    // dnsStatus (index 4) should be empty
    expect(cols[4]).toBe('');
  });
});

describe('validateCSVColumns', () => {
  it('validates correct CSV headers', () => {
    const rows = transformToExportRows([mockDomainListItem]);
    const csv = toCSV(rows, true);

    expect(validateCSVColumns(csv)).toBe(true);
  });

  it('rejects CSV with wrong headers', () => {
    const badCsv = 'Wrong,Headers\ndata,row';
    expect(validateCSVColumns(badCsv)).toBe(false);
  });

  it('rejects empty CSV', () => {
    expect(validateCSVColumns('')).toBe(false);
  });
});

// ============================================================================
// JSON Tests
// ============================================================================

describe('toJSON', () => {
  it('generates valid JSON', () => {
    const rows = transformToExportRows([mockDomainListItem]);
    const json = toJSON(rows);

    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('produces correct array structure', () => {
    const rows = transformToExportRows([mockDomainListItem, mockDomainWithErrors]);
    const json = toJSON(rows);
    const parsed = JSON.parse(json) as DomainExportRow[];

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
  });

  it('preserves all fields', () => {
    const rows = transformToExportRows([mockDomainListItem]);
    const json = toJSON(rows);
    const parsed = JSON.parse(json) as DomainExportRow[];

    expect(parsed[0]).toEqual({
      domain: 'example.com',
      rejectionReason: 'qualified',
      domainScore: 85,
      leadScore: 72,
      dnsStatus: 'success',
      httpStatus: 'success',
      dnsReason: null,
      httpReason: null,
      createdAt: '2025-01-01T00:00:00Z',
    });
  });
});

// ============================================================================
// Shape Validation Tests
// ============================================================================

describe('validateExportRowShape', () => {
  it('validates correct shape', () => {
    const row = transformToExportRow(mockDomainListItem);
    expect(validateExportRowShape(row)).toBe(true);
  });

  it('rejects missing domain', () => {
    const invalid = { rejectionReason: 'qualified' };
    expect(validateExportRowShape(invalid)).toBe(false);
  });

  it('rejects wrong type for domainScore', () => {
    const invalid = {
      domain: 'test.com',
      rejectionReason: 'qualified',
      domainScore: 'not-a-number',
      leadScore: null,
      dnsStatus: null,
      httpStatus: null,
      dnsReason: null,
      httpReason: null,
      createdAt: null,
    };
    expect(validateExportRowShape(invalid)).toBe(false);
  });

  it('rejects null object', () => {
    expect(validateExportRowShape(null)).toBe(false);
  });

  it('rejects non-object', () => {
    expect(validateExportRowShape('string')).toBe(false);
  });
});

// ============================================================================
// Filename Generation Tests
// ============================================================================

describe('generateFilename', () => {
  it('generates CSV filename', () => {
    const filename = generateFilename('12345678-abcd-efgh', DomainRejectionReasonEnum.qualified, 'csv');

    expect(filename).toMatch(/^domains-12345678-qualified-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('generates JSON filename', () => {
    const filename = generateFilename('12345678-abcd-efgh', DomainRejectionReasonEnum.no_keywords, 'json');

    expect(filename).toMatch(/^domains-12345678-no-keywords-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('generates "all" filename', () => {
    const filename = generateFilename('12345678-abcd-efgh', 'all', 'csv');

    expect(filename).toMatch(/^domains-12345678-all-domains-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

// ============================================================================
// Column Consistency Tests
// ============================================================================

describe('CSV_COLUMNS and CSV_HEADERS', () => {
  it('have matching lengths', () => {
    expect(CSV_COLUMNS.length).toBe(CSV_HEADERS.length);
  });

  it('have expected columns', () => {
    expect(CSV_COLUMNS).toContain('domain');
    expect(CSV_COLUMNS).toContain('rejectionReason');
    expect(CSV_COLUMNS).toContain('domainScore');
    expect(CSV_COLUMNS).toContain('leadScore');
    expect(CSV_COLUMNS).toContain('dnsStatus');
    expect(CSV_COLUMNS).toContain('httpStatus');
  });

  it('have expected headers', () => {
    expect(CSV_HEADERS).toContain('Domain');
    expect(CSV_HEADERS).toContain('Rejection Reason');
    expect(CSV_HEADERS).toContain('Domain Score');
    expect(CSV_HEADERS).toContain('Lead Score');
  });
});
