// V15 re-proof — a research run that ends in an SDK error result (budget exhausted) must persist the usage the
// result message reported, not 0 turns / $0.00. One real paid run on scratch instance A (:5161), tight cap $0.05.
// Env: DATABASE_URL = scratch URL, BASE_URL = http://127.0.0.1:5161.
import { BASE, q, writeJson, sleep, PREFIX } from "./lib.mjs";

if (!/awesome_scratch_592/.test(process.env.DATABASE_URL ?? "")) throw new Error("refusing: DATABASE_URL is not the scratch DB");
process.on("unhandledRejection", (e) => console.error("unhandled (ignored)", String(e).slice(0, 200)));
const out = { started: new Date().toISOString() };
const api = async (path, init = {}) => {
  const r = await fetch(`${BASE}${path}`, { ...init, headers: { "Content-Type": "application/json", Origin: BASE, "X-Admin-Audit-Key": process.env.ADMIN_PASSWORD } });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, json: j };
};
let id = null;
try {
  for (let i = 0; i < 90; i++) { try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch {} await sleep(1000); }
  const s = await api("/api/researcher/start", { method: "POST", body: JSON.stringify({
    prompt: `Find ONE open-source video quality metrics tool not already in the database. ${PREFIX}v15b usage-on-failure re-proof.`,
    maxTurns: 12, maxBudgetUsd: 0.05, targetDiscoveries: 1 }) });
  id = s.json?.jobId; out.start = { status: s.status, body: s.json };
  console.log("start", JSON.stringify(out.start));
  let j; const t0 = Date.now();
  while (Date.now() - t0 < 8 * 60_000) {
    j = (await api(`/api/researcher/jobs/${id}`)).json;
    if (["completed", "failed", "cancelled"].includes(j?.status)) break;
    await sleep(5000);
  }
  const ev = await q(`SELECT seq, event_type, summary, tokens_in, tokens_out, cost_usd, detail FROM agent_events WHERE job_type='research' AND job_id=$1 ORDER BY seq`, [id]);
  const result = ev.find((e) => e.event_type === "result");
  out.job = { status: j.status, error: j.errorMessage, turnsUsed: j.turnsUsed, inTok: j.totalInputTokens, outTok: j.totalOutputTokens, cost: j.estimatedCostUsd, totalDiscoveries: j.totalDiscoveries };
  out.resultEvent = result ? { seq: result.seq, summary: result.summary, tokensIn: result.tokens_in, tokensOut: result.tokens_out, cost: result.cost_usd, detail: result.detail } : null;
  out.eventCount = ev.length;
  out.match = result ? {
    turns: Number(j.turnsUsed) === Number(result.detail?.num_turns ?? -1),
    tokensIn: Number(j.totalInputTokens) === Number(result.tokens_in),
    tokensOut: Number(j.totalOutputTokens) === Number(result.tokens_out),
    cost: Math.abs(Number(j.estimatedCostUsd) - Number(result.cost_usd)) < 0.0001,
  } : null;
  console.log("job", JSON.stringify(out.job)); console.log("result", JSON.stringify(out.resultEvent)); console.log("match", JSON.stringify(out.match));
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  if (id) {
    const created = await q(`SELECT created_resource_id FROM research_discoveries WHERE job_id=$1 AND created_resource_id IS NOT NULL`, [id]);
    const rids = `{${created.map((r) => r.created_resource_id).join(",")}}`;
    await q(`UPDATE research_discoveries SET created_resource_id=NULL WHERE job_id=$1`, [id]);
    await q(`DELETE FROM resource_audit_log WHERE resource_id = ANY($1::int[])`, [rids]);
    await q(`DELETE FROM resources WHERE id = ANY($1::int[])`, [rids]);
    await q(`DELETE FROM research_discoveries WHERE job_id=$1`, [id]);
    await q(`DELETE FROM agent_events WHERE job_type='research' AND job_id=$1`, [id]);
    await q(`DELETE FROM research_jobs WHERE id=$1`, [id]);
  }
  out.residue = (await q(`SELECT (SELECT count(*) FROM research_jobs WHERE prompt LIKE '%\\_\\_qa\\_test\\_plan\\_592\\_%')::int jobs,
    (SELECT count(*) FROM agent_events WHERE job_type='research' AND job_id=$1)::int events,
    (SELECT count(*) FROM research_jobs WHERE status IN ('pending','processing'))::int active`, [id ?? -1]))[0];
  console.log("residue", JSON.stringify(out.residue));
  writeJson("/tmp/v592out/v15b-usage-on-failure.json", out);
  process.exit(0);
}
