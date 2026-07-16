// Run13 BUG-028: resources whose url is http:// get upgraded to https://
// ONLY when the https origin actually answers (2xx/3xx on a GET). Hosts that
// don't serve TLS keep their http URL and are journaled as documented
// TLS-less hosts. Idempotent: re-running skips rows already upgraded.
//
// Usage: npx tsx scripts/run13-https-upgrade.ts
import { Pool } from "pg";
import fs from "fs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function httpsAnswers(url: string): Promise<{ ok: boolean; detail: string }> {
  const httpsUrl = url.replace(/^http:\/\//, "https://");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(httpsUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; awesome-video-linkcheck)" },
    });
    return { ok: res.status < 400, detail: `GET ${res.status}` };
  } catch (e: any) {
    return { ok: false, detail: `error: ${e?.cause?.code || e?.name || e?.message}` };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const { rows } = await pool.query(
    `SELECT id, url, title FROM resources WHERE url LIKE 'http://%' ORDER BY id`,
  );
  console.log(`http:// resources found: ${rows.length}`);
  const journal: any[] = [];
  for (const r of rows) {
    const check = await httpsAnswers(r.url);
    if (check.ok) {
      const newUrl = r.url.replace(/^http:\/\//, "https://");
      // Don't collide with an existing https twin of the same URL.
      const dup = await pool.query(`SELECT id FROM resources WHERE url = $1 AND id <> $2`, [newUrl, r.id]);
      if (dup.rows.length > 0) {
        journal.push({ id: r.id, url: r.url, action: "skipped-duplicate-https-twin", twin: dup.rows[0].id, detail: check.detail });
        console.log(`SKIP  ${r.id} ${r.url} — https twin exists (${dup.rows[0].id})`);
        continue;
      }
      await pool.query(`UPDATE resources SET url = $1 WHERE id = $2`, [newUrl, r.id]);
      journal.push({ id: r.id, from: r.url, to: newUrl, action: "upgraded", detail: check.detail });
      console.log(`UPGRADE ${r.id} ${r.url} -> https (${check.detail})`);
    } else {
      journal.push({ id: r.id, url: r.url, action: "kept-http-tls-less-host", detail: check.detail });
      console.log(`KEEP  ${r.id} ${r.url} — https unreachable (${check.detail})`);
    }
  }
  fs.mkdirSync("evidence/run13", { recursive: true });
  fs.writeFileSync(
    "evidence/run13/bug028-https-upgrade.json",
    JSON.stringify({ ranAt: new Date().toISOString(), total: rows.length, journal }, null, 2),
  );
  const remaining = await pool.query(`SELECT count(*)::int c FROM resources WHERE url LIKE 'http://%'`);
  console.log(`Remaining http:// rows: ${remaining.rows[0].c}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
