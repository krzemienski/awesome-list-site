/**
 * Regression check for the AIA missing-intermediate recovery in
 * server/validation/linkChecker.ts (run with: npx tsx scripts/validation/tls-recovery-check.ts)
 *
 * Covers:
 *  1. Missing-intermediate chain from a public CA recovers (alive) — incomplete-chain.badssl.com
 *  2. Browser-blocking TLS failures stay dead — expired / wrong host / self-signed / untrusted root
 *  3. Trust boundary: a private CA chain (leaf + intermediate + self-signed root generated
 *     locally, i.e. what a hostile endpoint could publish via AIA links) is REJECTED by
 *     validateAiaChain — AIA downloads must never become trust anchors.
 */
import { execSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { X509Certificate } from 'node:crypto';
import { createServer } from 'node:http';
import { browserVerifyLink, validateAiaChain, fetchAiaUrlSafely, isPrivateAddress } from '../../server/validation/linkChecker';

let failures = 0;
function assert(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

async function liveMatrix() {
  const recovered = await browserVerifyLink('https://incomplete-chain.badssl.com/', 20000);
  assert('missing-intermediate chain recovers alive', recovered.confirmedAlive && !recovered.confirmedDead, recovered.verdict);

  const mustStayDead = [
    'https://expired.badssl.com/',
    'https://wrong.host.badssl.com/',
    'https://self-signed.badssl.com/',
    'https://untrusted-root.badssl.com/',
  ];
  for (const url of mustStayDead) {
    const v = await browserVerifyLink(url, 20000);
    assert(`stays dead: ${url}`, v.confirmedDead && !v.confirmedAlive, v.verdict);
  }
}

function privateCaChainRejected() {
  const dir = mkdtempSync(join(tmpdir(), 'tls-chain-check-'));
  try {
    const sh = (cmd: string) => execSync(cmd, { cwd: dir, stdio: 'pipe', shell: '/bin/bash' });
    // Self-signed private root
    sh(`openssl req -x509 -newkey rsa:2048 -nodes -keyout root.key -out root.pem -days 30 -subj "/CN=Evil Private Root" -addext basicConstraints=critical,CA:TRUE`);
    // Intermediate signed by the private root
    sh(`openssl req -newkey rsa:2048 -nodes -keyout inter.key -out inter.csr -subj "/CN=Evil Private Intermediate"`);
    sh(`openssl x509 -req -in inter.csr -CA root.pem -CAkey root.key -CAcreateserial -out inter.pem -days 30 -extfile <(printf "basicConstraints=critical,CA:TRUE")`);
    // Leaf for the target hostname, signed by the intermediate
    sh(`openssl req -newkey rsa:2048 -nodes -keyout leaf.key -out leaf.csr -subj "/CN=example.com"`);
    sh(`openssl x509 -req -in leaf.csr -CA inter.pem -CAkey inter.key -CAcreateserial -out leaf.pem -days 30 -extfile <(printf "subjectAltName=DNS:example.com")`);

    const leaf = new X509Certificate(readFileSync(join(dir, 'leaf.pem')));
    const inter = new X509Certificate(readFileSync(join(dir, 'inter.pem')));
    const root = new X509Certificate(readFileSync(join(dir, 'root.pem')));

    assert('private CA chain (leaf+intermediate) rejected — no system root', !validateAiaChain(leaf, [inter], 'example.com'));
    assert('private CA chain incl. self-signed root rejected — downloaded roots never trusted', !validateAiaChain(leaf, [inter, root], 'example.com'));
    assert('hostname mismatch rejected even for a well-formed chain', !validateAiaChain(leaf, [inter], 'other-host.com'));
    assert('empty intermediate list rejected', !validateAiaChain(leaf, [], 'example.com'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * 4. SSRF boundary: AIA URLs are attacker-controlled (they come from an
 *    unverified peer cert). The safe downloader must refuse non-http(s)
 *    schemes, loopback/private/link-local/metadata targets (v4+v6, mapped),
 *    hostnames resolving to private space, and all redirects. A live local
 *    listener proves blocked targets receive ZERO requests.
 */
async function ssrfBoundary() {
  // Address classifier sanity
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1']) {
    assert(`isPrivateAddress blocks ${ip}`, isPrivateAddress(ip));
  }
  assert('isPrivateAddress allows public v4', !isPrivateAddress('93.184.216.34'));
  assert('isPrivateAddress allows public v6', !isPrivateAddress('2606:4700::6810:84e5'));

  // Live proof: a loopback listener must never be hit.
  let hits = 0;
  const server = createServer((_req, res) => { hits++; res.end('hit'); });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()));
  const port = (server.address() as any).port;
  const blockedUrls = [
    `http://127.0.0.1:${port}/aia.der`,
    `http://[::1]:${port}/aia.der`,
    `http://localhost:${port}/aia.der`, // resolves to loopback
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.1/cert.der',
    'file:///etc/passwd',
    'ftp://example.com/cert.der',
    'http://user:pass@example.com/cert.der',
  ];
  for (const url of blockedUrls) {
    const body = await fetchAiaUrlSafely(url, 4000);
    assert(`SSRF blocked: ${url}`, body === null);
  }
  assert('loopback listener received zero requests', hits === 0, `hits=${hits}`);
  await new Promise<void>(r => server.close(() => r()));

  // Redirects are refused even from public hosts.
  const redirected = await fetchAiaUrlSafely(`https://httpbin.org/redirect-to?url=${encodeURIComponent('http://127.0.0.1/')}`, 15000);
  assert('redirecting AIA URL refused (redirect: manual)', redirected === null);
}

(async () => {
  privateCaChainRejected();
  await ssrfBoundary();
  await liveMatrix();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})();
