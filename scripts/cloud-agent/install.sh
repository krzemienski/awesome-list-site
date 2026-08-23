#!/usr/bin/env bash
# Cloud Agent install phase: durable, idempotent setup baked into the
# environment build snapshot. Prepares system packages, Node dependencies, the
# local PostgreSQL cluster, and the application schema.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=scripts/cloud-agent/pg.sh
source "$SCRIPT_DIR/pg.sh"

echo "==> [1/5] Ensuring PostgreSQL is installed"
pg_install_if_missing

echo "==> [2/5] Installing Node dependencies (npm ci)"
npm ci --no-audit --no-fund

echo "==> [3/5] Starting PostgreSQL and provisioning the database"
pg_start
pg_provision

echo "==> [4/5] Writing .env"
bash "$SCRIPT_DIR/write-env.sh"

echo "==> [5/5] Applying database schema (drizzle-kit push)"
npm run db:push

echo "Cloud Agent install complete."
