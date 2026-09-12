---
name: standalone-palette-drift is structurally red
description: The standalone palette gate scans the untouchable canonical source and the artifact's canonical ports; it cannot pass without a scope decision.
---

**Rule:** treat `standalone-palette-drift` as informational until its scope is
decided. It is *not* in the required-green list of the parity tasks; do not
"fix" it by editing `awesome-list-site-ds/` (contract: archive-identical) and
do not pin exceptions to force green.

**Why:** at the last green commit it already reported 89 literals, all inside
`awesome-list-site-ds/`; the artifact's verbatim canonical ports
(`artifacts/awesome-video-design-system/src/canonical/*`) add more because
they intentionally mirror the canonical HTML/CSS. Two legitimate resolutions
exist — exclude the canonical root and port the artifact literals to tokens,
or accept the canonical root as a reference corpus — and only the
design-system docs/showcase tasks can make that call.

**How to apply:** report the count and delta in the worklog (baseline vs now),
attribute new literals to the files that own them, and leave the decision to
the artifact-owning task; the palette gate that matters for app code is
`palette-drift` (+ `accent-drift`).
