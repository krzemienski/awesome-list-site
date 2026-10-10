import { clerk, api, q, pool, PREFIX, saveState, BASE } from "./lib.mjs";

const run = `${PREFIX}${Date.now()}`;
const state = { run, users: {}, resources: {} };
for (const role of ["submitter", "second", "admin"]) {
  const ext = `${run}_${role}`;
  const u = await clerk("POST", "/users", {
    email_address: [`${ext}@example.com`],
    external_id: ext,
    skip_password_requirement: true,
  });
  const s = await clerk("POST", "/sessions", { user_id: u.id });
  state.users[role] = { clerkId: u.id, sessionId: s.id, localId: ext, email: `${ext}@example.com` };
  const me = await api(state.users[role], "GET", "/api/auth/user");
  console.log(role, "JIT", me.status, me.body?.id);
}
await q(`UPDATE users SET role='admin' WHERE id=$1`, [state.users.admin.localId]);

const [{ name: category }] = await q(`SELECT name FROM categories ORDER BY id LIMIT 1`);
const mk = async (key, extra = {}) => {
  const slug = `${run}_${key}`;
  const [row] = await q(
    `INSERT INTO resources (title, url, description, category, status, submitted_by, approved_by, approved_at)
     VALUES ($1,$2,$3,$4,'approved',$5,$6,now()) RETURNING id, title, url, updated_at`,
    [slug, `https://example.com/${slug}`, `${slug} fixture description for edit proofs`, category,
     state.users.submitter.localId, state.users.admin.localId],
  );
  state.resources[key] = row;
};
for (const key of ["shape", "diff", "legacy", "url_a", "url_b", "race", "moderation", "ui"]) await mk(key);
saveState(state);
console.log(JSON.stringify(state, null, 2));
await pool.end();
