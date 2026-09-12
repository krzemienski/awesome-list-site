---
name: standalone-palette-drift is structurally red
description: The standalone palette gate scans the untouchable canonical source plus verbatim canonical ports; it cannot pass without a scope decision, so treat it as informational.
---

**Rule:** treat `standalone-palette-drift` as informational until its scope is
decided. Do not "fix" it by editing the canonical `awesome-list-site-ds/`
(contract: archive-identical) and do not pin exceptions to force green.

**Why:** the canonical source is a reference corpus full of raw colour
literals by design, and verbatim ports of it inside the design-system
artifact inherit them. Two legitimate resolutions exist — exclude the
canonical root and port the artifact literals to tokens, or accept the
canonical root as a reference corpus — and only the artifact-owning task can
make that call.

**How to apply:** report baseline vs current count in the worklog and attribute
new literals to their owning files; the palette gates that matter for app
code are `palette-drift` and `accent-drift`.
