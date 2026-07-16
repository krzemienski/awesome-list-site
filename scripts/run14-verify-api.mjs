// Run14 API verification: BUG-050/051/035/030/010/053/021/043/045/046/047/039
const BASE = "http://localhost:5000";
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${detail}`);
};
const j = async (path, opts) => {
  const r = await fetch(BASE + path, opts);
  let body = null;
  try { body = await r.clone().json(); } catch { body = await r.text().catch(() => null); }
  return { r, body };
};

// BUG-050: page size capped at 100
{
  const { body } = await j("/api/resources?limit=1000");
  const items = body?.resources ?? body?.items ?? body?.data ?? [];
  ok("BUG-050 page cap", Array.isArray(items) && items.length <= 100 && items.length > 0,
    `limit=1000 returned ${Array.isArray(items) ? items.length : "?"} rows`);
}

// BUG-051: canonical 401 envelope { message: "Unauthorized" } everywhere
{
  const probes = [
    ["GET", "/api/auth/me"],
    ["GET", "/api/admin/users"],
    ["POST", "/api/submit"],
  ];
  const det = [];
  let all = true;
  for (const [method, path] of probes) {
    const { r, body } = await j(path, { method, headers: { "Content-Type": "application/json" }, body: method === "POST" ? "{}" : undefined });
    const good = r.status === 401 && body && typeof body === "object" && body.message === "Unauthorized" && Object.keys(body).length === 1;
    det.push(`${method} ${path} -> ${r.status} ${JSON.stringify(body)}`);
    if (!good) all = false;
  }
  ok("BUG-051 401 envelope", all, det.join(" | "));
}

// BUG-035: 306-char email rejected on register
{
  const email = "a".repeat(294) + "@example.com"; // 306 chars
  const { r, body } = await j("/api/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "ValidPassw0rd!x" }),
  });
  ok("BUG-035 email length cap", r.status === 400,
    `306-char email -> ${r.status} ${JSON.stringify(body).slice(0, 120)}`);
}

// BUG-030: login timing oracle equalized (bcrypt burn on no-user path) + generic message
{
  const attempt = async (email) => {
    const t0 = performance.now();
    const { r, body } = await j("/api/auth/local/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "definitely-Wrong-Pass1!" }),
    });
    return { ms: performance.now() - t0, status: r.status, msg: body?.message ?? JSON.stringify(body) };
  };
  const ghost1 = await attempt("no-such-user-run14@example.com");
  const ghost2 = await attempt("no-such-user-run14b@example.com");
  const real = await attempt("admin@example.com"); // wrong password, real account
  const ghostMin = Math.min(ghost1.ms, ghost2.ms);
  const ratio = ghostMin > 0 ? real.ms / ghostMin : Infinity;
  const timingOk = ghostMin >= 50 && ratio < 3 && ratio > 1 / 3;
  const msgOk = [ghost1, ghost2, real].every(a => a.status === 401 && a.msg === "Invalid email or password");
  ok("BUG-030 login timing + generic msg", timingOk && msgOk,
    `ghost=${ghost1.ms.toFixed(0)}/${ghost2.ms.toFixed(0)}ms real=${real.ms.toFixed(0)}ms ratio=${ratio.toFixed(2)} msgs=${msgOk}`);
}

// BUG-010: server titles disambiguate same-named sub-subcategories
{
  const want = {
    "ffmpeg": "FFMPEG – Encoding Tools — Awesome Video",
    "ffmpeg-sc2222": "FFMPEG – FFmpeg-Based Tools — Awesome Video",
    "av1": "AV1 – Codecs — Awesome Video",
    "av1-sc2275": "AV1 – Open Source Encoder Projects — Awesome Video",
  };
  const det = [];
  let all = true;
  for (const [slug, expected] of Object.entries(want)) {
    const r = await fetch(`${BASE}/sub-subcategory/${slug}`, { headers: { "User-Agent": "Googlebot" } });
    const html = await r.text();
    const m = html.match(/<title>([^<]*)<\/title>/);
    const got = m ? m[1] : "(none)";
    if (got !== expected) all = false;
    det.push(`${slug}: "${got}"`);
  }
  ok("BUG-010 server title disambiguation", all, det.join(" | "));
}

// BUG-053: sitemap sub-subcategory set == non-empty node set
{
  const smText = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const smSlugs = new Set(
    [...smText.matchAll(/\/sub-subcategory\/([a-z0-9-]+)<\/loc>/g)].map(m => m[1])
  );
  const { body: tree } = await j("/api/awesome-list");
  const nonEmpty = new Set();
  const empty = new Set();
  tree.categories.forEach(c => c.subcategories?.forEach(sc => sc.subSubcategories?.forEach(ss => {
    if ((ss.resources?.length ?? 0) > 0) nonEmpty.add(ss.slug); else empty.add(ss.slug);
  })));
  const missing = [...nonEmpty].filter(s => !smSlugs.has(s));
  const extra = [...smSlugs].filter(s => !nonEmpty.has(s));
  ok("BUG-053 sitemap excludes empty nodes", missing.length === 0 && extra.length === 0,
    `sitemap=${smSlugs.size} nonEmpty=${nonEmpty.size} emptyNodes=${empty.size} missing=${missing.slice(0,3)} extra=${extra.slice(0,3)}`);
}

// Data fixes visible through the public API
{
  const { r, body } = await j("/api/resources/186449");
  ok("BUG-021 DASHSchema retitle", r.status === 200 && body?.title === "MPEG-DASH MPD XML Schema (DASHSchema)",
    `186449 -> ${r.status} "${body?.title}"`);
}
{
  const { r, body } = await j("/api/resources/186299");
  ok("BUG-045 rfc8216bis retitle", r.status === 200 && /rfc8216bis/i.test(body?.title ?? ""),
    `186299 -> ${r.status} "${body?.title}"`);
}
{
  const { r, body } = await j("/api/resources/185706");
  ok("BUG-046 repo-slug stripped", r.status === 200 && !/rokudev\/videoplayer-channel/.test(body?.description ?? ""),
    `185706 desc tail: "...${(body?.description ?? "").slice(-60)}"`);
}
{
  const { r, body } = await j("/api/resources/186101");
  const d = body?.description ?? "";
  ok("BUG-047 mid-word truncation fixed", r.status === 200 && /tasks\.$/.test(d) && !/\.\.\.$|…$/.test(d),
    `186101 desc tail: "...${d.slice(-60)}"`);
}
{
  const { r } = await j("/api/resources/185391");
  ok("BUG-043 soft-404 resource rejected/hidden", r.status === 404, `185391 -> ${r.status} (rejected rows are hidden)`);
}

// BUG-039: no duplicate resources within any journey
{
  const { body } = await j("/api/journeys");
  const journeys = Array.isArray(body) ? body : body?.journeys ?? [];
  let dupTotal = 0;
  const det = [];
  for (const jn of journeys) {
    const { body: d } = await j(`/api/journeys/${jn.id}`);
    const steps = d?.steps ?? d?.journey?.steps ?? [];
    const ids = steps.map(s => s.resourceId ?? s.resource_id).filter(Boolean);
    const dups = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dups.length) { dupTotal += dups.length; det.push(`j${jn.id}: dup ${dups}`); }
  }
  ok("BUG-039 no journey dups", journeys.length > 0 && dupTotal === 0,
    `${journeys.length} journeys checked, ${dupTotal} dup step resources ${det.join(";")}`);
}

const failed = results.filter(x => !x.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
