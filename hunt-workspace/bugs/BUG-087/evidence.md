# BUG-087 — Admin pages lack an audit-log surface (no /api/admin/audit, no Audit Log tab)

**Severity:** LOW
**Affected endpoint:** /api/admin/audit

## Reproduction
```bash
curl -sIL -o /dev/null -w '%{http_code}\n' https://awesome.video/api/admin/audit
```

## Expected
A dedicated Audit Log tab on /admin showing every approval, decline,
delete, and config change.

## Actual
The GitHub Sync tab shows recent sync jobs but the broader
admin-action audit log is not exposed.

## Evidence
- `quickprobe.json`, `api__api_audit_*`

## Fix prompt

```
Task: Add an Audit Log tab on /admin showing create/update/delete events
per resource. Backed by /api/admin/audit.

Acceptance:
1. /admin → Audit tab shows a paginated table.
2. /api/admin/audit returns 200 (admin-only) with audit records.
3. Verifiable.
```
