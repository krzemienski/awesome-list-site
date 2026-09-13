// Real HTTP contract probe. No database fixtures, mutations, or mocked services.
import assert from "node:assert/strict";

const base = process.env.BASE_URL || "http://127.0.0.1:5000";
async function get(path) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  return response.json();
}
const feed = await get("/api/home");
const counts = await get("/api/resources/kinds/counts");
const list = await get("/api/resources?limit=1");
for (const key of ["total", "approvedThisWeek", "featuredCount"]) {
  assert.ok(Number.isInteger(feed[key]) && feed[key] >= 0, `${key} must be a nonnegative integer`);
}
assert.equal(feed.total, counts.total, "Home total equals full-set kind total");
assert.equal(feed.total, list.total, "Home total equals resource listing total");
assert.equal(
  ["tools", "libraries", "standards", "events", "protocols", "other"].reduce((n, key) => n + counts[key], 0),
  feed.total,
  "All kinds, including hidden other, sum to the total",
);
assert.equal(feed.recent.length, Math.min(5, feed.total));
assert.equal(feed.featured.length, Math.min(6, feed.featuredCount));
for (const item of [...feed.recent, ...feed.featured]) {
  assert.equal(item.status, "approved");
  assert.equal(typeof item.id, "number");
  assert.equal(typeof item.title, "string");
  assert.equal(typeof item.resolvedKind, "string");
  for (const internal of ["submittedBy", "approvedBy", "approvedAt", "searchTsv", "githubSynced"]) {
    assert.ok(!(internal in item), `${internal} must not leak from the Home feed`);
  }
}
for (const item of feed.featured) assert.equal(item.metadata?.featured, true);
assert.ok(feed.approvedThisWeek <= feed.total);
console.log(JSON.stringify({
  result: "PASS",
  total: feed.total,
  approvedThisWeek: feed.approvedThisWeek,
  featuredCount: feed.featuredCount,
  recentIds: feed.recent.map((item) => item.id),
  featuredIds: feed.featured.map((item) => item.id),
  counts,
}, null, 2));