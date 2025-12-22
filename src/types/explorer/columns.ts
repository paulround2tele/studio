/**
 * Phase 7: Domain Grid Column Contract
 * 
 * NOTE: This file defines the TYPE CONTRACT for columns.
 * Actual column definitions with React components are in Phase 7.2.
 * 
 * @see docs/PHASE_7_RESULTS_EXPLORATION_ARCHITECTURE.md Section 8.4
 */

import type { DomainSortKey } from './state';
import type { DomainRow } from './state';

// ============================================================================
// COLUMN DEFINITION CONTRACT
// ============================================================================

/**
 * Column definition for DomainDataGrid
 * Each column specifies data access, rendering hints, and behavior
 * 
 * INVARIANTS:
 * - Sortable columns MUST use server-side sorting (no client sort)
 * - Column widths are responsive (minWidth, flex)
 * - Accessor must be type-safe against DomainRow
 */
export interface DomainGridColumn {
  /** Unique column identifier */
  readonly id: string;
  
  /** Display header text */
  readonly header: string;
  
  /** Data accessor - either a key of DomainRow or accessor function */
  readonly accessor: keyof DomainRow | ((row: DomainRow) => unknown);
  
  /** Server-side sort key (undefined = not sortable) */
  readonly sortKey?: DomainSortKey;
  
  /** Minimum column width in pixels */
  readonly minWidth: number;
  
  /** Flex-grow factor for responsive sizing */
  readonly flex?: number;
  
  /** Text alignment */
  readonly align?: ColumnAlignment;
  
  /** Whether column is visible by default */
  readonly visible?: boolean;
  
  /** Whether column can be hidden by user */
  readonly hideable?: boolean;
  
  /** Whether column can be resized */
  readonly resizable?: boolean;
}

/**
 * Column text alignment options
 */
export type ColumnAlignment = 'left' | 'center' | 'right';

// ============================================================================
// STANDARD COLUMN IDS
// ============================================================================

/**
 * Standard column identifiers
 * Used for referencing columns in visibility settings, etc.
 */
export const COLUMN_IDS = {
  SELECT: 'select',
  DOMAIN: 'domain',
  RICHNESS: 'richness',
  KEYWORDS: 'keywords',
  MICROCRAWL: 'microcrawl',
  LEAD_STATUS: 'lead',
  WARNINGS: 'warnings',
  ACTIONS: 'actions',
  DNS_STATUS: 'dns_status',
  HTTP_STATUS: 'http_status',
  CREATED_AT: 'created_at',
} as const;

export type ColumnId = typeof COLUMN_IDS[keyof typeof COLUMN_IDS];

// ============================================================================
// COLUMN DEFINITIONS (Type-safe specifications)
// ============================================================================

/**
 * Standard column specifications (without React components)
 * React cell renderers added in Phase 7.2
 */
export const COLUMN_SPECS: readonly Omit<DomainGridColumn, 'cell'>[] = [
  {
    id: COLUMN_IDS.SELECT,
    header: '',
    accessor: 'id',
    minWidth: 40,
    align: 'center',
    hideable: false,
    resizable: false,
  },
  {
    id: COLUMN_IDS.DOMAIN,
    header: 'Domain',
    accessor: 'domain',
    minWidth: 200,
    flex: 1,
    align: 'left',
    hideable: false,
  },
  {
    id: COLUMN_IDS.RICHNESS,
    header: 'Richness',
    accessor: (row) => row.features?.richness?.score,
    sortKey: 'richness_score',
    minWidth: 80,
    align: 'center',
  },
  {
    id: COLUMN_IDS.KEYWORDS,
    header: 'Keywords',
    accessor: (row) => row.features?.keywords?.unique_count,
    sortKey: 'keywords_unique',
    minWidth: 120,
    align: 'left',
  },
  {
    id: COLUMN_IDS.MICROCRAWL,
    header: 'Microcrawl',
    accessor: (row) => row.features?.microcrawl?.gain_ratio,
    sortKey: 'microcrawl_gain',
    minWidth: 80,
    align: 'center',
  },
  {
    id: COLUMN_IDS.LEAD_STATUS,
    header: 'Lead',
    accessor: 'leadStatus',
    minWidth: 80,
    align: 'center',
  },
  {
    id: COLUMN_IDS.DNS_STATUS,
    header: 'DNS',
    accessor: 'dnsStatus',
    minWidth: 60,
    align: 'center',
    visible: false, // Hidden by default (filtered out)
  },
  {
    id: COLUMN_IDS.HTTP_STATUS,
    header: 'HTTP',
    accessor: 'httpStatus',
    minWidth: 60,
    align: 'center',
    visible: false, // Hidden by default (filtered out)
  },
  {
    id: COLUMN_IDS.WARNINGS,
    header: 'Warnings',
    accessor: (row) => row.features?.richness?.stuffing_penalty,
    minWidth: 60,
    align: 'center',
  },
  {
    id: COLUMN_IDS.CREATED_AT,
    header: 'Created',
    accessor: 'createdAt',
    sortKey: 'created_at',
    minWidth: 100,
    align: 'left',
    visible: false, // Hidden by default
  },
  {
    id: COLUMN_IDS.ACTIONS,
    header: '',
    accessor: 'id',
    minWidth: 40,
    align: 'center',
    hideable: false,
    resizable: false,
  },
] as const;

// ============================================================================
// COLUMN VISIBILITY
// ============================================================================

/**
 * Default visible columns
 */
export const DEFAULT_VISIBLE_COLUMNS: readonly ColumnId[] = [
  COLUMN_IDS.SELECT,
  COLUMN_IDS.DOMAIN,
  COLUMN_IDS.RICHNESS,
  COLUMN_IDS.KEYWORDS,
  COLUMN_IDS.MICROCRAWL,
  COLUMN_IDS.LEAD_STATUS,
  COLUMN_IDS.WARNINGS,
  COLUMN_IDS.ACTIONS,
] as const;

/**
 * Column visibility state
 */
export type ColumnVisibility = Readonly<Record<ColumnId, boolean>>;

/**
 * Create default column visibility map
 */
export function createDefaultColumnVisibility(): ColumnVisibility {
  const visibility: Record<string, boolean> = {};
  
  for (const spec of COLUMN_SPECS) {
    visibility[spec.id] = spec.visible !== false;
  }
  
  return visibility as ColumnVisibility;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get column spec by ID
 */
export function getColumnSpec(id: ColumnId): typeof COLUMN_SPECS[number] | undefined {
  return COLUMN_SPECS.find(spec => spec.id === id);
}

/**
 * Get sortable columns
 */
export function getSortableColumns(): typeof COLUMN_SPECS[number][] {
  return COLUMN_SPECS.filter(spec => spec.sortKey !== undefined);
}

/**
 * Check if column is sortable
 */
export function isColumnSortable(id: ColumnId): boolean {
  const spec = getColumnSpec(id);
  return spec?.sortKey !== undefined;
}
