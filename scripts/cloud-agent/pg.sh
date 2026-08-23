#!/usr/bin/env bash
# Shared PostgreSQL helpers for the Cloud Agent dev environment.
#
# The default Cursor image has no init system, so the apt package cannot be
# auto-started; we drive the cluster directly with pg_ctlcluster. All helpers
# are idempotent and safe to re-run on every boot.
set -euo pipefail

PG_VERSION="${PG_VERSION:-16}"
PG_CLUSTER="${PG_CLUSTER:-main}"
PG_DB="${PG_DB:-awesome_list}"

pg_install_if_missing() {
  if ! command -v pg_ctlcluster >/dev/null 2>&1; then
    echo "Installing PostgreSQL ${PG_VERSION}..."
    sudo apt-get update -qq
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib
  fi
}

pg_start() {
  # pg_ctlcluster exits non-zero when the cluster is already running; tolerate it.
  sudo pg_ctlcluster "$PG_VERSION" "$PG_CLUSTER" start 2>/dev/null || true
  for _ in $(seq 1 30); do
    if pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
      echo "PostgreSQL is accepting connections."
      return 0
    fi
    sleep 1
  done
  echo "ERROR: PostgreSQL did not become ready in time." >&2
  return 1
}

pg_provision() {
  # Set a known password on the superuser and ensure the app database exists.
  sudo -u postgres psql -tAc "ALTER USER postgres PASSWORD 'postgres';" >/dev/null
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${PG_DB}'" | grep -q 1; then
    sudo -u postgres createdb "$PG_DB"
    echo "Created database '${PG_DB}'."
  fi
}
