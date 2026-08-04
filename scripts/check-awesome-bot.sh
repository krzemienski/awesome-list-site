#!/usr/bin/env bash
# awesome_bot check for the exported Awesome-list Markdown (repository/export
# scope — NOT the production Link Health dashboard, which scans approved
# resources in the live DB and records results in the admin panel).
#
# Usage:
#   bash scripts/check-awesome-bot.sh [markdown-file]
#
# With no argument, generates the export Markdown from the dev database via
# scripts/export-awesome-markdown.ts (requires DATABASE_URL), then runs
# awesome_bot against it.
#
# False-positive policy (mirrors the strict dead-link policy used by the
# link-health tooling): only DNS failures, connection-refused, confirmed
# 404/410, and SSL failures should fail the check. Therefore we pass:
#   --allow-timeout         connect timeouts from a datacenter IP = bot-block
#   --allow-redirect        redirects are healthy (checked elsewhere)
#   --allow-dupe            the same URL may legitimately appear twice
#   --allow <codes>         401/403/405/406/429/5xx/999 = bot-block/auth wall
#   --white-list            documented exclusions in scripts/awesome-bot-allowlist.txt
#
# Exit code: 0 = no confirmed broken links; 1 = confirmed broken links or setup
# failure. Full results land in $LOG_DIR (default /tmp/validation/awesome-bot).

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${AWESOME_BOT_LOG_DIR:-/tmp/validation/awesome-bot}"
ALLOWLIST_FILE="$REPO_ROOT/scripts/awesome-bot-allowlist.txt"
GEM_HOME_DIR="${AWESOME_BOT_GEM_HOME:-$HOME/.cache/awesome-bot-gems}"
# 202 = accepted-but-processing (lcevc.org), 418 = teapot anti-bot (videolan.org)
ALLOW_CODES="202,401,403,405,406,408,418,425,429,500,501,502,503,504,520,522,523,524,999"

mkdir -p "$LOG_DIR"

MD_FILE="${1:-}"
# Normalize a supplied path to absolute BEFORE any cd (awesome_bot runs from
# $LOG_DIR so it drops ab-results.json there; a relative path would break).
if [ -n "$MD_FILE" ] && [ "${MD_FILE#/}" = "$MD_FILE" ]; then
  MD_FILE="$(pwd)/$MD_FILE"
fi
if [ -z "$MD_FILE" ]; then
  MD_FILE="$LOG_DIR/awesome-list.md"
  echo "[awesome-bot] generating export Markdown -> $MD_FILE"
  if ! (cd "$REPO_ROOT" && npx tsx scripts/export-awesome-markdown.ts "$MD_FILE"); then
    echo "[awesome-bot] FAILED: could not generate export Markdown (see above)"
    exit 1
  fi
fi

if [ ! -s "$MD_FILE" ]; then
  echo "[awesome-bot] FAILED: markdown file missing or empty: $MD_FILE"
  exit 1
fi

# Build the comma-separated whitelist from the documented allowlist file.
WHITELIST=""
if [ -f "$ALLOWLIST_FILE" ]; then
  WHITELIST="$(grep -v '^\s*#' "$ALLOWLIST_FILE" | grep -v '^\s*$' | paste -sd, -)"
fi

run_awesome_bot() {
  local ab="$1"
  local args=(
    "$MD_FILE"
    --allow-timeout
    --allow-redirect
    --allow-dupe
    --allow "$ALLOW_CODES"
  )
  if [ -n "$WHITELIST" ]; then
    args+=(--white-list "$WHITELIST")
  fi
  echo "[awesome-bot] running: awesome_bot ${args[*]}"
  # awesome_bot writes ab-results.json into the CWD — keep that in LOG_DIR.
  (cd "$LOG_DIR" && GEM_HOME="$GEM_HOME_DIR" "$ab" "${args[@]}")
}

find_or_install_bot() {
  # 1. Already on PATH (CI installs it via `gem install awesome_bot`).
  if command -v awesome_bot >/dev/null 2>&1; then
    echo "awesome_bot"
    return 0
  fi
  # 2. Previously installed into the cached GEM_HOME.
  if [ -x "$GEM_HOME_DIR/bin/awesome_bot" ]; then
    echo "$GEM_HOME_DIR/bin/awesome_bot"
    return 0
  fi
  # 3. Install via nix-provided ruby (Replit workspace path).
  if command -v nix-shell >/dev/null 2>&1; then
    echo "[awesome-bot] installing awesome_bot gem into $GEM_HOME_DIR (one-time)" >&2
    if nix-shell -p ruby --run "GEM_HOME='$GEM_HOME_DIR' gem install awesome_bot --no-document" >"$LOG_DIR/gem-install.log" 2>&1 \
       && [ -x "$GEM_HOME_DIR/bin/awesome_bot" ]; then
      echo "$GEM_HOME_DIR/bin/awesome_bot"
      return 0
    fi
    echo "[awesome-bot] gem install failed — see $LOG_DIR/gem-install.log" >&2
  fi
  return 1
}

AB_BIN="$(find_or_install_bot)" || {
  echo "[awesome-bot] FAILED: awesome_bot is not available and could not be installed."
  echo "  Install manually with: gem install awesome_bot"
  exit 1
}

# nix-shell wrapper needed when running the gem-installed binstub (it needs
# ruby on PATH). If ruby isn't directly available, wrap the run.
if ! command -v ruby >/dev/null 2>&1 && command -v nix-shell >/dev/null 2>&1 && [ "$AB_BIN" != "awesome_bot" ]; then
  run_in_nix() {
    local args=(
      "$MD_FILE" --allow-timeout --allow-redirect --allow-dupe --allow "$ALLOW_CODES"
    )
    [ -n "$WHITELIST" ] && args+=(--white-list "$WHITELIST")
    echo "[awesome-bot] running (via nix-shell ruby): awesome_bot ${args[*]}"
    (cd "$LOG_DIR" && nix-shell -p ruby --run "GEM_HOME='$GEM_HOME_DIR' '$AB_BIN' $(printf '%q ' "${args[@]}")")
  }
  run_in_nix
  STATUS=$?
else
  run_awesome_bot "$AB_BIN"
  STATUS=$?
fi

echo ""
if [ $STATUS -eq 0 ]; then
  echo "[awesome-bot] PASS — no confirmed broken links in the export Markdown."
else
  echo "[awesome-bot] FAIL — confirmed broken links found (exit $STATUS)."
  echo "  Full results: $LOG_DIR/ab-results.json"
  echo "  NOTE: this is the pre-publish export check. It is separate from the"
  echo "  production Link Health dashboard (Admin -> Link Health), which scans"
  echo "  live approved resources. Do not treat these results as dashboard data."
  echo "  Before fixing a URL, confirm it is truly dead per the strict policy:"
  echo "  DNS failure / connection refused / browser-confirmed 404-410 / SSL only."
fi
exit $STATUS
