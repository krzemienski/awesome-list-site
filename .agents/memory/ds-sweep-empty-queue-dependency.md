---
name: ds-button-sweep needs empty admin queues
description: ds-button-sweep admin tab checks expect empty-state controls; live QA fixtures in a queue make them fail.
---
The `ds-button-sweep` admin tab sweep waits for an empty-state control on some tabs (e.g. Edits waits for
`button-refresh-pending-edits`, which renders ONLY when there are zero pending edits).

**Why:** a full DS verify run made while QA fixture edits were pending failed `admin-edits` ("not visible after 30000ms");
after fixture cleanup the same check passed. It looks like a DS regression but is fixture state.

**How to apply:** run awesome-ds-verify AFTER deleting fixtures that populate admin queues (or before creating them);
if an admin-tab expectation times out, check queue contents before debugging the component.
