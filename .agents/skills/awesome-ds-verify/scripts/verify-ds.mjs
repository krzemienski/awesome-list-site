#!/usr/bin/env node
/**
 * verify-ds — one command, one verdict, for awesome-list-site design-system work.
 *
 * Runs the repo's OWN validation gates (it does not re-implement them), maps
 * each to the audit stage it enforces, stores every log in a run-scoped
 * evidence directory, and prints one verdict:
 *
 *   PASS        every selected gate ran and passed                     exit 0
 *   FAIL        at least one BLOCK-severity gate failed                exit 1
 *   FIX         no BLOCK failed, at least one FIX-severity gate failed exit 2
 *   INCOMPLETE  nothing failed, but at least one gate did not run      exit 3
 *               (skipped, crashed, missing env) — this is NOT a pass
 *
 * A gate that did not execute is UNVERIFIED. It never counts as PASS.
 *
 * Usage:
 *   node verify-ds.mjs [--repo <path>] [--mode offline|full] [--deep]
 *                      [--base-url http://127.0.0.1:5000] [--routes /,/about]
 *                      [--artifact-base-url http://127.0.0.1:20928]
 *                      [--only id,id] [--out <dir>] [--list] [--json]
 *
 * Zero dependencies of its own. Node >= 18.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SYSTEMS = ['editorial', 'terminal', 'geist', 'brutalist', 'swiss'];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const opts = {
    repo: process.cwd(), mode: 'offline', deep: false, list: false, json: false,
    baseUrl: process.env.BASE_URL || process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5000',
    routes: '/', only: null, out: null,
    // pixel-parity also captures the design-system artifact (its Vite dev
    // server, workflow "artifacts/awesome-video-design-system: web").
    artifactBaseUrl: process.env.ARTIFACT_BASE_URL || 'http://127.0.0.1:20928',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const take = () => {
      const eq = arg.indexOf('=');
      if (eq !== -1) return arg.slice(eq + 1);
      i += 1;
      if (argv[i] === undefined) die(`${arg} needs a value`);
      return argv[i];
    };
    if (arg === '--deep') opts.deep = true;
    else if (arg === '--list') opts.list = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '-h' || arg === '--help') { printHelp(); process.exit(0); }
    else if (arg.startsWith('--repo')) opts.repo = take();
    else if (arg.startsWith('--mode')) opts.mode = take();
    else if (arg.startsWith('--base-url')) opts.baseUrl = take();
    else if (arg.startsWith('--artifact-base-url')) opts.artifactBaseUrl = take();
    else if (arg.startsWith('--routes')) opts.routes = take();
    else if (arg.startsWith('--only')) opts.only = take().split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg.startsWith('--out')) opts.out = take();
    else die(`unknown argument: ${arg}`);
  }
  if (!['offline', 'full'].includes(opts.mode)) die(`--mode must be offline or full (got ${opts.mode})`);
  opts.repo = path.resolve(opts.repo);
  opts.baseUrl = opts.baseUrl.replace(/\/+$/, '');
  opts.artifactBaseUrl = opts.artifactBaseUrl.replace(/\/+$/, '');
  return opts;
}

function printHelp() {
  const text = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  console.log(text.slice(text.indexOf('/**') + 3, text.indexOf('*/')).replace(/^ \* ?/gm, ''));
}

function die(message) {
  console.error(`verify-ds: ${message}`);
  process.exit(64);
}

// ---------------------------------------------------------------------------
// Gate catalogue. `needs`: offline | live | live-auth | network.
// `tier`: core (always) | deep (only with --deep; slow, heavyweight evidence).
// `cmd` is [executable, ...args] run with cwd = repo root.
// ---------------------------------------------------------------------------
function gateCatalogue(opts) {
  const live = { BASE_URL: opts.baseUrl, AUDIT_BASE_URL: opts.baseUrl };
  const tsx = path.join('node_modules', '.bin', 'tsx');
  const stylelint = path.join('node_modules', '.bin', 'stylelint');
  return [
    // ------------------------------ offline ------------------------------
    { id: 'token-parity', stages: ['0'], severity: 'BLOCK', needs: 'offline', tier: 'core',
      proves: 'Runtime tokens, accents and canonical utility rules resolve to the frozen design source (awesome-list-site-ds) for all 5 systems x 10 accents, or carry a documented deviation.',
      cmd: ['node', 'scripts/validation/canonical-token-parity.mjs'] },
    { id: 'theme-registry-types', stages: ['1'], severity: 'BLOCK', needs: 'offline', tier: 'core',
      proves: 'design-system.ts compiles standalone and rejects an unknown DEFAULT_SYSTEM or DEFAULT_ACCENT; registry uniqueness lives in the canonical JS and is checked by accent-drift.',
      cmd: ['node', 'scripts/validation/theme-registry-type-safety.mjs'] },
    { id: 'accent-drift', stages: ['1', '2', '3', '9', '10'], severity: 'BLOCK', needs: 'offline', tier: 'core',
      proves: 'Registry, pre-paint boot markers, :root[data-system]/[data-accent] blocks, skin selectors, font options and the always-on font <link> all agree.',
      cmd: ['node', 'scripts/validation/accent-drift.mjs'] },
    { id: 'token-contract', stages: ['10'], severity: 'BLOCK', needs: 'offline', tier: 'core',
      proves: 'Every :root[data-system] block declares the token set its peers agree on.',
      cmd: ['node', 'scripts/validation/stylelint-design-system-token-contract.mjs'] },
    { id: 'skin-blocks', stages: ['10'], severity: 'BLOCK', needs: 'offline', tier: 'core', builtin: 'skinBlocks',
      proves: 'The canonical client/public/ds/design-system.css keeps its [data-system] skin selectors (>= 55) with every system represented, and design-system.js defines every system.' },
    { id: 'palette-drift', stages: ['5'], severity: 'FIX', needs: 'offline', tier: 'core',
      proves: 'No new hardcoded hex / rgb() / Tailwind palette class / raw radius / font-family in client/src beyond the shrink-only baseline; SKILL.md stage-5 regex parity.',
      cmd: ['node', 'scripts/validation/palette-drift.mjs'] },
    { id: 'standalone-palette-drift', stages: ['5'], severity: 'FIX', needs: 'offline', tier: 'core',
      proves: 'Same stage-5 scan over manifest-backed artifacts/; frozen design archive still byte-identical to its upload.',
      cmd: ['node', 'scripts/validation/standalone-palette-drift.mjs'] },
    { id: 'lint-css', stages: ['5', '10'], severity: 'FIX', needs: 'offline', tier: 'core',
      proves: 'stylelint (with the design-system token-contract plugin) is clean over client/**/*.css.',
      cmd: [stylelint, 'client/**/*.css'] },
    { id: 'stage6-contract', stages: ['6'], severity: 'FIX', needs: 'offline', tier: 'core',
      proves: 'Button primitive minimum touch-target contract (44x44) holds for default/small/icon across all product profiles.',
      cmd: ['node', 'scripts/validation/ds-button-sweep.mjs', '--contract-only'] },
    { id: 'ds-artifact', stages: ['1'], severity: 'FIX', needs: 'offline', tier: 'core',
      proves: 'The published design-system artifact (tokens.json + docs) is regenerated from the current stylesheet and registry.',
      cmd: ['node', 'scripts/generate-design-system-artifact.mjs', '--check'] },
    // ------------------------------- live --------------------------------
    { id: 'live-probe', stages: ['1', '2', '3', '4', '9', '11'], severity: 'BLOCK', needs: 'live', tier: 'core',
      proves: 'On each requested route of the RUNNING app: DS globals present, data-system/data-accent set, --bg resolves, .page + .grain rendered, display font painted, and switching all 5 systems changes radius/border/font on real elements.',
      cmd: ['node', path.join(HERE, 'live-probe.mjs'), '--repo', opts.repo, '--base-url', opts.baseUrl, '--routes', opts.routes],
      env: live, evidenceArg: '--out', exitSeverity: { 1: 'BLOCK', 2: 'FIX' }, exitError: [70] },
    { id: 'font-prepaint', stages: ['3', '9'], severity: 'FIX', needs: 'live', tier: 'core',
      proves: 'data-font / --font-body / --font-sans are written before first paint on every boot path (no theme flash).',
      cmd: [tsx, 'scripts/validation/font-prepaint-audit.ts'], env: live },
    { id: 'ds-showcase', stages: ['9', '11'], severity: 'BLOCK', needs: 'live', tier: 'core',
      proves: '/design-system: every system pill flips html[data-system], token rows equal live computed values, tokens diverge across systems, and each declared face actually paints (width-measured, not fonts.check).',
      cmd: ['node', 'scripts/validation/design-system-showcase.mjs'], env: live },
    { id: 'ds-button-sweep', stages: ['6'], severity: 'FIX', needs: 'live-auth', tier: 'core',
      requiresEnv: ['CLERK_SECRET_KEY', 'DATABASE_URL'],
      proves: 'Stage-6 stray button/input/chip/card/h1/eyebrow sweeps on public, overlay-open, signed-in and admin routes, with detector canaries; SKILL.md <-> ds-button-filter.mjs literal parity.',
      cmd: ['node', 'scripts/validation/ds-button-sweep.mjs'], env: live },
    { id: 'ink-accent', stages: ['7', '8'], severity: 'FIX', needs: 'live-auth', tier: 'core',
      requiresEnv: ['CLERK_SECRET_KEY', 'ADMIN_PASSWORD'],
      proves: 'Accent discipline and ink-tier (no long p/li in --text-3/--text-4) across 5 systems x 2 widths x 4 surfaces, compared on RESOLVED colors.',
      // The gate refuses to overwrite its committed evidence (docs/parity/evidence/audit-567-ink-accent)
      // and its default stage dir, so every run gets a fresh, run-scoped pair under the evidence tree.
      cmd: ['node', 'scripts/validation/audit-567-ink-accent.mjs'], env: live,
      evidenceEnv: { AUDIT_567_INK_OUT: 'stage', AUDIT_567_INK_EVIDENCE_OUT: 'evidence' } },
    { id: 'webfont-fetch', stages: ['9'], severity: 'FIX', needs: 'network', tier: 'core',
      proves: 'Every font stylesheet URL answers 200 and ships an @font-face for each family it requests.',
      cmd: ['node', 'scripts/validation/accent-drift.mjs', '--network'] },
    // ------------------------------- deep --------------------------------
    { id: 'parity-systems', stages: ['11'], severity: 'BLOCK', needs: 'live-auth', tier: 'deep',
      requiresEnv: ['CLERK_SECRET_KEY', 'ADMIN_PASSWORD'],
      proves: 'Drives /settings/theme through all systems x accents, captures 4 surfaces x 4 widths, runs axe on every inventory row.',
      // The gate refuses to run over an existing checkpoint (its default
      // .cache/audit-567-run), so every run gets a fresh run-scoped output dir.
      // It still publishes into the tracked docs/parity/evidence/** tree by design.
      cmd: ['node', 'scripts/audit-567-browser.mjs', '--phase', 'all'], env: live, timeoutMs: 90 * 60_000,
      evidenceEnv: { AUDIT_567_OUT: 'run' } },
    { id: 'pixel-parity', stages: ['11'], severity: 'FIX', needs: 'live-auth', tier: 'deep',
      requiresEnv: ['CLERK_SECRET_KEY', 'ADMIN_PASSWORD'],
      proves: 'Editorial x Crimson pixel parity vs the design reference at <= 0.5% per screen x width.',
      // The harness also captures the design-system artifact, so it needs that
      // origin too (checked for reachability before the gate starts).
      cmd: ['node', 'tests/parity/runner.mjs'], env: { ...live, ARTIFACT_BASE_URL: opts.artifactBaseUrl },
      requiresServer: 'artifact', timeoutMs: 120 * 60_000 },
  ];
}

// ---------------------------------------------------------------------------
// Built-in gate: stage 10 skin-block census (the repo has no script for the
// raw counts the skill asks for, so it lives here — reading the real file).
// ---------------------------------------------------------------------------
function skinBlocks(repo) {
  const file = path.join(repo, 'client/public/ds/design-system.css');
  const jsFile = path.join(repo, 'client/public/ds/design-system.js');
  const lines = [];
  for (const f of [file, jsFile]) if (!fs.existsSync(f)) return { pass: false, log: `missing ${f}` };
  const css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const js = fs.readFileSync(jsFile, 'utf8');
  const systemSelectors = css.match(/\[data-system="(?:editorial|terminal|geist|brutalist|swiss)"\]/g) || [];
  let pass = true;
  const check = (ok, message) => { lines.push(`${ok ? 'PASS' : 'FAIL'} ${message}`); if (!ok) pass = false; };
  check(systemSelectors.length >= 55, `[data-system] selector count ${systemSelectors.length} (floor 55)`);
  for (const id of SYSTEMS) {
    const skins = (css.match(new RegExp(`\\[data-system="${id}"\\]\\s+[^{,]+`, 'g')) || []).length;
    check(skins > 0, `${id}: ${skins} component skin selector(s)`);
    // Per-system tokens are not CSS blocks: applyDesignSystem() writes them inline from DESIGN_SYSTEMS.
    check(new RegExp(`^\\s*${id}\\s*:\\s*\\{`, 'm').test(js), `${id}: DESIGN_SYSTEMS entry present in design-system.js`);
  }
  return { pass, log: lines.join('\n') };
}
const BUILTINS = { skinBlocks };

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------
// A gate that dies from an uncaught exception prints Node's version trailer.
// That is a broken harness or environment, not a design-system finding.
const CRASH = /^Node\.js v\d+/m;
const ENV_HINTS = [
  [/ERR_MODULE_NOT_FOUND|Cannot find (?:package|module)/, 'dependency missing — run `npm ci` in the repo'],
  [/No chromium-\* dir|Executable doesn't exist|browserType\.launch/, 'Chromium missing — run `npm run test:e2e:browsers` (or set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH)'],
  [/App not reachable|ECONNREFUSED|ERR_CONNECTION_REFUSED/, 'app not reachable — start it with `npm run dev` and re-run'],
  [/ENOENT/, 'a file the gate expects is missing (partial clone / LFS / deleted asset?)'],
];

function runCommand(gate, repo, evidenceDir) {
  return new Promise((resolve) => {
    const logPath = path.join(evidenceDir, `${gate.id}.log`);
    const stream = fs.createWriteStream(logPath);
    const args = gate.cmd.slice(1);
    if (gate.evidenceArg) args.push(gate.evidenceArg, path.join(evidenceDir, gate.id));
    // evidenceEnv: { ENV_NAME: '<subdir>' } → ENV_NAME=<evidenceDir>/<gate.id>/<subdir>
    const evidenceEnv = Object.fromEntries(Object.entries(gate.evidenceEnv || {})
      .map(([name, sub]) => [name, path.join(evidenceDir, gate.id, sub)]));
    const started = Date.now();
    const child = spawn(gate.cmd[0], args, {
      cwd: repo, env: { ...process.env, ...(gate.env || {}), ...evidenceEnv, FORCE_COLOR: '0', NO_COLOR: '1' },
    });
    const timeoutMs = gate.timeoutMs || 20 * 60_000;
    const timer = setTimeout(() => { stream.write(`\n[verify-ds] timeout after ${timeoutMs}ms — killed\n`); child.kill('SIGKILL'); }, timeoutMs);
    child.stdout.pipe(stream, { end: false });
    child.stderr.pipe(stream, { end: false });
    const finish = (exitCode, spawnError) => {
      clearTimeout(timer);
      if (spawnError) stream.write(`\n[verify-ds] spawn error: ${spawnError.message}\n`);
      stream.end(() => resolve({ exitCode, logPath, ms: Date.now() - started, spawnError }));
    };
    child.on('error', (error) => finish(null, error));
    child.on('close', (code) => finish(code, null));
  });
}

function classify(exitCode, log, spawnError, gate = {}) {
  if (gate.exitError?.includes(exitCode)) return { status: 'ERROR', reason: tail(log, 1) || `exit ${exitCode}` };
  if (spawnError) return { status: 'ERROR', reason: `could not start: ${spawnError.message}` };
  if (exitCode === 0) return { status: 'PASS', reason: '' };
  for (const [pattern, hint] of ENV_HINTS) {
    if (pattern.test(log) && (CRASH.test(log) || /not reachable|ECONNREFUSED/.test(log))) return { status: 'ERROR', reason: hint };
  }
  if (CRASH.test(log)) return { status: 'ERROR', reason: 'gate crashed with an uncaught exception (see log) — not a DS finding, not a pass' };
  if (exitCode === null) return { status: 'ERROR', reason: 'killed (timeout or signal)' };
  return { status: 'FAIL', reason: `exit ${exitCode}` };
}

async function reachable(baseUrl) {
  try {
    const response = await fetch(baseUrl, { method: 'GET', signal: AbortSignal.timeout(8000) });
    return response.status < 500 ? { ok: true } : { ok: false, why: `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, why: error.cause?.code || error.message };
  }
}

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function tail(text, count) {
  return text.trimEnd().split('\n').slice(-count).join('\n');
}

// For a failed gate: its own FAIL lines first (capped), else the raw tail.
function failureDigest(log) {
  const hits = log.split('\n').filter((line) => /^\s*(FAIL|✗|Error:|error )/.test(line));
  if (!hits.length) return tail(log, 15);
  const shown = hits.slice(0, 12);
  if (hits.length > shown.length) shown.push(`… ${hits.length - shown.length} more FAIL line(s) in the log`);
  return shown.join('\n');
}

function git(repo, ...args) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const opts = parseArgs(process.argv.slice(2));
const gates = gateCatalogue(opts);

if (opts.list) {
  for (const gate of gates) {
    console.log(`${gate.id.padEnd(26)} ${gate.severity.padEnd(5)} stage ${gate.stages.join(',').padEnd(11)} ${gate.needs.padEnd(9)} ${gate.tier}`);
  }
  process.exit(0);
}

const SENTINELS = ['scripts/validation/palette-drift.mjs', 'client/public/ds/design-system.css', 'awesome-list-site-ds/styles.css'];
const missingSentinels = SENTINELS.filter((file) => !fs.existsSync(path.join(opts.repo, file)));
if (missingSentinels.length) {
  die(`${opts.repo} does not look like awesome-list-site (missing ${missingSentinels.join(', ')}). Pass --repo <path>.`);
}
if (opts.only) {
  const unknown = opts.only.filter((id) => !gates.some((gate) => gate.id === id));
  if (unknown.length) die(`unknown gate id(s): ${unknown.join(', ')} — see --list`);
}

const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
const evidenceRoot = path.resolve(opts.out || path.join(opts.repo, '.cache', 'verify-ds'));
const evidenceDir = path.join(evidenceRoot, runId);
fs.mkdirSync(evidenceDir, { recursive: true });
// Self-ignoring evidence root: never dirties `git status`, no repo edit needed.
if (!opts.out && !fs.existsSync(path.join(evidenceRoot, '.gitignore'))) fs.writeFileSync(path.join(evidenceRoot, '.gitignore'), '*\n');

const head = git(opts.repo, 'rev-parse', 'HEAD');
const dirtyFiles = git(opts.repo, 'status', '--porcelain').split('\n').filter(Boolean);
if (opts.only?.some((id) => gates.find((gate) => gate.id === id).needs !== 'offline')) opts.mode = 'full';
const server = opts.mode === 'full' ? await reachable(opts.baseUrl) : { ok: false, why: 'offline mode' };
const artifactServer = opts.mode === 'full' && opts.deep ? await reachable(opts.artifactBaseUrl) : { ok: false, why: 'not needed' };

const say = (line) => { if (!opts.json) console.log(line); };
say(`verify-ds · run ${runId}`);
say(`repo ${opts.repo} @ ${head.slice(0, 10) || 'no-git'}${dirtyFiles.length ? ` (+${dirtyFiles.length} uncommitted)` : ''} · mode ${opts.mode}${opts.deep ? '+deep' : ''}`);
if (opts.mode === 'full') say(`app  ${opts.baseUrl} → ${server.ok ? 'reachable' : `NOT reachable (${server.why})`}`);
if (opts.mode === 'full' && opts.deep) say(`ds-artifact  ${opts.artifactBaseUrl} → ${artifactServer.ok ? 'reachable' : `NOT reachable (${artifactServer.why})`}`);
say('');

const results = [];
for (const gate of gates) {
  const base = { id: gate.id, stages: gate.stages, severity: gate.severity, needs: gate.needs, proves: gate.proves };
  let skip = '';
  if (opts.only && !opts.only.includes(gate.id)) skip = 'excluded by --only (scoped run)';
  else if (gate.tier === 'deep' && !opts.deep && !opts.only?.includes(gate.id)) skip = 'deep tier — re-run with --deep';
  else if (gate.needs !== 'offline' && opts.mode === 'offline') skip = `needs ${gate.needs} — re-run with --mode full`;
  else if ((gate.needs === 'live' || gate.needs === 'live-auth') && !server.ok && opts.mode === 'full') skip = `app not reachable at ${opts.baseUrl} (${server.why}) — start it with \`npm run dev\``;
  else if (gate.requiresServer === 'artifact' && !artifactServer.ok) skip = `design-system artifact not reachable at ${opts.artifactBaseUrl} (${artifactServer.why}) — start the "artifacts/awesome-video-design-system: web" workflow or pass --artifact-base-url`;
  else if (gate.requiresEnv) {
    const missing = gate.requiresEnv.filter((name) => !process.env[name]);
    if (missing.length) skip = `missing env: ${missing.join(', ')}`;
  }
  if (skip) {
    results.push({ ...base, status: 'UNVERIFIED', reason: skip });
    if (!skip.startsWith('excluded by --only')) say(`  ··  ${gate.id.padEnd(26)} UNVERIFIED — ${skip}`);
    continue;
  }

  let outcome;
  if (gate.builtin) {
    const started = Date.now();
    const { pass, log } = BUILTINS[gate.builtin](opts.repo);
    const logPath = path.join(evidenceDir, `${gate.id}.log`);
    fs.writeFileSync(logPath, `${log}\n`);
    outcome = { status: pass ? 'PASS' : 'FAIL', reason: pass ? '' : 'see log', logPath, ms: Date.now() - started, log };
  } else {
    const run = await runCommand(gate, opts.repo, evidenceDir);
    const log = fs.readFileSync(run.logPath, 'utf8');
    outcome = { ...classify(run.exitCode, log, run.spawnError, gate), exitCode: run.exitCode, logPath: run.logPath, ms: run.ms, log };
  }
  // ERROR means the gate never produced a judgement: report it as UNVERIFIED.
  const status = outcome.status === 'ERROR' ? 'UNVERIFIED' : outcome.status;
  // A gate that reports its own severity through its exit code (live-probe).
  const severity = (status === 'FAIL' && gate.exitSeverity?.[outcome.exitCode]) || gate.severity;
  results.push({
    ...base, severity, status, reason: outcome.reason, exitCode: outcome.exitCode ?? null, ms: outcome.ms,
    log: path.relative(evidenceDir, outcome.logPath), logSha256: sha256(outcome.logPath), tail: status === 'PASS' ? tail(outcome.log, 3) : failureDigest(outcome.log),
    command: gate.cmd ? gate.cmd.join(' ') : `(builtin ${gate.builtin})`,
  });
  const mark = { PASS: '  ✓   ', FAIL: '  ✗   ', UNVERIFIED: '  ··  ' }[status];
  say(`${mark}${gate.id.padEnd(26)} ${status}${status === 'FAIL' ? ` [${severity}]` : ''}${outcome.reason ? ` — ${outcome.reason}` : ''} (${(outcome.ms / 1000).toFixed(1)}s)`);
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------
const failed = results.filter((row) => row.status === 'FAIL');
const blocks = failed.filter((row) => row.severity === 'BLOCK');
const fixes = failed.filter((row) => row.severity === 'FIX');
const unverified = results.filter((row) => row.status === 'UNVERIFIED');
const passed = results.filter((row) => row.status === 'PASS');
const verdict = blocks.length ? 'FAIL' : fixes.length ? 'FIX' : unverified.length ? 'INCOMPLETE' : 'PASS';
const exitCode = { PASS: 0, FAIL: 1, FIX: 2, INCOMPLETE: 3 }[verdict];

const allStages = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
const stageCoverage = Object.fromEntries(allStages.map((stage) => {
  const rows = results.filter((row) => row.stages.includes(stage));
  const state = !rows.length ? 'NOT RUN'
    : rows.some((row) => row.status === 'FAIL') ? 'FAIL'
      : rows.every((row) => row.status === 'PASS') ? 'PASS'
        : rows.some((row) => row.status === 'PASS') ? 'PARTIAL' : 'UNVERIFIED';
  return [stage, { state, gates: rows.map((row) => `${row.id}:${row.status}`) }];
}));

const summary = {
  tool: 'verify-ds', runId, verdict, exitCode, mode: opts.mode, deep: opts.deep,
  repo: opts.repo, head, dirtyFiles, baseUrl: opts.mode === 'full' ? opts.baseUrl : null, routes: opts.routes,
  counts: { pass: passed.length, fail: failed.length, block: blocks.length, fix: fixes.length, unverified: unverified.length },
  stageCoverage, results, evidenceDir,
};
fs.writeFileSync(path.join(evidenceDir, 'results.json'), `${JSON.stringify(summary, null, 2)}\n`);

const bullet = (rows, render) => (rows.length ? rows.map(render).join('\n') : '_none_');
const md = `# Design-System Verification · awesome-list-site

**Verdict: ${verdict}**${verdict === 'INCOMPLETE' ? ' — nothing failed, but not everything ran. This is not a pass.' : ''}

Run \`${runId}\` · mode \`${opts.mode}${opts.deep ? '+deep' : ''}\` · HEAD \`${head.slice(0, 10) || 'n/a'}\`${dirtyFiles.length ? ` + ${dirtyFiles.length} uncommitted file(s)` : ''}
Evidence: \`${evidenceDir}\`

## Findings

### 🔴 BLOCK (${blocks.length})
${bullet(blocks, (row, i) => `${i + 1}. stage ${row.stages.join('/')} — \`${row.id}\` failed → read \`${row.log}\``)}

### 🟡 FIX (${fixes.length})
${bullet(fixes, (row, i) => `${i + 1}. stage ${row.stages.join('/')} — \`${row.id}\` failed → read \`${row.log}\``)}

### ⚪ UNVERIFIED (${unverified.length})
${bullet(unverified, (row, i) => `${i + 1}. stage ${row.stages.join('/')} — \`${row.id}\`: ${row.reason}`)}

## What passed
${bullet(passed, (row) => `- \`${row.id}\` (stage ${row.stages.join('/')}) — ${row.proves}`)}

## Stage coverage
| Stage | State | Gates |
|---|---|---|
${allStages.map((stage) => `| ${stage} | ${stageCoverage[stage].state} | ${stageCoverage[stage].gates.join(', ') || '—'} |`).join('\n')}
`;
fs.writeFileSync(path.join(evidenceDir, 'VERDICT.md'), md);

if (opts.json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  say('');
  for (const row of failed) {
    say(`──── ${row.id} [${row.severity}] · last lines of ${row.log}`);
    say(row.tail);
    say('');
  }
  if (verdict === 'INCOMPLETE' && opts.mode === 'offline' && !unverified.some((row) => row.needs === 'offline')) {
    say('offline scope clean — the static contract holds. Rendered behaviour (stages 2-4, 6-9, 11) is UNVERIFIED:');
    say('start the app and re-run with --mode full before calling this work done.');
  }
  say(`VERDICT: ${verdict}  (pass ${passed.length} · block ${blocks.length} · fix ${fixes.length} · unverified ${unverified.length})`);
  say(`evidence: ${evidenceDir}`);
  say(`          ${path.join(evidenceDir, 'VERDICT.md')}`);
}
process.exit(exitCode);
