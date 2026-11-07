---
name: Radix Tabs double activation
description: Radix Tabs ≥1.2 calls onValueChange twice per click; the shared ui/tabs wrapper drops the repeat, so never bypass it.
---
`@radix-ui/react-tabs` 1.2 focuses a trigger on mousedown before activating it, and in automatic activation mode that focus already activates it, so one click calls `onValueChange` twice. On `/advanced` one click sent `tool_tab_opened` twice (two `$insert_id`s) after the in-range dependency refresh of 2026-10-25.

**Why:** tab handlers that track analytics or push history would double-count.

**How to apply:** use `@/components/ui/tabs` (it drops a repeat of the same value within one task via a microtask-cleared ref). Don't import Radix Tabs directly. When verifying, count one event and one history entry per click.
