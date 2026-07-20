# NB-009 — Theme Accent + Font pickers: keyboard-operable radiogroups

## Fix
`client/src/pages/ThemeSettings.tsx`: the Accent and Font `role="radio"` card
buttons now carry the same roving-tabindex wiring the System picker already
had — `ref`, `tabIndex` (0 only on the active option), and
`onKeyDown={makeRadioKeyDown("accent"|"font", ids, activeId, pick)}` so
Arrow keys move selection and Home/End jump.

## Live proof (Playwright, dev, July 20, 2026)
Probe: focus the group's single tab stop, press ArrowRight, inspect
`document.activeElement`.

```json
"accent": { "options": 10, "singleTabStopBefore": true,
  "before": "accent-option-crimson", "after": "accent-option-magenta",
  "moved": true, "afterChecked": "true", "singleTabStopAfter": true },
"font": { "options": 6, "singleTabStopBefore": true,
  "before": "font-option-system", "after": "font-option-inter",
  "moved": true, "afterChecked": "true", "singleTabStopAfter": true },
"pass": true
```

- Exactly ONE tab stop per group before and after (roving tabindex intact).
- ArrowRight moves focus to the next option AND selects it
  (`aria-checked="true"` follows focus, matching the System picker pattern).
- Selection was arrowed back afterward (net-zero on the persisted theme).
