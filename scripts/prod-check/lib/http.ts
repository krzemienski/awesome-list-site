import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const GOOGLEBOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const TIMEOUT_MS = 15_000;

export class AuthExpiredError extends Error {
  constructor(reason: string, verbatim = false) {
    super(verbatim ? reason : `owner session expired (${reason})`);
  }
}

export interface HttpResponse {
  status: number;
  ms: number;
  text: string;
  json<T = unknown>(): T;
}

export interface GetOptions {
  ua?: string;
  owner?: boolean;
}

/** Read-only by construction: there is no method other than GET. */
export interface HttpClient {
  get(pathOrUrl: string, opts?: GetOptions): Promise<HttpResponse>;
  /** Routes `owner: true` GETs through this signed-in audit admin instead of the owner cookie file. */
  useAdmin(admin: { call(method: string, path: string): Promise<{ status: number; text: string }> }): void;
  ownerCookies(): { name: string; value: string }[];
}

const secrets = new Set<string>();

export function addSecret(value: string): void {
  if (value.length >= 6) secrets.add(value);
}

/** Removes any owner cookie value from text that may reach a log, result or evidence file. */
export function redact(text: string): string {
  let out = text;
  for (const s of secrets) out = out.split(s).join("<REDACTED>");
  return out;
}

function loadOwnerCookie(): string {
  const file = process.env.PROD_CHECK_OWNER_HDR ?? join(homedir(), ".cache", "awesome-audit", "owner.hdr");
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    throw new AuthExpiredError("owner header file not readable");
  }
  const line = raw.split(/\r?\n/).find((l) => /^cookie:/i.test(l));
  if (!line) throw new AuthExpiredError("no Cookie line in owner header file");
  const cookie = line.replace(/^cookie:\s*/i, "").trim();
  for (const pair of cookie.split(";")) {
    const value = pair.slice(pair.indexOf("=") + 1).trim();
    if (value.length >= 6) secrets.add(value);
  }
  return cookie;
}

export function createHttp(base: string): HttpClient {
  const baseHost = new URL(base).host;
  let cookie: string | undefined;
  const ownerCookie = () => (cookie ??= loadOwnerCookie());
  let admin: Parameters<HttpClient["useAdmin"]>[0] | undefined;

  return {
    useAdmin(actor) {
      admin = actor;
    },
    async get(pathOrUrl, opts = {}) {
      const url = new URL(pathOrUrl, base);
      if (opts.owner && admin) {
        if (url.host !== baseHost) throw new Error("refusing to send the admin session to another host");
        const started = Date.now();
        const res = await admin.call("GET", url.pathname + url.search);
        if (res.status === 401) throw new AuthExpiredError("401 from " + url.pathname);
        return { status: res.status, ms: Date.now() - started, text: res.text, json: <T>() => JSON.parse(res.text) as T };
      }
      const headers: Record<string, string> = { "user-agent": opts.ua ?? "awesome-prod-check/1" };
      if (opts.owner) {
        if (url.host !== baseHost) throw new Error("refusing to send the owner session to another host");
        headers.cookie = ownerCookie();
      }
      const started = Date.now();
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
      const text = await res.text();
      if (opts.owner && res.status === 401) throw new AuthExpiredError("401 from " + url.pathname);
      return {
        status: res.status,
        ms: Date.now() - started,
        text,
        json: <T>() => JSON.parse(text) as T,
      };
    },
    ownerCookies() {
      return ownerCookie()
        .split(";")
        .map((pair) => {
          const i = pair.indexOf("=");
          return { name: pair.slice(0, i).trim(), value: pair.slice(i + 1).trim() };
        });
    },
  };
}
