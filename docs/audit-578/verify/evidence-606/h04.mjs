import http from "node:http"; import https from "node:https";
const B = process.env.B || "http://127.0.0.1:5000";
const raw = (path) => new Promise((res, rej) => { const u = new URL(B); const mod = u.protocol==="https:"?https:http; const req = mod.request({ host: u.hostname, port: u.port||undefined, path, method: "GET" }, r => { let b=""; r.on("data", c=>b+=c); r.on("end", ()=>res({status:r.statusCode, loc:r.headers.location, body:b})); }); req.on("error", rej); req.end(); });
const canon = (b) => (b.match(/<link rel="canonical" href="([^"]+)"/)||[])[1];
const title = (b) => (b.match(/<title>([^<]*)<\/title>/)||[])[1];
const paths = process.argv.slice(2);
for (const p of paths) {
  let cur = p, hops = 0, r;
  while (true) { r = await raw(cur); if (r.status >= 300 && r.status < 400 && hops < 5) { hops++; cur = r.loc; } else break; }
  console.log(JSON.stringify({ request: p, hops, final: cur, status: r.status, canonical: canon(r.body), title: title(r.body) }));
}
