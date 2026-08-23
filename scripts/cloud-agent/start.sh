#!/usr/bin/env bash
# Cloud Agent start phase: per-boot reconciliation. Refreshes .env from the
# current environment (so secrets added after the build take effect), starts the
# PostgreSQL cluster, and ensures the schema is current. Returns once the
# database is ready; the dev server itself runs as a terminal.
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

echo "Cloud Agent start complete. Launch the app with: npm run dev"
