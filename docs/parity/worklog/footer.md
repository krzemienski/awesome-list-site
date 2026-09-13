# Canonical footer — isolated implementation handoff

## Delivered boundary

`client/src/components/layout/new/AppFooter.tsx` and its exclusively owned
`client/src/styles/shell/footer.css`. MainLayout, contact components, global
styles, frozen design source and aggregate reports are unchanged.

The component consumes the merged footer foundations and geometry tokens,
with four columns above 900px, two below (brand spans both), and one below
520px. The wrapper uses the 1240px content token and 48/40/32 padding;
mobile uses the reference's 36/20/24. Links retain 44px accessible targets.
It uses the existing official BrandMark rather than the prototype's text tile.

## Integration instructions

1. Import AppFooter from `./AppFooter` in MainLayout.
2. Replace the old inline footer with `<AppFooter nav={nav} site={footerSite} />`.
   Required `footerSite` fields: `name`, `tagline`, `repoUrl`, `repoBranch`.
   Name/tagline come from `/api/config` site.title/site.description; source
   repository/branch derive from awesome-list.config.yaml source.url, not
   deploy.github.repository (which is a different repository). The public API
   currently lacks source repository fields; integration must expose/pass them
   rather than reintroduce hardcoded defaults in the component.
3. Place it outside the sidebar/content row, as the canonical full-width
   bottom row. Do not leave it inside SidebarInset.
4. Remove MainLayout's now-unused Link, openCookieSettings and lazy
   ContactFooter imports/declaration. Keep Suspense/lazy and ContactDialogHost:
   variants b/e still need that host.
5. AppFooter uses reactive route state to return null on `/admin*`.
   No CSS admin-hiding workaround is needed.
6. Verify component reachability after wiring. Until then the dead-components
   gate correctly reports this intentionally unwired handoff; do not allowlist it.

## Content mapping / intentional reference differences

- Brand link retains `footer-home`; every other existing footer testid is
  retained, including journeys, cookie settings and copyright. Adds site-footer.
- Browse uses the first six real nav categories, All categories and Journeys.
- Project contains About, Submit, Admin and the existing legal/consent controls.
- Source contains the real repo, issues, contributing, guidelines and docs,
  plus the actual sitemap. Repo uses **master**, not the prototype's main:
  both main-based links returned 404; master equivalents returned 200.
- Reference has no contact/Get in touch entry. The lazy, opt-in ContactFooter
  slot is placed after Source links. No contact chunk renders with variant unset.
- Variant a is email + issues; b opens the dialog; c is Discussions.
  The assignment's “a opens dialog” conflicts with existing behavior and the
  no-contact-behavior-change boundary. Contact-variants owner must resolve this;
  no behavior was silently changed here.
- Variant a now exclusively owns the issue action: the static repo issue link
  is omitted for a, so configured/unavailable contact destinations cannot
  conflict with another issue link.
- Docs points to real repository documentation; no fake docs.html or
  design-system.html route was added.
- Retains Built with React & shadcn/ui instead of prototype version marketing.
- Real live counts and names, legal links, accessible targets and official
  brand mark necessarily differ from the prototype pixels. These differences
  are not claimed as a passing pixel comparison.

## Verification and evidence

Evidence directory: `docs/parity/evidence/footer/`.

- `npm run check`: exit 0.
- Direct browser mount of the real AppFooter through the running app's Vite
  module graph, supplied by real `/api/awesome-list/nav` data (no mocks).
  This avoids editing contested layout files. Four diagnostic footer captures,
  plus JSON geometry/accessibility/route results.
- 375/768/1024/1440: no horizontal overflow; 1/2/4/4 grid columns;
  matching responsive padding; axe serious/critical = 0 at all four widths.
- All 16 unique internal destinations returned 200 against local app.
  Five final external destinations returned 200, including corrected master URLs.
- Browser print media: component display none. Reactive navigation to /admin:
  component absent. Global print policy remains unchanged.
- Full unchanged `print-audit`: 49 checks, 0 failures (print-audit.log).
- `npm run bundle:budget` passes against the existing build manifest. This is
  NOT a measurement of the unwired component in the final application bundle.
- App preview /about renders cleanly; console contains only Vite/React
  development messages and the expected Clerk development-key warning.

## Review correction / owned pixel gate — PASS

The initial completion request was rejected. The owned footer comparison cannot
be delegated to integration. A new clean isolated reference-vs-actual capture
mounts the real component and independently transpiled frozen SiteFooter, with
the same live nav data, configured identity/source and effective theme tokens.
Reference links receive the documented 44px accessibility reconciliation.
Both captures disable transitions/animation/backdrop blur; no old shell or
back-to-top overlays remain in the isolated documents.

`pixels/` contains expected, actual, diff, runner and percentages. Pixelmatch
threshold stays 0.1 and limit stays 0.5%. The entire union of both footer
rectangles is compared without masking; unequal height is padded, not cropped.

| Width | Actual / expected height | Difference | Status |
|---|---|---|---|
| 375 | 1461 / 1461 | 0.000365% (2 px) | PASS |
| 768 | 1043 / 1043 | 0.000250% (2 px) | PASS |
| 1024 | 538 / 538 | 0.000363% (2 px) | PASS |
| 1440 | 538 / 538 | 0.000258% (2 px) | PASS |

The user approved reference reconciliation. The capture adapter preserves the
canonical frozen structure and adapts only required app content, official
BrandMark, 44px target presentation, build credit, and the block presentation
of the indexed-live status. The frozen source and acceptance limit are not
modified. This is the owned isolated region gate; shell.default integration
closure remains downstream.

Site identity and repository are now required configuration-derived props;
the pixel probe obtains title/description from the real public config endpoint
and derives source repo/branch from the checked-in configuration. Final tsc
passes. The original non-pixel captures above precede this identity correction.

Completion suite also reports unrelated Clerk sign-in timeout (auth-return)
and cross-tab-theme timeout (product-profile); dead-component/dead-export
failures are expected until the prohibited MainLayout wiring is integrated.

Contact-state evidence:

- Disabled: no ContactFooter chunk was requested; the single static configured
  repository issue link remains.
- Variant a: ContactFooter chunk was requested; with current contact config it
  renders the honest “Report an issue unavailable” state, and the static issue
  link is omitted. There is exactly one issue action/state, not contradictory
  duplicates. `contact-enabled-a.json` and `contact-disabled.json` retain the
  browser results. The temporary development env was removed and the workflow
  restarted with the original disabled state.

## Required integration closure (not passing claims)

The integration task owns actual shell wiring, baseline selector comparison,
final built-bundle budget, contact enabled-state interactions with the dialog
host, production strip comparison and full-row union-canvas pixel comparison.
No passing shell.default pixelmatch result is asserted here. The target remains
threshold 0.1, <=0.5% difference at 375/768/1024/1440 with no masking.
The initial diagnostic captures contain the shell's floating back-to-top.
The subsequent `pixels/` comparisons remove that capture contamination.
No test:e2e or production baseline suite was run against the unwired component.
No downstream task is proposed because integration is already queued.