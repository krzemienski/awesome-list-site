---
name: Shared-account theme writes
description: The theme picker persists to the server for signed-in users; how auditors on the shared admin account must treat it and how to clear it.
---
Signed-in theme changes (settings/theme picker, system/accent switchers) are written to the account's server preferences, not just localStorage. On the shared prod admin account one auditor's probe silently changes every later session's theme baseline.

**Why:** a clean-pass auditor left the shared admin at terminal/matrix; the API then could not restore null (schema rejected null, route used `??`), so restoration needed a code fix + republish.

**How to apply:** auditor briefs on the shared account must forbid the theme picker (use guest pages + window.applyDesignSystem for theme probes). Restore with PUT /api/user/preferences {"themeSystem":null,"themeAccent":null} (both null together; half-null → 400) with Origin header. DELETE /api/user/preferences keeps the theme — never use it for this.
