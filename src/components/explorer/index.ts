/**
 * Phase 7: Domain Explorer Components
 * 
 * ARCHITECTURE:
 * - DomainsGrid is the ONLY entry point for domain grid rendering
 * - DomainDrawer is the ONLY entry point for domain detail drawer
 * - DomainActionsBar is the ONLY entry point for batch actions
 * - useDomainsExplorer is the ONLY state authority (no shadow state)
 * - Server-side sorting only (isSortNonAuthoritative indicates client-only sort)
 * - URL-synced filters via useDomainFilters
 * 
 * @see docs/PHASE_7_RESULTS_EXPLORATION_ARCHITECTURE.md
 */

// Phase 7.2: Grid Components
export { DomainsGrid } from './DomainsGrid';
export { DomainsGridTable } from './DomainsGridTable';
export { DomainsGridHeader } from './DomainsGridHeader';
export { DomainsGridRow } from './DomainsGridRow';
export { DomainsGridPagination } from './DomainsGridPagination';
export { DomainsGridHydrationGuard } from './DomainsGridHydrationGuard';
export { DomainsGridEmptyState } from './DomainsGridEmptyState';

// Phase 7.3: Drawer Components
export { DomainDrawer } from './DomainDrawer';
export { DomainDrawerContent, DomainDrawerLoading, DomainDrawerEmpty } from './DomainDrawerContent';
export { DomainDrawerHeader } from './DomainDrawerHeader';
export { DomainDrawerRichness } from './DomainDrawerRichness';
export { DomainDrawerFeatures } from './DomainDrawerFeatures';
export { DomainDrawerDegraded, FallbackRichness } from './DomainDrawerDegraded';
export { DomainDrawerSkeleton } from './DomainDrawerSkeleton';

// Phase 7.4: Actions Components
export { DomainActionsBar, DomainActionsBarCompact } from './DomainActionsBar';
export { DomainActionsSelection } from './DomainActionsSelection';
export { DomainActionsExport } from './DomainActionsExport';
export type { ExportFormat, ExportOptions } from './DomainActionsExport';
