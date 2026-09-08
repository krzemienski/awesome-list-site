#!/usr/bin/env node
// Stray-script gate (task #387).
//
// Task #375 deleted the last loose one-off script from the repository root
// (.t264.mjs — an assertion-free Playwright probe, hardcoded to prod, run by
// hand and referenced by no workflow, npm script or import). It had survived
// for months because nothing in the suite looks at the root: the dead-code
// gate (dead-components.mjs) only walks client/src and shared/, so a .js/.mjs
// dropped beside package.json is invisible to every other check while still
// showing up in the first `ls` of the project and in security-scan output,
// reading as supported tooling.
//
// This gate closes that blind spot. Every executable/script file sitting
// directly in the repository root OR directly under scripts/ must be reachable
// by something MACHINE-READABLE:
//   · npm-script       — named in a package.json "scripts" command
//   · package-manifest — named in another package.json field (main/bin/…)
//   · workflow         — named in .replit (workflow task, run, deploy build)
//   · import           — a RESOLVED import/require edge from a file in an
//                        execution tree (client/, server/, shared/, scripts/,
//                        tests/, migrations/) — server/vite-dev.ts imports
//                        ../vite.config — or from a root file that is itself
//                        already referenced (see the chaining rule below)
//   · tooling          — named in a CI/container/tool config that is actually
//                        read by a tool (.github/workflows/*, Dockerfile,
//                        docker-compose.yml, vercel.json, railway.json,
//                        components.json, tsconfig.json, scripts/**/*.sh, …)
//   · recognized-config — an entry in ROOT_CONFIG_MANIFEST below whose owning
//                        package is still a declared dependency
// Anything else FAILS.
//
// NOTHING COUNTS JUST BECAUSE THE NAME APPEARS SOMEWHERE. Every surface is
// PARSED, and only three shapes of evidence exist:
//
//  1. An IMPORT EDGE read by the TypeScript SCANNER (ts.preProcessFile), never
//     by pattern matching. A specifier is an edge only when it is tokenized as
//     one, so a leftover constant, a log line or
//     `const example = 'import "./probe.mjs"'` produces nothing, and neither
//     does a commented-out import.
//  2. A COMMAND VALUE that actually runs the file — .replit run/args/build, a
//     CI `run:` step, a package.json script, a shell script line, Docker
//     RUN/CMD/ENTRYPOINT. "Runs" is decided by tokenizing the command and
//     judging it AGAINST ITS EXECUTABLE, because the same word is a file to
//     `node` and plain text to `echo`: wrappers (`env`, `sudo`, `time`) are
//     peeled off to reach the real command, a shell's `-c` argument is script
//     text that gets re-examined rather than a path, and a file-taking flag
//     counts only for a tool that reads a file that way — so `env echo
//     probe.mjs`, `echo -c probe.mjs`, `git add probe.mjs` and a workflow's
//     display `name` run nothing.
//  3. A PATH VALUE that a tool loads — tsconfig "files"/"include", a vercel
//     build "src", components.json tailwind.config, a local CI `uses: ./…`,
//     Docker COPY/ADD, or one of the file-bearing package.json fields
//     (main/module/bin/exports/files/…).
// For (2) and (3) alike, a key NAME is not evidence — its POSITION in that
// format's documented schema is. Each surface is read through its own schema
// (see schemaFor), so a value only counts where the format really runs or loads
// it. Everything else is metadata and certifies nothing: a workflow's display
// `name`, an `env:` var that happens to be called `command`, a marketplace
// action's `with:` inputs, a compose container_name or label, npm's `config`
// block (env vars, not a file), "description"/"keywords"/"author", a dependency
// name, or any key that merely spells the filename.
// Prose is not a surface at all: *.md (README, CHANGELOG, replit.md, docs/,
// reports/, journals/), .css and .html are never read, so a `/* probe.mjs */`
// or `<!-- probe.mjs -->` comment cannot resurrect anything. Comments inside
// the surfaces that are read are dropped by the parser (JSON through the TS
// JSONC reader, YAML through js-yaml, .replit/TOML through smol-toml) or
// stripped WHOLE-LINE AND INLINE with quote awareness (shell, Dockerfile), so
// `run: npm test  # node probe.mjs` vouches for nothing while `url/#anchor` and
// `"value # x"` stay intact. A surface the gate cannot PARSE is reported as a
// gate failure, never re-scanned as raw text: a malformed config must not be
// able to certify a dead script by merely containing its name.
// A mention in an audit report or a leftover TODO is exactly what made the old
// probes look supported; only something that actually runs or loads the file
// keeps it alive here.
//
// CHAINING RULE: checked files may import each other (a config loading a sibling
// config, or one active script loading another), but two stray scripts importing
// each other must not bootstrap themselves into looking alive. So a candidate
// import is evidence only when the importing candidate is itself referenced by
// an execution tree, command surface, or manifest — reachability from real
// roots, never a cycle.
//
// Auto-discovered tool configs (eslint.config.js, postcss.config.js, the .ts
// configs) are named by nothing, so they are pinned in ROOT_CONFIG_MANIFEST
// together with the package that discovers them — and the pin is only honored
// while that package is still a dependency, so a config whose tool was removed
// is reported as stray instead of being grandfathered forever. The manifest
// lives in THIS script (not a repo-mutable JSON allowlist) so widening the
// exemption universe is a visible, out-of-band edit to the gate itself — the
// same trust boundary dead-components.mjs uses for its frozen exceptions.
//
// Scope is executable/script files directly in the root or directly under
// scripts/ — the JS/TS family (.js/.mjs/.cjs/.jsx/.ts/.mts/.cts/.tsx), shell
// (.sh), and Python (.py) — not recursive. Tracked extensionless root files are
// also candidates when their first line has a recognized interpreter shebang;
// ordinary extensionless data files remain outside the scan. scripts/validation/
// and other nested directories are execution trees, while scripts/archive/ is
// excluded from both candidate discovery and import reachability. Files git
// already ignores are skipped (they never enter the repository).
// *.d.ts is exempt: ambient declarations are pulled in through tsconfig
// "include", never by a reference.
//
// Detector canaries run on every invocation (reference matching incl.
// substring/near-miss safety, comment stripping, docs exclusion, relative
// import resolution to the root, and the manifest's dependency condition), so
// a broken detector can never pass vacuously.
//
// Usage:
//   node scripts/validation/root-script-drift.mjs          # gate mode
//   node scripts/validation/root-script-drift.mjs --list   # + surface stats
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

// Import edges are read with the real TypeScript scanner, not regexes — see
// extractRelativeSpecifiers. Without it the gate cannot tell an import from a
// string that looks like one, so it fails loudly instead of guessing.
let ts;
try {
  ts = (await import('typescript')).default;
} catch {
  console.error('FAIL gate-unrunnable :: the "typescript" package is required to parse import edges — run npm install.');
  process.exit(1);
}

// YAML surfaces (CI workflows, compose) are parsed for the same reason: the
// gate must know a `run:` step from a display `name:`, which no regex can.
let yaml;
try {
  yaml = (await import('js-yaml')).default;
} catch {
  console.error('FAIL gate-unrunnable :: the "js-yaml" package is required to parse YAML surfaces — run npm install.');
  process.exit(1);
}

// .replit/TOML gets a real parser too, and for a second reason: a line scanner
// reads `args = "node probe.mjs"` out of a document that is not valid TOML at
// all, so a corrupt .replit could certify a stray script. Parsing validates the
// WHOLE document before any value is trusted.
let toml;
try {
  toml = await import('smol-toml');
} catch {
  console.error('FAIL gate-unrunnable :: the "smol-toml" package is required to parse .replit/TOML surfaces — run npm install.');
  process.exit(1);
}

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..', '..');
const LIST = process.argv.includes('--list');

const CODE_EXTS = ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx'];
const ACTIVE_SCRIPT_DIR = 'scripts';
const ARCHIVE_DIR = path.join('scripts', 'archive');

// `.replit`'s modules are the source of truth for which interpreters are
// enabled. Keep a policy for every enabled module family here so adding a
// future interpreter cannot silently leave its root-level script extension
// outside the scan. Non-interpreter modules still get an explicit decision:
// they do not add a root-level script extension or file-argument runtime.
//
// Each interpreter policy carries a canary. The canary is intentionally
// machine-readable (an npm script command), so adding an extension requires
// proving both that an unreferenced file is stray and that a real reference
// keeps it alive.
const REPLIT_MODULE_POLICIES = [
  {
    family: 'nodejs',
    extensions: CODE_EXTS,
    runtimes: ['node', 'nodejs', 'npx', 'tsx', 'ts-node', 'bun', 'deno', 'nodemon', 'pm2', 'vite-node'],
    canary: { file: 'probe.mjs', runtime: 'node' },
  },
  {
    family: 'python',
    extensions: ['.py'],
    runtimes: ['python', 'python3', 'python3.11'],
    canary: { file: 'probe.py', runtime: 'python' },
  },
  { family: 'web', extensions: [], runtimes: [], decision: 'platform module; no root-level script extension' },
  { family: 'postgresql', extensions: [], runtimes: [], decision: 'service module; no root-level script extension' },
];

const CHECKED_EXTS = new Set([
  ...REPLIT_MODULE_POLICIES.flatMap((policy) => policy.extensions),
  '.sh',
]);
const RECOGNIZED_SHEBANG_INTERPRETERS = new Set([
  ...REPLIT_MODULE_POLICIES.flatMap((policy) => policy.runtimes),
  'sh', 'bash', 'zsh', 'dash', 'ksh',
]);

function recognizedShebangInterpreter(content) {
  const firstLine = content.split(/\r?\n/, 1)[0];
  const match = /^#!\s*(\S+)(?:\s+(.*))?$/.exec(firstLine);
  if (!match) return null;
  const launcher = path.posix.basename(match[1]);
  const args = (match[2] ?? '').trim().split(/\s+/).filter(Boolean);
  let interpreter = launcher;
  if (launcher === 'env') {
    let i = 0;
    if (args[i] === '-S' || args[i] === '--split-string') i++;
    while (i < args.length && (args[i].startsWith('-') || /^[A-Za-z_]\w*=/.test(args[i]))) i++;
    interpreter = args[i] ? path.posix.basename(args[i]) : '';
  }
  return RECOGNIZED_SHEBANG_INTERPRETERS.has(interpreter) ? interpreter : null;
}

function policyForReplitModule(moduleName) {
  if (typeof moduleName !== 'string') return null;
  return REPLIT_MODULE_POLICIES.find(
    (policy) => moduleName === policy.family || moduleName.startsWith(`${policy.family}-`),
  ) ?? null;
}

function parseReplitModules(content) {
  try {
    const doc = toml.parse(content);
    if (!Array.isArray(doc?.modules) || !doc.modules.every((module) => typeof module === 'string')) {
      return { modules: [], error: 'modules must be an array of strings' };
    }
    return { modules: doc.modules, error: null };
  } catch (err) {
    return { modules: [], error: `unparseable TOML (${err.message.split('\n')[0]})` };
  }
}

function validateReplitModuleCoverage(modules) {
  const unknown = modules.filter((moduleName) => !policyForReplitModule(moduleName));
  if (unknown.length) {
    return {
      error: `no root-script policy for enabled .replit module(s): ${unknown.join(', ')}`,
      unknown,
    };
  }
  return { error: null, unknown: [] };
}

// ---------------------------------------------------------------------------
// Trusted manifest of auto-discovered root tool configs. Each entry is honored
// ONLY while `pkg` is still a declared dependency — a config for an uninstalled
// tool is stray, not exempt. Adding a row is the intended out-of-band act for a
// genuinely new tool config; one-off scripts can never be laundered in, because
// a "config" here must name a real package that loads it.
// ---------------------------------------------------------------------------
const ROOT_CONFIG_MANIFEST = [
  { file: 'eslint.config.js', pkg: 'eslint', note: 'flat config auto-discovered by `eslint .` (npm run lint)' },
  { file: 'stylelint.config.mjs', pkg: 'stylelint', note: 'auto-discovered by `stylelint` (npm run lint:css and editor diagnostics)' },
  { file: 'postcss.config.js', pkg: 'postcss', note: 'auto-discovered by the PostCSS/Tailwind pipeline during vite build' },
  { file: 'vite.config.ts', pkg: 'vite', note: 'auto-discovered by vite dev/build' },
  { file: 'vitest.config.ts', pkg: 'vitest', note: 'auto-discovered by `vitest run` (npm run test:unit / test:integration)' },
  { file: 'playwright.config.ts', pkg: '@playwright/test', note: 'auto-discovered by `playwright test` (npm run test:e2e)' },
  { file: 'drizzle.config.ts', pkg: 'drizzle-kit', note: 'auto-discovered by drizzle-kit push/studio (npm run db:push)' },
  { file: 'tailwind.config.ts', pkg: 'tailwindcss', note: 'Tailwind config (also named by components.json)' },
];

// Manual runbooks cannot be discovered by a tool, so they need an explicit
// out-of-band pin. Keep the reason beside the pin: a bare allowlist would let
// completed one-offs accumulate in the active scripts directory unnoticed.
const MANUAL_RUNBOOK_MANIFEST = [
  {
    file: 'scripts/migrate.ts',
    note: 'retained standalone migration runner for non-Replit/self-hosted recovery',
  },
  {
    file: 'scripts/prod-link-scan.ts',
    note: 'retained resumable production URL sweep; read-only and intentionally run by hand',
  },
  {
    file: 'scripts/verify-docker-deployment.sh',
    note: 'retained self-hosted Docker deployment verification runbook',
  },
  {
    file: 'scripts/verify-non-replit-build.sh',
    note: 'retained non-Replit production build verification runbook',
  },
  {
    file: 'scripts/vg2-ga4-validate.mjs',
    note: 'retained real-browser GA4 validation runbook, invoked after analytics changes',
  },
  {
    file: 'scripts/vg2-teardown.ts',
    note: 'retained cleanup runbook for the GA4 validation harness when automatic cleanup is incomplete',
  },
  {
    file: 'scripts/export-openapi-yaml.ts',
    note: 'retained on-demand OpenAPI artifact export used when refreshing checked-in API documentation',
  },
  {
    file: 'scripts/test-feedback-loop.ts',
    note: 'retained opt-in database-backed recommendation regression probe with QA-only teardown',
  },
];

// Execution trees: walked for CODE files, which contribute IMPORT EDGES ONLY.
// Their text is never searched for filenames — see "two kinds of evidence".
const IMPORT_TREE_DIRS = ['client', 'server', 'shared', 'scripts', 'tests', 'migrations'];

// Command surfaces: files whose job is to name other files to run or load, so
// naming one there IS the reference. Root configs, CI workflows, shell scripts.
// *.md, docs/, reports/, .css and .html are absent on purpose.
const COMMAND_SURFACE_DIRS = ['.github'];
const COMMAND_SURFACE_EXTS = new Set(['.sh', '.json', '.yml', '.yaml', '.toml']);
const SHELL_ONLY_DIRS = ['scripts']; // scripts/**/*.sh runs things; scripts/**/*.ts only imports them
// package.json is deliberately absent: it is parsed field-by-field instead of
// searched as text (see PKG_REFERENCE_FIELDS).
const ROOT_SURFACE_FILES = [
  '.replit',
  'Dockerfile',
  'docker-compose.yml',
  'vercel.json',
  'railway.json',
  'components.json',
  'tsconfig.json',
];

// Single predicate so the canaries can assert exactly what may vouch for a file.
function isCommandSurface(rel) {
  if (isArchivePath(rel)) return false;
  if (ROOT_SURFACE_FILES.includes(rel)) return true;
  const ext = path.extname(rel);
  if (COMMAND_SURFACE_DIRS.some((d) => rel.startsWith(`${d}/`))) return COMMAND_SURFACE_EXTS.has(ext);
  if (SHELL_ONLY_DIRS.some((d) => rel.startsWith(`${d}/`))) return ext === '.sh';
  return false;
}

function isArchivePath(rel) {
  return rel === ARCHIVE_DIR || rel.startsWith(`${ARCHIVE_DIR}/`);
}

// ---------------------------------------------------------------------------
// Reference matching.
// ---------------------------------------------------------------------------
// A root file is referenced by the bare name ("node probe.mjs") or "./probe.mjs".
// The lookbehind rejects near-misses that merely CONTAIN the name:
// "scripts/probe.mjs" is a different file, and "other-probe.mjs" is another one
// again — neither may keep the root file alive.
function referenceRegex(name) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(String.raw`(?<![\w./\\-])(?:\.[\\/])?${esc}(?![\w.-])`);
}

function referencesName(text, name) {
  return referenceRegex(name).test(text);
}

// Hash-comment surfaces (shell, YAML, TOML/.replit, Dockerfile): a comment can
// be INLINE, so `run: npm test  # node probe.mjs` must not vouch for probe.mjs.
// Quote-aware, because the hash is data inside a quoted value, and a `#` that
// is not preceded by whitespace is not a comment marker either (`url/#anchor`,
// `${#array}`), which keeps a real command from being truncated.
function stripHashLine(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === '\\' && quote !== "'") i++; // escaped char inside "" — skip it
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function stripHashComments(src) {
  return src.split('\n').map(stripHashLine).join('\n');
}

// ---------------------------------------------------------------------------
// Surfaces are PARSED, and only two kinds of value inside them can vouch.
// ---------------------------------------------------------------------------
// · command values — the places a format actually EXECUTES something (a CI
//   step's `run`, a .replit shell task's `args`, a package script, a shell
//   script line, Docker RUN/CMD/ENTRYPOINT). Matched with
//   referencesInvocation(), so `echo probe.mjs` vouches for nothing.
// · path values — the places a tool LOADS a file (tsconfig `files`/`include`, a
//   vercel build `src`, Docker COPY, a local CI `uses:`, the file-bearing
//   package.json fields). There the value IS the path, so an anchored name
//   match is the reference.
//
// Crucially, a KEY NAME is not evidence — its POSITION in the format's schema
// is. `command:` under a compose service is executed; `command:` inside a CI
// job's `env:` block is an environment variable that merely happens to be
// called command, and npm's `config` is arbitrary metadata rather than a file
// to load. A generic "any key named command/config/path, at any depth" walk
// therefore hands every format a metadata-shaped bypass, so each surface below
// is read through its OWN documented schema and everything outside those
// locations — display names, env blocks, labels, arbitrary scalars — says
// nothing.
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
// A command may be a string or an exec-form array (["node", "probe.mjs"]).
const asCommands = (v) =>
  typeof v === 'string' ? [v]
  : Array.isArray(v) && v.every((x) => typeof x === 'string') ? [v.join(' ')]
  : [];
const asPaths = (v) =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
const pushRef = (list, where, text) => {
  if (typeof text === 'string' && text.trim()) list.push({ where, text });
};

// .replit — run/entrypoint, the deployment block, and workflow tasks. `args` is
// a command only for a shell task; a packager task's args are package names.
function extractReplit(doc, out) {
  for (const c of asCommands(doc?.run)) pushRef(out.commands, 'run', c);
  for (const p of asPaths(doc?.entrypoint)) pushRef(out.paths, 'entrypoint', p);
  for (const p of asPaths(doc?.postMerge?.path)) pushRef(out.paths, 'postMerge.path', p);
  const deployment = isObj(doc?.deployment) ? doc.deployment : {};
  for (const key of ['run', 'build']) {
    for (const c of asCommands(deployment[key])) pushRef(out.commands, `deployment.${key}`, c);
  }
  const declared = doc?.workflows?.workflow;
  const workflows = Array.isArray(declared) ? declared : isObj(declared) ? [declared] : [];
  workflows.forEach((workflow, i) => {
    const tasks = Array.isArray(workflow?.tasks) ? workflow.tasks : [];
    tasks.forEach((task, j) => {
      if (typeof task?.task !== 'string' || !task.task.startsWith('shell.')) return;
      for (const c of asCommands(task.args)) {
        pushRef(out.commands, `workflows.workflow[${i}].tasks[${j}].args`, c);
      }
    });
  });
}

// GitHub Actions — a step's `run` executes; a local `uses: ./…` loads an action
// from the repo. A marketplace `uses`, a step `name`, `env:` and `with:` do not.
function extractGithubActions(doc, out) {
  const jobs = isObj(doc?.jobs) ? Object.entries(doc.jobs) : [];
  for (const [jobId, job] of jobs) {
    const steps = Array.isArray(job?.steps) ? job.steps : [];
    steps.forEach((step, i) => {
      for (const c of asCommands(step?.run)) pushRef(out.commands, `jobs.${jobId}.steps[${i}].run`, c);
      if (typeof step?.uses === 'string' && step.uses.startsWith('./')) {
        pushRef(out.paths, `jobs.${jobId}.steps[${i}].uses`, step.uses);
      }
    });
  }
  const runs = isObj(doc?.runs) ? doc.runs : null; // action.yml manifests
  if (!runs) return;
  for (const key of ['main', 'pre', 'post']) {
    for (const p of asPaths(runs[key])) pushRef(out.paths, `runs.${key}`, p);
  }
  const steps = Array.isArray(runs.steps) ? runs.steps : [];
  steps.forEach((step, i) => {
    for (const c of asCommands(step?.run)) pushRef(out.commands, `runs.steps[${i}].run`, c);
  });
}

// Compose — a service's command/entrypoint runs; its build.dockerfile is read.
// container_name, environment, labels and healthchecks are not invocations.
function extractCompose(doc, out) {
  const services = isObj(doc?.services) ? Object.entries(doc.services) : [];
  for (const [name, service] of services) {
    for (const key of ['command', 'entrypoint']) {
      for (const c of asCommands(service?.[key])) pushRef(out.commands, `services.${name}.${key}`, c);
    }
    for (const p of asPaths(service?.build?.dockerfile)) {
      pushRef(out.paths, `services.${name}.build.dockerfile`, p);
    }
  }
}

// tsconfig — the file sets tsc actually compiles, plus extends/references.
function extractTsconfig(doc, out) {
  for (const key of ['files', 'include']) {
    asPaths(doc?.[key]).forEach((p, i) => pushRef(out.paths, `${key}[${i}]`, p));
  }
  for (const p of asPaths(doc?.extends)) pushRef(out.paths, 'extends', p);
  const references = Array.isArray(doc?.references) ? doc.references : [];
  references.forEach((ref, i) => {
    for (const p of asPaths(ref?.path)) pushRef(out.paths, `references[${i}].path`, p);
  });
}

function extractVercel(doc, out) {
  for (const key of ['buildCommand', 'installCommand', 'devCommand']) {
    for (const c of asCommands(doc?.[key])) pushRef(out.commands, key, c);
  }
  const builds = Array.isArray(doc?.builds) ? doc.builds : [];
  builds.forEach((build, i) => {
    for (const p of asPaths(build?.src)) pushRef(out.paths, `builds[${i}].src`, p);
  });
}

function extractRailway(doc, out) {
  const spots = [
    ['build.buildCommand', doc?.build?.buildCommand],
    ['deploy.startCommand', doc?.deploy?.startCommand],
    ['deploy.preDeployCommand', doc?.deploy?.preDeployCommand],
  ];
  for (const [where, value] of spots) for (const c of asCommands(value)) pushRef(out.commands, where, c);
}

// components.json (shadcn/ui) — only the two files it actually reads.
function extractComponents(doc, out) {
  for (const key of ['config', 'css']) {
    for (const p of asPaths(doc?.tailwind?.[key])) pushRef(out.paths, `tailwind.${key}`, p);
  }
}

// A surface with no schema here contributes NOTHING: an unrecognized config
// cannot vouch, which keeps the failure direction safe (a stray is reported).
function schemaFor(rel) {
  const base = path.basename(rel);
  if (rel === '.replit') return extractReplit;
  if (rel.startsWith('.github/')) return extractGithubActions;
  if (/^(docker-)?compose([.-][\w-]+)?\.ya?ml$/.test(base)) return extractCompose;
  if (/^tsconfig(\..+)?\.json$/.test(base)) return extractTsconfig;
  if (base === 'vercel.json') return extractVercel;
  if (base === 'railway.json') return extractRailway;
  if (base === 'components.json') return extractComponents;
  return null;
}
// Heads that RUN a file argument rather than merely printing or moving it.
const JS_RUNTIMES = new Set(REPLIT_MODULE_POLICIES.find((policy) => policy.family === 'nodejs').runtimes);
const FILE_ARG_RUNTIMES = new Set(REPLIT_MODULE_POLICIES.flatMap((policy) => policy.runtimes));
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh']);
// Wrappers run ANOTHER command and say nothing themselves, so they are peeled
// off and the real head is judged: `env echo probe.mjs` is still just an echo.
const WRAPPERS = new Set(['env', 'exec', 'nohup', 'sudo', 'time', 'command', 'stdbuf', 'setsid']);
// Flags that take a file — honored ONLY for a head that actually reads a file
// that way. `-c` after `echo` is a word; `-c` after `eslint` is a config path.
const FILE_FLAGS = new Set(['--config', '--conf', '-c', '--require', '-r', '--import', '--loader', '--experimental-loader', '--project', '-p', '--file', '-f']);
const FILE_FLAG_HOSTS = new Set([
  ...JS_RUNTIMES,
  'eslint', 'prettier', 'tsc', 'vite', 'vitest', 'jest', 'mocha', 'playwright', 'tailwindcss',
  'postcss', 'drizzle-kit', 'esbuild', 'rollup', 'webpack', 'tsup', 'biome', 'stylelint',
  'concurrently', 'npm', 'pnpm', 'yarn',
]);

// Split a command on shell operators, honoring quotes so `echo "a && b"` stays
// one segment.
function splitCommandSegments(command) {
  const segments = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote) {
      cur += c;
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; cur += c; continue; }
    if (c === '\n' || c === ';' || c === '&' || c === '|') {
      if ((c === '&' || c === '|') && command[i + 1] === c) i++;
      segments.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  segments.push(cur);
  return segments.filter((s) => s.trim());
}

// Quote-aware word split: quotes are consumed, so `"probe.mjs"` is the token
// probe.mjs while `"echo probe.mjs"` stays ONE token (it is data, not a word).
function tokenizeCommand(segment) {
  const tokens = [];
  let cur = '';
  let quote = null;
  let quoted = false;
  for (let i = 0; i < segment.length; i++) {
    const c = segment[i];
    if (quote) {
      if (c === '\\' && quote === '"') { cur += segment[++i] ?? ''; continue; }
      if (c === quote) { quote = null; continue; }
      cur += c;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; quoted = true; continue; }
    if (/\s/.test(c)) {
      if (cur || quoted) { tokens.push(cur); cur = ''; quoted = false; }
      continue;
    }
    cur += c;
  }
  if (cur || quoted) tokens.push(cur);
  return tokens;
}

function tokenIsFile(token, name) {
  return token === name || token === `./${name}`;
}

// Does this command actually RUN the file? Interpretation is EXECUTABLE-AWARE:
// the same word is a file to `node` and plain text to `echo`, so the head
// decides. Evidence is the file being executed itself, handed to a runtime or
// shell, or given to a file-taking flag OF A TOOL THAT TAKES ONE. Anything else
// (echo, cat, git add, a log line, a display string) is not an invocation.
function referencesInvocation(command, name, depth = 0) {
  if (depth > 3) return false; // nested `sh -c` recursion guard
  for (const segment of splitCommandSegments(command)) {
    const tokens = tokenizeCommand(segment);
    let head = 0;
    // Step over `FOO=bar` prefixes and wrapper commands until the real head
    // appears; a wrapper's own flags (`env -i`, `-u NAME`) are not files.
    for (;;) {
      while (head < tokens.length && /^[A-Za-z_]\w*=/.test(tokens[head])) head++;
      if (head < tokens.length && WRAPPERS.has(path.basename(tokens[head]))) {
        head++;
        while (head < tokens.length && tokens[head].startsWith('-')) {
          if (tokens[head] === '-u' || tokens[head] === '--unset') head++; // takes a value
          head++;
        }
        continue;
      }
      break;
    }
    if (head >= tokens.length) continue;
    const exe = path.basename(tokens[head]);
    const isShell = SHELLS.has(exe);
    const runsFileArgs = FILE_ARG_RUNTIMES.has(exe) || isShell;
    const honorsFileFlags = FILE_FLAG_HOSTS.has(exe);
    for (let j = head; j < tokens.length; j++) {
      const token = tokens[j];
      // A shell's -c argument is SCRIPT TEXT, not a path: judge what it runs.
      if (isShell && /^-[a-z]*c$/.test(token) && tokens[j + 1] !== undefined) {
        if (referencesInvocation(tokens[j + 1], name, depth + 1)) return true;
        j++;
        continue;
      }
      if (tokenIsFile(token, name)) {
        if (j === head) return true; // ./probe.mjs — executed
        if (runsFileArgs) return true; // node probe.mjs
        if (honorsFileFlags && FILE_FLAGS.has(tokens[j - 1])) return true; // eslint --config probe.mjs
        continue;
      }
      const eq = token.indexOf('=');
      if (eq > 0 && honorsFileFlags && FILE_FLAGS.has(token.slice(0, eq)) && tokenIsFile(token.slice(eq + 1), name)) {
        return true; // --config=probe.mjs
      }
    }
  }
  return false;
}

function joinContinuations(text) {
  const out = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const start = i + 1;
    while (/\\\s*$/.test(line) && i + 1 < lines.length) {
      line = line.replace(/\\\s*$/, ' ') + lines[++i];
    }
    out.push({ line: start, text: line });
  }
  return out;
}

// Extract every command/path value a surface actually carries. A parse error is
// returned, never swallowed: a machine-readable config the gate cannot read is
// reported as a gate failure rather than silently re-scanned as raw text (which
// is how a malformed config could otherwise certify a dead script).
function extractSurfaceRefs(rel, content) {
  const out = { commands: [], paths: [], error: null };
  // Structured walks report a key path ("jobs.a.steps[0].run"); prefix the file
  // so a failure message says WHERE the evidence lives.
  const withFile = () => {
    for (const list of [out.commands, out.paths]) for (const item of list) item.where = `${rel} ${item.where}`;
    return out;
  };
  const ext = path.extname(rel);
  const base = path.basename(rel);
  const push = (list, where, text) => {
    if (typeof text === 'string' && text.trim()) list.push({ where, text });
  };

  if (ext === '.sh') {
    for (const { line, text } of joinContinuations(stripHashComments(content))) {
      push(out.commands, `${rel}:${line}`, text);
    }
    return out;
  }

  if (base === 'Dockerfile' || base.startsWith('Dockerfile.')) {
    for (const { line, text } of joinContinuations(stripHashComments(content))) {
      const m = /^\s*([A-Za-z]+)\s+(.*)$/.exec(text);
      if (!m) continue;
      const instruction = m[1].toUpperCase();
      let rest = m[2];
      if (instruction === 'RUN' || instruction === 'CMD' || instruction === 'ENTRYPOINT') {
        if (rest.trim().startsWith('[')) {
          try {
            const argv = JSON.parse(rest.trim());
            if (Array.isArray(argv)) rest = argv.join(' ');
          } catch {
            /* shell form with a bracket — keep the raw text */
          }
        }
        push(out.commands, `${rel}:${line} ${instruction}`, rest);
      } else if (instruction === 'COPY' || instruction === 'ADD') {
        // Only the SOURCE operands are files Docker reads out of the build
        // context. The last operand is the destination path inside the image —
        // `COPY app probe.mjs` writes TO probe.mjs and never reads the root
        // file, so treating every operand as a path is a bypass.
        let operands = tokenizeCommand(rest);
        const jsonForm = rest.trim().match(/\[[\s\S]*\]\s*$/);
        if (jsonForm) {
          try {
            const parsed = JSON.parse(jsonForm[0]);
            if (Array.isArray(parsed)) {
              operands = [...tokenizeCommand(rest.slice(0, jsonForm.index)), ...parsed.map(String)];
            }
          } catch {
            /* not exec form after all — keep the tokenized operands */
          }
        }
        const flags = operands.filter((t) => t.startsWith('--'));
        const args = operands.filter((t) => !t.startsWith('--'));
        // `--from=<stage|image>` sources live in another build stage or image,
        // not in this repository.
        if (!flags.some((f) => f.startsWith('--from='))) {
          for (const src of args.slice(0, -1)) push(out.paths, `${rel}:${line} ${instruction} source`, src);
        }
      }
    }
    return out;
  }

  // Structured formats: parse the WHOLE document, then read only the locations
  // that format's schema says are executed or loaded.
  const schema = schemaFor(rel);
  if (!schema) return out; // no schema → nothing here can vouch

  if (rel === '.replit' || ext === '.toml') {
    try {
      schema(toml.parse(content), out);
    } catch (err) {
      out.error = `unparseable TOML (${err.message.split('\n')[0]})`;
      out.commands.length = 0;
      out.paths.length = 0;
    }
    return withFile();
  }

  if (ext === '.json') {
    const { config, error } = ts.parseConfigFileTextToJson(rel, content);
    if (error || config === undefined || config === null) {
      out.error = `unparseable JSON (${error ? ts.flattenDiagnosticMessageText(error.messageText, ' ') : 'empty'})`;
      return out;
    }
    schema(config, out);
    return withFile();
  }

  if (ext === '.yml' || ext === '.yaml') {
    try {
      for (const doc of yaml.loadAll(content)) schema(doc, out);
    } catch (err) {
      // Multi-document YAML can throw after a document has been walked; drop
      // whatever was collected so a broken file contributes exactly nothing.
      out.error = `unparseable YAML (${err.message.split('\n')[0]})`;
      out.commands.length = 0;
      out.paths.length = 0;
    }
    return withFile();
  }

  return out;
}

function surfaceKind(rel) {
  if (rel === '.replit') return 'workflow';
  return 'tooling';
}

// ---------------------------------------------------------------------------
// package.json — read field by field, never as a blob of text.
// ---------------------------------------------------------------------------
// "scripts" is handled separately (kind npm-script). These are the remaining
// fields whose values are, by npm's own semantics, paths to files that get run
// or loaded. Everything else in the manifest — description, keywords, author,
// repository, dependency names — is metadata: a filename sitting there is a
// mention, not a reference, and must not keep a root script alive.
// `config` and `workspaces` are deliberately absent: npm's `config` is
// arbitrary key/value metadata surfaced as npm_package_config_* env vars, not a
// file npm loads, and `workspaces` names package directories. Neither can make
// a root script live.
const PKG_REFERENCE_FIELDS = ['main', 'module', 'browser', 'types', 'typings', 'bin', 'exports', 'imports', 'files', 'unpkg', 'jsdelivr'];

function packageFieldRefs(pkg) {
  const refs = [];
  const visit = (node, field) => {
    if (typeof node === 'string') refs.push({ field, text: node });
    else if (Array.isArray(node)) node.forEach((v, i) => visit(v, `${field}[${i}]`));
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) visit(v, `${field}.${k}`);
  };
  for (const field of PKG_REFERENCE_FIELDS) {
    if (pkg?.[field] !== undefined) visit(pkg[field], field);
  }
  return refs;
}

// ---------------------------------------------------------------------------
// Import edges into the root — TOKENIZED, never pattern-matched.
// ---------------------------------------------------------------------------
// ts.preProcessFile runs the real TypeScript scanner over the source and
// returns only genuine module specifiers (static import/export-from, bare
// `import "x"`, dynamic import(), and require() with JS detection on). Because
// the scanner tokenizes, a specifier that merely appears INSIDE a string or
// template literal — `const example = 'import "./probe.mjs"'` — is a string
// token, not an import, and produces no edge. Comments are likewise consumed as
// trivia, so a commented-out import cannot keep a root script alive.
function extractRelativeSpecifiers(source) {
  const { importedFiles } = ts.preProcessFile(source, /* readImportFiles */ true, /* detectJavaScriptImports */ true);
  const specs = new Set();
  for (const { fileName } of importedFiles) {
    if (fileName.startsWith('./') || fileName.startsWith('../')) specs.add(fileName);
  }
  return [...specs];
}

// Which root file (bare name) does this relative specifier resolve to, if any?
// Handles extensionless specifiers and NodeNext-style ".js" specifiers that
// point at a .ts source (server/vite-dev.ts imports "../vite.config").
function resolveRootTarget(spec, importerAbs, rootFileNames) {
  const base = path.resolve(path.dirname(importerAbs), spec);
  const relBase = path.relative(ROOT, base).replaceAll(path.sep, '/');
  const parent = path.posix.dirname(relBase);
  if (parent !== '.' && parent !== ACTIVE_SCRIPT_DIR) return null;
  if (isArchivePath(relBase)) return null;
  const stem = path.posix.basename(relBase);
  const stemExt = path.extname(stem);
  const prefix = parent === '.' ? '' : `${parent}/`;
  const candidates = !stemExt || CODE_EXTS.includes(stemExt) ? [`${prefix}${stem}`] : [];
  const swap = stem.match(/^(.*)\.(js|jsx|mjs|cjs)$/);
  if (swap) {
    candidates.push(`${prefix}${swap[1]}.ts`, `${prefix}${swap[1]}.tsx`);
  }
  for (const ext of CODE_EXTS) candidates.push(`${prefix}${stem}${ext}`);
  for (const cand of candidates) if (rootFileNames.has(cand)) return cand;
  return null;
}

// ---------------------------------------------------------------------------
// Classification — pure, so the canaries exercise the real decision path.
// surfaces:    [{ rel, kind, commands, paths }] parsed run-this/load-this values
// importedBy:  Map<rootFileName, importerRel>       edges from execution trees
// rootEdges:   Map<rootFileName, Set<rootFileName>> edges from other root files
// deps:        Set<string> of declared package names
// ---------------------------------------------------------------------------
function directEvidence(name, { surfaces, importedBy, deps, npmScripts, pkgFields, manualRunbooks = MANUAL_RUNBOOK_MANIFEST }) {
  const config = ROOT_CONFIG_MANIFEST.find((e) => e.file === name);
  if (config && deps.has(config.pkg)) {
    return { kind: 'recognized-config', where: `${config.pkg} — ${config.note}` };
  }

  const manual = manualRunbooks.find((e) => e.file === name);
  if (manual && typeof manual.note === 'string' && manual.note.trim()) {
    return { kind: 'manual-runbook', where: manual.note.trim() };
  }

  for (const [scriptName, command] of npmScripts) {
    if (referencesInvocation(command, name)) {
      return { kind: 'npm-script', where: `package.json scripts.${scriptName} → ${command.trim()}` };
    }
  }

  for (const { field, text } of pkgFields ?? []) {
    if (referencesName(text, name)) {
      return { kind: 'package-manifest', where: `package.json ${field} → ${text}` };
    }
  }

  const importer = importedBy.get(name);
  if (importer) return { kind: 'import', where: `imported by ${importer}` };

  for (const surface of surfaces) {
    // A command must RUN it; a path value must BE it. Neither is "the name
    // appears in this file somewhere".
    const shown = (text) => {
      const flat = text.trim().replace(/\s+/g, ' ');
      return flat.length > 100 ? `${flat.slice(0, 97)}…` : flat;
    };
    for (const command of surface.commands ?? []) {
      if (referencesInvocation(command.text, name)) {
        return { kind: surface.kind, where: `${command.where} → ${shown(command.text)}` };
      }
    }
    for (const target of surface.paths ?? []) {
      if (referencesName(target.text, name)) {
        return { kind: surface.kind, where: `${target.where} → ${shown(target.text)}` };
      }
    }
  }

  if (config) {
    return {
      kind: 'stray',
      why: `pinned in ROOT_CONFIG_MANIFEST as a config for "${config.pkg}", but "${config.pkg}" is no longer a declared dependency`,
    };
  }
  if (manual) {
    return {
      kind: 'stray',
      why: 'listed in MANUAL_RUNBOOK_MANIFEST without a documented non-empty reason',
    };
  }
  return { kind: 'stray', why: null };
}

// Candidate→candidate import edges are resolved by reachability, never by
// mutual assent: an edge only counts once its SOURCE is known-alive, so a cycle
// of otherwise unreferenced scripts stays stray no matter how they import each
// other.
function classifyAll(names, ctx) {
  const results = new Map(names.map((name) => [name, directEvidence(name, ctx)]));
  const rootEdges = ctx.rootEdges ?? new Map();
  for (let changed = true; changed; ) {
    changed = false;
    for (const name of names) {
      if (results.get(name).kind !== 'stray') continue;
      for (const importer of rootEdges.get(name) ?? []) {
        const source = results.get(importer);
        if (!source || source.kind === 'stray') continue;
        results.set(name, { kind: 'import', where: `imported by ${importer} (itself reachable: ${source.kind})` });
        changed = true;
        break;
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Collection.
// ---------------------------------------------------------------------------
function* walk(dir, exts) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') continue;
    if (entry.name.startsWith('.')) continue; // .cache, .git, … (top-level .github is passed in explicitly)
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).replaceAll(path.sep, '/');
    if (isArchivePath(rel)) continue;
    if (entry.isDirectory()) yield* walk(full, exts);
    else if (exts.has(path.extname(entry.name))) yield full;
  }
}

function rootCodeFiles() {
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => CHECKED_EXTS.has(path.extname(n)) && !n.endsWith('.d.ts'))
    .sort();
}

function trackedExtensionlessShebangFiles() {
  const tracked = spawnSync('git', ['-C', ROOT, 'ls-files', '--cached', '-z'], { encoding: 'utf8' });
  if (tracked.error || tracked.status !== 0) return [];
  return tracked.stdout
    .split('\0')
    .filter((name) => name && !name.includes('/') && path.extname(name) === '')
    .filter((name) => {
      try {
        return recognizedShebangInterpreter(fs.readFileSync(path.join(ROOT, name), 'utf8')) !== null;
      } catch {
        return false;
      }
    })
    .sort();
}

function activeScriptFiles() {
  const dir = path.join(ROOT, ACTIVE_SCRIPT_DIR);
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => CHECKED_EXTS.has(path.extname(n)) && !n.endsWith('.d.ts'))
    .map((n) => `${ACTIVE_SCRIPT_DIR}/${n}`)
    .sort();
}

// Files git already ignores never enter the repository, so they cannot "pile
// up" in it. If git is unavailable the set is empty — the stricter direction.
function gitIgnoredNames(names) {
  if (!names.length) return new Set();
  const res = spawnSync('git', ['-C', ROOT, 'check-ignore', '--stdin'], { input: names.join('\n'), encoding: 'utf8' });
  if (res.error || res.status === null || res.status > 1) return new Set();
  return new Set(res.stdout.split('\n').map((s) => s.trim()).filter(Boolean));
}

function collect(candidateNames) {
  const surfaces = [];
  const parseFailures = []; // a surface the gate cannot read is a gate failure
  const importedBy = new Map(); // edges from the execution trees
  const rootEdges = new Map(); // edges from other root files (honored transitively)
  const absToRel = (abs) => path.relative(ROOT, abs).replaceAll(path.sep, '/');

  // (a) Command surfaces — the only places where naming a file IS a reference.
  //     Note this gate itself is scripts/validation/*.mjs, i.e. NOT a surface:
  //     it spells every manifest filename out, and code text never vouches.
  const surfaceAbs = [];
  for (const dir of [...COMMAND_SURFACE_DIRS, ...SHELL_ONLY_DIRS]) {
    const full = path.join(ROOT, dir);
    if (fs.existsSync(full)) surfaceAbs.push(...walk(full, COMMAND_SURFACE_EXTS));
  }
  for (const name of ROOT_SURFACE_FILES) {
    const full = path.join(ROOT, name);
    if (fs.existsSync(full)) surfaceAbs.push(full);
  }
  for (const abs of surfaceAbs) {
    const rel = absToRel(abs);
    if (!isCommandSurface(rel)) continue; // e.g. scripts/**: shell scripts only
    let raw;
    try {
      raw = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    const refs = extractSurfaceRefs(rel, raw);
    if (refs.error) parseFailures.push({ rel, error: refs.error });
    surfaces.push({ rel, kind: surfaceKind(rel), commands: refs.commands, paths: refs.paths });
  }

  // (b) Import edges — parsed, resolved, comment-free. Source text is searched
  //     for import specifiers and nothing else.
  const codeAbs = [];
  for (const dir of IMPORT_TREE_DIRS) {
    const full = path.join(ROOT, dir);
    if (fs.existsSync(full)) codeAbs.push(...walk(full, new Set(CODE_EXTS)));
  }
  const candidateAbs = [...candidateNames].map((name) => path.join(ROOT, name));
  for (const abs of new Set([...codeAbs, ...candidateAbs])) {
    let raw;
    try {
      raw = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    const rel = absToRel(abs);
    const self = rel;
    const isCandidate = candidateNames.has(self);
    for (const spec of extractRelativeSpecifiers(raw)) {
      const target = resolveRootTarget(spec, abs, candidateNames);
      if (!target || target === self) continue;
      if (isCandidate) {
        if (!rootEdges.has(target)) rootEdges.set(target, new Set());
        rootEdges.get(target).add(self);
      } else if (!importedBy.has(target)) {
        importedBy.set(target, rel);
      }
    }
  }
  return { surfaces, parseFailures, importedBy, rootEdges, codeCount: codeAbs.length };
}

function readPackageJson() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const deps = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ]);
  const npmScripts = Object.entries(pkg.scripts ?? {});
  return { deps, npmScripts, pkgFields: packageFieldRefs(pkg) };
}

// ---------------------------------------------------------------------------
// Canaries — fail loudly if matching, stripping, resolution, or the manifest
// condition regress.
// ---------------------------------------------------------------------------
function runCanaries() {
  const eq = (a, b, what) => {
    const ja = JSON.stringify(a), jb = JSON.stringify(b);
    if (ja !== jb) throw new Error(`canary: ${what} → ${ja}, expected ${jb}`);
  };

  // Reference matching, including the near-miss cases.
  eq(referencesName('node probe.mjs', 'probe.mjs'), true, 'bare name in a command');
  eq(referencesName('args = "node ./probe.mjs --check"', 'probe.mjs'), true, './-prefixed name');
  eq(referencesName('"scripts": { "x": "node probe.mjs" }', 'probe.mjs'), true, 'name inside JSON');
  eq(referencesName('node scripts/probe.mjs', 'probe.mjs'), false, 'same name under scripts/ is a DIFFERENT file');
  eq(referencesName('node ./scripts/probe.mjs', 'probe.mjs'), false, 'nested ./scripts/ path is a different file');
  eq(referencesName('node other-probe.mjs', 'probe.mjs'), false, 'suffix near-miss does not count');
  eq(referencesName('node probe.mjs.bak', 'probe.mjs'), false, 'extended name does not count');
  eq(referencesName('cp probe.mjs /tmp; node probe.mjs', 'probe.mjs'), true, 'name followed by punctuation');

  // Invocation matching: naming a file is not running it.
  const runs = (command, name = 'probe.mjs') => referencesInvocation(command, name);
  eq(runs('node probe.mjs'), true, 'node probe.mjs runs it');
  eq(runs('node --experimental-strip-types ./probe.mjs --check'), true, 'runtime flags do not hide the file');
  eq(runs('NODE_ENV=production npx tsx probe.mjs'), true, 'env prefixes and npx are handled');
  eq(runs('./probe.mjs'), true, 'executing it directly counts');
  eq(runs('vitest run --config probe.mjs'), true, 'a file-taking flag counts');
  eq(runs('vitest run --config=./probe.mjs'), true, 'the --flag=value form counts');
  eq(runs('npm test && node probe.mjs'), true, 'a later segment still counts');
  eq(runs('echo probe.mjs'), false, 'echoing the name runs nothing');
  eq(runs('git add probe.mjs'), false, 'staging the file is not running it');
  eq(runs('echo "see probe.mjs for details"'), false, 'a quoted sentence is data, not a command');
  eq(runs('cat notes && echo probe.mjs'), false, 'echo stays echo in a later segment');
  eq(runs('node scripts/probe.mjs'), false, 'a scripts/ namesake is a different file');
  // Interpretation is executable-aware: a wrapper must be peeled off to reach
  // the REAL command, and a file flag only counts for a tool that reads a file
  // that way — otherwise `env echo x` and `echo -c x` certify a dead script.
  eq(runs('env echo probe.mjs'), false, 'a wrapper does not turn echo into an invocation');
  eq(runs('env -i FOO=bar echo probe.mjs'), false, 'wrapper flags and assignments do not change that');
  eq(runs('sudo -E time echo probe.mjs'), false, 'stacked wrappers still resolve to echo');
  eq(runs('env NODE_ENV=production node probe.mjs'), true, 'unwrapping still finds a real runtime behind it');
  eq(runs('time node probe.mjs'), true, 'and behind a timing wrapper');
  eq(runs('echo -c probe.mjs'), false, 'a config flag means nothing to echo');
  eq(runs('git commit -f probe.mjs'), false, 'nor a -f to git');
  eq(runs('cat -p probe.mjs'), false, 'nor a -p to cat');
  eq(runs('eslint --config probe.mjs'), true, 'but it does to a tool that loads a config');
  eq(runs('bash -c "node probe.mjs"'), true, 'a shell -c script is judged by what it runs');
  eq(runs('bash -c "echo probe.mjs"'), false, 'so an echo inside -c is still an echo');
  eq(runs('bash -lc "cd app && node probe.mjs"'), true, 'including combined shell flags');
  eq(runs('bash probe.mjs'), true, 'a shell handed the file runs it');
  eq(runs('python probe.py', 'probe.py'), true, 'python runs a Python script');
  eq(runs('python3 ./probe.py', 'probe.py'), true, 'python3 runs a Python script');

  // Tracked extensionless root files only become candidates when their first
  // line names an interpreter this gate understands.
  eq(recognizedShebangInterpreter('#!/usr/bin/env node\nconsole.log("x")'), 'node', 'env node shebang is recognized');
  eq(recognizedShebangInterpreter('#!/usr/bin/env -S python3 -u\nprint("x")'), 'python3', 'env split-string Python shebang is recognized');
  eq(recognizedShebangInterpreter('#!/bin/bash\nset -e'), 'bash', 'direct shell shebang is recognized');
  eq(recognizedShebangInterpreter('#!/usr/bin/ruby\nputs "x"'), null, 'unknown interpreter shebang is not guessed');
  eq(recognizedShebangInterpreter('extensionless data\n#!/usr/bin/env node'), null, 'a later shebang does not make data executable');

  // Hash comments — whole-line AND inline — must not keep a file alive, on
  // every surface that has them (shell, TOML/.replit, Dockerfile).
  const kindsOf = (rel, text) => {
    const refs = extractSurfaceRefs(rel, text);
    if (refs.error) return `error: ${refs.error}`;
    return (
      refs.commands.some((c) => referencesInvocation(c.text, 'probe.mjs')) ||
      refs.paths.some((p) => referencesName(p.text, 'probe.mjs'))
    );
  };
  eq(kindsOf('scripts/x.sh', '# run: node probe.mjs'), false, 'whole-line shell comment stripped');
  eq(kindsOf('scripts/x.sh', 'npm test   # then: node probe.mjs'), false, 'INLINE shell comment stripped');
  eq(kindsOf('.replit', 'run = "npm run check"  # was: node probe.mjs'), false, 'inline TOML comment stripped');
  eq(kindsOf('Dockerfile', '# COPY probe.mjs ./'), false, 'commented-out Dockerfile COPY stripped');
  eq(kindsOf('Dockerfile', 'COPY app ./  # COPY probe.mjs ./'), false, 'inline Dockerfile comment stripped');
  // …while real commands survive the stripper.
  eq(kindsOf('Dockerfile', 'COPY probe.mjs ./'), true, 'live Dockerfile COPY still counts');
  eq(kindsOf('.replit', 'run = "node probe.mjs"  # trailing note'), true, 'command before an inline comment survives');
  eq(kindsOf('scripts/x.sh', 'curl https://x.dev/#anchor && node probe.mjs'), true, 'a # inside a URL is not a comment');

  // Surfaces are parsed field by field: only run-this/load-this values vouch.
  eq(kindsOf('.replit', 'run = "npm run dev"\n[[workflows.workflow]]\nname = "probe.mjs"\nauthor = 12345\n'), false, 'a .replit workflow display NAME vouches for nothing');
  eq(kindsOf('.replit', '[[workflows.workflow.tasks]]\ntask = "shell.exec"\nargs = "node probe.mjs"\n'), true, 'a .replit shell.exec args line counts');
  eq(kindsOf('.replit', '[deployment]\nbuild = ["bash", "probe.mjs"]\n'), true, 'a .replit array command counts');
  eq(kindsOf('.replit', '[postMerge]\npath = "probe.mjs"\n'), true, 'a .replit postMerge path counts');
  eq(kindsOf('.github/workflows/ci.yml', 'name: probe.mjs\njobs:\n  a:\n    steps:\n      - name: probe.mjs\n        run: npm test\n'), false, 'CI display names vouch for nothing');
  eq(kindsOf('.github/workflows/ci.yml', 'jobs:\n  a:\n    steps:\n      - run: |\n          npm ci\n          node probe.mjs\n'), true, 'a CI run: step counts');
  eq(kindsOf('.github/workflows/ci.yml', 'jobs:\n  a:\n    steps:\n      - run: echo probe.mjs\n'), false, 'an echo inside a CI step is not an invocation');
  eq(kindsOf('.github/workflows/ci.yml', 'jobs:\n  a:\n    steps:\n      - uses: ./probe.mjs\n'), true, 'a local action path counts');
  eq(kindsOf('Dockerfile', 'LABEL note="probe.mjs"\nENV SCRIPT=probe.mjs\n'), false, 'Docker metadata vouches for nothing');
  eq(kindsOf('Dockerfile', 'CMD ["node", "probe.mjs"]'), true, 'exec-form CMD counts');
  // COPY/ADD: the last operand is the DESTINATION inside the image, never a
  // file Docker reads from the repo, and --from= sources come from elsewhere.
  eq(kindsOf('Dockerfile', 'COPY app probe.mjs'), false, 'a COPY destination vouches for nothing');
  eq(kindsOf('Dockerfile', 'COPY app /probe.mjs'), false, 'nor an absolute COPY destination');
  eq(kindsOf('Dockerfile', 'COPY ["app", "probe.mjs"]'), false, 'nor an exec-form COPY destination');
  eq(kindsOf('Dockerfile', 'COPY --chown=node:node app probe.mjs'), false, 'nor a destination after a flag');
  eq(kindsOf('Dockerfile', 'ADD app probe.mjs'), false, 'nor an ADD destination');
  eq(kindsOf('Dockerfile', 'COPY --from=builder /app/probe.mjs ./'), false, 'nor a source copied out of another stage');
  eq(kindsOf('Dockerfile', 'COPY --chown=node:node probe.mjs ./app/'), true, 'a real source after a flag counts');
  eq(kindsOf('Dockerfile', 'COPY other.mjs probe.mjs /app/'), true, 'a source among several counts');
  eq(kindsOf('Dockerfile', 'COPY ["probe.mjs", "/app/"]'), true, 'an exec-form COPY source counts');
  eq(kindsOf('Dockerfile', 'RUN echo probe.mjs > /tmp/x'), false, 'echo inside RUN is not an invocation');
  eq(kindsOf('docker-compose.yml', 'services:\n  web:\n    container_name: probe.mjs\n    image: node\n'), false, 'an arbitrary compose value vouches for nothing');
  eq(kindsOf('docker-compose.yml', 'services:\n  web:\n    command: node probe.mjs\n'), true, 'a compose command counts');

  // A key NAME is not evidence; its POSITION in the schema is. These all spell
  // a runnable-looking value under a key called run/command/script/path, in a
  // place the format never executes or loads — env blocks, `with:` inputs,
  // top-level metadata, a non-shell workflow task.
  eq(kindsOf('.github/workflows/ci.yml', 'env:\n  command: node probe.mjs\njobs:\n  a:\n    steps:\n      - run: npm test\n'), false, 'a top-level CI env var named command runs nothing');
  eq(kindsOf('.github/workflows/ci.yml', 'jobs:\n  a:\n    env:\n      run: node probe.mjs\n    steps:\n      - run: npm test\n'), false, 'nor a job-level env var named run');
  eq(kindsOf('.github/workflows/ci.yml', 'jobs:\n  a:\n    steps:\n      - env:\n          script: node probe.mjs\n        run: npm test\n'), false, 'nor a step env var named script');
  eq(kindsOf('.github/workflows/ci.yml', 'jobs:\n  a:\n    steps:\n      - uses: actions/x@v4\n        with:\n          command: node probe.mjs\n          path: probe.mjs\n'), false, 'nor a `with:` input of a marketplace action');
  eq(kindsOf('.github/workflows/ci.yml', 'jobs:\n  a:\n    steps:\n      - uses: actions/checkout@v4\n        path: probe.mjs\n'), false, 'nor an arbitrary key beside a marketplace uses');
  eq(kindsOf('docker-compose.yml', 'services:\n  web:\n    environment:\n      command: node probe.mjs\n    labels:\n      script: probe.mjs\n'), false, 'nor a compose environment/label entry');
  eq(kindsOf('.replit', '[env]\nrun = "node probe.mjs"\n'), false, 'nor a .replit env value named run');
  eq(kindsOf('.replit', '[[workflows.workflow.tasks]]\ntask = "packager.installForAll"\nargs = "node probe.mjs"\n'), false, 'nor a non-shell workflow task argument');
  eq(kindsOf('vercel.json', '{ "env": { "src": "probe.mjs" }, "github": { "path": "probe.mjs" } }'), false, 'nor a vercel env/metadata value');
  eq(kindsOf('components.json', '{ "aliases": { "config": "probe.mjs" } }'), false, 'nor a components.json alias');
  eq(kindsOf('tsconfig.json', '{ "compilerOptions": { "paths": { "@/x": ["probe.mjs"] } }, "exclude": ["probe.mjs"] }'), false, 'nor a tsconfig path alias or exclude');
  // …while the documented load-bearing locations of the same files do count.
  eq(kindsOf('vercel.json', '{ "builds": [{ "src": "probe.mjs" }], "buildCommand": "npm run build" }'), true, 'a vercel build src counts');
  eq(kindsOf('railway.json', '{ "deploy": { "startCommand": "node probe.mjs" } }'), true, 'a railway startCommand counts');
  eq(kindsOf('components.json', '{ "tailwind": { "config": "probe.mjs" } }'), true, 'the tailwind config components.json names counts');
  eq(kindsOf('tsconfig.json', '{ "files": ["probe.mjs"] }'), true, 'a tsconfig files[] entry counts');
  eq(kindsOf('.github/actions/x/action.yml', 'runs:\n  using: node20\n  main: probe.mjs\n'), true, 'a JS action entry file counts');

  // Unreadable machine-readable surfaces fail loudly; they never fall back to
  // raw text, where a stray name would look like a reference.
  const badJson = extractSurfaceRefs('vercel.json', '{ "src": "probe.mjs" ');
  eq(badJson.error !== null, true, 'malformed JSON is reported as a parse failure');
  eq([badJson.commands.length, badJson.paths.length], [0, 0], 'malformed JSON contributes no reference');
  const badYaml = extractSurfaceRefs('.github/workflows/ci.yml', 'jobs:\n  a:\n   - run: node probe.mjs\n  a: [oops\n');
  eq(badYaml.error !== null, true, 'malformed YAML is reported as a parse failure');
  eq([badYaml.commands.length, badYaml.paths.length], [0, 0], 'malformed YAML contributes no reference');
  // …including TOML, which a line scanner would happily read a live-looking
  // `args =` line out of even when the document as a whole is not TOML.
  const badToml = extractSurfaceRefs('.replit', 'this is not toml\nargs = "node probe.mjs"\n');
  eq(badToml.error !== null, true, 'malformed .replit is reported as a parse failure');
  eq([badToml.commands.length, badToml.paths.length], [0, 0], 'malformed .replit contributes no reference');
  eq(String(kindsOf('.replit', '[[workflows.workflow\nargs = "node probe.mjs"\n')).startsWith('error: unparseable TOML'), true, 'an unclosed table header fails instead of vouching');

  // Import edges come from the TypeScript scanner, so only REAL imports count.
  const specs = (src) => extractRelativeSpecifiers(src);
  eq(specs('import "./probe.mjs";'), ['./probe.mjs'], 'bare import is an edge');
  eq(specs('import x from "../probe.mjs";'), ['../probe.mjs'], 'default import is an edge');
  eq(specs('export { a } from "./probe.mjs";'), ['./probe.mjs'], 'export-from is an edge');
  eq(specs('const m = require("./probe.mjs");'), ['./probe.mjs'], 'require is an edge');
  eq(specs('await import("./probe.mjs");'), ['./probe.mjs'], 'dynamic import is an edge');
  eq(specs(`const example = 'import "./probe.mjs"';`), [], 'an import inside a STRING is not an edge');
  eq(specs('const t = `import "./probe.mjs"`;'), [], 'an import inside a TEMPLATE literal is not an edge');
  eq(specs('const doc = "run node ./probe.mjs first";'), [], 'a plain string naming the file is not an edge');
  eq(specs('// import "./probe.mjs";'), [], 'a commented-out import is not an edge');
  eq(specs('/* import "./probe.mjs"; */'), [], 'a block-commented import is not an edge');
  eq(specs('import "./other.mjs";'), ['./other.mjs'], 'a different specifier is reported as itself');

  // What may vouch at all. Prose is not a surface; neither are CSS/HTML (whose
  // comments this gate does not parse) nor source files (whose text is only
  // ever read for import specifiers).
  eq(isCommandSurface('README.md'), false, 'markdown is not a reference surface');
  eq(isCommandSurface('docs/AUDIT.md'), false, 'docs/ is not a reference surface');
  eq(isCommandSurface('client/src/index.css'), false, 'CSS is not a reference surface');
  eq(isCommandSurface('client/index.html'), false, 'HTML is not a reference surface');
  eq(isCommandSurface('client/src/lib/utils.ts'), false, 'source text is not a reference surface');
  eq(isCommandSurface('scripts/validation/root-script-drift.mjs'), false, 'a .mjs under scripts/ is not a reference surface');
  eq(isCommandSurface('scripts/pre-publish-gate.sh'), true, 'shell scripts run things, so they are surfaces');
  eq(isCommandSurface('.github/workflows/ci.yml'), true, 'CI workflows are surfaces');
  eq(isCommandSurface('package.json'), false, 'package.json is parsed structurally, never searched as text');
  eq(isCommandSurface('.replit'), true, '.replit is a surface');

  // Relative import resolution into the root (incl. extensionless + NodeNext).
  const rootNames = new Set(['vite.config.ts', 'probe.mjs', 'thing.ts']);
  const importer = path.join(ROOT, 'server', 'vite-dev.ts');
  eq(resolveRootTarget('../vite.config', importer, rootNames), 'vite.config.ts', 'extensionless root import resolves');
  eq(resolveRootTarget('../thing.js', importer, rootNames), 'thing.ts', 'NodeNext .js specifier resolves to the .ts source');
  eq(resolveRootTarget('../probe.mjs', importer, rootNames), 'probe.mjs', 'exact root import resolves');
  eq(resolveRootTarget('./storage', importer, rootNames), null, 'sibling import is not a root import');
  eq(resolveRootTarget('../shared/schema', importer, rootNames), null, 'import into another dir is not a root import');
  const nonCodeRootNames = new Set(['probe.py', 'probe.sh']);
  eq(resolveRootTarget('../probe', importer, nonCodeRootNames), null, 'an extensionless JS import cannot resolve a Python or shell script');
  eq(resolveRootTarget('../probe.py', importer, nonCodeRootNames), null, 'an explicit non-JS import cannot resolve a Python script');
  const scriptNames = new Set(['scripts/probe.mjs', 'scripts/thing.ts']);
  const scriptImporter = path.join(ROOT, 'scripts', 'validation', 'probe.mjs');
  eq(resolveRootTarget('../probe.mjs', scriptImporter, scriptNames), 'scripts/probe.mjs', 'a validation import resolves to an active script');
  eq(resolveRootTarget('../scripts/probe.mjs', importer, scriptNames), 'scripts/probe.mjs', 'a source-tree import resolves to an active script');
  eq(resolveRootTarget('../archive/probe.mjs', scriptImporter, new Set(['scripts/archive/probe.mjs'])), null, 'archive scripts never resolve as active scripts');

  // End-to-end classification against synthetic surfaces.
  const ctx = (over = {}) => ({
    surfaces: [],
    importedBy: new Map(),
    rootEdges: new Map(),
    deps: new Set(['eslint', 'postcss', 'vite', 'vitest', '@playwright/test', 'drizzle-kit', 'tailwindcss']),
    npmScripts: [],
    ...over,
  });
  const kindOf = (name, over) => classifyAll([name], ctx(over)).get(name).kind;
  eq(kindOf('probe.mjs'), 'stray', 'unreferenced root script is stray');
  eq(kindOf('probe.mjs', { npmScripts: [['probe', 'node probe.mjs']] }), 'npm-script', 'npm-script reference keeps it');
  eq(kindOf('probe.sh'), 'stray', 'unreferenced root shell script is stray');
  eq(kindOf('probe.py'), 'stray', 'unreferenced root Python script is stray');
  const surfaceOf = (rel, text) => ({ surfaces: [{ rel, kind: surfaceKind(rel), ...extractSurfaceRefs(rel, text) }] });
  eq(kindOf('probe.mjs', surfaceOf('.replit', '[[workflows.workflow.tasks]]\ntask = "shell.exec"\nargs = "node probe.mjs"\n')), 'workflow', 'workflow reference keeps it');
  eq(kindOf('probe.sh', surfaceOf('.replit', '[[workflows.workflow.tasks]]\ntask = "shell.exec"\nargs = "bash probe.sh"\n')), 'workflow', 'workflow reference keeps a root shell script');
  eq(kindOf('probe.py', { npmScripts: [['probe', 'python probe.py']] }), 'npm-script', 'a Python npm script keeps it');
  eq(kindOf('probe.py', surfaceOf('.replit', '[[workflows.workflow.tasks]]\ntask = "shell.exec"\nargs = "python3 probe.py"\n')), 'workflow', 'a Python workflow keeps it');
  eq(kindOf('probe.py', surfaceOf('Dockerfile', 'COPY probe.py ./')), 'tooling', 'Dockerfile reference keeps a root Python script');
  eq(kindOf('probe'), 'stray', 'unreferenced extensionless shebang candidate is stray');
  eq(kindOf('probe', { npmScripts: [['probe', './probe']] }), 'npm-script', 'direct command keeps an extensionless shebang candidate');
  eq(kindOf('probe', { pkgFields: packageFieldRefs({ bin: { probe: './probe' } }) }), 'package-manifest', 'machine-readable path keeps an extensionless shebang candidate');

  // Every enabled .replit module family must have an explicit policy. The
  // interpreter policies also carry both sides of the extension contract:
  // an unreferenced file is stray, while a machine-readable command reference
  // keeps that same extension alive.
  const currentModules = parseReplitModules('modules = ["nodejs-20", "web", "python-3.11", "postgresql-16"]');
  eq(currentModules.error, null, 'the .replit module canary parses');
  eq(validateReplitModuleCoverage(currentModules.modules).error, null, 'current .replit modules have explicit policies');
  eq(validateReplitModuleCoverage([...currentModules.modules, 'ruby-3.3']).error !== null, true, 'a new interpreter requires an explicit policy');
  for (const policy of REPLIT_MODULE_POLICIES) {
    if (!policy.canary) continue;
    const { file, runtime } = policy.canary;
    eq(policy.extensions.includes(path.extname(file)), true, `${policy.family} policy covers its canary extension`);
    eq(kindOf(file), 'stray', `${policy.family} canary file is stray when unreferenced`);
    eq(
      kindOf(file, { npmScripts: [['runtime-canary', `${runtime} ${file}`]] }),
      'npm-script',
      `${policy.family} canary file is kept by a machine-readable command`,
    );
  }

  eq(kindOf('probe.mjs', surfaceOf('.replit', 'name = "probe.mjs"')), 'stray', 'a workflow display name does not keep it');
  eq(kindOf('probe.mjs', surfaceOf('.replit', 'this is not toml\nargs = "node probe.mjs"\n')), 'stray', 'a corrupt .replit cannot keep a root script alive');
  eq(kindOf('probe.mjs', { importedBy: new Map([['probe.mjs', 'server/index.ts']]) }), 'import', 'import edge from an execution tree keeps it');
  eq(kindOf('probe.mjs', surfaceOf('.github/workflows/test.yml', 'jobs:\n  a:\n    steps:\n      - run: node probe.mjs\n')), 'tooling', 'CI reference keeps it');
  eq(kindOf('probe.mjs', surfaceOf('.github/workflows/test.yml', 'jobs:\n  a:\n    steps:\n      - name: node probe.mjs\n        run: npm test\n')), 'stray', 'a CI step title does not keep it');
  eq(kindOf('probe.mjs', { npmScripts: [['other', 'node scripts/probe.mjs']] }), 'stray', 'a scripts/ namesake does not rescue the root copy');
  eq(referencesName('node scripts/probe.mjs', 'scripts/probe.mjs'), true, 'active script path is matched');
  eq(referencesName('node scripts/probe.mjs.bak', 'scripts/probe.mjs'), false, 'active script suffix near-miss does not count');
  eq(runs('node scripts/probe.mjs', 'scripts/probe.mjs'), true, 'node runs an active script path');
  eq(runs('node scripts/other.mjs', 'scripts/probe.mjs'), false, 'another active script path does not count');
  eq(kindOf('scripts/probe.mjs'), 'stray', 'an unreferenced active script is stray');
  eq(kindOf('scripts/probe.mjs', { npmScripts: [['probe', 'node scripts/probe.mjs']] }), 'npm-script', 'an npm script keeps an active script');
  eq(kindOf('scripts/probe.mjs', surfaceOf('.replit', '[[workflows.workflow.tasks]]\ntask = "shell.exec"\nargs = "node scripts/probe.mjs"\n')), 'workflow', 'a Replit shell workflow keeps an active script');
  eq(kindOf('scripts/probe.mjs', surfaceOf('.github/workflows/test.yml', 'jobs:\n  a:\n    steps:\n      - run: node scripts/probe.mjs\n')), 'tooling', 'a CI command keeps an active script');
  eq(kindOf('scripts/probe.mjs', { importedBy: new Map([['scripts/probe.mjs', 'scripts/validation/x.mjs']]) }), 'import', 'a real import keeps an active script');
  const manualRunbook = MANUAL_RUNBOOK_MANIFEST[0].file;
  eq(kindOf(manualRunbook), 'manual-runbook', 'a documented manual runbook is pinned');
  eq(kindOf('scripts/probe.mjs', { manualRunbooks: [{ file: 'scripts/probe.mjs', note: 'synthetic manual reason' }] }), 'manual-runbook', 'a documented manual reason can pin a runbook');
  eq(kindOf('scripts/probe.mjs', { manualRunbooks: [{ file: 'scripts/probe.mjs', note: '   ' }] }), 'stray', 'a manual pin without a documented reason cannot pass');
  eq(isCommandSurface('scripts/archive/old.sh'), false, 'archive scripts are not command surfaces');

  // package.json is read field by field: only fields that npm resolves to a
  // file may vouch. Metadata mentioning the name certifies nothing.
  const fieldsOf = (pkg) => packageFieldRefs(pkg).map((r) => r.field);
  eq(fieldsOf({ description: 'nightly run of probe.mjs', keywords: ['probe.mjs'], author: 'probe.mjs', homepage: 'https://x.dev/probe.mjs' }), [], 'metadata fields yield no reference');
  eq(fieldsOf({ dependencies: { 'probe.mjs': '^1.0.0' } }), [], 'a dependency name is not a file reference');
  eq(fieldsOf({ main: 'probe.mjs' }), ['main'], 'main is a file-bearing field');
  eq(fieldsOf({ bin: { probe: './probe.mjs' } }), ['bin.probe'], 'bin entries are file-bearing');
  eq(fieldsOf({ files: ['dist', 'probe.mjs'] }), ['files[0]', 'files[1]'], 'files entries are file-bearing');
  eq(fieldsOf({ exports: { '.': { import: './probe.mjs' } } }), ['exports...import'], 'nested exports are file-bearing');
  // …and end to end, through the real decision path.
  const pkgRefs = (pkg) => ({ pkgFields: packageFieldRefs(pkg) });
  eq(kindOf('probe.mjs', pkgRefs({ description: 'runs probe.mjs on deploy' })), 'stray', 'a description mention leaves it stray');
  eq(kindOf('probe.mjs', pkgRefs({ keywords: ['probe.mjs'], author: 'probe.mjs <a@b.c>' })), 'stray', 'arbitrary metadata leaves it stray');
  eq(kindOf('probe.mjs', pkgRefs({ bin: { probe: './probe.mjs' } })), 'package-manifest', 'a bin entry keeps it');
  eq(kindOf('probe.mjs', pkgRefs({ main: 'probe.mjs' })), 'package-manifest', 'main keeps it');
  // npm's `config` is env-var metadata, not a file npm loads, so a filename
  // parked there is a mention like any other.
  eq(kindOf('probe.mjs', pkgRefs({ config: { runner: './probe.mjs' } })), 'stray', 'npm config metadata leaves it stray');
  eq(kindOf('probe.mjs', pkgRefs({ workspaces: ['probe.mjs'] })), 'stray', 'a workspaces entry leaves it stray');
  eq(kindOf('probe.mjs', pkgRefs({ files: ['probe.mjs'] })), 'package-manifest', 'a published files[] entry keeps it');
  eq(kindOf('probe.mjs', pkgRefs({ files: ['scripts/probe.mjs'] })), 'stray', 'a files entry for a different path leaves it stray');

  // JSON surfaces contribute string VALUES only — not comments, not keys.
  eq(kindsOf('tsconfig.json', '{\n  // legacy: node probe.mjs\n  "files": ["src/main.ts"]\n}'), false, 'JSONC comment in a json surface stripped');
  eq(kindsOf('components.json', '{ "probe.mjs": true }'), false, 'a json KEY spelling the name is not a reference');
  eq(kindsOf('components.json', '{ "style": "probe.mjs", "rsc": false }'), false, 'a non-path json value naming it is not a reference');
  eq(kindsOf('tsconfig.json', '{ "files": ["probe.mjs"] }'), true, 'a json file-list value naming it counts');
  eq(kindsOf('vercel.json', '{ "builds": [{ "src": "probe.mjs" }] }'), true, 'a nested json path value naming it counts');
  eq(kindsOf('railway.json', '{ "deploy": { "startCommand": "node probe.mjs" } }'), true, 'a json command value that runs it counts');
  eq(kindOf('eslint.config.js'), 'recognized-config', 'manifest config with its package installed passes');
  eq(kindOf('eslint.config.js', { deps: new Set(['vite']) }), 'stray', 'manifest config whose package is gone is stray');
  eq(kindOf('tailwind.config.ts'), 'recognized-config', 'ts config in the manifest passes');

  // Candidate→candidate edges resolve by reachability, so a cycle cannot
  // bootstrap itself…
  const cycle = classifyAll(['a.mjs', 'b.mjs'], ctx({
    rootEdges: new Map([['a.mjs', new Set(['b.mjs'])], ['b.mjs', new Set(['a.mjs'])]]),
  }));
  eq([cycle.get('a.mjs').kind, cycle.get('b.mjs').kind], ['stray', 'stray'], 'two root scripts importing each other stay stray');
  // …and importing something alive does not make the importer alive either.
  const oneWay = classifyAll(['probe.mjs', 'vite.config.ts'], ctx({
    rootEdges: new Map([['vite.config.ts', new Set(['probe.mjs'])]]),
  }));
  eq(oneWay.get('probe.mjs').kind, 'stray', 'importing a live config does not rescue the importer');
  const scriptCycle = classifyAll(['scripts/a.mjs', 'scripts/b.mjs'], ctx({
    rootEdges: new Map([
      ['scripts/a.mjs', new Set(['scripts/b.mjs'])],
      ['scripts/b.mjs', new Set(['scripts/a.mjs'])],
    ]),
  }));
  eq(
    [scriptCycle.get('scripts/a.mjs').kind, scriptCycle.get('scripts/b.mjs').kind],
    ['stray', 'stray'],
    'two active scripts importing each other stay stray',
  );
  // …while a genuinely reachable root file does vouch for what it loads.
  const chained = classifyAll(['helper.mjs', 'vite.config.ts'], ctx({
    rootEdges: new Map([['helper.mjs', new Set(['vite.config.ts'])]]),
  }));
  eq(chained.get('helper.mjs').kind, 'import', 'a config that is itself reachable vouches for what it imports');
}

// ---------------------------------------------------------------------------
// Run.
// ---------------------------------------------------------------------------
runCanaries();
console.log('PASS canaries :: reference matching + comment stripping + candidate-import resolution + manifest conditions verified against synthetic samples');

const replitPath = path.join(ROOT, '.replit');
let replitContent;
try {
  replitContent = fs.readFileSync(replitPath, 'utf8');
} catch {
  console.error('FAIL runtime-coverage :: .replit is missing — enabled interpreter coverage cannot be established.');
  process.exit(1);
}
const replitModules = parseReplitModules(replitContent);
if (replitModules.error) {
  console.error(`FAIL runtime-coverage :: ${replitModules.error}`);
  process.exit(1);
}
const moduleCoverage = validateReplitModuleCoverage(replitModules.modules);
if (moduleCoverage.error) {
  console.error(`FAIL runtime-coverage :: ${moduleCoverage.error}`);
  console.error('       Add an explicit module policy with its root script extension and canaries.');
  process.exit(1);
}

const rootFiles = [...new Set([...rootCodeFiles(), ...trackedExtensionlessShebangFiles()])].sort();
const activeScripts = activeScriptFiles();
const allCandidates = [...rootFiles, ...activeScripts];
const ignored = gitIgnoredNames(allCandidates);
const checked = allCandidates.filter((n) => !ignored.has(n));

// The gate must never pass vacuously: the root has always held tool configs and
// scripts/ has active tooling, so an empty set means discovery broke.
if (!checked.length) {
  console.error('FAIL scan-empty :: no root or active scripts/ executable files found — the scan is broken, not the repo clean.');
  process.exit(1);
}

const { deps, npmScripts, pkgFields } = readPackageJson();
const { surfaces, parseFailures, importedBy, rootEdges, codeCount } = collect(new Set(checked));

// A surface the gate cannot parse is a broken gate, not a silent pass: it must
// never fall back to scanning raw text, or a malformed config could certify a
// dead script by merely containing its name.
if (parseFailures.length) {
  for (const f of parseFailures) console.error(`FAIL surface-unreadable :: ${f.rel} — ${f.error}`);
  console.error('       Fix the config (or it is not a config): the gate reads these files to decide');
  console.error('       what runs, and refuses to guess from raw text when they do not parse.');
  process.exit(1);
}

const verdicts = classifyAll(checked, { surfaces, importedBy, rootEdges, deps, npmScripts, pkgFields });
const results = checked.map((name) => ({ name, ...verdicts.get(name) }));
const stray = results.filter((r) => r.kind === 'stray');

if (LIST) {
  console.log(
    `replit module coverage: ${replitModules.modules
      .map((moduleName) => {
        const policy = policyForReplitModule(moduleName);
        return `${moduleName} → ${policy.extensions.join(', ') || 'no root script extension'}`;
      })
      .join('; ')}`,
  );
  console.log(`command surfaces: ${surfaces.length} file(s) (root configs, ${COMMAND_SURFACE_DIRS.join(', ')}, ${SHELL_ONLY_DIRS.join(', ')}/**/*.sh)`);
  console.log(`import edges parsed from: ${codeCount} source file(s) across ${IMPORT_TREE_DIRS.join(', ')}`);
  console.log(`candidate executable/script files: ${allCandidates.length} (${rootFiles.length} root, ${activeScripts.length} active scripts/, ${ignored.size} git-ignored, ${checked.length} checked)`);
  const manifestAbsent = ROOT_CONFIG_MANIFEST.filter((e) => !checked.includes(e.file)).map((e) => e.file);
  if (manifestAbsent.length) console.log(`manifest entries with no file present: ${manifestAbsent.join(', ')}`);
  const runbookAbsent = MANUAL_RUNBOOK_MANIFEST.filter((e) => !checked.includes(e.file)).map((e) => e.file);
  if (runbookAbsent.length) console.log(`manual-runbook entries with no file present: ${runbookAbsent.join(', ')}`);
}

for (const r of stray) {
  console.error(`FAIL stray-script :: ${r.name}`);
  if (r.why) console.error(`       ${r.why}`);
  else {
    console.error('       Nothing machine-readable references it: no npm script (package.json), no');
    console.error('       workflow (.replit), no CI/container/tooling config, no import edge from');
    console.error('       client/server/shared/scripts/tests/migrations (or from a root file that is');
    console.error('       itself reachable), and it is neither a recognized tool config nor a pinned');
    console.error('       manual runbook. A mention in prose, a comment, or a plain source string is');
    console.error('       deliberately not a reference.');
  }
}
if (stray.length) {
  console.error('');
  console.error('       An unreferenced root or active scripts/ file reads as supported tooling while');
  console.error('       no command or import keeps it alive. Fix by one of:');
  console.error('         · wire it to an npm script or a validation workflow, or import it;');
  console.error('         · move a completed historical helper under scripts/archive/;');
  console.error('         · delete it (git keeps the history);');
  console.error('         · if it is a legitimate manual runbook, document why it remains and pin it');
  console.error('           in MANUAL_RUNBOOK_MANIFEST in this gate;');
  console.error('         · if it is a genuine auto-discovered tool config, add it to');
  console.error('           ROOT_CONFIG_MANIFEST in this gate together with the package that loads it.');
  console.error(`\n${stray.length} stray script(s).`);
  process.exit(1);
}

console.log(`PASS root-script-drift :: ${checked.length} root + active scripts/ executable file(s) checked, 0 stray${ignored.size ? `, ${ignored.size} git-ignored` : ''}`);
for (const r of results) console.log(`       ${r.name} — ${r.kind}: ${r.where}`);
