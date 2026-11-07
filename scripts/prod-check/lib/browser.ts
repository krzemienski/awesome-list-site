import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { AUDIT_RUN_HEADER, redact, type HttpClient } from "./http.ts";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const SAFE_PATH = /^\/[A-Za-z0-9\-._~%/]*(\?[A-Za-z0-9\-._~%=&,+]*)?(#[\w-]*)?$/;

export type AuthState = "visitor" | "owner" | "auditMember" | "auditAdmin";

/** The only first-party writes an audit context may make: Clerk sign-in plus the Tier 2 steps. */
const CLERK_WRITES: [method: string, path: RegExp][] = [["POST", /^\/api\/__clerk\//]];
const AUDIT_WRITES: [method: string, path: RegExp][] = [
  ["POST", /^\/api\/resources$/],
  ["POST", /^\/api\/user\/contributions\/resource\/\d+\/withdraw$/],
  ["POST", /^\/api\/bookmarks\/\d+$/],
  ["DELETE", /^\/api\/bookmarks\/\d+$/],
  ["POST", /^\/api\/admin\/resources\/\d+\/reject$/],
  ["PUT", /^\/api\/admin\/resources\/\d+$/],
  ["POST", /^\/api\/admin\/database-backups$/],
  ["DELETE", /^\/api\/admin\/qa-rows\/(resources|resource_edits|bookmark_collections)\/\d+$/],
];

const writeAllowed = (auth: AuthState, method: string, pathname: string, tier2: boolean) =>
  auth.startsWith("audit") && (tier2 ? [...CLERK_WRITES, ...AUDIT_WRITES] : CLERK_WRITES).some(([m, re]) => m === method && re.test(pathname));

export interface Violation {
  method: string;
  url: string;
}

export interface ConsoleError {
  auth: AuthState;
  page: string;
  text: string;
}

export interface KitContext {
  readonly auth: AuthState;
  readonly context: BrowserContext;
  newPage(): Promise<Page>;
  /** Curl-checks the URL (must answer 200), then opens it and waits for the network to settle. */
  open(page: Page, path: string): Promise<void>;
  close(): Promise<void>;
}

export interface BrowserKit {
  readonly violations: Violation[];
  readonly consoleErrors: ConsoleError[];
  newContext(auth: AuthState, viewport?: { width: number; height: number }): Promise<KitContext>;
  screenshot(page: Page, id: string): Promise<string>;
  close(): Promise<void>;
}

async function launch(): Promise<Browser> {
  try {
    return await chromium.launch();
  } catch (err) {
    if (!String(err).includes('Executable doesn\'t exist')) throw err;
    return chromium.launch({ channel: "chrome" });
  }
}

export async function createBrowserKit(base: string, http: HttpClient, evidenceDir: string, tier2 = false): Promise<BrowserKit> {
  const browser = await launch();
  const host = new URL(base).host;
  const violations: Violation[] = [];
  const consoleErrors: ConsoleError[] = [];
  const isFirstParty = (url: string) => {
    const h = new URL(url).host;
    return h === host || h.endsWith("." + host);
  };

  return {
    violations,
    consoleErrors,
    async newContext(auth, viewport) {
      const context = await browser.newContext(viewport ? { viewport } : {});
      await context.route("**/*", (route) => {
        const req = route.request();
        if (isFirstParty(req.url()) && !SAFE_METHODS.has(req.method()) && !writeAllowed(auth, req.method(), new URL(req.url()).pathname, tier2)) {
          violations.push({ method: req.method(), url: redact(req.url().split("?")[0]) });
          return route.abort();
        }
        return route.continue(isFirstParty(req.url()) ? { headers: { ...req.headers(), ...AUDIT_RUN_HEADER } } : undefined);
      });
      if (auth === "owner") {
        await context.addCookies(http.ownerCookies().map((c) => ({ ...c, url: base })));
      }
      const webdriver = await (async () => {
        const probe = await context.newPage();
        const value = await probe.evaluate(() => navigator.webdriver);
        await probe.close();
        return value;
      })();
      if (webdriver !== true) throw new Error("navigator.webdriver is not true: analytics would record this run");

      return {
        auth,
        context,
        async newPage() {
          const page = await context.newPage();
          const record = (text: string) => consoleErrors.push({ auth, page: new URL(page.url(), base).pathname, text: redact(text) });
          page.on("pageerror", (err) => record(`pageerror: ${err.message}`));
          page.on("console", (msg) => {
            if (msg.type() !== "error") return;
            const url = msg.location().url;
            const external429 = msg.text().includes('status of 429') && url && !isFirstParty(url);
            if (!external429) record(msg.text());
          });
          return page;
        },
        async open(page, path) {
          const url = new URL(path, base);
          if (url.host !== host || !SAFE_PATH.test(url.pathname + url.search + url.hash)) {
            throw new Error(`refusing to open ${path}: not a well-formed ${host} path`);
          }
          if (auth !== "visitor" && url.pathname.startsWith("/resource/")) {
            throw new Error("refusing to open a resource page on a signed-in context: it records a view interaction");
          }
          const probe = await http.get(url.pathname + url.search);
          if (probe.status !== 200) throw new Error(`${url.pathname} answered ${probe.status}; not opening it in the browser`);
          await page.goto(url.href, { waitUntil: "domcontentloaded" });
          await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
        },
        close: () => context.close(),
      };
    },
    async screenshot(page, id) {
      const dir = join(evidenceDir, "screenshots");
      mkdirSync(dir, { recursive: true });
      const file = join(dir, `${id}.png`);
      await page.screenshot({ path: file, fullPage: false }).catch(() => undefined);
      return file;
    },
    close: () => browser.close(),
  };
}
