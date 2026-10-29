# ux-admin-content, cycle 03 (rev b89d3e4b): ISSUES, 1 LOW (AC-13), plus 1 side effect on a real row

| id | sev | URL | width | saw vs expected | source |
|---|---|---|---|---|---|
| AC-13 | LOW | /admin#resources | 320 | The Search input is 28px wide and shows only "S" of its placeholder, because the Filters icon button (44px) and Add (79px) crowd it out. At 741-1440 it is 200px. Expected: a usable search field at 320. | admin-catalog-resources.css:45-60, ResourceManager.tsx toolbar |

**Re-checks:**
- AC-06 to AC-12: fixed.
- AC-08 was checked with the coarse-pointer rules forced, not on a real device.
- AC-01 to AC-05 and HDR-01 are still fixed.

**Rows created and deleted:** listed in created-rows.md (190353, 1196, 2335 and 3774). All are confirmed absent.

**Side effect on a REAL row:** a no-op save on resource 190113 "oddity-rtsp-server". The values are unchanged and it is still approved. It may have bumped updated_at and written an audit-log entry. The owner has been told, and nothing was reverted.

**Housekeeping:** `agent-browser close --all` may have closed other agents' agent-browser sessions.

**UNVERIFIED:**
- Real coarse-pointer device.
- Reduced motion and screen reader.
- Server-side field-error focus.
- Bulk actions and the Featured toggle.
- Live approve or reject.
- Overview accuracy.
