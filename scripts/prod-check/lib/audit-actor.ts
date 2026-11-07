import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Page } from "playwright";
import type { BrowserKit, KitContext } from "./browser.ts";
import { addSecret } from "./http.ts";

export type ActorRole = "Admin" | "Member";

export interface Credentials {
  email: string;
  password: string;
  /** Not secret; Tier 2 requires it, Tier 1 does not. */
  id?: string;
}

export interface ApiResponse {
  status: number;
  text: string;
  json<T = unknown>(): T;
}

/** A signed-in audit account: calls are made from inside the page so Clerk keeps the session cookie fresh. */
export interface Actor {
  readonly role: ActorRole;
  readonly id: string | undefined;
  /** The signed-in browser context, for checks that need to look at pages as this account. */
  readonly kit: KitContext;
  call(method: string, path: string, body?: unknown): Promise<ApiResponse>;
  close(): Promise<void>;
}

const ENV_FILE_DEFAULTS: Record<ActorRole, { file: string; prefix: string }> = {
  Admin: { file: join(homedir(), ".cache", "awesome-audit", "audit-admin.env"), prefix: "AUDIT_ADMIN" },
  Member: { file: join(homedir(), ".cache", "awesome-audit", "member.env"), prefix: "MEMBER" },
};

function readEnvFile(file: string): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(file, "utf8").split(/\r?\n/).map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l)).filter((m) => m).map((m) => [m![1], m![2]]),
    );
  } catch {
    return {};
  }
}

/**
 * Email and password come from PROD_CHECK_AUDIT_<ROLE>_EMAIL/_PASSWORD, or else from the env file named by
 * PROD_CHECK_AUDIT_<ROLE>_ENV (default under ~/.cache/awesome-audit). The id is not secret: PROD_CHECK_AUDIT_<ROLE>_ID.
 */
export function loadCredentials(role: ActorRole): Credentials | null {
  const upper = role.toUpperCase();
  const { file, prefix } = ENV_FILE_DEFAULTS[role];
  const fromFile = readEnvFile(process.env[`PROD_CHECK_AUDIT_${upper}_ENV`] ?? file);
  const email = process.env[`PROD_CHECK_AUDIT_${upper}_EMAIL`] ?? fromFile[`${prefix}_EMAIL`];
  const password = process.env[`PROD_CHECK_AUDIT_${upper}_PASSWORD`] ?? fromFile[`${prefix}_PASSWORD`];
  const id = process.env[`PROD_CHECK_AUDIT_${upper}_ID`];
  if (!email || !password) return null;
  addSecret(password);
  addSecret(email);
  return { email, password, id };
}

async function signIn(page: Page, ctx: KitContext, creds: Credentials): Promise<void> {
  await ctx.open(page, "/sign-in");
  const email = page.getByRole("textbox", { name: "Email address" });
  await email.fill(creds.email);
  await email.press("Enter");
  const password = page.getByRole("textbox", { name: "Password" });
  await password.waitFor({ timeout: 15_000 });
  await password.fill(creds.password);
  await password.press("Enter");
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), { timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
}

async function rawCall(page: Page, method: string, path: string, body: unknown): Promise<{ status: number; text: string }> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const clerk = (window as unknown as { Clerk?: { session?: { getToken(): Promise<unknown> } } }).Clerk;
      await clerk?.session?.getToken().catch(() => undefined);
      const res = await fetch(path, {
        method,
        credentials: "include",
        headers: body === undefined ? {} : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: res.status, text: await res.text() };
    },
    { method, path, body },
  );
}

export async function openActor(kit: BrowserKit, base: string, role: ActorRole, creds: Credentials): Promise<Actor> {
  const ctx = await kit.newContext(role === "Admin" ? "auditAdmin" : "auditMember");
  const page = await ctx.newPage();
  await signIn(page, ctx, creds);
  const respond = (r: { status: number; text: string }): ApiResponse => ({ ...r, json: <T>() => JSON.parse(r.text) as T });

  return {
    role,
    id: creds.id,
    kit: ctx,
    async call(method, path, body) {
      let res = await rawCall(page, method, path, body);
      if (res.status === 401) {
        // The ~1 minute __session cookie lapsed: reloading lets Clerk renew it, then ask once more.
        await page.goto(new URL("/", base).href, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
        res = await rawCall(page, method, path, body);
      }
      return respond(res);
    },
    close: () => ctx.close(),
  };
}
