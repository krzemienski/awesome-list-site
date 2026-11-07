import type { Ctx } from "../registry.ts";

export interface Sitemap {
  paths: string[];
  byType: Map<string, string[]>;
}

/** Deterministic PRNG so a run id reproduces the same random picks. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFor(runId: string, salt: string): () => number {
  let h = 2166136261;
  for (const ch of runId + salt) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return mulberry32(h);
}

export async function loadSitemap(ctx: Ctx): Promise<Sitemap> {
  const cached = ctx.shared.get("sitemap") as Sitemap | undefined;
  if (cached) return cached;
  const res = await ctx.http.get("/sitemap.xml");
  if (res.status !== 200) throw new Error(`/sitemap.xml returned ${res.status}`);
  const paths = [...res.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
    const u = new URL(m[1].trim());
    return u.pathname + u.search;
  });
  const byType = new Map<string, string[]>();
  for (const p of paths) {
    const type = p.split(/[/?]/)[1] ?? "";
    byType.set(type, [...(byType.get(type) ?? []), p]);
  }
  const sitemap = { paths, byType };
  ctx.shared.set("sitemap", sitemap);
  return sitemap;
}

/** Picks n distinct paths of a type; paged variants (`?page=2`) are excluded. */
export function pick(sitemap: Sitemap, type: string, n: number, rng: () => number): string[] {
  const pool = (sitemap.byType.get(type) ?? []).filter((p) => !p.includes("?"));
  const chosen: string[] = [];
  while (chosen.length < n && pool.length) chosen.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return chosen;
}
