// Shared helper to unwrap axios/fetch hybrid responses without introducing any casts
// It attempts to return resp.data if present, otherwise the resp itself, typed generically.
interface HasData<T> { data?: T }

export function unwrapApiResponse<T>(resp: unknown): T | undefined {
  if (typeof resp === 'object' && resp !== null && 'data' in (resp as HasData<T>)) {
    const candidate = (resp as HasData<T>).data;
    return candidate as T | undefined;
  }
  return resp as T | undefined;
}
