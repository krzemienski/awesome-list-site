import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

/** Report a confirmed missing page once per route visit, including StrictMode. */
export function useMissingRouteTelemetry(missing: boolean): void {
  const [pathname] = useLocation();
  const reported = useRef<string | null>(null);
  useEffect(() => {
    // A refetch of a missing entity passes through pending (missing=false)
    // and back; that is the same visit, so only a path change re-arms.
    if (!missing || reported.current === pathname) return;
    reported.current = pathname;
    reportDeadLink(pathname, document.referrer);
  }, [missing, pathname]);
}

// Query strings and fragments can carry typed search text or tokens; the
// report needs only where the visitor was.
function withoutQuery(url: string): string | null {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return null;
  }
}

/**
 * Route-resolution failure telemetry.
 *
 * Any time the SPA lands on a 404 surface (hard unknown route via the wouter
 * catch-all, or a soft-404 rendered inline by Category/Subcategory pages —
 * both render <NotFound />, which calls this on mount), we report the dead
 * link so broken inbound/internal links surface in monitoring.
 *
 * Dev → console only. Production → fire-and-forget POST to
 * /api/telemetry/dead-link (keepalive so it survives quick navigations).
 */
function reportDeadLink(path: string, referrer: string): void {
  const payload = {
    path,
    referrer: referrer ? withoutQuery(referrer) : null,
    ts: new Date().toISOString(),
  };

  if (import.meta.env.DEV) {
    console.log("[route-monitor] dead link:", payload);
    return;
  }

  try {
    fetch("/api/telemetry/dead-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Telemetry must never break the page.
    });
  } catch {
    // Ignore — telemetry is best-effort.
  }
}
