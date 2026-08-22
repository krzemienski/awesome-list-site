#!/usr/bin/env node
/**
 * Serialized production build for validation runs.
 *
 * The completion runner executes every gate in parallel. Two gates write or
 * read dist/ (`task302-build` and `cache-headers` --spawn); an unserialized
 * `npm run build` can rewrite dist/index.js while the cache-headers gate is
 * booting it, which surfaces as a truncated module ("SyntaxError: Unexpected
 * end of input"). This wrapper holds the shared "dist" gate lease for the
 * duration of the build so dist/ is never torn under a concurrent reader.
 */
import { spawn } from 'node:child_process';
import { acquireGateLease } from './gate-lease.mjs';

const release = await acquireGateLease('dist', 'build-dist');
process.on('exit', () => { try { release(); } catch { /* already released */ } });

const child = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
child.on('error', (err) => {
  console.error('FATAL: failed to start npm run build:', err.message);
  process.exit(1);
});
child.on('exit', (code) => process.exit(code ?? 1));
