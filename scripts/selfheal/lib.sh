#!/bin/bash
# Shared helpers for the awesome.video self-healing loop (sourced, never executed).
# All jobs run from a dedicated clean worktree kept at origin/main, never the main checkout.

export PATH="/Users/nick/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
SH_HOME="$HOME/.awesome-selfheal"
REPO_DIR="$SH_HOME/repo"
STATE_DIR="$SH_HOME/state"
WT_DIR="$SH_HOME/wt"
LOG_DIR="$HOME/Library/Logs/awesome-selfheal"
MAIN_CHECKOUT="/Users/nick/Desktop/awesome-list-site"
GH_REPO="krzemienski/awesome-list-site"
mkdir -p "$STATE_DIR" "$WT_DIR" "$LOG_DIR"

# launchd has no keychain session, so git's osxkeychain helper hangs. Authenticate git through gh (token in hosts.yml).
export GIT_TERMINAL_PROMPT=0
export GIT_CONFIG_COUNT=2
export GIT_CONFIG_KEY_0=credential.helper GIT_CONFIG_VALUE_0=
export GIT_CONFIG_KEY_1=credential.helper GIT_CONFIG_VALUE_1='!gh auth git-credential'

# Pre-merge installs track a branch: echo origin/ops/selfheal > ~/.awesome-selfheal/ref. Delete the file once merged.
SELFHEAL_REF="${SELFHEAL_REF:-$(cat "$SH_HOME/ref" 2>/dev/null || echo origin/main)}"

log() { printf '%s [%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${SH_JOB:-selfheal}" "$*"; }

notify() {
  osascript -e "display notification \"$1\" with title \"awesome.video selfheal\"" >/dev/null 2>&1 || true
}

redact() {
  sed -E 's/(Bearer |token=|gh[pousr]_|sk-)[A-Za-z0-9._-]+/\1<REDACTED>/g; s/(__client[A-Za-z_]*=)[^;" ]+/\1<REDACTED>/g'
}

# Keep logs bounded without breaking launchd's open file descriptor.
rotate_logs() {
  local f
  for f in "$LOG_DIR"/*.log; do
    [ -f "$f" ] || continue
    if [ "$(stat -f %z "$f")" -gt 5242880 ]; then
      tail -n 2000 "$f" >"$f.tmp" && cat "$f.tmp" >"$f" && rm -f "$f.tmp"
    fi
  done
}

# mkdir-based lock (macOS has no flock). Stale locks older than $2 minutes are taken over.
acquire_lock() {
  local dir="$STATE_DIR/$1.lock" stale_min="${2:-120}"
  if ! mkdir "$dir" 2>/dev/null; then
    if [ -n "$(find "$dir" -maxdepth 0 -mmin +"$stale_min" 2>/dev/null)" ]; then
      rm -rf "$dir"; mkdir "$dir" || return 1
    else
      return 1
    fi
  fi
}
release_lock() { rm -rf "$STATE_DIR/$1.lock"; }

# Run a command with a wall-clock limit (no coreutils timeout on macOS).
run_limited() {
  local secs="$1"; shift
  "$@" & local pid=$!
  ( sleep "$secs"; kill -TERM "$pid" 2>/dev/null; sleep 5; kill -KILL "$pid" 2>/dev/null ) >/dev/null 2>&1 &
  local watchdog=$!
  wait "$pid"; local rc=$?
  kill "$watchdog" 2>/dev/null; wait "$watchdog" 2>/dev/null
  return $rc
}

# Create the dedicated worktree on first use, then pin it to $SELFHEAL_REF.
sync_repo() {
  acquire_lock sync 10 || { sleep 20; acquire_lock sync 10 || return 1; }
  local rc=0
  if [ ! -e "$REPO_DIR/.git" ]; then
    git -C "$MAIN_CHECKOUT" fetch -q origin || rc=1
    git -C "$MAIN_CHECKOUT" worktree add -f --detach "$REPO_DIR" "$SELFHEAL_REF" >/dev/null 2>&1 \
      || git -C "$MAIN_CHECKOUT" worktree add -f --detach "$REPO_DIR" origin/main >/dev/null 2>&1 || rc=1
  fi
  if [ "$rc" -eq 0 ]; then
    git -C "$REPO_DIR" fetch -q --prune origin \
      && { git -C "$REPO_DIR" checkout -q -f --detach "$SELFHEAL_REF" 2>/dev/null \
           || git -C "$REPO_DIR" checkout -q -f --detach origin/main; } || rc=1
  fi
  [ -e "$REPO_DIR/node_modules" ] || ln -s "$MAIN_CHECKOUT/node_modules" "$REPO_DIR/node_modules"
  release_lock sync
  return $rc
}

# The shell may carry a harness proxy (ANTHROPIC_*); claude must use the logged-in subscription instead.
claude_env_clean() {
  local v
  for v in $(env | sed -n 's/^\(ANTHROPIC_[A-Za-z0-9_]*\)=.*/\1/p'); do unset "$v"; done
}
