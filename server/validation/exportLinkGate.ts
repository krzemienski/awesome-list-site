/**
 * Export link gate — pre-push broken-link check for the generated
 * Awesome-list Markdown (repository/export scope).
 *
 * Runs inside the GitHub export path BEFORE any write to the repository, on
 * the exact README content the export is about to push. It is deliberately
 * separate from the production Link Health dashboard (which scans approved
 * resources in the live DB and records results in the admin panel): this gate
 * writes nothing to the DB and its findings must never be conflated with
 * dashboard data.
 *
 * False-positive policy (strict dead-link policy, same as the link-health
 * tooling and the awesome_bot script/CI check): only links that are
 * CONFIRMED dead fail the gate —
 *   - DNS not found / connection refused
 *   - HTTP 404/410 confirmed under a browser User-Agent
 *   - SSL certificate failures
 * Timeouts, 401/403/418/429/999, 5xx and other bot-block shapes never fail
 * the export. Documented exclusions live in scripts/awesome-bot-allowlist.txt
 * (shared with the awesome_bot check).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { LinkChecker, browserVerifyLink } from './linkChecker';

export interface ExportLinkGateResult {
  checked: number;
  skipped: number;
  confirmedBroken: Array<{ url: string; verdict: string }>;
  passed: boolean;
}

const ALLOWLIST_PATH = join(process.cwd(), 'scripts', 'awesome-bot-allowlist.txt');

export function loadExportLinkAllowlist(path: string = ALLOWLIST_PATH): string[] {
  try {
    return readFileSync(path, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
  } catch {
    return [];
  }
}

/** Extract unique absolute http(s) URLs from markdown links. */
export function extractMarkdownUrls(markdown: string): string[] {
  const urls = new Set<string>();
  const pattern = /\]\((https?:\/\/[^)\s]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(markdown)) !== null) {
    urls.add(m[1]);
  }
  return [...urls];
}

/**
 * Check every link in the generated export Markdown; return the confirmed
 * broken ones. First pass uses the fast bot-UA checker; anything it flags is
 * re-verified under a browser User-Agent with the strict dead-link
 * classification, so bot-blocks never fail the gate.
 */
export async function runExportLinkGate(
  markdown: string,
  opts: { concurrency?: number; timeoutMs?: number; onProgress?: (checked: number, total: number) => void } = {},
): Promise<ExportLinkGateResult> {
  const allowlist = loadExportLinkAllowlist();
  const allUrls = extractMarkdownUrls(markdown);
  const urls = allUrls.filter((u) => !allowlist.some((entry) => u.includes(entry)));
  const skipped = allUrls.length - urls.length;

  const checker = new LinkChecker({
    concurrent: opts.concurrency ?? 20,
    timeout: opts.timeoutMs ?? 10000,
    retryCount: 0,
    onProgress: opts.onProgress,
  });

  const report = await checker.checkLinks(urls.map((url) => ({ url })));

  // Candidates: anything not clearly alive in the first pass.
  const candidates = report.results.filter((r) => !r.valid);
  const confirmedBroken: Array<{ url: string; verdict: string }> = [];

  for (const candidate of candidates) {
    const verification = await browserVerifyLink(candidate.url);
    if (verification.confirmedDead) {
      confirmedBroken.push({ url: candidate.url, verdict: verification.verdict });
    }
  }

  return {
    checked: urls.length,
    skipped,
    confirmedBroken,
    passed: confirmedBroken.length === 0,
  };
}
