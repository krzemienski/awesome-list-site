# BUG-104 — /admin/subpages return 404 but breadcrumbs confirm route names exist

**Severity:** LOW (information disclosure; no functional impact)
**URL:** https://awesome.video/admin/{categories,resources,users,settings,jobs,etc.}
**Viewport:** 1440×900 desktop

## Reproduction

1. Authenticate and open `/admin/categories`, `/admin/resources`, `/admin/users`, `/admin/settings`, `/admin/jobs`, `/admin/flags`, `/admin/audit`, `/admin/logs`, `/admin/login`, `/admin/profile`, `/admin/users/new`, `/admin/categories/new`, `/admin/resources/new`.
2. Each URL returns HTTP 404 and renders the global 404 card ("Page Not Found — the page may have been moved or doesn't exist").
3. The breadcrumb at the top of each 404 page reads: `Home › Admin › {Categories|Resources|Users|Settings|...}` — confirming all of those sub-routes exist by name in the client router even though the server returns 404.

## Expected

A 404 on an admin subroute should either (a) not leak the breadcrumb context (would confuse attackers enumerating endpoints) or (b) the breadcrumbs should match a real handler (i.e. those routes should work).

## Actual

- 11 of the 13 probed /admin subpages return 404. The only /admin subpage that exists is `/admin` itself.
- The `Approvals / Edits / Enrichment / Researcher / Export / Database / Resources / Categories / Subcategories / Sub-Subcats / Journeys / Users / GitHub / Link Health / Audit` are all rendered as in-page tabs (not separate URLs), but their breadcrumb entries on the 404 pages leak the same names.

## Evidence

- `audit_admin_admin_categories.png` (Prior admin audit screenshot, full-page, file mtime Jul 10 16:56, in `screenshots/`).
- `audit_admin_admin_resources.png`, `audit_admin_admin_users.png`, `audit_admin_admin_settings.png`, `audit_admin_admin_audit.png`, `audit_admin_admin_logs.png`, `audit_admin_admin_flags.png`, `audit_admin_admin_login.png`, `audit_admin_admin_logout.png`, `audit_admin_admin_profile.png`, `audit_admin_admin_users_new.png`, `audit_admin_admin_resources_new.png`, `audit_admin_admin_categories_new.png` — all show the same breadcrumb + 404 layout.
- `admin-audit-1.json` line 656-1140: `/admin/categories` → status 404, finalUrl `https://awesome.video/admin/categories`, breadcrumb textSnippet begins with "Skip to main content | Awesome Video | 1,946 resources | Navigation | Home | Submit Resource | Learning Journeys | Advanced | Theme | Admin | Categories | Community & Events …".

## Fix prompt

```
Task: Decide whether /admin/* sub-routes are intended endpoints or just
404 fall-throughs. If they're not intended, the React Router should NOT
emit a breadcrumb containing those names (currently it leaks the original
path even on 404). If they ARE intended, the server must return 200 with
the actual page (probably as a deep-link to a particular tab).

Two fixes, pick one:

  (a) Remove the breadcrumb-shown routes from the React Router config
      so the breadcrumb just reads "Home › Admin" on a 404.
  (b) Implement the missing /admin/{categories,resources,users,...} pages
      that anchor the in-page tabs at those URLs (e.g. /admin/resources?
      focused=resources).

Acceptance:
  • Visit /admin/categories — the breadcrumb should NOT contain the word
    "Categories" if it's a real 404.
  • OR /admin/categories should render the Categories tab content.
```
