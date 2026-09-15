---
name: Built-in browser testing policy
description: Functional/user/visual testing must use the platform testing subagent + Screenshot tool; custom browser stacks are prohibited project-wide.
---

**Rule:** any functional, user-flow, click-through or screenshot-evidence check goes through the platform testing subagent (`config: { $kind: "testing" }`, continue with `sendFollowup`) or the Screenshot tool. No new Playwright/Chromium installs or pins, no agent-browser daemons, no bespoke headless harness scripts. Registered validation workflows, `tests/parity/`, `perf:mobile`, `baseline:compare` stay as the automated gates and are run as-is.

**Why:** the user asked (2026-09-15) that "never again" a task tries to stand up a custom test environment; earlier tasks burned time on Playwright pins, agent-browser daemons dying between calls and harness reinvention. The rule is recorded in `replit.md` ("Testing policy — built-in browser testing only") and appended to every open task description.

**How to apply:** when writing or steering task plans, include the tester-plan format + anti-loop rule (3 identical failures → record handoff, mark UNVERIFIED, move on). General subagents refuse browser runs (main agent owns workflow/browser), so browser verification is done by the main agent via the tester, never delegated to a general helper. Task-agent progress is invisible from main (no status feed; branches `subrepl-*` appear only on push) — steering must be written into the task description up front, from known traps in this memory.
