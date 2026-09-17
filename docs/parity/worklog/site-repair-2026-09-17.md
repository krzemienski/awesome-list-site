# Parallel product repairs — 2026-09-17

The user stopped the long parity run and requested parallel investigation,
implementation, and actual built-in browser use. The unfinished run was
stopped; its exact disposable identity was removed. No new whole-inventory
pixel, Lighthouse, or gate sweep was launched in this repair pass.

## Ownership and implementation

| Area | Implemented |
| --- | --- |
| Shell | Runtime title/repository/branch reaches navigation; official current branding retained. Explicit configured issue destinations replace invented links. Search closes and clears on pathname/query history navigation. Admin bottom padding accounts for consent height. |
| Home/taxonomy/search | Kind filter is wired through both resource results and primary listing counts, tags, children and pagination. Clear removes its URL state. Public resource fields survive the card adapter. Mobile filters no longer overlap the summary. Grid/List moved out of a clipped screen-reader-only heading into the visible filter panel. |
| Resource surfaces | Restored visible detail actions, metadata and related content. Cards/details consume public kind and featured fields consistently, including bookmark, collection and recommendation consumers. |
| Member/public pages | Configured contact destinations and unavailable states replace hardcoded legal/About links. About FAQ uses actual category counts and the same site identity as server JSON-LD. Journey progress is bounded. |
| Admin | GitHub loading/error/empty states and real read-only job-details dialog; configured repository defaults preserve operator edits. Research notes have excerpts and accessible read-only details. Resource filters/tools disclosure is named. New resources become visible under their actual status. Delete actions are permanently visible, normal-flow 44px controls after two failed hover-positioning approaches. Unsupported Invite is explicitly disabled and visually muted. |
| Backend | Admin create retains metadata.featured. Listing kind filtering uses the existing resolver across resources/counts/ETags. FAQ identity matches the client. Unconfigured security.txt returns unavailable rather than an invalid success or invented tracker. |
| Artifact/contact | Phone document grids/flow metadata reflow; existing ink/list repairs preserved. Docs controls retain accessible height. Malformed fragment decoding no longer crashes mount. Unavailable contact variants expose their real reason. |

No frozen reference, expected capture, threshold, database schema, production
configuration or historical GitHub job was rewritten.

## Built-in browser evidence

One persistent tester, `site-repair-browser`, performed sequential journeys
against the main application on port 5000, not the artifact.

| Journey/state | Result and native screenshot evidence |
| --- | --- |
| Guest search → browser Back, 375 | PASS after repair: palette closes, current search trigger regains focus, reopening is empty. `wfa23n`, `xuihwt`. |
| Mobile taxonomy filters | PASS: no collection-summary overlap; kind Libraries gives one matching result; clearing restores the full scope. `hzuw5k`, `p84abj`, `zotr5a`, `b77c66`. The kind screenshot caught a transient skeleton; the tester separately observed the populated result. |
| Desktop Grid/List pointer use | PASS after moving the clipped control: actual horizontal rows and multi-column cards, not only checked state. `fc5ol5`, `xxjg6l`. |
| All 15 displayed admin tabs | Activated and selected state checked: Overview, Approvals, Edits, Enrichment, Researcher, Export, Database, Resources, Categories, Subcategories, Users, GitHub, Link Health, Audit, Research. Existing idle/empty states were observed without starting paid jobs or external syncs. |
| Admin create/edit kind/featured | PASS: create retains Tools + Featured, changing and clearing kind persists after reload; pending items remain non-public. `fho30d`, `l47mu6`. A second approved owned item appeared in both Index and Curated featured areas; switching featured off removed it from featured but correctly retained Recently Indexed. |
| Pointer delete/cancel/reopen | Initial attempts exposed a real table-cell interception defect. Final normal-flow presentation PASS: pointer Delete → Cancel → move away → Delete → Confirm. `yobe5e`, `n2lq61`, `mkg24y`, `4u7jfq`. |
| Research note details | PASS: pointer open, complete brief, bounded heading, Close focus return, keyboard Enter reopen. `s96h3r`, `w7c1wv`, `87zl4o`. A subsequent header-padding adjustment keeps the long title clear of the close button. |
| Bookmark → collection → note → reload | PASS: saved resource 185563, created owned collection, moved bookmark, saved note; reload retained association and text. `81lb2b`, `yjplx8`, `mttri4`, `3xshdb`, `hcwlgm`. |
| Member cleanup | PASS: clear note, remove bookmark, delete owned collection, reload to All saved 0. `qvpd1w`. |

Native screenshots were personally inspected for the initial modal/overlap,
admin action hitboxes, and final research dialog. The main Screenshot tool
also confirmed the running taxonomy page renders with real content and no
browser error. Native IDs are retained rather than copying account-table
screenshots containing other users' personal details into the repository.

## Teardown and limitations

- The tester deleted only owned resources 188457 and 188458 and collection
  285; bookmark/note associations on resource 185563 belonged only to its
  disposable account. Existing catalog records and historical jobs were not
  deleted.
- The first Clerk testing handshake reached the artifact host and was
  correctly recorded UNABLE. A real, scoped development Clerk identity and
  database admin bridge then enabled the actual app sign-in; no auth bypass
  or production account was introduced.
- Final exact-fixture teardown removed the Clerk identity before its local
  row. Owned resources/collection were already absent, and remaining owned
  bookmarks, notes and collections were all zero. Temporary login material
  was removed. The separately interrupted parity identity was also removed
  by its exact ID, without sweeping other workers.
- Consent bottom-clearance interaction remained UNVERIFIED in the final
  admin pass because the tester had already declined consent. The padding
  repair is source-reviewed, not claimed as a browser-proven state.
- The optional phone saved-bookmark capture was not taken after cleanup.
- Artifact/contact changes are source-reviewed; this pass did not repeat
  every contact variant or 50 theme combinations.
- Existing production SSR logs refer to an older import-time Clerk error.
  The current renderer already contains its guard; the SSR investigator
  successfully imported and rendered the current built renderer. No new
  production release was made.
- TypeScript integration errors introduced during parallel card wiring
  were corrected. The final scoped implementation agent reported a clean
  TypeScript run. This is not a claim that the historical lint/pixel/full
  release gates now pass.

The historical full-inventory result remains historical and is not replaced
with a fabricated green report. This record describes actual product repairs
and the specifically exercised user journeys.

## Continuation: contact and design-system interactions

Three parallel owners reviewed contact behavior, implemented artifact
interactions, and checked the remaining application scope without starting
another broad audit. No additional main-app behavior gap was established by
the read-only scope review; historical failures were not relabeled as new bugs.

Implemented:
- Contact footer distinguishes a failed configuration request from genuinely
  unconfigured destinations.
- Reopening a contact form clears a previous submission error while retaining
  entered values. Pending submissions remain pending on reopen, and the
  submit handler rejects a second send while one is in flight.
- Artifact parser boot reads the same combined theme record as React,
  validating system/accent together. Invalid records resolve both defaults;
  obsolete split storage keys no longer override the runtime's decision.
- Showcase tab specimens now have real panels, arrow/Home/End navigation,
  roving focus, and selected state. Non-action list rows no longer suggest
  that clicking will perform an operation.
- Showcase, Anatomy and Docs have keyboard skip links that focus and scroll
  the main landmark without changing the route fragment or current chapter.
- Docs no longer overwrites an outgoing Anatomy/Showcase navigation before
  unmounting. Chapter Back/Forward navigation is preserved.

The same built-in tester verified tabs and Terminal/Magenta reload persistence
at 375px (`aing3j`, `b8h5rh`, `dx4duq`). It exposed the outgoing Docs navigation
bug, which was repaired rather than bypassed. The focused correction passed
at 375px and 768px: Docs → Principles → Anatomy → Showcase, keyboard skip
focus without chapter/route changes, and browser Back/Forward. Personally
reviewed captures include `6yfp3j` (768px docs navigation) and `8a04cm` (768px
Anatomy). Document-level overflow was zero in the verified narrow states.
The main Screenshot tool also confirmed the artifact renders at 1280px.

The TypeScript check passed. Earlier artifact build/type checks passed before
the final navigation corrections; those corrections were exercised in the
running artifact rather than starting another build/gate loop. No precise
prepaint flash measurement is claimed. Contact changes are source/type-checked;
configured submission evidence from the earlier contact pass remains historical
and was not replayed. Default-off flags, production configuration, frozen
reference sources, font-preview ownership and database data were unchanged.