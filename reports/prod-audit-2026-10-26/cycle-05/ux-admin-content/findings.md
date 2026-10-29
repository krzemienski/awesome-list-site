# ux-admin-content, cycle 05 (rev 63a1c79d at start and end): ISSUES, 1 MEDIUM and 1 LOW

| id | sev | where | saw vs expected | source |
|---|---|---|---|---|
| AC-19 | MEDIUM | /admin#resources, 1440 | Typing a number in the "Page number" box and pressing Enter does not jump. The page request returns 200 and the URL briefly shows ?page=N, then the page snaps back to the old page and replaces the URL with /admin#resources. Blurring the field does commit the jump. The same box works on public category pages, so the problem is the admin paging state reverting. | ResourceManager.tsx:1684 (`onNavigate={(p)=>setPage(p)}`) plus its page-reset effect; paginator.tsx:161-176 `commitJump` |
| AC-20 | LOW | /admin#categories edit dialog, 1440 | An empty Name, or a duplicate slug, shows only a role=alert banner. The field gets no aria-invalid or aria-describedby, and focus stays on Save. AC-18 already marks and focuses the field in the Resources dialogs; the taxonomy dialogs don't. | GenericCrudManager.tsx ~2323-2343 (handleUpdate, setFormError) |

## Re-checks
- **Fixed:** AC-01 to AC-18 and HDR-01, including AC-07 across 320–1024 and AC-11 after a long scroll.
- **AC-18:** fixed in both the edit and the create dialog.
- **Not a defect:** AC-15.

## Passed
Overview accuracy, approval dialogs (cancelled), edits, and resources:
- rows per page;
- the four sort options, checked against the API;
- search, create validation, the Featured toggle and bulk delete;
- reload restoring the page.

Also: categories create, edit and delete-lock; subcategory and sub-subcategory create and delete; the journeys steps dialog (view only).

## Rows
Created and deleted: 190357, plus 1198, 2337 and 3776. The lead re-read production and confirmed 190357 returns 404 and stats are back to 4017/3825/16.

## UNVERIFIED
- A real coarse pointer: the touch checks forced the media rules instead.
- Live approve or reject, and saving journey steps.
- Screen reader and reduced motion.
- Loading and error states.
