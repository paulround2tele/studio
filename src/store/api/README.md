# API Store Golden Rules (Contract Migration)

Status: In-Progress (Phase A→B)

1. Direct Resource Responses Only
   - Do NOT assume `{ success, data }` wrapping for 2xx.
   - Treat `response.data` (axios) or body (fetch) as the final typed resource.
2. Centralized Error Handling
   - Non-2xx must conform to ErrorEnvelope: `{ error: { code, message, details? }, requestId }`.
   - Map errors in a shared `baseQueryWithErrors` (to be added) – never per-endpoint unwrap.
3. No `extractResponseData` / `normalizeResponse` in new code
   - Those are transitional; delete by Phase D.
4. Zero `any` in RTK Query endpoint definitions
   - If typing is hard: create a local type alias referencing generated models.
5. No Transform Unless Justified
   - `transformResponse` allowed only for pagination wrapper or intentional shape adaptation, with a code comment `// contract:reason`.
6. Request ID is a header
   - Access via `response.headers['x-request-id']` if needed; never expected in 2xx JSON body.
7. Pagination Pattern B
   - Lists that paginate return `{ items, page, pageSize, total }` (NOT envelope). Keep arrays only for clearly small bounded lists (e.g., persona list might adopt wrapper later if needed).
8. Consistent Error Surfacing
   - Convert backend error codes to UI-friendly messages in a single utility (planned `mapApiError`).
9. Kill Drift Fast
   - If you see a new `success:` key in a 2xx response body, raise immediately; CI will block soon.
10. Transition Deadlines
   - `normalizeResponse.ts` removed by Day 15.
   - `extractResponseData` references removed by Day 12.

## Pending Additions
- baseQueryWithErrors implementation
- Error mapping helper
- Pagination helper utilities

## Example (Future Base Query)
```ts
const rawBase = fetchBaseQuery({ baseUrl: '/api/v2' });
export const baseQueryWithErrors: BaseQueryFn = async (args, api, extra) => {
  const res = await rawBase(args, api, extra);
  if ('error' in res && res.error && (res.error as any).data?.error) {
    const { error, requestId } = (res.error as any).data;
    return { error: { status: (res.error as any).status, data: { code: error.code, message: error.message, requestId } } };
  }
  return res;
};
```
