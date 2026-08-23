#!/usr/bin/env bash
# Cloud Agent start phase: per-boot startup. Refreshes .env from the current
# environment (so secrets added after the build take effect), starts the
# PostgreSQL cluster, ensures the schema is current, then launches the app in
# the foreground (Express API + Vite client on :5000). The dev server stays
# attached so its logs and lifecycle remain visible to the agent.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=scripts/cloud-agent/pg.sh
source "$SCRIPT_DIR/pg.sh"

echo "==> Refreshing .env"
bash "$SCRIPT_DIR/write-env.sh"

echo "==> Starting PostgreSQL"
pg_start
pg_provision

echo "==> Ensuring database schema is current"
npm run db:push

echo "==> Starting the dev server (Express + Vite on :5000)"
# Replace the shell with the dev server so it remains the attached foreground
# process for this boot. On first boot against an empty catalog the server
# auto-seeds the ~1,934 curated resources before serving.
exec npm run dev
