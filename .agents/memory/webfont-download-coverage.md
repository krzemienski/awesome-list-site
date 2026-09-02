---
name: Webfont download coverage
description: Why a font family named in a stack or a --font-* var can still render in the fallback face
---

# Webfont download coverage

Declaring a family — in a picker stack, in a `--font-*` custom property, in the pre-paint boot map — is only half of a webfont. The face renders only if some loader actually fetches the file, and the fetchers are separate from the declarations and from each other:

- the static `<link rel="stylesheet">` in the HTML shell (pre-paint, carries the primary body face only),
- the per-design-system stylesheet map (fetched after first paint, for the selected system),
- the per-picker-option stylesheet map (fetched only when a visitor selects that option).

No single map owns the whole set, so a family can be named by every declaration that matters and still never be downloaded.

**Why:** this failure is invisible in the way that matters. The setting sticks, the attribute flips, the computed `font-family` reads back correct — and the text quietly renders in the next family in the chain (`system-ui`, `ui-monospace`). Unlike a rejected choice that resets on reload, there is nothing in the UI to notice. Mono faces are the usual casualty: `--font-mono` is declared per system while the per-system maps fetch only each system's display/body face.

**How to apply:** when a font "doesn't apply", check the fetcher before the declaration — grep the loader maps for the family, not the CSS for the token. When adding a family to any declaration, add or confirm the loader that downloads it in the same change.

## A parity gate cannot see a typo both sides share

Comparing a stack against its stylesheet URL only catches the two sides *disagreeing*. A family misspelled in BOTH (stack "'Gesit', sans-serif" + family=Gesit) agrees with itself and passes, while the font host answers 400 and the face never arrives. Closing that needs a live fetch: HTTP 200 **and** an @font-face declaring every family the URL asked for, since a 200 can still be an error page, an empty body, or a different family.

**Why:** the offline gate is registered in the validation suite, so it must stay off the network — a font-host outage cannot be allowed to fail unrelated changes. The live check is therefore opt-in and nothing runs it for you.

**How to apply:** run the opt-in webfont probe by hand in the same change that edits a font URL; treat "the gate is green" as saying nothing about whether the URL resolves.
