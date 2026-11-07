#!/bin/bash
# Triage: for an open `selfheal` issue with no PR yet, run headless `claude -p` in a fresh worktree to propose ONE fix PR.
# It may open a PR; it never merges or publishes (settings.json deny rules + guard.sh hook). Max 1 PR attempt per run,
# max 2 attempts per fingerprint per UTC day.
MAX_ATTEMPTS_PER_DAY=2
CLAUDE_TIMEOUT=1800

main() {
  SH_JOB=triage
  . "$(dirname "$0")/lib.sh"
  acquire_lock triage 90 || { log "another triage run is active"; return 0; }
  trap 'release_lock triage' EXIT
  sync_repo || log "repo sync failed; using existing checkout"

  local issues row number title fp attempts_file day n branch wt prompt out rc
  issues=$(gh issue list --repo "$GH_REPO" --label selfheal --state open --json number,title --limit 50) || return 1
  while IFS= read -r row; do
    number=$(jq -r .number <<<"$row"); title=$(jq -r .title <<<"$row")
    [[ "$title" == *"[selfheal self-test]"* ]] && continue
    fp=$(sed -nE 's/.*\[sh:([0-9a-f]{10})\].*/\1/p' <<<"$title"); [ -n "$fp" ] || continue
    if [ -n "$(gh pr list --repo "$GH_REPO" --state all --search "sh:$fp in:title" --json number,title \
         | jq -r --arg t "[sh:$fp]" '.[] | select(.title | contains($t)) | .number')" ]; then
      log "#$number $fp already has a PR; skipping"; continue
    fi
    day=$(date -u +%Y%m%d); attempts_file="$STATE_DIR/attempts-$fp-$day"
    n=$(cat "$attempts_file" 2>/dev/null || echo 0)
    [ "$n" -ge "$MAX_ATTEMPTS_PER_DAY" ] && { log "#$number $fp hit $MAX_ATTEMPTS_PER_DAY attempts today; skipping"; continue; }
    echo $((n + 1)) >"$attempts_file"

    branch="selfheal/$fp-$(date -u +%H%M%S)"; wt="$WT_DIR/$fp-$day-$((n + 1))"
    git -C "$REPO_DIR" worktree add -q -b "$branch" "$wt" origin/main || { log "worktree add failed"; continue; }
    ln -s "$REPO_DIR/node_modules" "$wt/node_modules"
    prompt=$(sed -e "s|{{ISSUE}}|$number|g" -e "s|{{REPO}}|$GH_REPO|g" -e "s|{{FP}}|$fp|g" -e "s|{{BRANCH}}|$branch|g" "$REPO_DIR/scripts/selfheal/prompt.md")
    out="$LOG_DIR/triage-$fp-$day-$((n + 1)).json"

    log "#$number $fp: starting claude -p in $wt (attempt $((n + 1)))"
    (
      cd "$wt" || exit 4
      claude_env_clean
      export SELFHEAL_FIX_DIR="$wt"
      run_limited "$CLAUDE_TIMEOUT" claude -p "$prompt" \
        --settings "$REPO_DIR/scripts/selfheal/settings.json" \
        --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
        --permission-mode dontAsk --permission-prompts none \
        --max-turns 60 --max-budget-usd 5 --model sonnet \
        --output-format json --no-session-persistence >"$out" 2>>"$LOG_DIR/triage.err"
    )
    rc=$?
    log "#$number $fp: claude exit $rc ($(jq -r '"is_error=\(.is_error) turns=\(.num_turns) cost=\(.total_cost_usd)"' "$out" 2>/dev/null || echo 'no json'))"
    [ "$rc" -ne 0 ] && notify "Triage failed for #$number (exit $rc)"
    # Worktrees that opened no PR are removed; ones with a PR stay for 7 days.
    if [ -z "$(gh pr list --repo "$GH_REPO" --head "$branch" --state all --json number --jq '.[0].number')" ]; then
      git -C "$REPO_DIR" worktree remove --force "$wt" 2>/dev/null
      git -C "$REPO_DIR" branch -D "$branch" >/dev/null 2>&1
    fi
    break
  done < <(jq -c '.[]' <<<"$issues")
  find "$WT_DIR" -mindepth 1 -maxdepth 1 -mtime +7 -exec git -C "$REPO_DIR" worktree remove --force {} \; 2>/dev/null
  git -C "$REPO_DIR" worktree prune
  return 0
}
main "$@"; exit $?
