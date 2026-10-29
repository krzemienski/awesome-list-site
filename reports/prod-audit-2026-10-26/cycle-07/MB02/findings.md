# C7 MB02 (member: API keys, account deletion dialog, bookmarks queue/collections)
Worker: sonnet a7286673d0b2c57d3. Revisions 130e5829 then 31d0acce (rows 017-022 re-driven at 1440 on 31d0acce). Evidence: e2e-evidence/cycle-07/MB02/.
Verdict: 0 confirmed. All 12 rows driven at 1440/820/390 (touch viewport-only).
- C7-MB02-01 DISMISSED: the 60px right padding at 390 on /bookmarks and /about is the deliberate back-to-top lane (layout.css:50, PR #73/#82), the same as C7-AC01-01.
- C7-MB02-02 DISMISSED: the 20px bookmark select checkboxes sit inside 44px labels (worker measured); the label is the tap target.
BLOCKED-BY-POLICY: MB-014 confirm/failure (account deletion), MB-015 (withdraw needs a pending deletion request).
QA: collections 159-163 deleted (/api/collections = []); 2 QA API keys revoked (0 active). Owner baseline restored (name, favorites, 12 bookmarks, homeLayout index, prefs revision 65, no deletion request).
