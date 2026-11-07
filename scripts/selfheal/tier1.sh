#!/bin/bash
# Tier 1 (launchd every 6 h, or kicked early by Tier 0): runs prod-check tiers 0+1, then files, updates or
# reopens ONE GitHub issue per failure fingerprint (label `selfheal`). Detection and filing need no LLM.
# Env: SELFHEAL_SELFTEST=1 injects one synthetic failing check; SELFHEAL_DRY=1 prints gh writes instead of running them;
#      SELFHEAL_NO_TRIAGE=1 skips the fix-PR step.
MAX_ISSUES=3
REOPEN_DAYS=7

norm() {
  printf '%s' "$1" | tr 'A-Z' 'a-z' | sed -E 's/[0-9]{4}-[0-9]{2}-[0-9]{2}t[0-9:.]+z?/#/g; s/[0-9a-f]{8}-[0-9a-f-]{27}/#/g; s/[0-9a-f]{12,}/#/g; s/[0-9]+/#/g; s/[[:space:]]+/ /g' | cut -c1-200
}
fingerprint() { printf '%s\n%s' "$1" "$(norm "$2")" | shasum -a 1 | cut -c1-10; }

gh_write() {
  if [ -n "${SELFHEAL_DRY:-}" ]; then log "DRY gh $*" >&2; echo "https://dry-run/issues/0"; else gh "$@"; fi
}

# Most recent selfheal issue whose title carries [sh:<fp>] -> "number state closedAt".
# Lists by label instead of using the search API: search indexing lags, which would let a quick re-run file a duplicate.
find_issue() {
  local list
  list=$(gh issue list --repo "$GH_REPO" --label selfheal --state all --json number,title,state,closedAt --limit 500) || return 2
  jq -r --arg t "[sh:$1]" '[.[] | select(.title | contains($t))] | sort_by(.number) | last | select(. != null) | "\(.number) \(.state) \(.closedAt // "")"' <<<"$list"
}

days_since() { echo $(( ( $(date +%s) - $(date -j -u -f "%Y-%m-%dT%H:%M:%SZ" "$1" +%s) ) / 86400 )); }

bump_count() {
  mkdir -p "$STATE_DIR/occ"
  local f="$STATE_DIR/occ/$1" n
  n=$(( $(cat "$f" 2>/dev/null || echo 0) + 1 )); echo "$n" >"$f"; echo "$n"
}

issue_body() { # fp id tier detail values
  cat <<BODY | redact
**Fingerprint:** \`[sh:$1]\`
**Check:** \`$2\` (tier $3)
**Detected:** $RUN_TS by the selfheal Tier 1 job, production revision \`$REVISION\`
**Evidence on the owner's Mac:** \`$EVIDENCE_DIR\`

### Detail
\`\`\`
$4
\`\`\`

### Values
\`\`\`json
$5
\`\`\`

Filed automatically. The fix loop opens a PR from a fresh worktree and never merges or publishes; the owner approves both.
Refs: awesome.video ops plan, self-healing loop (#286).
BODY
}

file_one() { # id tier detail values
  local id="$1" tier="$2" detail="$3" values="$4" fp found number state closed n title symptom
  fp=$(fingerprint "$id" "$detail")
  symptom=$(printf '%s' "$detail" | tr '\n' ' ' | cut -c1-70)
  title="[sh:$fp] $id: $symptom"
  [ "$id" = "SELFTEST" ] && title="[selfheal self-test] [sh:$fp] $id: synthetic failing check"
  found=$(find_issue "$fp") || { log "fp $fp: issue lookup failed; not filing (would risk a duplicate)"; return; }
  n=$(bump_count "$fp")
  if [ -n "$found" ]; then
    read -r number state closed <<<"$found"
    if [ "$state" = "OPEN" ]; then
      gh_write issue comment "$number" --repo "$GH_REPO" --body "Recurrence #$n at $RUN_TS (revision \`$REVISION\`): $(printf '%s' "$detail" | tr '\n' ' ' | cut -c1-200 | redact)" >/dev/null
      log "fp $fp: commented on #$number (open, occurrence $n)"; echo "$fp updated #$number"; return
    fi
    if [ -n "$closed" ] && [ "$(days_since "$closed")" -lt "$REOPEN_DAYS" ]; then
      gh_write issue reopen "$number" --repo "$GH_REPO" --comment "Regression at $RUN_TS (revision \`$REVISION\`), closed less than $REOPEN_DAYS days ago: $(printf '%s' "$detail" | tr '\n' ' ' | cut -c1-200 | redact)" >/dev/null
      log "fp $fp: reopened #$number (occurrence $n)"; echo "$fp reopened #$number"; return
    fi
  fi
  local url
  url=$(gh_write issue create --repo "$GH_REPO" --label selfheal --title "$title" --body "$(issue_body "$fp" "$id" "$tier" "$detail" "$values")")
  log "fp $fp: filed $url"; echo "$fp filed $url"
}

main() {
  SH_JOB=tier1
  . "$(dirname "$0")/lib.sh"
  rotate_logs
  acquire_lock tier1 180 || { log "another Tier 1 run is active; exiting"; return 0; }
  trap 'release_lock tier1' EXIT
  rm -f "$STATE_DIR/WAKE_TIER1"
  sync_repo || log "repo sync failed; running the existing checkout"
  cd "$REPO_DIR" || return 4

  local hb age
  hb="$STATE_DIR/tier0.heartbeat"
  if [ -f "$hb" ]; then
    age=$(( ( $(date +%s) - $(stat -f %m "$hb") ) / 60 ))
    [ "$age" -gt 90 ] && { log "WARN Tier 0 heartbeat is $age min old"; notify "Tier 0 has not run for $age min"; }
  fi

  RUN_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  local out rc
  out=$(mktemp "$STATE_DIR/tier1-run.XXXXXX")
  npx tsx scripts/prod-check/index.ts --tier 0,1 --schedule --json >"$out" 2> >(redact >&2)
  rc=$?
  log "prod-check exit $rc"

  local failing
  case "$rc" in
    3|4) failing=$(jq -nc --argjson rc "$rc" '[{id:"RUNNER",tier:1,detail:"prod-check runner error (exit \($rc))",values:{}}]'); REVISION=unknown; EVIDENCE_DIR="(none)" ;;
    *)
      REVISION=$(jq -r '.revision' "$out"); EVIDENCE_DIR="$HOME/.cache/awesome-prod-check/$(jq -r '.runId' "$out")"
      failing=$(jq -c '[.checks[] | select(.status=="fail" and (.authExpired | not)) | {id, tier, detail, values}]
        + (if any(.checks[]; .authExpired) then [{id:"AUTH-EXPIRED",tier:1,detail:"owner session expired; refresh the owner header",values:{}}] else [] end)' "$out") ;;
  esac
  rm -f "$out"
  if [ -n "${SELFHEAL_SELFTEST:-}" ]; then
    failing=$(jq -c '. + [{id:"SELFTEST",tier:1,detail:"[selfheal self-test] synthetic failing check; safe to close",values:{}}]' <<<"$failing")
  fi

  local count; count=$(jq 'length' <<<"$failing")
  if [ "$count" -eq 0 ]; then log "all checks green"; else
    if [ "$count" -gt "$MAX_ISSUES" ]; then
      local ids; ids=$(jq -r '[.[].id] | join(", ")' <<<"$failing")
      file_one "MULTI" 1 "multiple failures: more than $MAX_ISSUES checks failing" "$(jq -c '[.[] | {id, detail}]' <<<"$failing" | cut -c1-1500)" >/dev/null
      log "multiple failures filed as one issue: $ids"
    else
      local row
      while IFS= read -r row; do
        file_one "$(jq -r .id <<<"$row")" "$(jq -r .tier <<<"$row")" "$(jq -r .detail <<<"$row")" "$(jq -c '.values // {}' <<<"$row" | cut -c1-1500)"
      done < <(jq -c '.[]' <<<"$failing")
    fi
  fi
  jq -n --arg ts "$RUN_TS" --argjson rc "$rc" --argjson failing "$(jq -c '[.[].id]' <<<"$failing")" '{ts:$ts, rc:$rc, failing:$failing}' >"$STATE_DIR/tier1.json"

  if [ -z "${SELFHEAL_NO_TRIAGE:-}" ] && [ -z "${SELFHEAL_SELFTEST:-}" ] && [ -z "${SELFHEAL_DRY:-}" ]; then
    "$(dirname "$0")/triage.sh" || log "triage exited $?"
  fi
  return 0
}
main "$@"; exit $?
