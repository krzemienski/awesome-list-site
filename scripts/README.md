# Project scripts

- `deployment/`: publishing support (`publish-build.sh` is the deploy build).
- Root scripts: supported generators, migrations and operational commands.
  Consult `package.json` and each script's usage header before running them.

This project has no validation scripts, test suites or drift gates; changes are
verified by using the running app in a browser and calling the real API.
