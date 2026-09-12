# Parity evidence

Raw proof that a parity task did what its worklog claims: screenshots, pixel-diff
outputs, `tsc`/gate logs, API shape dumps, and any other machine-produced
artefact. Each task writes into its own folder named after the task slug
(`docs/parity/evidence/<task-slug>/`, e.g. `foundation/`, `header/`,
`resource-detail/`); never overwrite another task's folder. Keep files small and
named after what they show (`home.jpg`, `tsc-before.txt`, `pixel-1440.png`);
large or regenerated dumps (Playwright traces, full gate logs) belong in `/tmp`
and only their summary lines belong here. The matching narrative lives in
`docs/parity/worklog/<task-slug>.md`, which must link to every file it relies on.
