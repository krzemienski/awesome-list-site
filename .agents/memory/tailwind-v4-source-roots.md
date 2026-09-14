# Tailwind v4 source roots

## Lesson

Tailwind v4's CSS-first scanner is not constrained by this repository's legacy
`tailwind.config.ts` `content` array unless the CSS explicitly loads that
configuration with `@config`. With `@tailwindcss/postcss` using its default
base and a bare `@import "tailwindcss"`, automatic detection starts at the
workspace `process.cwd()` and scans `**/*`.

That can turn retained captures, documentation, agent skills, `.local`, and
`.cache` (including Chromium data) into accidental utility candidates. Those
files must never function as an implicit safelist for the production app.

## Repository pattern

For the client entry stylesheet at `client/src/index.css`, disable automatic
detection and name only production template roots:

```css
@import "tailwindcss" source(none);
@source "../index.html";
@source ".";
```

The paths are relative to `client/src/index.css`: `.` covers the React UI under
`client/src`, while `../index.html` retains the HTML entry point.

## Before changing roots

1. Trace Vite runtime imports and include every directory containing rendered
   class strings. Do not add an unused safelist.
2. Audit dynamic class construction. Tailwind can detect literal alternatives
   kept in scanned source, but cannot infer a token assembled from runtime
   fragments such as `bg-${color}`.
3. Verify the narrowed compiler output against the relevant rendered route
   inventories/visual checks. Server SEO shell markup in this repository uses
   scoped inline CSS, and shared modules currently contain no UI class markup,
   so neither is a Tailwind source root by default.

The initial source audit found the workspace-default scanner reading 4,558
files/319,885 candidates, versus 228 files/10,256 candidates for the explicit
client roots. Treat those figures as a regression signal, not as a substitute
for final build and route verification.