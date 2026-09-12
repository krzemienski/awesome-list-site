/**
 * Render docs/parity/REPORT.md (and the per-run REPORT.md) from results.json.
 * The markdown is derived only — results.json is the machine-readable truth.
 */
import fs from "node:fs";
import path from "node:path";

const percent = (row) => (row.comparison ? `${row.comparison.diffPercent.toFixed(4)}%` : "—");
const pixels = (row) => (row.comparison ? String(row.comparison.differingPixels) : "—");
const dims = (row) => (row.comparison
  ? `${row.comparison.actualDimensions.width}×${row.comparison.actualDimensions.height} vs ${row.comparison.expectedDimensions.width}×${row.comparison.expectedDimensions.height}`
  : "—");

/**
 * The standalone `--determinism N` evidence (reference side, fresh contexts),
 * read from the docs evidence directory when the run itself carries none.
 * Returns null when the file is absent or unreadable — the report then says so.
 */
const readDeterminismEvidence = (file) => {
  if (!file) return null;
  try {
    const payload = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(payload.rows) || !payload.captures) return null;
    return payload;
  } catch {
    return null;
  }
};

const describeDeterminism = (determinism, label, link) => {
  const failing = determinism.rows.filter((cell) => !cell.identical);
  const verdict = failing.length ? `${failing.length} of ${determinism.rows.length} cells NOT identical (${failing.map((cell) => `${cell.screen}@${cell.width}`).join(", ")})` : `all ${determinism.rows.length} cells byte-identical`;
  return `Determinism proof (${label}): ${determinism.rows.length} row/width cells captured ${determinism.captures} times each in fresh contexts — ${verdict} (see ${link}).`;
};

const describeRecoveries = (configuration) => {
  const waits = configuration.throttleWaits || [];
  const deferrals = configuration.throttleDeferrals || [];
  const reloads = configuration.documentReloads || [];
  const waitedMs = waits.reduce((sum, wait) => sum + (wait.waitedMs || 0), 0);
  const parts = [
    waits.length ? `${waits.length} rate-limit wait${waits.length === 1 ? "" : "s"} (${Math.round(waitedMs / 1000)} s in total, excluded from row budgets)` : "no rate-limit waits",
    deferrals.length ? `${deferrals.length} row deferral${deferrals.length === 1 ? "" : "s"} to the end of the queue` : "no deferrals",
    reloads.length ? `${reloads.length} side reopen${reloads.length === 1 ? "" : "s"} (document reload or fonts not ready) recovered by reopening the side (${reloads.map((event) => `${event.screen}@${event.width} ${event.side}/${event.phase}${event.kind === "fonts-not-ready" ? "/fonts" : ""}`).join(", ")})` : "no document reloads or font-readiness reopens",
  ];
  return `Recoveries: ${parts.join("; ")}. Every event is listed in results.json under \`configuration\`.`;
};

/**
 * @param {object} results parsed results.json
 * @param {{ linkPrefix: string, stageRoot?: string, determinismEvidence?: { file: string, link: string } }} options
 *   linkPrefix is the path from the rendered markdown file to the run directory;
 *   determinismEvidence points at the standalone determinism.json (absolute
 *   path) and the link to render for it from the markdown file.
 */
const describeTeardown = (identity) => {
  const teardown = identity.teardown;
  if (!teardown) return "no teardown recorded";
  if (teardown.keepUser) return "kept by --keep-user";
  if (identity.teardownError) return `INCOMPLETE — ${identity.teardownError}`;
  const local = teardown.localDeleted === true ? "local row deleted" : `local ${teardown.localDeleted}`;
  const clerk = teardown.clerkDeleted ? "Clerk user deleted" : "Clerk user already absent";
  const remaining = teardown.verification?.localQaUsersRemaining?.length ?? "?";
  return `${local}, ${clerk}, ${remaining} __qa_test_parity_ rows remaining`;
};

export function renderReport(results, { linkPrefix, stageRoot, determinismEvidence }) {
  const exists = (relative) => !stageRoot || fs.existsSync(path.join(stageRoot, relative));
  const link = (relative, label) => (relative && exists(relative) ? `[${label}](${linkPrefix}${relative})` : label);
  const externalDeterminism = results.determinism ? null : readDeterminismEvidence(determinismEvidence?.file);
  const rows = results.rows;
  const measured = rows.filter((row) => row.denominator);
  const byStatus = (status) => rows.filter((row) => row.status === status).length;
  const fontGapRows = rows.filter((row) => row.fontParity && !row.fontParity.ok);
  const eligibility = results.inventory.eligibility;
  const substitutions = results.provenance.referenceAdapter?.placeholders;

  const lines = [
    "# Visual parity report",
    "",
    `Run: \`${results.runId}\`  `,
    `Claim: **${results.claim}**  `,
    `Gate: **${results.gatePassed ? "PASS" : "NOT PASSED"}** (exit code ${results.exitCode})  `,
    `Identity: ${results.identity.mode === "admin" ? `disposable Clerk admin \`${results.identity.bridgeId}\` "${results.identity.displayName || "Nick"}" (torn down: ${describeTeardown(results.identity)})` : `visitor (\`--as visitor\`, ${results.identity.reason || "no admin session"})`}  `,
    `Frozen clock: \`${results.configuration.frozenAt}\` on both sides.  `,
    `Denominator: ${results.summary.pass} pass / ${results.summary.fail} fail / **${results.summary.denominator}** pixel rows executed. ` +
      `${results.summary.incomplete || byStatus("INCOMPLETE")} row-incomplete${results.summary.incompleteEvidence && !results.summary.incomplete ? " plus run-level incomplete evidence" : ""}, ${byStatus("BLOCKED")} blocked, ${byStatus("EVIDENCE")} evidence-only, ${byStatus("UNVERIFIED")} token-only, ${byStatus("ALIAS")} aliases, ${byStatus("SKIPPED")} not selected.`,
    "",
    results.selection.full
      ? `Full inventory run: every one of the ${rows.length} screen/width rows below has exactly one terminal status.`
      : `Selected run (\`${results.selection.description}\`): ${rows.length} rows executed; rows outside the selection are not listed and the gate is diagnostic only.`,
    "",
    "## Eligibility",
    "",
    "| Class | Screens | Meaning |",
    "|---|---:|---|",
    `| pixel | ${eligibility.pixel} | Compared pixel-for-pixel at 375/768/1024/1440 (or the row's declared widths); counted in the denominator. |`,
    `| token-only | ${eligibility["token-only"]} | Design has no counterpart; verified by token audits, never by pixels. |`,
    `| artifact-docs | ${eligibility["artifact-docs"]} | Design-system docs chapters; captured as evidence, excluded from the denominator. |`,
    `| blocked | ${eligibility.blocked} | Cannot be compared yet; each row carries its reason. |`,
    "",
    "## Rows",
    "",
    "| Screen | Width | Class | Status | Diff px | Diff % | Actual vs expected size | Evidence / reason |",
    "|---|---:|---|---|---:|---:|---|---|",
    ...rows.map((row) => {
      const evidence = row.links?.diff
        ? `${link(row.links.actual, "actual")} · ${link(row.links.expected, "expected")} · ${link(row.links.diff, "diff")}${row.reason ? ` — ${row.reason}` : ""}`
        : (row.reason || (row.aliasOf ? `alias of ${row.aliasOf}` : "—"));
      return `| ${row.screen} | ${row.width} | ${row.eligibility} | ${row.status}${row.evidenceKind ? ` (${row.evidenceKind})` : ""} | ${pixels(row)} | ${percent(row)} | ${dims(row)} | ${evidence} |`;
    }),
    "",
    "## Font-face parity",
    "",
    fontGapRows.length
      ? `${fontGapRows.length} executed rows declare different \`@font-face\` sets for the nine parity families; each is a FAIL regardless of pixel diff. The gap table is in ${link("font-gaps.md", "font-gaps.md")}. Families missing on the app page in the first gap: ${fontGapRows[0].fontParity.familiesMissingOnActual.join(", ") || "none"}; missing on the reference page: ${fontGapRows[0].fontParity.familiesMissingOnExpected.join(", ") || "none"}.`
      : "Every executed row declared identical `@font-face` sets for the nine parity families.",
    "",
    "## Reference adapter",
    "",
    `Catalog snapshot \`${results.provenance.snapshot.sha256.slice(0, 16)}…\` (${results.provenance.snapshot.categories} categories, ${results.provenance.snapshot.totalResources} resources) bound to the design's \`AV_*\` globals; admin globals bound: ${results.provenance.referenceAdapter.adminGlobals.length ? results.provenance.referenceAdapter.adminGlobals.join(", ") : "none (no admin session)"}.`,
    "",
    "| File | Design literal | Served as | Source |",
    "|---|---|---|---|",
    ...(substitutions?.applied || []).map((entry) => `| ${entry.file} | \`${entry.from}\` | \`${entry.to}\` | ${entry.source} |`),
    ...(substitutions?.unadapted || []).map((entry) => `| ${entry.file} | \`${entry.literal}\` | *(unchanged)* | ${entry.why} |`),
    "",
    "## Capture contract",
    "",
    `Chromium ${results.configuration.browserVersion}; DPR 1; en-US; UTC; dark; reduced motion; viewport heights ${JSON.stringify(results.configuration.viewportHeights)}; pixelmatch threshold ${results.configuration.pixelmatchThreshold}; includeAA false; ceiling ${results.configuration.maximumDiffPercent}% of the union canvas. Full-page captures; unequal sizes are compared on an unscaled union canvas where every unmatched pixel counts. No masking, no cropping, no post-processing. Normalisations applied to both sides: ${results.configuration.captureNormalisations.join("; ")}. Backdrop-filter values are compared per row via computed style before normalisation.${results.configuration.captureState ? ` Pre-seeded state: theme ${results.configuration.captureState.theme.system} × ${results.configuration.captureState.theme.accent} on both sides; app localStorage ${JSON.stringify(results.configuration.captureState.app.localStorage)}.` : ""}`,
    "",
    results.determinism
      ? describeDeterminism(results.determinism, "this run", link("determinism.json", "determinism.json"))
      : externalDeterminism
        ? describeDeterminism(externalDeterminism, `standalone \`--determinism ${externalDeterminism.captures}\` run \`${externalDeterminism.runId}\`, reference side`, `[determinism.json](${determinismEvidence.link})`)
        : "Determinism proof: none recorded — run `--determinism 3` to refresh `docs/parity/evidence/harness/determinism/`.",
    "",
    describeRecoveries(results.configuration),
    "",
    `Machine-readable result: ${link("results.json", "results.json")}; output hashes: ${link("OUTPUT-MANIFEST.json", "OUTPUT-MANIFEST.json")}. The reference was served from an in-memory snapshot on an ephemeral loopback port; awesome-list-site-ds/ was not modified (raw and served hashes are both recorded).`,
    "",
    `Inputs changed during run: ${results.provenance.workspace.inputsChangedDuringRun ? "YES — stale" : "no"}. Live catalog/admin adapter hashes were re-read after the final row${results.provenance.referenceAdapter?.live?.error ? `, but the re-read was incomplete: ${results.provenance.referenceAdapter.live.error}` : ""}; ${measured.length ? `${measured.filter((row) => row.actualCaptureStability?.stableAttempts?.[0] > 1 || row.expectedCaptureStability?.stableAttempts?.[0] > 1).length} comparisons needed more than one raw frame before two consecutive frames were byte-identical; every attempt is retained.` : ""}`,
    "",
  ];
  return lines.filter((line) => line !== null).join("\n");
}

export function renderStatus(results) {
  const rows = results.rows;
  const pixelRows = rows.filter((row) => row.eligibility === "pixel");
  const passing = pixelRows.filter((row) => row.status === "PASS");
  const failing = pixelRows.filter((row) => row.status === "FAIL");
  const incomplete = pixelRows.filter((row) => row.status === "INCOMPLETE");
  const blocked = pixelRows.filter((row) => row.status === "BLOCKED");
  const worst = [...failing].sort((a, b) => (b.comparison?.diffPercent ?? 0) - (a.comparison?.diffPercent ?? 0)).slice(0, 10);
  return [
    "# Parity status",
    "",
    `Latest baseline run: \`${results.runId}\` (${results.executedAt}) — gate **${results.gatePassed ? "PASS" : "NOT PASSED"}**.`,
    "",
    `Pixel rows: ${passing.length} pass, ${failing.length} fail, ${incomplete.length} incomplete, ${blocked.length} blocked of ${pixelRows.length}. Eligibility: ${JSON.stringify(results.inventory.eligibility)}.`,
    "",
    "## Largest measured gaps",
    "",
    "| Screen | Width | Diff % | Reason |",
    "|---|---:|---:|---|",
    ...worst.map((row) => `| ${row.screen} | ${row.width} | ${percent(row)} | ${row.reason || "pixel diff above ceiling"} |`),
    "",
    "## Blocked rows",
    "",
    ...(blocked.length ? blocked.map((row) => `- ${row.screen}@${row.width}: ${row.reason}`) : ["- none"]),
    "",
    "## Incomplete rows",
    "",
    ...(incomplete.length ? incomplete.map((row) => `- ${row.screen}@${row.width}: ${row.reason}`) : ["- none"]),
    "",
    "See [REPORT.md](REPORT.md) for every row and the evidence links.",
    "",
  ].join("\n");
}
