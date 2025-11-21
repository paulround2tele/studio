# Campaign Domains List API

Endpoint: `GET /campaigns/{campaignId}/domains`

## Purpose
Returns generated domains for a campaign with optional filtering, cursor/paged pagination, and (behind a feature flag) server‑side richness based sorting and warnings filtering.

## Feature Flag
Server‑side in‑memory sorting/filtering is gated by the environment variable:
```
ANALYSIS_SERVER_SORT=true
```
If disabled, results are unsorted with respect to richness metrics (client performs sorting) and no `X-Domains-Sort-Version` header is emitted.

## Query Parameters
| Name | Type | Description | Default | Notes |
|------|------|-------------|---------|-------|
| limit | int (1–1000) | Offset page size | 100 | Ignored when `first` (cursor) supplied |
| offset | int >=0 | Offset start | 0 | Legacy offset pagination |
| dnsStatus | enum(pending,ok,error,timeout) | Filter by DNS status | – | |
| httpStatus | enum(pending,ok,error,timeout) | Filter by HTTP status | – | |
| dnsReason | string | Exact DNS error reason | – | Examples: NXDOMAIN, TIMEOUT |
| httpReason | string | Exact HTTP error reason | – | Examples: TIMEOUT, TLS_ERROR |
| minScore | number | Minimum domain score | – | Advanced/cursor path only |
| notParked | boolean | Exclude parked domains | – | Advanced/cursor path only |
| hasContact | boolean | Include only domains with contact signals | – | Advanced/cursor path only |
| keyword | string | Require at least one keyword match | – | Advanced/cursor path only |
| sort | enum(richness_score, microcrawl_gain, keywords_unique) | Server-side richness sort field | richness_score | Enabled only when `ANALYSIS_SERVER_SORT` true |
| dir | enum(asc, desc) | Sort direction | desc | |
| warnings | enum(has, none) | Filter domains by presence of any richness penalty warning (see thresholds) | – | Applied before sorting |
| first | int | Cursor page size | – | Cursor pagination path |
| after | string | Cursor continuation token | – | Cursor pagination path |

## Server-Side Sorting Metadata
When server sorting is active the body remains a plain `CampaignDomainsListResponse`. Sorting metadata moved to:

1. `X-Domains-Sort-Version`: Indicates the server applied the canonical sorter/filters.
2. `pageInfo.sortBy` / `pageInfo.sortOrder`: Echo the effective ordering so the UI can represent it without consulting headers.

Filtering metadata (e.g., `warnings=has`) is encoded by the request parameters; no separate `meta.extra` object exists after the success envelope was removed.

## Response Header
When server-side sorting/filtering is applied the response includes:
```
X-Domains-Sort-Version: 1
```
This header version increments if the semantics of server ordering change (e.g. tie-breakers, field weighting).

## Warnings Classification
A domain is considered to have warnings (and matches `warnings=has`) if ANY of:
- stuffing_penalty > 0
- repetition_index > 0.30
- anchor_share > 0.40

These constants are currently defined server-side:
```
repetitionWarningThreshold = 0.30
anchorShareWarningThreshold = 0.40
```
and must remain in sync with the frontend utility `getDomainWarnings` in `src/components/campaigns/DomainsList.tsx`.

Warnings indicators:
| Key | Column Label | Condition | Tooltip |
|-----|--------------|-----------|---------|
| S | stuffing | stuffing_penalty > 0 | Keyword stuffing penalty applied |
| R | repetition | repetition_index > 0.30 | High repetition index (>0.30) |
| A | anchor_share | anchor_share > 0.40 | High anchor share proportion (>40%) |

## Client Detection Logic
Frontend should detect server sorting by presence of the `X-Domains-Sort-Version` header (preferred) or non-empty `pageInfo.sortBy`. When detected, it should:
1. Skip client-side re-sorting of richness/microcrawl/keywords metrics.
2. (Optional) Still allow client-only *display* filtering toggles (current implementation retains local warnings filter for UX, but future iterations may offload fully to server).

## Telemetry
Prometheus counter (registered when feature flag active):
```
domains_list_server_sort_requests_total{sort_field, warnings_filter}
```
`warnings_filter` label empty when no filter applied.

## Fallback / Invalid Parameters
If an unsupported `sort` or `dir` value is provided the server falls back silently to `richness_score` / `desc` and reflects canonical values in `pageInfo.sortBy` / `pageInfo.sortOrder` so the client can reconcile UI state.

## Future Work
- Persist richness & microcrawl metrics in the database to push sorting into SQL (eliminating memory sort and large payload fetching).
- Add `warnings` materialized boolean column to allow DB-side filtering.
- Extend metadata with aggregate counts of warning categories.

## Example
```
GET /campaigns/11111111-1111-1111-1111-111111111111/domains?sort=keywords_unique&dir=asc&warnings=none&limit=50
X-Domains-Sort-Version: 1
{
  "campaignId": "11111111-1111-1111-1111-111111111111",
  "items": [ /* DomainListItem[] */ ],
  "total": 500,
  "aggregates": {
    "dns": { "ok": 480, "error": 20 },
    "http": { "ok": 470, "error": 30 },
    "leads": { "qualified": 42 }
  },
  "pageInfo": {
    "hasNextPage": true,
    "sortBy": "keywords_unique",
    "sortOrder": "ASC",
    "first": 50
  }
}
```
