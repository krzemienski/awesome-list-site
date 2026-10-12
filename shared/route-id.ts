/** PostgreSQL int4 ceiling for numeric route ids. */
export const ROUTE_ID_MAX = 2147483647;

/**
 * Parse a /resource/:id or /journey/:id segment. Only the canonical form — a
 * positive integer without sign, leading zeros or whitespace that fits int4 —
 * names a record; anything else is a not-found URL. Kept free of zod so the
 * client shell can import it.
 */
export function parseRouteId(raw: string | null | undefined): number | null {
  if (!raw || !/^[1-9]\d{0,9}$/.test(raw)) return null;
  const id = Number(raw);
  return id <= ROUTE_ID_MAX ? id : null;
}
