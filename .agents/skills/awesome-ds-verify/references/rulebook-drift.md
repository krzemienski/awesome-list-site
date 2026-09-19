# Rulebook drift — where the in-repo SKILL.md disagrees with the code

Checked against `krzemienski/awesome-list-site` @ `6462b2b` (2026-09-17).
The code wins (the rulebook says so itself). Re-check these before relying on
this note — once the rulebook is patched, delete the matching entry here.

Line numbers refer to `.agents/skills/verify-design-system/SKILL.md`.

## 1 · Source of truth is described two ways (line 27)

Rulebook: audit against `docs/AGENTS.md` / `docs/DESIGN-SYSTEM.md`, "not
against the retired handoff prototype."
Code: `design-system.css`'s header and `canonical-token-parity.mjs` treat
`awesome-list-site-ds/` as the **frozen design authority** — every token, accent
and canonical utility must resolve to it or carry a documented deviation.

Both are true at different layers: the design archive governs **values**; the
docs govern **how `client/` consumes them** (shadcn + bridge + `data-ds` hooks
rather than raw `.btn`). The rulebook never invokes the parity gate — this
skill adds it as **stage 0**.

## 2 · Stage 3 — boot lists are generated, not hand-synced (lines 110–116, 269)

Rulebook: the boot script validates against inline, hand-synced ID lists.
Code: `client/index.html` holds three Vite markers —
`__AWESOME_VIDEO_THEME_BOOT__`, `__AWESOME_VIDEO_PRODUCT_PROFILE_BOOT__`,
`__AWESOME_VIDEO_FONT_BOOT__` — replaced at build/serve time from
`THEME_BOOT_DATA`, `PRODUCT_PROFILE_BOOT_DATA` and `FONT_BOOT_DATA`.
`accent-drift` now asserts the script keeps exactly one marker per dataset and
reads ids only from the injected object.

Consequence when auditing: a **literal id list pasted into the boot script is
the finding**, not the expected state. Also new since the rulebook was written:
the boot sets `data-product-profile` from the route (admin / learning /
public) and takes that profile's default system + accent.

## 3 · Stage 7 — the accent snippet cannot match (line 720)

`getComputedStyle` serialises colors as `rgb(255, 61, 82)`. The snippet tests
whether that string `includes('ff3d52')`. It never does, so `accentUsers` is
always `[]` and the stage always "passes".

Use the `ink-accent` gate (`scripts/validation/audit-567-ink-accent.mjs`): it
resolves `--accent` through a probe element and compares parsed RGBA. If you
need a DevTools one-off:

```js
const probe = Object.assign(document.createElement('i'), { style: 'color:var(--accent)' });
document.body.append(probe);
const accent = getComputedStyle(probe).color; probe.remove();
const rgb = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).join(',');
[...document.querySelectorAll('body *')].filter((el) => {
  const s = getComputedStyle(el);
  return [s.color, s.backgroundColor, s.borderTopColor].some((c) => rgb(c) === rgb(accent) && !/, 0\)$/.test(c));
});
```

## 4 · Stage 8 — same bug, different token (line 752)

`getPropertyValue('--text-3')` returns the raw declaration,
`rgba(244, 243, 238, 0.52)`; computed `color` comes back as
`rgba(244, 243, 238, 0.52)` only if spacing/precision happen to agree, and
never when the token is hex. Strict `===` on those strings is unreliable.
Same fix: resolve through a probe element, compare parsed values — or run
`ink-accent`.

Also note `--text-3` is `0.52` alpha in the runtime vs `0.4` in the design
(documented WP-6 a11y deviation: 0.4 gave ~3.4:1 on black). Don't "restore" it.

## 5 · Stage 9 — fonts are no longer lazy (lines 769, 782)

Rulebook: "only Inter loads pre-paint"; check `FONT_URLS`.
Code: `client/index.html` ships **one always-on `<link>`** requesting all nine
families (byte-identical to the design source's — enforced by `accent-drift`
rule 11). The constant is `FONT_STYLESHEETS`, and it only serves picker
*overrides* that aren't in the always-on set.

Consequence: a system's display face failing to paint is a broken always-on
link (or a Google Fonts 400), not a missing per-system entry. Verify with
`ds-showcase` (width-measured) and `webfont-fetch`. `document.fonts.check`
with a bare family gives false negatives for faces nothing has painted yet —
`live-probe` asks about the face a real element is using.

## 6 · Stage 11 — "BLOCK if visible bugs" has no pass criterion

The stage tells a human to look. For an agent that is unfalsifiable. This
skill's objective form, all from the running app:

- attribute flips for 5/5 systems — 🔴
- `--radius`, `--border-w`, `--font-display` each resolve to ≥ 2 distinct
  values across the five — 🔴
- first visible card / button / `h1` shows ≥ 2 distinct computed styles across
  the five (identical everywhere = hardcoded → go to stage 5) — 🟡
- `ds-showcase` passes — 🔴
- then a human-style look at the per-system screenshots for "restyled into
  garbage", which no computed-style check catches
