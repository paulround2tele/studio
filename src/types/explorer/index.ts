/**
 * Phase 7: Results Explorer Type Contracts
 * 
 * ARCHITECTURAL CONTRACT:
 * These types are the single source of truth for all domain exploration state.
 * No local state outside the useDomainsExplorer hook. Ever.
 * 
 * @see docs/PHASE_7_RESULTS_EXPLORATION_ARCHITECTURE.md
 */

export * from './state';
export * from './filters';
export * from './drawer';
export * from './columns';
export * from './actions';
