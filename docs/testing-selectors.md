# Stable Testing Selectors Strategy

This document defines the conventions and coverage for `data-testid` attributes used across the application to enable resilient, intention-revealing Playwright and RTL tests.

## Goals
- Eliminate brittle selectors (text, nth-child, role heuristics) for core flows.
- Provide semantic, domain-scoped identifiers that remain stable through visual or layout changes.
- Support quick querying for both granular field-level assertions and high-level flow orchestration.

## Naming Convention
`<domain>-<scope>-<element>` (all kebab-case)

Where:
- `domain` = high-level area (auth | campaign | pipeline | persona | proxy | phase | campaign-domains)
- `scope`  = sub-area or form type (login, overview, http, dns, discovery, analysis, form, actions, etc.)
- `element` = specific semantic unit (card, title, submit, field-name, input-name, row, status, etc.)

### Guidelines
1. Prefer nouns or noun-phrases: `campaign-overview-card`, `phase-discovery-form`.
2. For lists/collections, suffix with plural noun: `phase-http-personas-list`.
3. For dynamic members include primary identifier: `phase-http-persona-<id>`.
4. For selected state or variant add a suffix: `phase-http-persona-selected-<id>`.
5. Avoid encoding styling/layout (no `left-col`, `grid-item-3`).
6. Avoid internal library abstractions (no `rhf-controller` or `shadcn-input`).
7. Keep consistent prefixes so cross-cutting queries (e.g., all phase forms) can use regex `^phase-` if needed.

## Domains & Coverage
| Domain | Examples | Purpose |
|--------|----------|---------|
| auth | `auth-login-form`, `auth-login-submit` | Login flows |
| campaign | `campaign-form`, `campaign-overview-card`, `campaign-start-phase` | Campaign creation & overview |
| pipeline | `pipeline-workspace`, `pipeline-phase-stepper` | Workspace container & navigation |
| persona | `persona-http-input-user-agent`, `persona-dns-input-resolvers` | Persona configuration |
| proxy | `proxy-input-address`, `proxy-toggle-status`, `proxy-menu-delete` | Proxy CRUD & status ops |
| phase (discovery/dns/http/analysis) | `phase-discovery-input-pattern-type`, `phase-dns-submit`, `phase-http-persona-<id>` | Phase configuration forms |
| campaign-domains | `campaign-domains-row`, `campaign-domains-page-indicator` | Generated domains list & pagination |

## Read-Only Mirrors
Forms that surface a read-only summary implement `*-readonly-*` selectors (e.g., `phase-http-readonly-keyword-sets`) enabling deterministic assertions post-save.

## Dynamic Patterns
- Collection members: `prefix-<id>` or `prefix-<slug>`; prefer backend ID when stable.
- Chips/badges for selections: `phase-dns-chip-<personaId>`.
- Virtualized rows: `campaign-domains-virtual-row` (distinct from static `campaign-domains-row`).

## Examples
Login:
- Page container: `auth-login-page`
- Email field: `auth-login-email`
- Submit button: `auth-login-submit`

Campaign Creation:
- Form: `campaign-form`
- Name input: `campaign-name-input`
- Submit: `campaign-submit`

Pipeline Workspace:
- Workspace container: `pipeline-workspace`
- Phase stepper: `pipeline-phase-stepper`
- Placeholder content: `pipeline-phase-placeholder`

Discovery Phase:
- Form wrapper: `phase-discovery-form`
- Pattern selector: `phase-discovery-input-pattern-type`
- TLDs field: `phase-discovery-input-tlds`
- Submit: `phase-discovery-submit`

HTTP Validation Phase:
- Personas list: `phase-http-personas-list`
- Persona item: `phase-http-persona-<id>`
- Keyword set selected: `phase-http-keyword-set-selected-<id>`
- Submit: `phase-http-submit`

Analysis Phase:
- Type badge: `phase-analysis-type-<type>`
- Suggestions toggle: `phase-analysis-suggestions-toggle`
- Custom rule chip: `phase-analysis-custom-rule-<value>`

Personas (HTTP):
- Field wrapper: `persona-http-field-user-agent`
- Input element: `persona-http-input-user-agent`
- Submit button: `persona-http-submit`

Personas (DNS):
- Resolver strategy select trigger: `persona-dns-input-resolver-strategy`
- Resolvers textarea: `persona-dns-input-resolvers`
- Submit: `persona-dns-submit`

Proxies:
- Form: `proxy-form`
- Address input: `proxy-input-address`
- Toggle enable: `proxy-input-user-enabled`
- Row cells: `proxy-cell-status`
- Action menu entries: `proxy-menu-edit`, `proxy-menu-delete`

Domains List:
- Card: `campaign-domains-card`
- Page indicator: `campaign-domains-page-indicator`
- Row: `campaign-domains-row`
- Infinite switch: `campaign-domains-infinite-switch`
- Load more button: `campaign-domains-load-more`

## Testing Usage Patterns
Playwright examples:
```ts
// Click start phase if enabled
await page.getByTestId('campaign-start-phase').click();

// Select an HTTP persona
await page.getByTestId(`phase-http-persona-${personaId}`).click();

// Assert discovery form saved summary
await expect(page.getByTestId('phase-discovery-readonly-tlds')).toContainText('com');
```

RTL example:
```tsx
expect(screen.getByTestId('auth-login-submit')).toBeDisabled();
```

## Migration Notes
Legacy tests using text-based selectors should be incrementally refactored. Mixed usage is acceptable during transition, but new tests MUST use `data-testid` for core flows.

## Lint / Review Checklist
- [ ] Selector prefixed with approved domain
- [ ] No visual/styling references
- [ ] Dynamic IDs sanitized
- [ ] Read-only and editable forms both covered (where applicable)
- [ ] No collisions in grep (`grep -R "data-testid=\"<name>\" src`) show single definition unless intentionally reused (e.g., rows)

## Future Enhancements
- Optional test util: `const el = (id: string) => page.getByTestId(id);`
- Schema-driven generation for CRUD tables.
- Snapshot of selector map as JSON for documentation automation.

---
Maintainer: QA / Platform Engineering
Last Updated: (auto-generated)