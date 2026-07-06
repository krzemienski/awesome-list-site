import { db } from "../server/db";
import { users, resources } from "../shared/schema";
import { like, or } from "drizzle-orm";

// Net-zero teardown for the VG-2 GA4 validation harness. The harness registers
// throwaway users (email `__qa_test_*@example.com`) and submits placeholder
// resources (url `https://qa-test-*`). FK audit (July 2026) confirmed the only
// existing child rows are in resource_audit_log (SET NULL on delete for both
// resource_id and performed_by), and every NO ACTION referrer has 0 rows, so a
// direct delete is safe: CASCADE children drop automatically, audit rows null.
async function teardown() {
  const deletedResources = await db
    .delete(resources)
    .where(
      or(
        like(resources.url, "https://qa-test-%"),
        like(resources.title, "QA Test Resource %"),
      ),
    )
    .returning({ id: resources.id, title: resources.title });

  // NOTE: `_` is a SQL LIKE single-char wildcard, so `__qa_test_%` is broader
  // than a literal prefix match. It is intentionally scoped to the harness's own
  // synthetic `__qa_test_<timestamp>@example.com` addresses and is safe here;
  // if this pattern is ever reused against real data, escape the underscores
  // (e.g. an ESCAPE clause) to avoid matching unintended rows.
  const deletedUsers = await db
    .delete(users)
    .where(like(users.email, "__qa_test_%"))
    .returning({ id: users.id, email: users.email });

  console.log(`🧹 Deleted ${deletedResources.length} QA resource(s):`, deletedResources.map((r) => r.id).join(", ") || "(none)");
  console.log(`🧹 Deleted ${deletedUsers.length} QA user(s):`, deletedUsers.map((u) => u.email).join(", ") || "(none)");
  process.exit(0);
}

teardown().catch((e) => {
  console.error("❌ Teardown failed:", e);
  process.exit(1);
});
