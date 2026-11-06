import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { register, pass, fail, info } from "../registry.ts";

const git = promisify(execFile);
const REPO = fileURLToPath(new URL("../../..", import.meta.url));
const run = (...args: string[]) => git("git", ["-C", REPO, ...args]).then((r) => r.stdout.trim());

async function mainHead(): Promise<string> {
  const origin = await run("remote", "get-url", "origin");
  if (!origin.includes("awesome-list-site")) throw new Error("git remote origin is not awesome-list-site");
  return (await run("ls-remote", "origin", "refs/heads/main")).split(/\s/)[0];
}

async function commitsAhead(live: string, main: string): Promise<string> {
  try {
    return await run("rev-list", "--count", `${live}..${main}`);
  } catch {
    return "unknown";
  }
}

register(
  {
    id: "T0-01",
    tier: 0,
    kind: "api",
    blocking: true,
    async run(ctx) {
      const live = (await ctx.http.get("/api/version")).json<{ revision: string }>().revision;
      const main = await mainHead();
      if (live === main) return pass(`live revision = main ${main.slice(0, 8)}`, { live, main });
      if (ctx.schedule) {
        const n = await commitsAhead(live, main);
        return info(`main ahead of prod by ${n} commits (live ${live.slice(0, 8)}, main ${main.slice(0, 8)})`, { live, main, ahead: n });
      }
      return fail(`live ${live.slice(0, 8)} != main ${main.slice(0, 8)}`, { live, main });
    },
  },
  {
    id: "T0-02",
    tier: 0,
    kind: "api",
    blocking: true,
    async run(ctx) {
      const res = await ctx.http.get("/api/health/ready");
      return res.status === 200 ? pass(`ready probe 200 in ${res.ms} ms`) : fail(`ready probe answered ${res.status}`);
    },
  },
  {
    id: "T0-03",
    tier: 0,
    kind: "api",
    blocking: true,
    async run(ctx) {
      const res = await ctx.http.get("/");
      if (res.status !== 200) return fail(`home answered ${res.status}`);
      return res.ms < 5000 ? pass(`home 200 in ${res.ms} ms`, { ms: res.ms }) : fail(`home took ${res.ms} ms (limit 5000)`, { ms: res.ms });
    },
  },
);
