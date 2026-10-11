// Downloads every JS chunk reachable from production's entry module and greps
// for UI copy that only the final F01–F13 code renders (states that cannot be
// triggered read-only: reseed failure, partial seed, failed/cancelled scans,
// partial GitHub import). Anonymous GETs of public static assets only.
const BASE = process.env.BASE || "https://awesome.video";
const html = await (await fetch(BASE + "/")).text();
const seen = new Set(); const queue = [...html.matchAll(/\/assets\/[A-Za-z0-9_.-]+\.js/g)].map((m) => m[0]);
const bodies = {};
while (queue.length) {
  const p = queue.shift(); if (seen.has(p)) continue; seen.add(p);
  const r = await fetch(BASE + p); if (!r.ok) continue; const t = await r.text(); bodies[p] = t;
  for (const m of t.matchAll(/(?:\/assets\/|\.\/|")([A-Za-z0-9_-]+-[A-Za-z0-9_-]{8}\.js)/g)) queue.push("/assets/" + m[1]);
}
console.log("chunks downloaded:", Object.keys(bodies).length);
const markers = {
  F01: ["database unchanged", "seed-result-failed"],
  F02: ["Seeding partially failed", "seed-result-partial"],
  F03: ["Non-restorable catalog snapshot"],
  F04_absent: ["No supported admin endpoint is currently available for this format"],
  F05: ["resources.exported", "categories.exported"],
  F08: ["Link health data could not be refreshed"],
  F09: ["Counts and problem links below are from the previous completed scan"],
  F10: ["Cancel running scan"],
  F11: ["Cancel link check", "Checks the stored URL of every approved resource"],
  F13: ["Failed items ("],
};
for (const [k, list] of Object.entries(markers)) for (const s of list) {
  const hits = Object.entries(bodies).filter(([, t]) => t.includes(s)).map(([p]) => p);
  console.log(`${k.padEnd(10)} ${hits.length ? "FOUND " : "absent"} ${JSON.stringify(s)} ${hits.slice(0, 2).join(" ")}`);
}
