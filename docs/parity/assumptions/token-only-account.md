# Account token-only implementation and verification

## Eligibility and scope

These routes have no loaded canonical counterpart. The historical ThemePage
in pages-extra.jsx is a pattern hint, not a pixel reference. All account
captures remain outside the pixel denominator. No pixel threshold, masking,
or canvas rule has been changed.

The owned page stylesheet is `client/src/styles/pages/account.css`. Settings
owns its layout; the Home preference block can be inserted by the integrator
without changing learning/notification preference contracts.

| Route / state | Closest 11-patterns pattern | Mapping |
|---|---|---|
| /settings | Submit / admin form | Centered preference column, canonical Card/Input/Button, separate learning and notification sections |
| /settings/theme | Submit / admin + specimen preview | Five system radios, ten accent radios, optional font radios; canonical radius, border width and selected shadow |
| /profile | Resource detail + stats strip | Identity header, metrics, tabs, canonical cards and progress fill |
| /bookmarks signed in | Category filtered list | Collection filters, summary controls, resource cards, bulk toolbar |
| /bookmarks guest empty | Empty | Canonical empty icon, heading, exploration/sign-in actions |
| /bookmarks guest populated | Category list + callout | Device-saved ResourceCards and account-upgrade callout |
| BookmarksGate resolving auth | Loading | Busy status and token-backed spinner; no forced login |
| /contributions | Category filtered list | Filtered timeline cards, status chips, disclosure details |
| /notifications | Category list / Empty | Read-state rows, unread marker, mark-read actions, empty inbox |
| /onboarding | Submit / admin | Progress steps and the existing learning-preference form |
| /continue-learning | Resource detail / Category list | Progress cards, next-step callouts, recent resources |
| /sign-in and /sign-up | Submit / admin | Real Clerk components with appearance variables; see docs/AUTH-APPEARANCE.md |

## Implemented changes

- Account pages consume scoped token styles instead of page-local literal
  color/radius/shadow treatments; public component contracts and testids remain.
- Theme radio selection announces the active combination through a polite
  atomic status region. Font override storage uses safeStorage.
- Theme selection no longer invents a per-card glow; it uses --shadow-accent.
- Clerk typography and surfaces follow resolved tokens; border ink remains
  full-opacity before Clerk's alpha ramp. Errors use --color-destructive,
  not the user's arbitrary accent.
- Contribution pending/approved/rejected badges use canonical chip
  warn/ok/bad utilities. Superseded remains textually labeled and neutral.

## Evidence and actual results

Evidence root: `evidence/parity-account/`.

- `account-552.json`: guest and signed-in route captures, axe observations,
  real Clerk identity/sign-in and successful own-identity teardown.
- `FINAL-MANIFEST.json`: 77 retained evidence files.
- `theme-matrix.json`: 50 selections using pointer and keyboard, checked
  radio state and computed accent/background values.
- `signed-behavior.json`: signed-in screens and their actual empty states.
- `checks/`: command output, including failed lint and measured HEAD baseline.

The 50 combinations resolve their selected accent; **--bg remains #000000
for every combination**, as defined by the current dark-only foundations.
This is not evidence that --bg changes between combinations. Reload and
cross-tab theme persistence were observed in the browser only.

Screenshots exist at 375/768/1024/1440 for account routes, and 375/1440 for
real Clerk surfaces. Some auth/guest captures use the existing default
Geist/Cyan rather than Editorial/Crimson; these are functional evidence,
not final target captures. Signed-in account captures use Editorial/Crimson.
The guest populated bookmark and theme interaction screenshots retained by
the tester are linked in its report; the four guest bookmark route captures
are the empty state, not populated-state coverage at every width.

Personally inspected: signedIn.settings-375.png (stacked settings cards and
forms), signedIn.profile-768.png (identity, metrics, progress and recommendations),
auth.sign-in-1440.png (real Clerk controls), and the running theme-page preview.
These confirm rendered surfaces, not blanket pixel approval.

The browser report records zero serious/critical axe findings, real Clerk
sign-in completion, and guest save/reload persistence. Final semantic-error
color corrections occurred after captures; no error-state screenshot is
claimed for those corrections.

## Account theme persistence

The user authorized the required shared-contract extension. Signed-in system
and accent values now use the same monotonic revision row as learning
preferences while remaining independent of learning reset. Guests still use
safe browser storage only.

Fresh real-system proof is in `results.json` and
`signed-theme-reload.png`: Terminal/Rose saved through the API at revision 2,
survived a document reload with both radios checked and both html attributes
set, then Terminal/Cyan synchronized to a second tab and persisted. The
disposable local and Clerk identities were both deleted, with zero matching
local identities remaining.

The rapid-click rerun dispatches the system and accent choices in one browser
task and proves the same Terminal/Rose result, preventing stale React render
state from persisting the prior system.

The real onboarding form was completed across all five steps. The API reported
`onboardingStatus: "completed"` and step 5 at revision 5; a document reload
retained that completed state. Evidence is in
`signed-onboarding-completed.png` and the browser result JSON.

## Integration and infrastructure notes

1. Notification mark-read could not be exercised because the disposable
   account inbox was empty; no foreign worker identity was modified.
2. Production baseline and aggregate inventory closure remain with the
   integration/final-regression owner under the parallel execution contract.
3. Shared browser workflows encountered lease contention from simultaneous
   repository-wide audits. The account browser harnesses, all 50 theme
   combinations, Clerk auth, reload, cross-tab sync, guest bookmark reload,
   onboarding completion, and axe checks ran directly against the live app.
4. Whole-repo lint failed (5,527 errors, 21 warnings); HEAD also fails
   (5,496 errors, 21 warnings). Normalized per-message comparison found no
   added client-source messages; untracked/generated workspace files make
   the whole-tree totals differ. This is not a green lint gate.
5. The fresh bundle build succeeds. The shared bundle gate currently reports
   only `route:category` 0.2 KiB over its threshold; account routes and chunks
   are not the reported surface.

Passing commands: check, migration-drift, preferences-revision-races,
response-contracts, lint:css, scoped account CSS lint, test:unit
(15 files / 300 tests), palette-drift, accent-drift, standalone-palette-drift,
theme-registry-type-safety, dead-components, guest-recommendations, and a
fresh production build.

## Integration handoff

The proposed account inventory is staged at
`docs/parity/handoffs/token-only-account.json`, separate from aggregate family
records. Loading it directly in inventory/ requires regenerating the shared
inventory.json, which is forbidden to this leaf task; the existing inventory
list remains valid. The integrator installs the proposed fragment at the
requested tests/parity/inventory/token-only-account.json path and regenerates
the aggregate.
Reconcile it with existing account.json rows (including replacing obsolete
blocked auth/settings classifications), rather than counting duplicate
surfaces. The downstream integration task owns aggregate closure. No
deployment was performed.

Evidence files are retained under the ignored evidence tree and force-staged
for this task.