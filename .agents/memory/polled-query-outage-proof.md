---
name: Polled query outage proof
description: Pages with several polled queries must keep last-good data on background poll failure; prove it unattended
---
A failed *background* poll must never replace a page that already rendered good data. Hard-fail only on a first-load error or a 401. Keep the last good data and show a stale or error badge instead.

**Why:** on a page with several polled queries, one failing query that hard-fails takes down every sibling widget. That includes the widget whose stale/error state you were trying to show. A manual Refresh click hides the problem because it re-runs only that widget's own query.

**How to apply:** whenever polling is added or changed, prove the failure state with a real outage and no interaction for one full poll interval. Never prove it only through a Refresh click.
