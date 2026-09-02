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

**How to apply:** when a font "doesn't apply", check the fetcher before the declaration — grep the loader maps for the family, not the CSS for the token. When adding a family to any declaration, add or confirm the loader that downloads it in the same change. Merging families into an existing per-system Google Fonts URL (`&family=…`) closes the gap for free: same single request, so no new pre-paint cost.


## One stored id, two halves

The saved design-system id is read twice: by the pre-paint boot script, which PAINTS the page, and by the app, which DOWNLOADS that system's faces. Storage is arbitrary text — it outlives a retired id and anyone can type one in — so the two halves must agree on what counts as a real id, from a single own-property test.

**Why:** the boot script resolves against a literal id list, so it always lands on a real system. `id in MAP` and `MAP[id] ? …` in the app's half answer YES for `toString`, `constructor`, `valueOf`, `__proto__` — keys nobody declared. The app then asks for a stylesheet that cannot exist while the page paints the default system, and every face that system names goes unfetched: the same silent fallback as a missing loader, reachable by one line of localStorage.

**How to apply:** export one `isSystemId`/`resolveSystemId` pair and route every reader through it (`hasOwnProperty.call`, not `Object.hasOwn` — the boot path still ships to older Safari). A gate can prove this by executing the shipped resolver: transform the module with `esbuild.transformSync({ loader: 'ts', format: 'cjs' })`, run it in a `new Function`, and feed it the inherited keys. Checking that a caller merely *imports* the resolver is not enough — the import survives when the call reverts to the raw value; inspect the argument at each call site.

## Verifying that a face really paints

`document.fonts.check("12px 'X'")` is not evidence. It returns false for families that are demonstrably rendering (a variable/subsetted face whose other subsets are still `unloaded`), so it produces false alarms in both directions.

Measure instead: render the same string with the declared stack, with the wanted family forced alone, and with the stack's generic fallback. The declared stack must measure exactly like the forced family and differently from the generic.

**Why:** Google serves some families (Fraunces) as one static `@font-face` per weight, and the browser downloads only the weights the page actually paints. A synthetic probe at a weight nothing paints therefore measures like a fallback even though the loader is correct — `await document.fonts.load("<weight> <size> <family>")` before measuring, or the probe accuses a working fix.

Run each design system's paint probe in a fresh browser document. Switching systems in one document leaves every earlier stylesheet registered, so a shared family loaded by an earlier system can make a later system pass even when its own loader dropped that family.

**Why:** Font-face availability is document-scoped and cumulative. A sequential switch sweep masked a missing Swiss mono loader because Terminal had already registered the same face.

**How to apply:** Set the target system in storage before navigation, open a fresh context/page, and measure there. Mutation-probe a loader copy with one family removed; a same-page switch sweep is not valid evidence.
## A parity gate cannot see a typo both sides share

Comparing a stack against its stylesheet URL only catches the two sides *disagreeing*. A family misspelled in BOTH (stack "'Gesit', sans-serif" + family=Gesit) agrees with itself and passes, while the font host answers 400 and the face never arrives. Closing that needs a live fetch: HTTP 200 **and** an @font-face declaring every family the URL asked for, since a 200 can still be an error page, an empty body, or a different family.

**Why:** the offline gate is registered in the validation suite, so it must stay off the network — a font-host outage cannot be allowed to fail unrelated changes. The live check is therefore opt-in and nothing runs it for you.

**How to apply:** run the opt-in webfont probe by hand in the same change that edits a font URL; treat "the gate is green" as saying nothing about whether the URL resolves.
