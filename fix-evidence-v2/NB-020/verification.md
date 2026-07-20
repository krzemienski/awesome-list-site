# NB-020 — resource-id parsing: garbage IDs
No code change; verified acceptable. Live transcript (dev, July 20, 2026), GET /api/resources/:id:
abc → 404 · 1.5 → 404 · 1e9 → 404 · -1 → 404 · 0 → 404 · 999999999 → 404 · "1;DROP" → 404 · %00 → 404
Every non-existent/garbage id answers 404 `{"message":"Resource not found"}` via the Run16 BUG-091 catch-all (a non-numeric id is still a resource lookup). Nothing ever 200s or 500s; status is uniform (all 404) so there is no parser-oracle. VERIFIED.
