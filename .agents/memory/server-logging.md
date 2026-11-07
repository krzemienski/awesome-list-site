---
name: Server logging conventions
description: Rules for the one server logger (levels, context, scrubbing) and traps found while migrating ~620 console lines to it.
---

**Rule:** server runtime code logs only through the area logger (`createLogger(area)`), never `console.*`; jobs log started / finished / failed-with-reason; the HTTP line carries `user=<pseudonymous id>` only for mutating calls.
**Why:** the owner asked for traceable logs in the published app; one format with rid lets every line of a request be grouped.

**Trap — path scrubbing vs readable slugs:** a "≥16 alnum chars with a digit" token heuristic turned 404 paths like `/this-page-does-not-exist-692` into `/:token`, hiding exactly the paths the 404 logs exist to show. Keep the hyphenated-word slug exception (and the explicit UUID rule) when touching `scrubPath`.

**Trap — JIT provisioning fires per concurrent request:** a new Clerk session sends several API calls at once; `insert … onConflictDoNothing` + re-select made EVERY one look like "created" (triple sign-up log + triple server `sign_up_completed`). Use `.returning()` and treat only the winning insert as the sign-up moment.

**How to apply:** after server log changes, restart the workflow (no hot reload), curl a 404 page and a share/uuid path, and read the workflow log lines.
