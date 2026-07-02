import { checkResourceLinks, type LinkCheckResult } from "../server/validation/linkChecker";
import fs from "fs";

const OUT_DIR = ".local/prod-link-scan";
fs.mkdirSync(OUT_DIR, { recursive: true });

const log = (msg: string) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(`${OUT_DIR}/progress.log`, line + "\n");
};

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

async function browserVerify(url: string): Promise<{ status: number | string; finalUrl?: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(t);
    return { status: r.status, finalUrl: r.url };
  } catch (e: any) {
    clearTimeout(t);
    return { status: "ERR:" + (e?.cause?.code || e?.name || "unknown") };
  }
}

async function main() {
  const BUDGET_MS = 88000;
  const started = Date.now();

  // Cache the prod resource list so every invocation sees the same snapshot
  let resources: { id: number; title: string; url: string; category: string }[];
  const resFile = `${OUT_DIR}/resources.json`;
  if (fs.existsSync(resFile)) {
    resources = JSON.parse(fs.readFileSync(resFile, "utf8"));
  } else {
    log("Fetching production resources...");
    const resp = await fetch("https://awesome.video/api/resources?limit=3000");
    const data = (await resp.json()) as { resources: typeof resources };
    resources = data.resources;
    fs.writeFileSync(resFile, JSON.stringify(resources));
    log(`Fetched ${resources.length} approved resources from production.`);
  }

  // Resumable pass 1: process chunks until the time budget is used up
  const stateFile = `${OUT_DIR}/state.json`;
  const pass1File = `${OUT_DIR}/pass1.jsonl`;
  const state = fs.existsSync(stateFile)
    ? JSON.parse(fs.readFileSync(stateFile, "utf8"))
    : { nextIndex: 0 };

  const CHUNK = 100;
  while (state.nextIndex < resources.length && Date.now() - started < BUDGET_MS) {
    const chunk = resources.slice(state.nextIndex, state.nextIndex + CHUNK);
    const report = await checkResourceLinks(
      chunk.map((r) => ({ id: r.id, title: r.title, url: r.url })),
      { timeout: 12000, concurrent: 20, retryCount: 0 },
    );
    fs.appendFileSync(pass1File, report.results.map((r) => JSON.stringify(r)).join("\n") + "\n");
    state.nextIndex += chunk.length;
    fs.writeFileSync(stateFile, JSON.stringify(state));
    log(`Pass 1 progress: ${state.nextIndex}/${resources.length}`);
  }

  if (state.nextIndex < resources.length) {
    log(`PAUSED at ${state.nextIndex}/${resources.length} — rerun to continue.`);
    return;
  }

  const allResults: LinkCheckResult[] = fs
    .readFileSync(pass1File, "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  const failures = allResults.filter((r) => !r.valid);
  log(`Pass 1 complete: ${allResults.length - failures.length} ok, ${failures.length} flagged. Pass 2 verifying flagged with browser UA...`);

  // Pass 2: browser-UA GET verification of every pass-1 failure (resumable)
  const byId = new Map(resources.map((r) => [r.id, r]));
  const pass2File = `${OUT_DIR}/pass2.jsonl`;
  const doneIds = new Set<number>();
  if (fs.existsSync(pass2File)) {
    for (const l of fs.readFileSync(pass2File, "utf8").trim().split("\n").filter(Boolean)) {
      doneIds.add(JSON.parse(l).resourceId);
    }
  }
  const pending = failures.filter((f) => !doneIds.has(f.resourceId!));
  const P2_CONC = 10;
  for (let i = 0; i < pending.length; i += P2_CONC) {
    if (Date.now() - started >= BUDGET_MS) {
      log(`Pass 2 PAUSED at ${doneIds.size + i}/${failures.length} — rerun to continue.`);
      return;
    }
    const batch = pending.slice(i, i + P2_CONC);
    const out = await Promise.all(
      batch.map(async (f) => {
        const v = await browserVerify(f.url);
        return { ...f, verifyStatus: v.status, verifyFinalUrl: v.finalUrl };
      }),
    );
    fs.appendFileSync(pass2File, out.map((r) => JSON.stringify(r)).join("\n") + "\n");
    if ((i / P2_CONC) % 5 === 0) log(`Pass 2 progress: ${doneIds.size + i + batch.length}/${failures.length}`);
  }
  const verified: any[] = fs
    .readFileSync(pass2File, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  // Classify
  const classify = (r: any): string => {
    const vs = r.verifyStatus;
    if (typeof vs === "string") {
      if (vs.includes("ENOTFOUND")) return "dead_dns";
      if (vs.includes("ECONNREFUSED")) return "dead_refused";
      if (vs.includes("CERT")) return "dead_ssl";
      if (vs.includes("Abort") || vs.includes("Timeout")) return "timeout";
      return "dead_conn";
    }
    if (vs >= 200 && vs < 400) return "ok_botblock_only";
    if (vs === 404 || vs === 410) return "dead_404";
    if (vs === 403 || vs === 401 || vs === 429 || vs === 999) return "botblock_or_auth";
    if (vs >= 500) return "server_error";
    return "other_" + vs;
  };

  const final = verified.map((r) => {
    const res = byId.get(r.resourceId);
    return {
      resourceId: r.resourceId,
      title: r.resourceTitle,
      category: res?.category,
      url: r.url,
      pass1Status: r.status || r.statusText,
      verifyStatus: r.verifyStatus,
      verifyFinalUrl: r.verifyFinalUrl,
      classification: classify(r),
    };
  });

  const counts: Record<string, number> = {};
  for (const f of final) counts[f.classification] = (counts[f.classification] || 0) + 1;

  fs.writeFileSync(
    `${OUT_DIR}/results.json`,
    JSON.stringify({ scannedAt: new Date().toISOString(), total: resources.length, pass1Failures: failures.length, counts, flagged: final }, null, 2),
  );
  log(`DONE. Classification counts: ${JSON.stringify(counts)}`);
}

main().catch((e) => {
  log("FATAL: " + (e?.stack || e));
  process.exit(1);
});
