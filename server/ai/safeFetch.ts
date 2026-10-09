import dns from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
import { Readable } from 'node:stream';
import fetch from 'node-fetch';

// Fail closed: only globally routable unicast addresses may be contacted.
const blocked = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10],
  ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blocked.addSubnet(address, prefix, 'ipv4');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');
for (const [address, prefix] of [
  ['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20],
] as const) blocked.addSubnet(address, prefix, 'ipv6');

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, 'ipv4');
  return family === 6 && globalV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6');
}

/**
 * Resolve every hop and pin the vetted address in the socket's lookup callback.
 * The URL host remains unchanged for Host/SNI/certificate verification.
 * The deadline includes DNS, redirects and streaming body consumption.
 */
export async function safeFetch(
  input: string,
  options: { timeout?: number; maxBytes?: number; headers?: Record<string, string>; followRedirects?: boolean } = {},
): Promise<{ body: Buffer; url: string; status: number; statusText: string; ok: boolean; headers: Headers }> {
  const controller = new AbortController();
  const timeout = options.timeout ?? 10_000;
  const maxBytes = options.maxBytes ?? 5 * 1024 * 1024;
  let timer: ReturnType<typeof setTimeout>;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Request timeout'));
    }, timeout);
  });
  const work = async () => {
    let url = new URL(input);
    for (let hop = 0; hop <= 5; hop++) {
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        throw new Error('Unsafe URL: only uncredentialed HTTP/HTTPS URLs are allowed');
      }
      const hostname = url.hostname.replace(/^\[|\]$/g, '');
      const addresses = isIP(hostname)
        ? [{ address: hostname, family: isIP(hostname) }]
        : await dns.lookup(hostname, { all: true, verbatim: true });
      if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
        throw new Error('Unsafe URL: destination is not a public IP address');
      }
      if (controller.signal.aborted) throw new Error('Request timeout');
      const pinned = addresses[0];
      const Agent = url.protocol === 'https:' ? HttpsAgent : HttpAgent;
      const agent = new Agent({
        family: pinned.family,
        lookup: (_hostname, _options, callback) => {
          callback(null, pinned.address, pinned.family);
        },
      });
      try {
        const response = await fetch(url, {
          agent, signal: controller.signal, redirect: 'manual', size: maxBytes,
          headers: options.headers,
        });
        if ([301, 302, 303, 307, 308].includes(response.status) && options.followRedirects !== false) {
          (response.body as Readable | null)?.destroy();
          const location = response.headers.get('location');
          if (!location) throw new Error('Redirect has no destination');
          if (hop === 5) throw new Error('Too many redirects');
          url = new URL(location, url);
          continue;
        }
        const length = Number(response.headers.get('content-length'));
        if (length > maxBytes) {
          (response.body as Readable | null)?.destroy();
          throw new Error('Response exceeds size limit');
        }
        const chunks: Buffer[] = [];
        let size = 0;
        if (response.body) {
          for await (const chunk of response.body) {
            const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            size += bytes.length;
            if (size > maxBytes) {
              (response.body as Readable).destroy();
              throw new Error('Response exceeds size limit');
            }
            chunks.push(bytes);
          }
        }
        return {
          body: Buffer.concat(chunks), url: url.href, status: response.status,
          statusText: response.statusText, ok: response.ok,
          headers: new Headers([...response.headers.entries()]),
        };
      } finally {
        agent.destroy();
      }
    }
    throw new Error('Too many redirects');
  };
  try {
    return await Promise.race([work(), expired]);
  } finally {
    clearTimeout(timer!);
  }
}
