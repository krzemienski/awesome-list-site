/**
 * Tier 2: the write path, driven as two dedicated audit accounts (reports/prod-ops-2026-11-06/lanes/tier2-spec.md).
 * Every row it creates is titled `[QA-<run>]`; T2-10 removes them through /api/admin/qa-rows, T2-11 proves they are gone.
 * It never approves anything and never sends the analytics consent header.
 */
import { register, pass, fail, skip, verdict, type Check, type Ctx, type Result } from "../registry.ts";
import { loadCredentials, openActor, type Actor } from "../lib/audit-actor.ts";

interface Rows { id: number; title?: string; status?: string; notes?: string; deletable?: boolean }
interface QaRows { counts: Record<string, number>; rows: Record<string, Rows[]> }

const QA_TABLES = ["resources", "resource_edits", "bookmark_collections"] as const;

/** Finds the first object anywhere in a JSON value whose `id` is `id`. */
function findById(value: unknown, id: number): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = findById(item, id);
      if (hit) return hit;
    }
  } else if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (obj.id === id) return obj;
    for (const child of Object.values(obj)) {
      const hit = findById(child, id);
      if (hit) return hit;
    }
  }
  return undefined;
}

const state = (ctx: Ctx) => ctx.shared;
const actors = (ctx: Ctx) => state(ctx).get("t2.actors") as { admin: Actor; member: Actor };
const num = (ctx: Ctx, key: string) => state(ctx).get(key) as number | undefined;
const runPrefix = (ctx: Ctx) => `[QA-${ctx.runId}]`;
const title = (ctx: Ctx, label: string) => `${runPrefix(ctx)} ${label}`;
const qaUrl = (ctx: Ctx, n: number) => `${ctx.base}/qa-probe/${ctx.runId}-${n}`;

/** A step that runs only when the steps it depends on stored their ids. */
function step(id: string, needs: string[], run: (ctx: Ctx, a: { admin: Actor; member: Actor }) => Promise<Result>): Check {
  return {
    id, tier: 2, kind: "api", blocking: true,
    async run(ctx) {
      const missing = needs.filter((key) => state(ctx).get(key) === undefined);
      if (missing.length) return skip(`needs ${missing.join(", ")}`);
      return run(ctx, actors(ctx));
    },
  };
}

async function submit(ctx: Ctx, member: Actor, label: string, n: number): Promise<{ id?: number; problems: string[] }> {
  const res = await member.call("POST", "/api/resources", {
    title: title(ctx, label),
    url: qaUrl(ctx, n),
    description: `QA probe, safe to delete. Created by the prod-check Tier 2 run ${ctx.runId}.`,
    category: "Media Tools",
    metadata: { tags: ["qa-probe"] },
  });
  if (res.status !== 201) return { problems: [`submit answered ${res.status}`] };
  const row = res.json<{ id: number; status: string; submittedBy?: string }>();
  const problems: string[] = [];
  if (row.status !== "pending") problems.push(`status ${row.status}, expected pending`);
  if (row.submittedBy !== undefined && row.submittedBy !== member.id) problems.push("submittedBy is not the audit member");
  return { id: row.id, problems };
}

/** Only rows whose title carries this run's id, so another lane's [QA- rows are never touched. */
function ownRows(ctx: Ctx, found: QaRows) {
  return QA_TABLES.flatMap((table) => (found.rows[table] ?? []).filter((r) => r.title?.startsWith(runPrefix(ctx))).map((row) => ({ table, row })));
}

const listQaRows = async (admin: Actor) => admin.call("GET", "/api/admin/qa-rows");

/** Pending submissions carrying this run's prefix; real visitor submissions never count. */
async function pendingFromThisRun(ctx: Ctx, admin: Actor): Promise<Rows[]> {
  const queue = (await admin.call("GET", "/api/admin/pending-resources")).json<{ resources: Rows[] }>();
  return queue.resources.filter((r) => r.title?.startsWith(runPrefix(ctx)));
}

async function syncQueueTotal(admin: Actor): Promise<number | undefined> {
  const res = await admin.call("GET", "/api/github/sync-status");
  return res.status === 200 ? res.json<{ total: number }>().total : undefined;
}

const setup: Check = {
  id: "T2-00", tier: 2, kind: "browser", blocking: true,
  async run(ctx) {
    const adminCreds = loadCredentials("Admin");
    const memberCreds = loadCredentials("Member");
    if (!adminCreds || !memberCreds || !ctx.browser) return fail("audit credentials or ids missing");
    const admin = ctx.admin ?? (await openActor(ctx.browser, ctx.base, "Admin", adminCreds));
    const member = await openActor(ctx.browser, ctx.base, "Member", memberCreds);
    state(ctx).set("t2.actors", { admin, member });

    const problems: string[] = [];
    for (const [actor, label] of [[admin, "admin"], [member, "member"]] as const) {
      const who = (await actor.call("GET", "/api/auth/user")).json<{ user?: { id: string; role: string } }>().user;
      if (who?.id !== actor.id) problems.push(`${label} session is not the configured audit ${label}`);
      if (label === "admin" && who?.role !== "admin") problems.push("audit admin does not have role admin");
      if (label === "member" && who?.role !== "user") problems.push("audit member is not a plain user");
    }
    if (problems.length) return fail(problems.join("; "));

    const qa = await listQaRows(admin);
    if (qa.status === 403) return fail("QA_CLEANUP_USER_IDS does not list the audit accounts (publish the .replit change first)");
    if (qa.status !== 200) return fail(`qa-rows answered ${qa.status}`);
    const leftovers = Object.entries(qa.json<QaRows>().counts).filter(([t]) => QA_TABLES.includes(t as never));
    state(ctx).set("t2.ready", 1);
    return pass("both audit accounts signed in", { leftoversFromOtherRuns: Object.fromEntries(leftovers) });
  },
};

const submitStep = step("T2-01", ["t2.ready"], async (ctx, { member }) => {
  const { id, problems } = await submit(ctx, member, "submit probe", 1);
  if (id === undefined) return fail(problems.join("; "));
  state(ctx).set("t2.id1", id);
  const mine = findById((await member.call("GET", "/api/user/contributions")).json(), id);
  if (!mine) problems.push("not listed in the member's contributions");
  else if (mine.status !== "pending") problems.push(`contributions show status ${String(mine.status)}`);
  return verdict(problems, `submitted #${id}, pending, listed for the member`, { id });
});

const queueStep = step("T2-02", ["t2.id1"], async (ctx, { admin }) => {
  const id = num(ctx, "t2.id1")!;
  const queue = (await admin.call("GET", "/api/admin/pending-resources")).json<{ resources: Rows[]; total: number }>();
  const row = queue.resources.find((r) => r.id === id);
  const problems: string[] = [];
  if (!row) problems.push(`#${id} not in the pending queue`);
  else if (!row.title?.startsWith(runPrefix(ctx))) problems.push("queued title lost its prefix");
  return verdict(problems, `#${id} is in the approvals queue`);
});

const rejectStep = step("T2-03", ["t2.id1"], async (ctx, { admin, member }) => {
  const id = num(ctx, "t2.id1")!;
  const res = await admin.call("POST", `/api/admin/resources/${id}/reject`, { reason: `QA run ${ctx.runId}: rejecting a test submission.` });
  if (res.status !== 200) return fail(`reject answered ${res.status}`);
  const problems: string[] = [];
  if (res.json<{ status: string }>().status !== "rejected") problems.push("response is not rejected");
  const rejected = findById((await admin.call("GET", "/api/admin/resources?status=rejected&limit=50")).json(), id);
  if (!rejected) problems.push("not in the admin rejected list");
  if (findById((await admin.call("GET", "/api/admin/pending-resources")).json(), id)) problems.push("still in the pending queue");
  if (findById((await member.call("GET", "/api/user/contributions")).json(), id)?.status !== "rejected") problems.push("member does not see rejected");
  for (const path of [`/api/resources/${id}`, `/resource/${id}`]) {
    const status = (await ctx.http.get(path)).status;
    if (status !== 404) problems.push(`public ${path} answered ${status}, expected 404`);
  }
  if (rejected) state(ctx).set("t2.description0", typeof rejected.description === "string" ? rejected.description : "");
  return verdict(problems, `#${id} rejected; hidden from the public`);
});

const withdrawStep = step("T2-04", ["t2.ready"], async (ctx, { admin, member }) => {
  const { id, problems } = await submit(ctx, member, "withdraw probe", 2);
  if (id === undefined) return fail(problems.join("; "));
  state(ctx).set("t2.id2", id);
  const path = `/api/user/contributions/resource/${id}/withdraw`;
  const res = await member.call("POST", path);
  if (res.status !== 200 || res.json<{ current?: { status: string } }>().current?.status !== "withdrawn") problems.push(`withdraw answered ${res.status}`);
  const again = (await member.call("POST", path)).status;
  if (again !== 409) problems.push(`second withdraw answered ${again}, expected 409`);
  if (findById((await admin.call("GET", "/api/admin/pending-resources")).json(), id)) problems.push("withdrawn row is still queued");
  if (findById((await member.call("GET", "/api/user/contributions")).json(), id)?.status !== "withdrawn") problems.push("member does not see withdrawn");
  return verdict(problems, `#${id} submitted and withdrawn; second withdraw 409`);
});

async function pickBookmarkTarget(ctx: Ctx, member: Actor): Promise<number | undefined> {
  const listing = (await ctx.http.get("/api/resources?limit=10")).json();
  const mine = (await member.call("GET", "/api/bookmarks")).json();
  const ids = (Array.isArray(listing) ? listing : (listing as { resources?: unknown[] }).resources ?? []) as { id: number }[];
  return ids.map((r) => r.id).find((id) => typeof id === "number" && !findById(mine, id));
}

const bookmarkStep = step("T2-05", ["t2.ready"], async (ctx, { member }) => {
  const rid = await pickBookmarkTarget(ctx, member);
  if (rid === undefined) return fail("no approved resource that the audit member has not already bookmarked");
  const problems: string[] = [];
  const notes = `QA ${ctx.runId}`;
  try {
    const add = await member.call("POST", `/api/bookmarks/${rid}`, { notes });
    if (add.status !== 200) return fail(`bookmark add answered ${add.status}`);
    const saved = findById((await member.call("GET", "/api/bookmarks")).json(), rid);
    if (!saved) problems.push("bookmark not listed after add");
    else if (saved.notes !== notes) problems.push("bookmark notes lost");
  } finally {
    const remove = await member.call("DELETE", `/api/bookmarks/${rid}`);
    if (remove.status !== 200 && remove.status !== 404) problems.push(`bookmark remove answered ${remove.status}`);
  }
  if (findById((await member.call("GET", "/api/bookmarks")).json(), rid)) problems.push("bookmark still listed after remove");
  return verdict(problems, `bookmark on #${rid} added, read back, removed`, { resourceId: rid });
});

/** C-06 (F-MCON-01): submit under an awesome.video QA URL, withdraw, then prove the public surfaces never showed it. */
const submitWithdrawStep = step("C-06", ["t2.ready"], async (ctx, { member }) => {
  const name = `${runPrefix(ctx)} qa-audit-c06`;
  const res = await member.call("POST", "/api/resources", {
    title: name,
    url: `${ctx.base}/qa-audit-${ctx.runId}/c06`,
    description: `QA probe, safe to delete. Created by prod-check C-06 run ${ctx.runId}.`,
    category: "Media Tools",
    metadata: { tags: ["qa-probe"] },
  });
  if (res.status !== 201) return fail(`submit answered ${res.status}`);
  const row = res.json<{ id: number; status: string }>();
  state(ctx).set("t2.idc06", row.id);
  const problems: string[] = [];
  if (row.status !== "pending") problems.push(`status ${row.status}, expected pending`);
  const withdraw = await member.call("POST", `/api/user/contributions/resource/${row.id}/withdraw`);
  if (withdraw.status !== 200) problems.push(`withdraw answered ${withdraw.status}`);
  const publicStatus = (await ctx.http.get(`/api/resources/${row.id}`)).status;
  if (publicStatus !== 404) problems.push(`public GET /api/resources/${row.id} answered ${publicStatus}, expected 404`);
  const found = (await ctx.http.get(`/api/search?q=${encodeURIComponent(name)}`)).json<{ total: number }>().total;
  if (found !== 0) problems.push(`search for ${name} found ${found}, expected 0`);
  const sitemap = (await ctx.http.get("/sitemap.xml")).text;
  if ([`/resource/${row.id}<`, `qa-audit-${ctx.runId}`, name].some((needle) => sitemap.includes(needle))) problems.push("sitemap lists the withdrawn row");
  return verdict(problems, `#${row.id} submitted pending, withdrawn; public 404, search 0, sitemap 0`, { id: row.id });
});

const editStep = step("T2-06", ["t2.id1", "t2.description0"], async (ctx, { admin }) => {
  const id = num(ctx, "t2.id1")!;
  const original = state(ctx).get("t2.description0") as string;
  const queueBefore = await syncQueueTotal(admin);
  const problems: string[] = [];
  const edited = `[QA-${ctx.runId}] edited by Tier 2`;
  const put = (description: string) => admin.call("PUT", `/api/admin/resources/${id}`, { description });
  const readBack = async () => findById((await admin.call("GET", "/api/admin/resources?status=rejected&limit=50")).json(), id)?.description;

  if ((await put(edited)).status !== 200) return fail("edit answered non-200");
  if ((await readBack()) !== edited) problems.push("edit not visible on read-back");
  const revert = await put(original);
  if (revert.status !== 200) problems.push(`revert answered ${revert.status}`);
  if ((await readBack()) !== original) problems.push("revert not visible on read-back");
  const queueAfter = await syncQueueTotal(admin);
  if (queueBefore !== undefined && queueAfter !== undefined && queueAfter > queueBefore) problems.push(`GitHub sync queue grew ${queueBefore} -> ${queueAfter}`);
  return verdict(problems, `#${id} edited and reverted; sync queue ${queueBefore} -> ${queueAfter}`);
});

/** Runs from index.ts after every Tier 2 run, however it ended: backs up, then deletes this run's `[QA-<run>]` rows, one id per call. */
export const cleanup = step("T2-10", ["t2.ready"], async (ctx, { admin }) => {
  const listing = await listQaRows(admin);
  if (listing.status !== 200) return fail(`qa-rows answered ${listing.status}`);
  const found = listing.json<QaRows>();
  const targets = ownRows(ctx, found);
  if (targets.length === 0) return pass(`no ${runPrefix(ctx)} rows to remove`);

  const backup = await admin.call("POST", "/api/admin/database-backups");
  const sha = backup.status === 201 ? backup.json<{ dump?: { sha256?: string }; sha256?: string }>() : undefined;
  const backupSha256 = sha?.dump?.sha256 ?? sha?.sha256;
  if (!backupSha256) return fail(`backup answered ${backup.status}; nothing was deleted`);

  const problems: string[] = [];
  let removed = 0;
  // Edits go with their parent resource, so delete resources first and tolerate an already-gone edit row.
  for (const { table, row } of targets) {
    if (!row.deletable) { problems.push(`${table} #${row.id} is not deletable`); continue; }
    const res = await admin.call("DELETE", `/api/admin/qa-rows/${table}/${row.id}`, { expectedTitle: row.title, backupSha256 });
    if (res.status === 200) removed++;
    else if (!(table === "resource_edits" && res.status === 404)) problems.push(`${table} #${row.id} answered ${res.status}`);
  }
  return verdict(problems, `backup ${backupSha256.slice(0, 12)}; removed ${removed} of ${targets.length} rows`);
});

export const verifyGone = step("T2-11", ["t2.ready"], async (ctx, { admin }) => {
  const problems: string[] = [];
  const listing = await listQaRows(admin);
  if (listing.status !== 200) return fail(`qa-rows answered ${listing.status}`);
  const left = ownRows(ctx, listing.json<QaRows>());
  if (left.length) problems.push(`rows remain: ${left.map(({ table, row }) => `${table}#${row.id}`).join(", ")}`);
  for (const key of ["t2.id1", "t2.id2", "t2.idc06"]) {
    const id = num(ctx, key);
    if (id === undefined) continue;
    const status = (await ctx.http.get(`/api/resources/${id}`)).status;
    if (status !== 404) problems.push(`GET /api/resources/${id} answered ${status}, expected 404`);
  }
  const pending = await pendingFromThisRun(ctx, admin);
  if (pending.length) problems.push(`still pending: ${pending.map((r) => `#${r.id}`).join(", ")}`);
  return verdict(problems, `zero ${runPrefix(ctx)} rows left; re-read 404; none pending`);
});

/** True once T2-00 passed, i.e. once any write could have happened. */
export const tier2Wrote = (ctx: Ctx) => ctx.shared.get("t2.ready") !== undefined;

export const closeTier2Actors = (ctx: Ctx) =>
  Promise.all(Object.values((ctx.shared.get("t2.actors") ?? {}) as Record<string, Actor>).map((a) => a.close().catch(() => undefined)));

register(setup, submitStep, queueStep, rejectStep, withdrawStep, bookmarkStep, editStep, submitWithdrawStep);
