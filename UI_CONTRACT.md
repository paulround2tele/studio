# UI Contract - TailAdmin Token Specification

## Enforcement Policy

**Any deviation from these tokens requires explicit approval from Product (Carlo) before commit.**

---

## Table Tokens

### Source of Truth
`tailadmin/.../partials/table/table-06.html`

### Exact Tokens (Verbatim)

#### Table Header (`<thead>`)
```
bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700
```

#### Table Header Cell (`<th>`)
```
px-5 py-3 sm:px-6 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400
```

#### Table Body (`<tbody>`)
```
divide-y divide-gray-100 dark:divide-gray-800
```

#### Table Body Cell (`<td>`)
```
px-5 py-4 sm:px-6
```

#### Table Row (`<tr>`)
```
hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors
```

---

## Implementation Reference

All table tokens are exported from:
- **File**: `src/components/shared/Card.tsx`
- **Constants**:
  - `TABLE_HEADER_CLASSES`
  - `TABLE_HEADER_CELL_CLASSES`
  - `TABLE_BODY_CLASSES`
  - `TABLE_BODY_CELL_CLASSES`
  - `TABLE_ROW_CLASSES`

---

## Change Log

| Date | Change | Approved By |
|------|--------|-------------|
| 2026-01-01 | Initial table token specification from table-06.html | Pending visual sign-off |
