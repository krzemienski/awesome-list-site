#!/usr/bin/env node

/**
 * Compile-time regression gate for the design-system registry.
 *
 * The source file is copied to a disposable TypeScript project and compiled
 * once unchanged, then once for each intentionally invalid registry edit.
 * This proves the relationships are enforced by TypeScript rather than only
 * being valid in today's declarations, without touching the working tree.
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SOURCE_PATH = join(ROOT, 'client/src/lib/design-system.ts');
const TSC_PATH = join(ROOT, 'node_modules/typescript/bin/tsc');

const mutations = [
  {
    name: 'duplicate system id',
    apply(source) {
      return source.replace("id: 'terminal',", "id: 'editorial',");
    },
  },
  {
    name: 'duplicate accent id',
    apply(source) {
      return source.replace(
        "{ id: 'magenta', name: 'Magenta'",
        "{ id: 'crimson', name: 'Magenta'",
      );
    },
  },
  {
    name: 'missing SYSTEM_DEFAULT_ACCENT row',
    apply(source) {
      const needle = "defaultAccent: 'matrix',";
      return source.replace(needle, '');
    },
  },
  {
    name: 'unknown mapped accent',
    apply(source) {
      const needle = "defaultAccent: 'matrix',";
      return source.replace(needle, "defaultAccent: 'not-an-accent',");
    },
  },
  {
    name: 'invalid DEFAULT_SYSTEM',
    apply(source) {
      return source.replace(
        "defaultSystem: 'editorial',",
        "defaultSystem: 'not-a-system',",
      );
    },
  },
  {
    name: 'invalid DEFAULT_ACCENT',
    apply(source) {
      return source.replace(
        "defaultAccent: 'crimson',\n  systems:",
        "defaultAccent: 'not-an-accent',\n  systems:",
      );
    },
  },
];

const tsconfig = JSON.stringify(
  {
    compilerOptions: {
      noEmit: true,
      strict: true,
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'bundler',
      lib: ['ESNext', 'DOM', 'DOM.Iterable'],
      skipLibCheck: true,
    },
    include: ['design-system.ts'],
  },
  null,
  2,
);

function assertMutationApplied(name, original, mutated) {
  if (mutated === original) {
    throw new Error(`mutation did not apply: ${name}`);
  }
}

function compile(projectDir) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [TSC_PATH, '--project', join(projectDir, 'tsconfig.json'), '--pretty', 'false'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });
}

const source = await readFile(SOURCE_PATH, 'utf8');
const scratch = await mkdtemp(join(tmpdir(), 'theme-registry-types-'));

try {
  await writeFile(join(scratch, 'tsconfig.json'), tsconfig);

  await writeFile(join(scratch, 'design-system.ts'), source);
  const baseline = await compile(scratch);
  if (baseline.code !== 0) {
    throw new Error(`baseline registry does not compile:\n${baseline.output}`);
  }
  console.log('PASS baseline :: current design-system registry compiles');

  for (const mutation of mutations) {
    const mutated = mutation.apply(source);
    assertMutationApplied(mutation.name, source, mutated);
    await writeFile(join(scratch, 'design-system.ts'), mutated);
    const result = await compile(scratch);
    if (result.code === 0) {
      throw new Error(`mutation unexpectedly compiled: ${mutation.name}`);
    }
    console.log(`PASS rejected :: ${mutation.name}`);
  }
} catch (error) {
  console.error(`FAIL :: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await rm(scratch, { recursive: true, force: true });
}