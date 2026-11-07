# ux-member, cycle 03 (rev b89d3e4b): PASS, 0 new findings

- **MB-01, MB-02 and MB-03:** fixed on production.
- **MB-04 (Undo toast lasts about 6s):** fixed in #75, which shipped after this deploy. It goes out in deploy E.
- **QA rows:**
  - Collection 148 was created and deleted; GET /api/collections returns [].
  - Resource 190354 was submitted, withdrawn and deleted; it returns 404 both anon and as owner. The lead re-read both on production at 00:5xZ.
- **Side effects that cannot be undone:** notification-preferences updatedAt and journey 9 lastAccessedAt were bumped.
- **UNVERIFIED:**
  - Collection publish/archive, bulk actions, API keys, unsubscribe and reset, the deletion request, and theme writes.
  - The full keyboard walk.
  - MB-01 as a Clerk member.
  - Real touch input.
