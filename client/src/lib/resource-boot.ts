import type { QueryClient } from "@tanstack/react-query";

/**
 * A direct visit to /resource/:id ships that resource's API responses in a
 * `<script type="application/json" id="resource-boot">` block (server
 * renderResourceBoot). Seeding them under the page's own query keys lets the
 * first render be the finished page — no skeleton, no "Loading resource"
 * title, and no Related card growing under the actions once its fetch lands.
 */
export function seedResourceBoot(queryClient: QueryClient): void {
  const el = document.getElementById("resource-boot");
  if (!el) return;
  el.remove();
  const match = /^\/resource\/([^/]+)$/.exec(window.location.pathname);
  if (!match) return;
  let payload: { resource?: { id?: unknown }; related?: unknown };
  try {
    payload = JSON.parse(el.textContent || "");
  } catch {
    return;
  }
  const id = match[1];
  // The page keys its queries by the raw route segment; only the canonical
  // digits form is ever prerendered, so anything else just fetches normally.
  if (!payload.resource || String(payload.resource.id) !== id) return;
  queryClient.setQueryData(["/api/resources", id], payload.resource);
  if (payload.related) {
    queryClient.setQueryData(["/api/resources", id, "related"], payload.related);
  }
}
