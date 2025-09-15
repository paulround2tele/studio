## Pagination Enhancements

This document summarizes the new domain pagination architecture.

### Goals
1. Provide deterministic page navigation (First/Prev/Next/Last).
2. Support large domain datasets efficiently (infinite mode + virtualization).
3. Prepare for cursor-based pagination if backend omits total counts.
4. Lay groundwork for future sorting and filtering.

### Key Pieces
- `usePaginatedDomains` hook: Encapsulates numeric & cursor pagination, infinite accumulation, virtualization advisory.
- `DomainsList` component: Refactored to use hook; adds page size selector, navigation controls, infinite toggle, and virtualization via `react-window` once row count threshold exceeded.

### Hook API (Simplified)
State fields include `page`, `pageCount`, `items`, `hasNext`, `hasPrev`, `infinite`, `cursorMode`, `shouldVirtualize`.
Actions: `next`, `prev`, `first`, `last`, `goTo`, `toggleInfinite`, `setPageSize`, `refresh`.

### Infinite Mode
When enabled, fetched pages are accumulated (unique by id/domain) and virtualization kicks in beyond a threshold (default 2000 rows) to preserve performance.

### Cursor Mode Support
If `total` is absent but `pageInfo.hasNextPage` exists, `cursorMode` becomes true; `pageCount` is `undefined` and UI shows `Page X / (…)`.

### Virtualization
Implemented with `react-window` (fixed row height 40px) only in infinite mode when threshold exceeded. Standard paged (non-infinite) view renders classic table.

### Future Enhancements
- Sorting & filtering pass-through params once backend adds query support.
- Dedicated virtualization for non-infinite giant pages (if needed).
- Sticky header / column resizing.
- Playwright test data seeding fixture for deterministic pagination E2E test.

### Testing
- Unit tests: `usePaginatedDomains.test.tsx` cover navigation & accumulation.
- E2E placeholder: `playwright-tests/domain-pagination.spec.ts` validates basic control rendering.

### Migration Notes
Legacy offset logic removed from `DomainsList` in favor of centralized hook to reduce duplication and facilitate later enhancements.
