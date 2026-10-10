// Tear down any __qa_test_plan_592_ identities left by an aborted run: Clerk first, then local rows.
import { q, clerk, teardownUser, PREFIX, residue } from "./lib.mjs";
const clerkUsers = await clerk("GET", `/users?query=${encodeURIComponent(PREFIX)}&limit=100`);
const local = await q(`SELECT id FROM users WHERE id LIKE $1`, [PREFIX.replace(/_/g, "\\_") + "%"]);
const ids = new Set([...clerkUsers.map((u) => u.external_id).filter(Boolean), ...local.map((r) => r.id)]);
for (const bridgeId of ids) {
  const cu = clerkUsers.find((u) => u.external_id === bridgeId);
  await teardownUser({ bridgeId, clerkUserId: cu?.id ?? "user_missing" });
  console.log("removed", bridgeId, cu ? "(clerk+local)" : "(local only)");
}
console.log("residue", JSON.stringify(await residue()));
process.exit(0);
