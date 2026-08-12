#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const publicDir = path.join(root, "dist/public");
const manifestPath = path.join(publicDir, ".vite/manifest.json");
const modulesPath = path.join(publicDir, "bundle-modules.json");
const budgetPath = path.join(
  root,
  "scripts/validation/bundle-budgets.json",
);
const check = process.argv.includes("--check");
const jsonArg = process.argv.indexOf("--json");
const jsonPath =
  jsonArg >= 0 && process.argv[jsonArg + 1]
    ? path.resolve(root, process.argv[jsonArg + 1])
    : null;

function readJson(file, label) {
  if (!fs.existsSync(file)) {
    throw new Error(
      `${label} is missing at ${path.relative(root, file)}. Run npm run build first.`,
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function compressedSizes(file) {
  const content = fs.readFileSync(path.join(publicDir, file));
  return {
    rawBytes: content.length,
    gzipBytes: zlib.gzipSync(content, { level: 9 }).length,
    brotliBytes: zlib.brotliCompressSync(content, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  };
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

try {
  const manifest = readJson(manifestPath, "Vite manifest");
  const moduleInventory = readJson(modulesPath, "Bundle module inventory");
  const budgets = readJson(budgetPath, "Bundle budget");
  const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
  if (!entryKey) throw new Error("Vite manifest has no entry chunk.");

  const collectClosure = (startKey, excluded = new Set()) => {
    const keys = new Set();
    const visit = (key) => {
      if (excluded.has(key) || keys.has(key)) return;
      const item = manifest[key];
      if (!item) {
        throw new Error(`Manifest import "${key}" is missing.`);
      }
      keys.add(key);
      for (const imported of item.imports ?? []) visit(imported);
    };
    visit(startKey);
    return keys;
  };

  const measure = (keys) => {
    const chunks = [];
    const total = { rawBytes: 0, gzipBytes: 0, brotliBytes: 0 };
    for (const key of [...keys].sort()) {
      const file = manifest[key].file;
      if (!file.endsWith(".js")) continue;
      const sizes = compressedSizes(file);
      chunks.push({ key, file, ...sizes });
      for (const metric of Object.keys(total)) total[metric] += sizes[metric];
    }
    return { ...total, chunks };
  };

  const initialKeys = collectClosure(entryKey);
  const initial = measure(initialKeys);
  const routes = {};
  for (const [name, routeBudget] of Object.entries(budgets.routes)) {
    if (!manifest[routeBudget.manifestKey]) {
      throw new Error(
        `Budget route "${name}" cannot find manifest key "${routeBudget.manifestKey}".`,
      );
    }
    routes[name] = measure(
      collectClosure(routeBudget.manifestKey, initialKeys),
    );
  }

  const failures = [];
  const compare = (label, measured, limits) => {
    for (const metric of ["rawBytes", "gzipBytes", "brotliBytes"]) {
      const maxName = `max${metric[0].toUpperCase()}${metric.slice(1)}`;
      const max = limits[maxName];
      if (typeof max === "number" && measured[metric] > max) {
        failures.push(
          `${label} ${metric} is ${formatBytes(measured[metric])}, ` +
            `${formatBytes(measured[metric] - max)} over the ${formatBytes(max)} budget.`,
        );
      }
    }
  };

  compare("initial", initial, budgets.initial);
  for (const [name, measured] of Object.entries(routes)) {
    compare(`route:${name}`, measured, budgets.routes[name]);
  }

  for (const item of Object.values(manifest)) {
    if (!item.isDynamicEntry || !item.file.endsWith(".js")) continue;
    compare(
      `async-chunk:${item.name ?? item.src ?? item.file}`,
      compressedSizes(item.file),
      budgets.maxAsyncChunk,
    );
  }

  const forbidden = budgets.initialForbiddenModulePatterns.map(
    (pattern) => new RegExp(pattern),
  );
  const initialModules = initial.chunks.flatMap(
    ({ file }) => moduleInventory.chunks[file]?.modules ?? [],
  );
  for (const moduleId of initialModules) {
    const matched = forbidden.find((pattern) => pattern.test(moduleId));
    if (matched) {
      failures.push(
        `initial isolation violation: ${moduleId} matches ${matched}. ` +
          "Move the feature behind a dynamic route/feature import.",
      );
    }
  }

  const baseline = budgets.baseline.initial;
  const reductions = {
    rawPercent: +((1 - initial.rawBytes / baseline.rawBytes) * 100).toFixed(1),
    gzipPercent: +(
      (1 - initial.gzipBytes / baseline.gzipBytes) *
      100
    ).toFixed(1),
    brotliPercent: +(
      (1 - initial.brotliBytes / baseline.brotliBytes) *
      100
    ).toFixed(1),
  };
  const report = {
    schemaVersion: 1,
    baseline: budgets.baseline,
    initial,
    reductions,
    routes,
    failures,
  };

  console.log("Bundle report (logical Vite manifest graph)");
  console.log(
    `  initial  raw ${formatBytes(initial.rawBytes)} | ` +
      `gzip ${formatBytes(initial.gzipBytes)} | ` +
      `brotli ${formatBytes(initial.brotliBytes)}`,
  );
  console.log(
    `  reduction vs ${budgets.baseline.commit.slice(0, 12)}: ` +
      `raw ${reductions.rawPercent}% | gzip ${reductions.gzipPercent}% | ` +
      `brotli ${reductions.brotliPercent}%`,
  );
  for (const [name, measured] of Object.entries(routes)) {
    console.log(
      `  route:${name.padEnd(15)} gzip ${formatBytes(measured.gzipBytes)} | ` +
        `brotli ${formatBytes(measured.brotliBytes)} | ` +
        `${measured.chunks.length} incremental chunks`,
    );
  }
  console.log(
    `  initial isolation: ${initialModules.length} modules checked against ` +
      `${forbidden.length} forbidden feature patterns`,
  );

  if (jsonPath) {
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`  JSON report: ${path.relative(root, jsonPath)}`);
  }

  if (failures.length) {
    console.error("\nBundle budget failures:");
    for (const failure of failures) console.error(`  - ${failure}`);
    if (check) process.exitCode = 1;
  } else {
    console.log("\nBundle budgets: PASS");
  }
} catch (error) {
  console.error(`Bundle report failed: ${error.message}`);
  process.exitCode = 1;
}