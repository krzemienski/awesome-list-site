// Shared bounded 429 retry helper for maintenance scripts paging /api/resources
// at the limit≤100 contract (Audit2 BUG-025). Rapid sequential pages can trip
// the platform edge rate limit; honor a positive Retry-After (seconds) when
// present, otherwise back off 2/4/6/8/10s. Non-429 responses (including other
// non-2xx) are returned as-is for the caller's normal failure handling.
export async function fetchWith429Retry(url, options = undefined, maxRetries = 5) {
  let r = await fetch(url, options);
  for (let attempt = 0; r.status === 429 && attempt < maxRetries; attempt++) {
    const retryAfter = Number(r.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 120_000)
      : 2000 * (attempt + 1);
    await new Promise((res) => setTimeout(res, waitMs));
    r = await fetch(url, options);
  }
  return r;
}
