# Project scripts

- `deployment/`: publishing support (`publish-build.sh` is the deploy build).
- `hooks/`: Claude Code hooks registered in `.claude/settings.json` (`prod-write-guard.mjs`
  asks before production admin writes and denies a non-local `db:push`).
- Root scripts: supported generators, migrations and operational commands.
  Consult `package.json` and each script's usage header before running them.

This project has no validation scripts, test suites or drift gates; changes are
verified by using the running app in a browser and calling the real API.
