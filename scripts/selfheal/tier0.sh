#!/bin/bash
# Tier 0 (launchd, every 30 min): GET-only production checks, no browser, no LLM.
# On failure it sets the wake flag and kicks Tier 1 early. Never writes to GitHub.
main() {
  SH_JOB=tier0
  . "$(dirname "$0")/lib.sh"
  rotate_logs
  sync_repo || log "repo sync failed; running the existing checkout"
  cd "$REPO_DIR" || return 4
  touch "$STATE_DIR/tier0.heartbeat"

  local prev_rc rc=0 failing
  prev_rc=$(jq -r '.rc // 0' "$STATE_DIR/tier0.json" 2>/dev/null || echo 0)
  npx tsx scripts/prod-check/index.ts --tier 0 --schedule 2>&1 | redact
  rc=${PIPESTATUS[0]}

  case "$rc" in
    0) failing="[]" ;;
    1|2|5) failing=$(jq -c '[.checks[] | select(.status=="fail") | .id]' "$HOME/.cache/awesome-prod-check/latest/result.json" 2>/dev/null || echo '["UNREADABLE"]') ;;
    *) failing='["RUNNER"]' ;;
  esac
  jq -n --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --argjson rc "$rc" --argjson failing "$failing" \
    '{ts:$ts, rc:$rc, failing:$failing}' >"$STATE_DIR/tier0.json"
  log "tier0 exit $rc failing=$failing"

  if [ "$rc" -ne 0 ]; then
    touch "$STATE_DIR/WAKE_TIER1"
    [ "$prev_rc" -eq 0 ] && notify "Tier 0 failing: $failing"
    launchctl kickstart "gui/$(id -u)/dev.awesomevideo.selfheal.tier1" >/dev/null 2>&1 || true
  fi
  return "$rc"
}
main "$@"; exit $?
