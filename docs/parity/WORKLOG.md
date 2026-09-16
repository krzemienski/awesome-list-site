# Consolidated parity worklog

This ordered index preserves the per-wave records and their handoffs; it does not relabel historical browser evidence as a run at current documentation HEAD `a1e2a9fc598a34b4e662a27f5c8bdb6a869c8f3e`.

| Phase | Delivered record(s) | Commit(s) | Consolidated outcome |
|---|---|---|---|
| Foundation / baseline | [foundation](worklog/foundation.md), [prod baseline](worklog/prod-baseline.md) | `d7004885`, `98f1b0cc`, `1611b848` | Buildable base and read-only production baseline retained. |
| Canonical tokens / fonts | [tokens](worklog/tokens.md), [fonts](worklog/fonts.md) | `7dfe06f7`, `ee798204` | Canonical rules integrated; accessibility deviations remain explicit. |
| Harness | [harness](worklog/harness.md) | `6fc80a5f` | Full-union Pixelmatch, frozen clock, disposable Nick, and font gate established. |
| Shell | [footer](worklog/footer.md), [header](worklog/shell-header.md), [sidebar](worklog/sidebar-implementation.md) | `8fc3f6ec`, `8bf3494d`, `6cab708f` | Selected Home/drawer/palette rows pass; general visual closure does not follow. |
| Catalog / discovery | [kind API](worklog/kind-api.md), [discovery](worklog/discovery.md) | `6f94cab0`, `882d5d6b` | Contract work landed; broader pixels remain open. |
| Contact | [contact API](worklog/contact-api.md), [retention](worklog/contact-retention.md) | `5f52709e`, `43dc2ba4` | Default-off contact and retention retained; receipt is not delivery. |
| Artifact | [showcase](worklog/artifact-showcase-550.md), [docs](worklog/artifact-docs.md) | `fdf1c6b7`, `59cd9037` | Real artifact surfaces retained; canonical reconciliation remains open. |
| Integration / audit | [integration](worklog/integration-shell.md), [DS audit](DS-AUDIT.md) | `b190c8fe`, `d11775ec` | Focused functional/audit evidence is distinct from global pixel closure. |
| Contact verification | [variants](worklog/contact-variants-566.md), [click-through](CLICKTHROUGH.md) | `10cb97df`, `2b44a2bc` | Scoped visitor/admin flows pass within their stated boundary. |
| Full regression | [full handoff](worklog/full-regression-2026-09-15.md) | `a1e2a9fc` | **BLOCKED:** 16/188 pixel pass; historical capture origin remains `2b44a2bc`. |

## Exact unresolved handoffs

The following remain verbatim-owner work: 172/188 pixel cells fail; 17 cells exceed repeat tolerance; 57 first-pass failures are font-gap-only; the Journeys cap decision is unresolved; lint is 5,218 errors / 23 warnings; Firefox/WebKit executables are absent; Clerk target-host mismatch left New Collection, Notes, and Profile unable; the DS sweep stopped at bookmark seed 401; sidebar assertions and taxonomy errors need adjudication; research@1440 axe is incomplete; token-only/blocked cells remain non-pixel proof; and baseline adjudication remains incomplete. See the [full verbatim owner table](worklog/full-regression-2026-09-15.md#owner-handoffs-and-exact-repro).

The final [Task 571 link/PNG audit report](evidence/verification-571/parity571-missing-targets.txt), [JSON result](evidence/verification-571/parity571-links.json), and [runnable Node document](evidence/verification-571/parity571-audit.js.txt) resolve the current static-link handoff: 163 Markdown files, 1,674 links, 1,298 PNG references (698 unique), zero missing local targets, zero missing PNGs, and zero existing-but-untracked PNGs. Historical leaf claims remain explicit UNVERIFIED where the completion log, `final-shell-build/` directory, and artifact workflow log are unavailable; no replacement raw evidence is asserted. The SCREENS aggregate remains excluded from leaf-link repairs. [Independent verification](VERIFICATION.md) remains the separate fresh-command boundary.

## Supplemental complete record index

Every file in `worklog/` is represented by the phase table above or this compact index: `artifact-docs-generation.md` (`59cd9037`); `artifact-docs.md` (`59cd9037`); `artifact-showcase-550.md` (`fdf1c6b7`); `audit-567-browser.md`, `audit-567-continuation.md`, `audit-567-ds-verdicts.md`, `audit-567-expanded-progress.md`, `audit-567-final-handoff.md`, `audit-567-performance.md`, `audit-567-static.md`, `audit-567-status.md`, and `audit-567-visual-review.md` (audit series `d11775ec`); `contact-api.md` (`5f52709e`); `contact-retention.md` (`43dc2ba4`); `contact-variants-566.md` and `contact-variants-gates.md` (`10cb97df`); `discovery.md` (`882d5d6b`); `final-integration-review.md` and `integration-shell.md` (`b190c8fe`); `fonts.md` (`ee798204`); `footer.md` (`8fc3f6ec`); `foundation.md` (`d7004885`, `98f1b0cc`, `1611b848`); `full-regression-2026-09-15.md` (`a1e2a9fc`); `harness.md` (`6fc80a5f`); `kind-api.md` (`6f94cab0`); `prod-baseline.md` (`98f1b0cc`); `shell-header.md` (`8bf3494d`); `sidebar-implementation.md` (`6cab708f`); `tokens.md` (`7dfe06f7`); and `README.md` (uncommitted index/reading guide, not an evidence-producing phase record).

## Conventional-prefix audit

This is a Git-subject audit of the phase commits listed above; it does not rewrite historical subjects. Foundation (`d7004885` `chore`, `98f1b0cc`/`1611b848` `fix`), tokens (`7dfe06f7` `chore`), fonts (`ee798204` `chore`), kind API (`6f94cab0` `feat`), and contact API (`5f52709e` `feat`) meet the conventional-prefix requirement. Harness (`6fc80a5f`), shell/footer/header/sidebar (`8fc3f6ec`, `8bf3494d`, `6cab708f`), discovery (`882d5d6b`), retention (`43dc2ba4`), artifact (`fdf1c6b7`, `59cd9037`), integration/audit (`b190c8fe`, `d11775ec`), contact verification (`10cb97df`), and full-regression handoff (`a1e2a9fc`) have descriptive subjects without a conventional prefix: **UNMET historical audit gap**. Do not claim per-phase conventional-commit compliance until an owner supplies an approved audit exception or follow-up convention policy.