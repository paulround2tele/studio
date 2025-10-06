// Shared helper to unwrap axios/fetch hybrid responses without introducing any casts
// It attempts to return resp.data if present, otherwise the resp itself, typed generically.
export function unwrapApiResponse<T>(resp: unknown): T | undefined {
  return (resp as any)?.data ?? (resp as T);
}
