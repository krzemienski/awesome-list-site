import { token, loadState, BASE, api } from "./lib.mjs";
import fs from "node:fs";
const s = loadState();
const out = {};
for (const [who, u] of [["admin", s.users.admin], ["submitter", s.users.submitter]]) {
  const res = await fetch(`${BASE}/api/claude/analyze`, { method: "POST", headers: { "Content-Type": "application/json", Origin: BASE, Authorization: `Bearer ${await token(u)}` }, body: JSON.stringify({ url: "not-a-url" }) });
  out[who] = { status: res.status, ratelimit: res.headers.get("ratelimit"), ratelimitPolicy: res.headers.get("ratelimit-policy"), remaining: res.headers.get("ratelimit-remaining"), body: (await res.text()).slice(0, 200) };
}
out.aiHealth = (await api(s.users.admin, "GET", "/api/health/ai")).body.requestCount;
fs.writeFileSync("/tmp/qa582/quota-probe.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
