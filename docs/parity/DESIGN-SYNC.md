# Canonical design-source synchronization

## Scope and provenance

- Phase: **0 only**. This record synchronizes the canonical reference; it makes no product-parity claim.
- Supplied archive: `attached_assets/awesome_list_site_2_1789019068732.zip`
- Verified SHA-256: `19f0240c46caf790bfc384e21f123525699e1ff386fe892f8084bf73337302c9`
- The hash is identical to the previously reviewed archive recorded in `.local/tasks/verified-app-design-parity-archive-review.md`.
- Safe extraction used for comparison: `/tmp/design-parity-bundle-7zbnza_9`.
- `inspection-manifest.json` identifies exactly 103 original archive entries. Generated decode/inspection files outside that manifest were excluded.
- The ZIP remains intact and is not an application input.

The existing `awesome-list-site-ds/` tree was compared path-by-path with all 103 original entries before synchronization. Result: 77 byte-identical, 10 existing paths to overwrite, and 16 archive paths to add. Local-only files are retained.

## Source authority and variants

The authoritative target is the **modular** `index.html` load graph:

`data.js` → `tweaks-panel.jsx` → `design-systems.jsx` → `layout.jsx` → `sidebar-variants.jsx` → `home-layouts.jsx` → `pages.jsx` → `admin.jsx` → `app.jsx`.

This generation provides Index (default) and Curated home layouts, configurable identity and search placement, a right-justified header cluster, command palette, full footer, persistent 56px collapsed rail, and L1/L2/L3 sidebar.

`index.standalone.html` and `Awesome.Video - Standalone.html` are genuine older generated snapshots. They are retained as provenance, but their embedded app (four older home layouts, featured default, static identity, L1/L2 sidebar, no full footer or command palette) is never the canonical app target. Historical screenshots under `uploads/` are also references, not baselines; their documented references are preserved.

`design-system.html` and `docs.html` remain separate entrypoints. They are not folded into the app.

## Required reads completed before synchronization

Read end-to-end in the mandated order:

1. `awesome-list-site-ds/HANDOFF.md`
2. `awesome-list-site-ds/docs/04-tokens.md`
3. `awesome-list-site-ds/docs/05-theming.md`
4. `awesome-list-site-ds/docs/10-components.md`
5. `awesome-list-site-ds/docs/11-patterns.md`
6. upstream `SKILL-verify-design-system.md` (the vendor path was absent before sync)
7. upstream `styles.css` (753 lines)
8. upstream `design-systems.jsx` (346 lines)

Also read completely because they are changed/new authored reference files: `app.jsx`, `data.js`, `home-layouts.jsx`, `index.html`, `layout.jsx`, `pages.jsx`, `sidebar-variants.jsx`, `REPLIT-REMEDIATION-PROMPT.md`, `audit-report.md`, and `uploads/INDEX.md`. The prior complete archive review accounts for every other authored entry and all binary references. Generated standalone HTML was retained but was not promoted over the modular source.

## Existing paths approved for overwrite

| Path under `awesome-list-site-ds/` | Old SHA-256 | Archived SHA-256 |
|---|---|---|
| `app.jsx` | `e39129ff454bb5e56a92b7d38dad3aa99dc11e29df8624ab8881197fef9ff585` | `9d71619b1c70720d36b15803b818040f4515ca165b09388f9e60376fa81ae1c6` |
| `data.js` | `35324994961101928952a1a3d096fdcfd98303a665a01b5555427e760df93793` | `5196b2a166673cc3c62a011028573d93e02b9f690b24db2e06b6372700b25a66` |
| `design-systems.jsx` | `e8aeb34e3782ed072a8589f70a257a8189b294acc4f0cc7bbaf551cfa5a7fdf2` | `30c37539db397941f209055af28a5284fbdd14a3322adb869701c70b0e05bc7c` |
| `home-layouts.jsx` | `f3a5e925c803306907915ea2ddccf82b881b3675ca2a4785ee591df0025a6b8c` | `c91a2a679670684b4182b3c6015544265373e01cf2ee96efc778975a2257b4f2` |
| `index.html` | `79cfd4cd69ffe94630ea0bafef0cf8b9493f01124abdad8ba034055994d4f1f2` | `7f561822fdbb5b67ebce62324d7f02ce0154eb90b2927f8d46510466cda5f8f7` |
| `index.standalone.html` | `99f3003bc79da742c366f30c2f34a5d3a06e6fb536a8103b08e76826cd335172` | `7b62e47bf3ab24c6c1268be3a9ce078627d3074519af542bec07d1c40c7ffa47` |
| `layout.jsx` | `24b08135e304c71713488aea0d5ffca6c466f8e3a11b8ebbac57700287ecbf33` | `911f165b50f94d6b3930b2761545606105a9a4ba9727ed443a0681b039b3e76a` |
| `pages.jsx` | `c0bbabf247f5d51ca4fc779a487e03da3b4722984e48d208271d73cc058f1866` | `ee95572bb30f38424920918c49c9b483898ec975adf4bc0a8c04664cf2fd4a58` |
| `styles.css` | `fbd75f30bf05a19971d9073a5278834137cc2107e9269b557e84f2eb2dbc3f3f` | `f65694df1965889a6a6a4bff6404d9b47164f097ebcd417513a34d430e6a1055` |
| `uploads/INDEX.md` | `1fe5547f63a56f0743305449e662d9997d0410b44cafcd28040a7cc03b765b9c` | `12870b61be9bec03ae8da92b17fcc7f32a05df45fd4f4e23fd07d89bd0f9daf2` |

Machine-readable additions and hashes are in `source-sync.json`.

## Runtime prerequisites and inherent reference limits

- Serve `awesome-list-site-ds/` over HTTP with `index.html` as the directory entry. The reference has no package/build step.
- Network access is required for Google Fonts, React 18.3.1, ReactDOM 18.3.1, and Babel Standalone 7.29.0. Integrity and CORS are declared for the unpkg scripts.
- JSX modules use `type="text/babel"` and browser globals, so Babel Standalone and exact script order are runtime prerequisites. `design-system.html` and `docs.html` have their own static load graphs.
- Font provenance differs by form: modular entrypoints request nine external Google families (Inter, Fraunces, JetBrains Mono, Geist, Instrument Serif, Space Grotesk, IBM Plex Mono, IBM Plex Sans, Manrope); standalone bundles contain 63 WOFF2 subset files represented by 190 `@font-face` declarations. The smaller counts in prose are stale.
- The reference intentionally uses illustrative demo data. No source totals, users, activity, resources, live counts, or credentials may be bound into production. Future parity work must use authorized real data and must not mock or intercept APIs.
- The reference has inherent behavior/accessibility limits: unknown theme IDs can leave mismatched attributes, drawer search is inert, counts are hardcoded, some controls are below the 44px touch contract, palette focus needs real-tab verification, and L3 demo resources have no L3 field. These are documented rather than masked.
- Touch guidance conflicts: component visuals include 26–36px controls while the governing accessibility contract requires 44px targets. Preserve the 44px production contract; do not treat undersized reference hit boxes as required behavior.
- Breakpoint guidance conflicts: source CSS hides the sidebar at `max-width: 768px` and opens tablet drawer access through 1024px, while the governing brief requires a 240px sidebar at exactly 768px and drawer only below 768px. Future implementation must follow the explicit 375/768/1024/1440 contract and record the reconciliation; this source sync does not rewrite upstream bytes.

## Verification boundary

Synchronization verifies provenance, hashes, load references, and static syntax only. No browser was run and no server/workflow was started. This is not evidence of visual or behavioral parity.