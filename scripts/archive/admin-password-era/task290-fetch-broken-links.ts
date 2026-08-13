/** Task 290: dump latest completed prod link-health job's broken/suspect entries. */
import fs from "fs";
const BASE = process.env.PROD_BASE || "https://awesome.video";
const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD;
if (!PASSWORD) { console.error("ADMIN_PASSWORD not set"); process.exit(1); }

let cookie = "";
async function login() {
  for (let a = 1; a <= 4; a++) {
    const r = await fetch(`${BASE}/api/auth/local/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (r.ok) {
      const sc: string[] = (r.headers as any).getSetCookie?.() ?? [r.headers.get("set-cookie")].filter(Boolean);
      cookie = sc.find((c) => c.startsWith("connect.sid="))!.split(";")[0];
      return;
    }
    console.log(`[login] attempt ${a} -> ${r.status}`);
    await new Promise((res) => setTimeout(res, 5000 * a));
  }
  throw new Error("login failed");
}
async function api(path: string) {
  const r = await fetch(`${BASE}${path}`, { headers: { Origin: BASE, Cookie: cookie } });
  return { status: r.status, body: await r.json().catch(() => null) };
}
async function main() {
  await login();
  const st = await api(`/api/admin/link-health/status`);
  console.log("status:", JSON.stringify(st.body));
  const bl = await api(`/api/admin/link-health/broken-links`);
  if (bl.status !== 200) throw new Error(`broken-links -> ${bl.status}`);
  fs.mkdirSync("evidence/task290", { recursive: true });
  fs.writeFileSync("evidence/task290/broken-links-raw.json", JSON.stringify(bl.body, null, 2));
  const checks = bl.body.checks || [];
  console.log(`total flagged: ${checks.length}`);
  for (const c of checks) {
    console.log(JSON.stringify({ id: c.resourceId ?? c.resource_id, st: c.status, http: c.httpStatus ?? c.http_status, err: c.errorMessage ?? c.error, url: c.url, final: c.finalUrl ?? c.final_url }));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
