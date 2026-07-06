/**
 * One-off LIVE-PROD data reconciliation (Option A — clean data → honest 1,838).
 *
 * Deletes 372 URL-duplicate rows (keep-lowest-id), reassigns the single
 * category-orphan (QUANTEEC id 184991, category "1090" → Infrastructure &
 * Delivery / Peer-to-Peer Streaming Solutions), and rewrites 6 tracking-param
 * links to their clean canonical URLs.
 *
 * Runs against the live admin API (executeSql is read-only on prod). Resumable:
 * deleted ids are journaled to .local/prod-cleanup/deleted.json so a re-run
 * skips completed work. The admin password is read from process.env and is
 * NEVER logged.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const BASE = process.env.PROD_BASE || 'https://awesome.video';
const EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const PASSWORD = process.env.ADMIN_PASSWORD;
const DIR = '.local/prod-cleanup';
const START = Date.now();
const BUDGET_MS = 90_000;

if (!PASSWORD) {
  console.error('ADMIN_PASSWORD not set in env — aborting.');
  process.exit(1);
}

const removeIds: number[] = JSON.parse(readFileSync(`${DIR}/remove-ids.json`, 'utf8'));
const deletedPath = `${DIR}/deleted.json`;
const deleted: Record<string, number> = existsSync(deletedPath)
  ? JSON.parse(readFileSync(deletedPath, 'utf8'))
  : {};
const saveDeleted = () => writeFileSync(deletedPath, JSON.stringify(deleted));

async function login(): Promise<string> {
  const r = await fetch(`${BASE}/api/auth/local/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`login failed ${r.status}: ${body.slice(0, 200)}`);
  const anyHeaders = r.headers as any;
  const cookies: string[] = typeof anyHeaders.getSetCookie === 'function'
    ? anyHeaders.getSetCookie()
    : [r.headers.get('set-cookie')].filter(Boolean) as string[];
  const cookie = cookies.map((c) => c.split(';')[0]).join('; ');
  if (!cookie) throw new Error('login succeeded but no session cookie returned');
  return cookie;
}

async function delOne(id: number, cookie: string) {
  const r = await fetch(`${BASE}/api/admin/resources/${id}`, {
    method: 'DELETE',
    headers: { Cookie: cookie },
  });
  if (r.status === 200 || r.status === 404) {
    deleted[id] = r.status;
    return { id, status: r.status, ok: true };
  }
  const t = await r.text();
  return { id, status: r.status, ok: false, text: t.slice(0, 200) };
}

async function putOne(id: number, patch: Record<string, unknown>, cookie: string) {
  const r = await fetch(`${BASE}/api/admin/resources/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(patch),
  });
  const t = await r.text();
  return { id, status: r.status, ok: r.ok, text: r.ok ? '' : t.slice(0, 200) };
}

async function main() {
  const cookie = await login();
  console.log('logged in — session acquired');

  const pending = removeIds.filter((id) => !(id in deleted));
  console.log(`deletes: ${removeIds.length - pending.length} already done, ${pending.length} pending`);

  const CONC = 5;
  const failures: any[] = [];
  let idx = 0;
  let processed = 0;
  async function worker() {
    while (idx < pending.length) {
      if (Date.now() - START > BUDGET_MS) return;
      const id = pending[idx++];
      const res = await delOne(id, cookie);
      processed++;
      if (!res.ok) failures.push(res);
      if (processed % 25 === 0) { saveDeleted(); console.log(`  deleted ${processed}/${pending.length}`); }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  saveDeleted();

  const stillPending = removeIds.filter((id) => !(id in deleted));
  console.log(`this run: processed ${processed}, failures ${failures.length}, remaining ${stillPending.length}`);
  if (failures.length) console.log('sample failures:', JSON.stringify(failures.slice(0, 5)));
  if (stillPending.length > 0) {
    console.log('INCOMPLETE (budget) — re-run to resume before applying fixes.');
    return;
  }

  const orphan = await putOne(
    184991,
    { category: 'Infrastructure & Delivery', subcategory: 'Peer-to-Peer Streaming Solutions' },
    cookie,
  );
  console.log('orphan 184991 PUT:', orphan.status, orphan.ok ? 'OK' : orphan.text);

  const links: Record<number, string> = {
    185811: 'https://medium.com/@NetflixTechBlog/inca-message-tracing-and-loss-detection-for-streaming-data-netflix-de4836fc38c9',
    186097: 'https://netflixtechblog.com/improving-our-video-encodes-for-legacy-devices-2b6b56eec5c9',
    186107: 'https://medium.com/dailymotion/hardware-assisted-video-transcoding-at-dailymotion-66cd2db448ae',
    186145: 'https://medium.com/vicuesoft-techblog/3-cases-from-a-video-expert-encoding-basics-b1ba1c398af8',
    186146: 'https://medium.com/twitch-news/live-video-transmuxing-transcoding-ffmpeg-vs-twitchtranscoder-part-i-489c1c125f28',
    186147: 'https://medium.com/twitch-news/live-video-transmuxing-transcoding-ffmpeg-vs-twitchtranscoder-part-ii-4973f475f8a3',
  };
  for (const [id, url] of Object.entries(links)) {
    const r = await putOne(Number(id), { url }, cookie);
    console.log(`link ${id} PUT:`, r.status, r.ok ? 'OK' : r.text);
  }

  const totRes: any = await (await fetch(`${BASE}/api/resources?limit=1`)).json();
  const cats: any[] = await (await fetch(`${BASE}/api/categories`)).json();
  const sum = cats.reduce((a, c) => a + (c.resourceCount || 0), 0);
  console.log('\n=== VERIFY LIVE PROD ===');
  console.log('/api/resources total =', totRes.total);
  console.log('/api/categories sum  =', sum);
  for (const c of cats) console.log('  ', c.name, c.resourceCount);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
