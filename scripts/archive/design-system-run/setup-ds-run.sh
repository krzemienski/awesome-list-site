#!/usr/bin/env bash
# setup-ds-run.sh — prepare and launch the Opus 5.5 design-system run on awesome-list-site.
#
# Usage:
#   scripts/setup-ds-run.sh [--repo-dir DIR] [--prompt FILE] [--secrets-json FILE]
#                     [--effort LEVEL] [--no-tmux] [--skip-login] [--yes]
#
#   --repo-dir DIR       where the repo lives or gets cloned (default: ~/Desktop/awesome-list-site)
#   --prompt FILE        the revised prompt file (default: ./awesome-list-site-design-system-opus-5-5.md)
#   --secrets-json FILE  flat JSON of env vars ({"DATABASE_URL": "...", ...}); loaded into the
#                        session's environment at launch, never written to disk
#   --effort LEVEL       lead-session effort (default: high)
#   --no-tmux            run Claude Code in this terminal instead of a detached tmux session
#   --skip-login         skip the interactive claude_design login step
#   --yes                continue past warnings without asking

set -euo pipefail

REPO_URL="https://github.com/krzemienski/awesome-list-site.git"
REPO_DIR="$HOME/Desktop/awesome-list-site"
PROMPT_FILE="./awesome-list-site-design-system-opus-5-5.md"
SECRETS_JSON=""
EFFORT="high"
MODEL="claude-opus-5-5"
USE_TMUX=1
SKIP_LOGIN=0
ASSUME_YES=0
TMUX_SESSION="ds-run"
DESIGN_MCP_NAME="claude_design"
DESIGN_MCP_URL="https://api.anthropic.com/v1/design/mcp"
APP_PORT=5000

# ---------- helpers ----------
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
ok()    { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn()  { printf '  \033[33m!\033[0m %s\n' "$*"; }
fail()  { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }
confirm() {
  [[ $ASSUME_YES -eq 1 ]] && return 0
  local reply
  read -r -p "  $1 [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]]
}
need() { command -v "$1" >/dev/null 2>&1 || fail "'$1' is not installed or not on PATH."; }

# ---------- args ----------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-dir)     REPO_DIR="$2"; shift 2 ;;
    --prompt)       PROMPT_FILE="$2"; shift 2 ;;
    --secrets-json) SECRETS_JSON="$2"; shift 2 ;;
    --effort)       EFFORT="$2"; shift 2 ;;
    --no-tmux)      USE_TMUX=0; shift ;;
    --skip-login)   SKIP_LOGIN=1; shift ;;
    --yes|-y)       ASSUME_YES=1; shift ;;
    -h|--help)      sed -n '2,17p' "$0"; exit 0 ;;
    *)              fail "Unknown argument: $1 (see --help)" ;;
  esac
done

PROMPT_FILE="$(cd "$(dirname "$PROMPT_FILE")" && pwd)/$(basename "$PROMPT_FILE")"
[[ -f "$PROMPT_FILE" ]] || fail "Prompt file not found: $PROMPT_FILE"
if [[ -n "$SECRETS_JSON" ]]; then
  SECRETS_JSON="$(cd "$(dirname "$SECRETS_JSON")" && pwd)/$(basename "$SECRETS_JSON")"
  [[ -f "$SECRETS_JSON" ]] || fail "Secrets JSON not found: $SECRETS_JSON"
fi

# ---------- 1. tools ----------
bold "1. Tools"
for t in git node npm claude; do need "$t"; ok "$t"; done
node_major="$(node -p 'process.versions.node.split(".")[0]')"
[[ "$node_major" -ge 18 ]] || fail "Node $node_major found; Vite 5 needs Node 18+."
ok "node $(node -v)"
if [[ -n "$SECRETS_JSON" ]]; then need jq; ok "jq"; fi
if [[ $USE_TMUX -eq 1 ]] && ! command -v tmux >/dev/null 2>&1; then
  warn "tmux not found; running in this terminal instead."
  USE_TMUX=0
fi

# ---------- 2. repo ----------
bold "2. Repository"
if [[ -d "$REPO_DIR/.git" ]]; then
  ok "found $REPO_DIR"
  git -C "$REPO_DIR" fetch --quiet origin
  if [[ -n "$(git -C "$REPO_DIR" status --porcelain)" ]]; then
    warn "working tree has uncommitted changes; the agent will branch from this state."
    confirm "Continue anyway?" || exit 1
  fi
else
  mkdir -p "$(dirname "$REPO_DIR")"
  git clone --quiet "$REPO_URL" "$REPO_DIR"
  ok "cloned into $REPO_DIR"
fi
cd "$REPO_DIR"
ok "on branch $(git rev-parse --abbrev-ref HEAD) (the agent creates its own work branch)"

# ---------- 3. dependencies ----------
bold "3. Dependencies"
if [[ -f package-lock.json ]]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
ok "node_modules installed"

# ---------- 4. environment + database ----------
bold "4. Environment and database"
if [[ -n "$SECRETS_JSON" ]]; then
  jq -e 'type == "object"' "$SECRETS_JSON" >/dev/null || fail "Secrets JSON must be a flat object."
  eval "$(jq -r 'to_entries[] | "export \(.key)=\(.value | tostring | @sh)"' "$SECRETS_JSON")"
  ok "loaded $(jq 'length' "$SECRETS_JSON") variables from secrets JSON (kept in memory only)"
fi
if [[ -z "${DATABASE_URL:-}" && -f .env ]] && grep -qE '^DATABASE_URL=' .env; then
  ok "DATABASE_URL defined in .env"
  if ! git check-ignore -q .env; then warn ".env is NOT gitignored — make sure it never gets committed."; fi
  DB_URL_FOR_CHECK="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"
else
  DB_URL_FOR_CHECK="${DATABASE_URL:-}"
fi
if [[ -z "$DB_URL_FOR_CHECK" ]]; then
  warn "No DATABASE_URL found (env, --secrets-json, or .env). Pages that read the DB will fail, which blocks browser verification."
  confirm "Continue without a database?" || exit 1
elif command -v psql >/dev/null 2>&1; then
  if psql "$DB_URL_FOR_CHECK" -Atqc 'select 1' >/dev/null 2>&1; then ok "database reachable"
  else warn "DATABASE_URL set but the database did not answer."; confirm "Continue anyway?" || exit 1; fi
else
  warn "psql not installed; DATABASE_URL is set but reachability was not checked."
fi

if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$APP_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  warn "Port $APP_PORT is already in use:"
  lsof -nP -iTCP:"$APP_PORT" -sTCP:LISTEN | sed 's/^/      /'
  confirm "Continue (the agent will need that port)?" || exit 1
else
  ok "port $APP_PORT free"
fi

# ---------- 5. MCP servers ----------
bold "5. MCP servers"
mcp_list="$(claude mcp list 2>&1 || true)"
if grep -qiE 'chrome|browser|devtools|playwright|puppeteer' <<<"$mcp_list"; then
  ok "browser MCP present:"
  grep -iE 'chrome|browser|devtools|playwright|puppeteer' <<<"$mcp_list" | sed 's/^/      /'
else
  warn "No browser MCP found in 'claude mcp list'. The run's only accepted evidence comes from one."
  confirm "Continue without a browser MCP?" || exit 1
fi
if grep -qi "$DESIGN_MCP_NAME" <<<"$mcp_list"; then
  ok "$DESIGN_MCP_NAME present"
else
  warn "$DESIGN_MCP_NAME not configured."
  if confirm "Add it now ($DESIGN_MCP_URL, http transport)?"; then
    claude mcp add --transport http "$DESIGN_MCP_NAME" "$DESIGN_MCP_URL"
    ok "added $DESIGN_MCP_NAME"
  fi
fi

# ---------- 6. design login ----------
bold "6. claude_design login"
if [[ $SKIP_LOGIN -eq 1 ]]; then
  warn "skipped (--skip-login)"
else
  echo "  Claude Code will open. Run /design-login (or authenticate $DESIGN_MCP_NAME under /mcp), then /exit."
  confirm "Open Claude Code for login now?" && (cd "$REPO_DIR" && claude --model "$MODEL") || warn "login step skipped"
fi

# ---------- 7. split the prompt ----------
bold "7. Prompt"
RUN_DIR="$REPO_DIR/.git/ds-run"          # inside .git so nothing here can be committed
mkdir -p "$RUN_DIR"
awk '/^## Part A/{on=1; next} on && /^---[[:space:]]*$/{exit} on' "$PROMPT_FILE" > "$RUN_DIR/system.md"
awk '/^## Part B/{on=1; next} on' "$PROMPT_FILE" > "$RUN_DIR/task.md"
[[ -s "$RUN_DIR/system.md" ]] || fail "Couldn't find '## Part A' in $PROMPT_FILE"
[[ -s "$RUN_DIR/task.md"   ]] || fail "Couldn't find '## Part B' in $PROMPT_FILE"
grep -q '^A standing instruction from the user' "$RUN_DIR/system.md" \
  || fail "Part A is missing the standing instruction paragraph."
ok "system prompt: $(wc -w < "$RUN_DIR/system.md" | tr -d ' ') words; task: $(wc -w < "$RUN_DIR/task.md" | tr -d ' ') words"

help_text="$(claude --help 2>&1 || true)"
CLAUDE_ARGS=(--model "$MODEL")
if grep -q -- '--append-system-prompt' <<<"$help_text"; then
  CLAUDE_ARGS+=(--append-system-prompt "__SYSTEM__")
  PROMPT_MODE="split"
  ok "using --append-system-prompt for Part A"
else
  # Fallback: one message, with the standing instruction kept as the final paragraph.
  awk '/^A standing instruction from the user/{exit} {print}' "$RUN_DIR/system.md" > "$RUN_DIR/combined.md"
  printf '\n' >> "$RUN_DIR/combined.md"
  cat "$RUN_DIR/task.md" >> "$RUN_DIR/combined.md"
  printf '\n' >> "$RUN_DIR/combined.md"
  awk '/^A standing instruction from the user/{on=1} on' "$RUN_DIR/system.md" >> "$RUN_DIR/combined.md"
  PROMPT_MODE="combined"
  warn "--append-system-prompt not available; sending one combined message (standing instruction last)"
fi
if grep -q -- '--effort' <<<"$help_text"; then
  CLAUDE_ARGS+=(--effort "$EFFORT")
  ok "effort $EFFORT via --effort"
else
  warn "no --effort flag in this Claude Code version; run '/effort $EFFORT' first thing in the session."
fi

# ---------- 8. launcher ----------
LAUNCHER="$RUN_DIR/launch.sh"
{
  echo '#!/usr/bin/env bash'
  echo 'set -euo pipefail'
  printf 'cd %q\n' "$REPO_DIR"
  if [[ -n "$SECRETS_JSON" ]]; then
    printf 'eval "$(jq -r '\''to_entries[] | "export \\(.key)=\\(.value | tostring | @sh)"'\'' %q)"\n' "$SECRETS_JSON"
  fi
  printf 'args=('; printf '%q ' "${CLAUDE_ARGS[@]}"; echo ')'
  if [[ "$PROMPT_MODE" == "split" ]]; then
    printf 'for i in "${!args[@]}"; do [[ "${args[$i]}" == "__SYSTEM__" ]] && args[$i]="$(cat %q)"; done\n' "$RUN_DIR/system.md"
    printf 'exec claude "${args[@]}" "$(cat %q)"\n' "$RUN_DIR/task.md"
  else
    printf 'exec claude "${args[@]}" "$(cat %q)"\n' "$RUN_DIR/combined.md"
  fi
} > "$LAUNCHER"
chmod +x "$LAUNCHER"

bold "8. Launch"
echo "  Launcher: $LAUNCHER"
confirm "Start the run now?" || { echo "  Start it later with: $LAUNCHER"; exit 0; }
if [[ $USE_TMUX -eq 1 ]]; then
  tmux has-session -t "$TMUX_SESSION" 2>/dev/null && fail "tmux session '$TMUX_SESSION' already exists (tmux kill-session -t $TMUX_SESSION)."
  tmux new-session -d -s "$TMUX_SESSION" -c "$REPO_DIR" "bash $(printf '%q' "$LAUNCHER")"
  ok "running in tmux session '$TMUX_SESSION' — attach with: tmux attach -t $TMUX_SESSION"
  echo "  Permission prompts will wait for you in that session."
else
  exec bash "$LAUNCHER"
fi
