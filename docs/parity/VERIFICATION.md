# Independent verification — task 571

> This is historical verification. Current scoped native-browser and static
> evidence, fresh lint failure, safe-test-database requirements and unresolved
> reference conflicts are in [COMPLETION-REVIEW.md](COMPLETION-REVIEW.md).
> Overall original-contract acceptance remains **NOT COMPLETE**.

## Scope and provenance

This was an independent acceptance/evidence review plus the task-required
existing validation commands. Application source was not edited. After the
initial unavailable-origin attempt, the coordinating agent started the existing
application workflow; the verifier used only the existing pixel harness.

- **Command-tested commit:** `a1e2a9fc598a34b4e662a27f5c8bdb6a869c8f3e`
- **Retained full-regression capture commit:** `2b44a2bc08692059cc4ab63c526a5871451fbe1f`
- **Retained full inventory run:** `2026-09-15T17-47-51-897Z-9407`
- **Retained repeat pixel run:** `2026-09-15T18-59-43-142Z-21936`

The retained full run is not evidence that the later documentation commit
`a1e2a9fc` was browser-tested. Conversely, the static command results below
are evidence only for `a1e2a9fc`, not for any documentation commit made after
this verification. The command ledger is retained in
[evidence/verification-571/COMMANDS.md](evidence/verification-571/COMMANDS.md)
and the sanitized raw logs in
[evidence/verification-571/RAW-GATE-LOGS.md](evidence/verification-571/RAW-GATE-LOGS.md).

The final read-only Markdown-link/PNG audit is retained as a
[runnable Node document](evidence/verification-571/parity571-audit.js.txt),
[JSON result](evidence/verification-571/parity571-links.json), and
[raw report](evidence/verification-571/parity571-missing-targets.txt).
It covers 163 Markdown files (including the root README, ADMIN-GUIDE,
CONTACT-VARIANTS, and these new verification documents), 1,674 links, and
1,298 PNG references (698 unique): zero missing local targets, zero missing
PNGs, and zero existing-but-untracked PNGs. The retained script exits
nonzero if a local target is missing or a PNG is missing/unavailable.

## Acceptance and retained-evidence review

The requested pixel gate remains **BLOCKED**. `STATUS.md` and the full-run
`results.json` agree: 188 measured pixel cells contain 16 PASS and 172 FAIL;
there are additionally 40 blocked, 96 token-only unverified, 4 evidence-only,
and 4 alias cells. The pass threshold remains 0.5%; it was not relaxed.
The repeat reports 17/188 measured determinism deltas greater than 0.01
percentage points. The retained full run records `gatePassed: false`, clean
source fingerprints, and an admin identity teardown with no local QA users
remaining.

I opened these retained actual/reference/diff PNG triplets with `ReadFile`:

| Sample | Result of visual review | Retained machine result |
|---|---|---|
| `app.home.index` at 375 | Actual and reference have the same long mobile shell/content structure; the diff is sparse/low-intensity. | PASS |
| `app.shell.palette` at 1440 | Actual and reference show the same centered palette over the same desktop home shell; only small localized diff marks are visible. | PASS |
| `app.category` at 1024 | Actual is a narrow single-column card/list treatment while the reference is a wider multi-column card layout; the diff has an extensive highlighted lower region. | FAIL, 35.128%, above the 0.5% ceiling |

The reviewed files are the `actual/`, `expected/`, and `diff/` files in
`tests/parity/baseline/2026-09-15T17-47-51-897Z-9407/` for those three samples.
They substantiate the retained PASS/FAIL classifications but do not cure the
full-inventory blockers.

The retained production-baseline summary also remains incomplete: 26 routes
were compared, 1 was identical, 25 remain unresolved, with 43 tracked route
deltas and 8 of 12 API endpoints having tracked deltas. It is not a new
production comparison.

## Fresh selected parity attempts

The five valid pixel IDs were selected from `npm run test:parity -- --list`:
`app.home.index`, `app.home.curated`, `app.category`, `app.about`, and
`app.shell.palette`.

1. The initial exact requested command exited **2** before browser work because
   `BASE_URL` was absent.
2. A changed-input prerequisite check with the documented loopback setting,
   `BASE_URL=http://127.0.0.1:5000`, also exited **2**:
   `net::ERR_CONNECTION_REFUSED` at the sign-in page. It did not capture a
   row, create a baseline directory, or alter the shared STATUS/REPORT files.
3. After the app workflow was made available, the one final permitted
   five-row attempt reached the browser and captured a partial sequence.
   The external command limit stopped it after 300 seconds before the harness
   could complete, write a run directory, execute its own teardown, or return its own
   exit code. The wrapper reports a timeout (`-1`), not a parity result.
   It measured four `app.about` cells as FAIL (5.5721–8.9731%) and two
   `app.category` cells as FAIL (58.0711% and 58.7279%), then stopped while
   starting `app.category@1024`.
4. No further capture retry was made. Browser work is therefore finished with
   **partial new measurements**, but the selected five-row run and its
   cleanup are **UNVERIFIED**. This is neither a selected-run pass nor a
   complete selected-run visual failure classification.

The unavailable-loopback attempt reported `identity teardown incomplete:
verification: fetch failed` after creating a disposable parity admin. The
final timed-out attempt also created and promoted a disposable parity admin,
but was terminated before the harness could report teardown.

Cleanup was then completed with an exact-identity operation following the
existing parity helper's prefix and endpoint ordering, restricted to the two
known bridge IDs. The helper's `--sweep` mode was not used because it is
prefix-wide and could affect another worker's fixture. The exact operation
matched/deleted one local record and one Clerk record and verified zero local
and zero Clerk records remaining for the two-ID target set (`targetSetSha256`
`74bc33070572d22ec87a20a8f656b85374096bc96c2e96ddcd56e976f27f8430`);
it exited 0. No personal data or other-worker identity was printed or acted
on. The raw proof is retained in
[`RAW-GATE-LOGS.md`](evidence/verification-571/RAW-GATE-LOGS.md).

The retained full run's cleanup proof remains valid for its own `2b44a2bc`
execution only.

The selected harness is documented to leave shared reports alone. I also
backed them up before the attempt and compared them afterward: `docs/parity/
STATUS.md`, `docs/parity/REPORT.md`, and `tests/parity/REPORT.md` were
byte-identical before and after. The preserved full-run reporting state was
not overwritten.

## Fresh non-browser gates at `a1e2a9fc`

| Check | Exit | Verified result |
|---|---:|---|
| `npm run check` | 0 | TypeScript completed without diagnostics. |
| `npm run test:unit` | 0 | 16 files and 315 tests passed. |
| `npm run validate:response-contracts` | 0 | 19 endpoint checks, 0 real mismatches; observer liveness verified. |
| `npm run validate:openapi` | 0 | 178 API routes, 178 named contracts, 150 paths. |
| `npx tsx scripts/verify-boot-migration-safety.ts` | 0 | Completes a partial schema and fails loudly/atomically for the deliberately non-idempotent migration scenario. |
| `npx tsx scripts/check-migration-drift.ts` | 0 | 27 migration files journaled; scratch schema reproduced; 27 serial sequences were not behind. |
| `node scripts/validation/dead-exports.mjs` | 0 | 841 exports in 216 modules checked; 791 imported and 50 pinned exceptions. |
| `node scripts/validation/root-script-drift.mjs` | 0 | 28 executable root/active-script files checked; 0 stray. |

## Verdict and handoffs

**Acceptance is BLOCKED.** The fresh non-browser type, unit, API-contract,
migration, export, and root-script gates passed at the stated tested SHA.
They do not supersede the retained failed pixel denominator, blocked/reference
coverage, production-baseline deltas, or the partial selected-run failures.

The separate final static link/PNG gate is **PASS**. The six authorized
historical leaf links now carry explicit **UNVERIFIED** missing-artifact notes;
the unavailable completion log, `final-shell-build/` directory, and artifact
workflow log were not replaced with fabricated raw evidence. The SCREENS
aggregate remains intentionally excluded from those leaf repairs. The final
audit report, JSON, and runnable script above are the resolved handoff for
current link counts.

1. The required five-row selection must be run to completion and retain its
   generated evidence before a selected-run verdict can be claimed.
2. Pixel/reference owners must address or explicitly adjudicate the 172
   retained failed measured cells; the category sample demonstrates a material
   layout mismatch, not a threshold rounding issue.
3. Baseline/inventory owners must resolve or document the 25 unresolved
   production-route deltas and the missing reference states before claiming
   complete parity.
