# Project scripts

Active root scripts are classified by
`node scripts/validation/root-script-drift.mjs`. The gate checks executable
references from package commands, workflows, imports and tool configuration;
documentation mentions alone do not establish reachability.

- `validation/`: regression, drift, performance and release checks.
- `deployment/`: publishing support.
- Root scripts: supported generators, migrations and operational commands.
  Consult `package.json` and each script's usage header before running them.

The unreferenced static demo HTML pages have been retired. They were not
application entry points, test fixtures or supported commands. See
[`docs/parity/CLEANUP.md`](../docs/parity/CLEANUP.md) for the reachability
evidence and retained-source decisions. The root-script gate deliberately
checks executables, not HTML; its scope has not been widened to treat static
reference pages as runnable scripts.