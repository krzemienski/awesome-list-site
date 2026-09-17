---
name: Webfont download coverage
description: Why a font family named in a stack or a --font-* var can still render in the fallback face
---

# Webfont download coverage

Declaring a family — in a picker stack, in a `--font-*` custom property, in the pre-paint boot map — is only half of a webfont. The face renders only if some loader actually fetches the file, and the fetchers are separate from the declarations. Historically there were three of them (shell link with the body face only, a per-design-system stylesheet map fetched after first paint, a per-picker-option map) and no single one owned the whole set, so a family could be named by every declaration that matters and still never be downloaded.

**Why:** this failure is invisible in the way that matters. The setting sticks, the attribute flips, the computed `font-family` reads back correct — and the text quietly renders in the next family in the chain (`system-ui`, `ui-monospace`). Unlike a rejected choice that resets on reload, there is nothing in the UI to notice. Mono faces were the usual casualty: `--font-mono` declared per system while the per-system maps fetched only each system's display/body face.

**How to apply:** when a font "doesn't apply", check the fetcher before the declaration — grep the loader for the family, not the CSS for the token. When adding a family to any declaration, confirm the loader that downloads it in the same change.

## The shell owns ONE request, copied from the design source (parity W1, September 2026)

The always-on `<link rel="stylesheet">` in the HTML shell now IS the whole set: the design source's single Google Fonts css2 request (nine families — Inter, Fraunces, JetBrains Mono, Geist, Instrument Serif, Space Grotesk, IBM Plex Mono, IBM Plex Sans, Manrope), byte-identical. The per-design-system stylesheet map and its loader were deleted, not kept "lazy": every family any system's `--font-*` names is already in that link, so a lazy path would be dead code. Only picker overrides outside the set (DM Sans, Source Sans 3) still load on demand.

**Why:** pixel parity needs both documents to declare the same `@font-face` set — same families, weights, styles AND axes. Google Fonts serves a different variable subset per axis list: the app's `Fraunces:ital,opsz,wght@…9..144…` and the design's `Fraunces:ital,wght@…` both "have Fraunces 600", but from different font files with different outlines and advance widths, so headings drifted by pixels while every family/weight/style check passed. `[...document.fonts]` triples cannot see this; only the request URL can.

**How to apply:** never edit the shell font URL by hand — it must stay equal to the design's (`accent-drift` reads the design html live and fails on one byte, on a second always-on font link, or on any other `client/src` module requesting Google Fonts). If a system's token names a family the link lacks, that is token drift: fix the token, never widen the URL past the design. Unused declared families cost only CSS bytes — browsers fetch font files on first use, so the nine-family link still downloads exactly two files on `/`. Compare face sets with a probe that lists `document.fonts` on both pages after `fonts.ready` (`docs/parity/evidence/fonts/font-set.mjs`), and diff the *hrefs* too.


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

## Weight coverage is a URL contract, not a paint measurement

A loaded family can still synthesize a requested weight. Inventory meaningful rendered text by its resolved token stack and computed numeric `fontWeight`, then compare those weights with the active loader URL. Normalize optional quotes away when comparing computed `font-family` with custom-property stacks: browsers may serialize the same family once quoted and once unquoted.

Google Fonts css2 weight parsing has three cases: discrete `wght@400;600`, inclusive variable ranges such as `wght@400..800`, and no `wght` axis (a default static 400 face, including requests that only specify `ital`). A mutation must remove the weight from the URL contract; registered faces remain document-scoped after a link changes and can otherwise make a missing-weight paint probe pass.

**Why:** rendered-width checks prove the primary family paints, but synthesized bold has the same family metrics and slips through. Browser serialization and cumulative `FontFaceSet` state make naive comparisons and post-load mutations falsely reassuring.

**How to apply:** report failures with system, token, and numeric weight. Interpret ranges inclusively, treat axis tuples by the `wght` column rather than position, and validate the mutated URL inventory instead of expecting the browser to unload a previously registered face.

## Deduplicated loaders still need provenance

An optional font loader may reuse a stylesheet URL that is already present in the HTML shell. If runtime validation scopes coverage to the selected option, the deduplication path must annotate the existing link with the same option provenance it would put on a newly created link.

**Why:** Inter's optional picker URL can be byte-for-byte identical to the always-on Inter URL. Returning early on that duplicate preserves network efficiency but otherwise makes the option look loaderless to a correctly isolated gate.

**How to apply:** keep one request, but attach option ownership before returning from the duplicate-link path. Wait for the non-rendered link to be attached (not visible) before mutation checks, because optional loaders run after first paint.

## Per-view font requests without a static href (design-system artifact, September 2026)

The standalone artifact ports two frozen pages that make *different* css2 requests (the docs page declares no IBM Plex Sans and a different axis subset). One static `<link href>` can never be right for both, and a static href is fetched by the preload scanner before any inline script can swap it, so "swap the href in a boot script" still downloaded the wrong faces first on a direct `#docs-…` load.

**Why:** the parity harness compares declared `@font-face` sets per view; a preloaded wrong sheet leaves extra faces declared on one side (font gaps) even after the swap.

**How to apply:** ship the link with NO `href`, both URLs as `data-*` attributes, `blocking="render"`, and set `href` synchronously from an inline `<head>` script whose hash test mirrors the app's `readView()` normalisation exactly (decode, `#`/`#/`, first segment, lower-case). Verify with a request listener: exactly one css2 request per view, and the chosen URL equals the frozen page's byte-for-byte.
