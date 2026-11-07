#!/bin/bash
# PreToolUse hook for the headless triage agent. Exit 2 blocks the tool call (and any other non-zero
# exit is turned into a block too). Deny rules in settings.json miss full-path and `sh -c` calls; this is the hard guard.
# Blocks: non-GET requests, git push to anything but selfheal/*, force push, gh pr merge, gh api writes other than
# issue/label/PR create+update, ssh/scp/rsync (Replit), any mcp__* tool, secret reads, writes outside the fix worktree.
set -u
LOG="$HOME/Library/Logs/awesome-selfheal/guard.log"
trap 'echo "selfheal guard: internal error, failing closed" >&2; exit 2' ERR
set -E

input=$(cat)
tool=$(jq -r '.tool_name // ""' <<<"$input")

block() {
  mkdir -p "$(dirname "$LOG")"
  printf '%s BLOCK %s | %s | %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$tool" "$(printf '%s' "${2:-}" | tr '\n' ' ' | cut -c1-200)" >>"$LOG"
  echo "selfheal guard: blocked ($1). The triage agent may only read, edit its fix worktree, open issues/PRs and run GETs." >&2
  exit 2
}

SECRET_RE='awesome-audit|owner\.hdr|(^|/)\.ssh(/|$)|(^|/)\.env([^[:alnum:]]|$)|\.aws/|Keychains|\.gnupg|\.config/gh/|cookies[[:space:]]+get|(find|dump|export)-(generic|internet)-password|security[[:space:]]+(find|dump|export)'

check_path() { # tool path
  local p="$2" real
  [[ "$p" =~ $SECRET_RE ]] && block "secret path" "$p"
  case "$1" in Read|Grep|Glob) return 0 ;; esac
  [ -n "${SELFHEAL_FIX_DIR:-}" ] || block "write with no fix worktree" "$p"
  [[ "$p" == *".."* ]] && block "path traversal" "$p"
  [[ "$p" == */.git || "$p" == */.git/* ]] && block "git internals" "$p"
  [[ "$p" == */node_modules/* || "$p" == */package.json || "$p" == */package-lock.json || "$p" == */.npmrc || "$p" == *.config.* || "$p" == */scripts/selfheal/* ]] && block "protected path (deps, config, selfheal)" "$p"
  real="$p"
  case "$real" in "$SELFHEAL_FIX_DIR"/*) return 0 ;; esac
  block "write outside fix worktree" "$p"
}

TOOLS_OK_FOR_HOST='^(curl|echo|printf|grep|rg|git|gh|cat|head|tail|jq|sed|awk|wc|sort|uniq|cut|tr|ls)$'

CURL_RE='^curl( -sS)?( -m [0-9]+)?( -I)? https://awesome\.video/[A-Za-z0-9._~/?&=%:-]*$'

check_curl() { # whole segment must match one strict shape; no flag parsing
  [[ "$1" =~ $CURL_RE ]] || block "curl outside the strict GET shape" "$1"
}

check_gh_api() { # tokens after `gh api`
  local method="" endpoint="" writes=0 prev="" t
  for t in "$@"; do
    case "$prev" in -X|--method) method=$(printf '%s' "$t" | tr a-z A-Z) ;; esac
    case "$t" in
      -f|-F|--field|--raw-field|--input|-f?*|-F?*|--field=*|--raw-field=*|--input=*) writes=1 ;;
      --method=*) method=$(printf '%s' "${t#--method=}" | tr a-z A-Z) ;;
      -X?*) method=$(printf '%s' "${t#-X}" | tr a-z A-Z) ;;
      -*) ;;
      *) if [ -z "$endpoint" ] && [ "$prev" != "-X" ] && [ "$prev" != "--method" ] && [[ "$prev" != -H && "$prev" != --header && "$prev" != --jq && "$prev" != -q && "$prev" != --template && "$prev" != -t ]]; then endpoint="$t"; fi ;;
    esac
    prev="$t"
  done
  [[ "$endpoint" =~ graphql ]] && block "gh api graphql" "$*"
  [ -z "$method" ] && { [ "$writes" -eq 1 ] && method=POST || method=GET; }
  [ "$method" = GET ] && return 0
  [[ "$method" =~ ^(POST|PATCH)$ ]] || block "gh api $method" "$*"
  [[ "$endpoint" =~ ^/?repos/[^/]+/[^/]+/(issues|issues/[0-9]+|issues/[0-9]+/comments|issues/[0-9]+/labels|labels|labels/[^/]+|pulls)$ ]] \
    || block "gh api write outside issue/label/PR create" "$*"
}

check_segment() {
  local seg="$1" toks first
  read -r -a toks <<<"$seg"
  [ "${#toks[@]}" -gt 0 ] || return 0
  first="${toks[0]}"
  while [[ "$first" == *=* && "${#toks[@]}" -gt 1 ]]; do toks=("${toks[@]:1}"); first="${toks[0]}"; done
  first="${first##*/}"

  [[ "$first" =~ ^(sh|bash|zsh|dash|ksh|fish|node|deno|bun|python|python3|perl|ruby|php|lua|tclsh|source|\.|exec|xargs|env|wget|ssh|scp|sftp|rsync|mosh|sudo|launchctl|osascript|nc|ncat|telnet)$ ]] && block "forbidden command $first" "$seg"
  [[ "$seg" == *awesome-replit* ]] && block "replit ssh host" "$seg"

  if [ "$first" = curl ]; then check_curl "$(printf "%s" "$seg" | sed -E "s/^[[:space:]]+//; s/[[:space:]]+$//")"; fi
  if [[ "$seg" =~ [Aa]wesome\.video ]] && ! [[ "$first" =~ $TOOLS_OK_FOR_HOST ]]; then block "non-curl client against awesome.video" "$seg"; fi

  if [ "$first" = git ]; then
    if [[ "$seg" =~ (^|[[:space:]])push([[:space:]]|$) ]]; then
      [[ "$seg" =~ ^[[:space:]]*git[[:space:]]+push([[:space:]]+(-u|--set-upstream))?[[:space:]]+origin[[:space:]]+selfheal/[A-Za-z0-9._/-]+[[:space:]]*$ ]] \
        || block "git push other than origin selfheal/*" "$seg"
    fi
    [[ "$seg" =~ (reset[[:space:]]+--hard|branch[[:space:]]+-[dD]|clean[[:space:]]+-[a-zA-Z]*f|update-ref|filter-branch|config[[:space:]]|remote[[:space:]]+(set-url|add)) ]] && block "destructive git" "$seg"
  fi

  if [ "$first" = gh ]; then
    [[ "$seg" =~ gh[[:space:]]+pr[[:space:]]+(merge|review|ready) ]] && block "gh pr merge/review" "$seg"
    [[ "$seg" =~ gh[[:space:]]+(repo|release|secret|variable|workflow|run|ruleset|auth|extension|alias|codespace|ssh-key|gpg-key)[[:space:]] ]] && block "gh admin command" "$seg"
    [[ "$seg" =~ gh[[:space:]]+issue[[:space:]]+(delete|transfer|lock|pin) ]] && block "gh issue destructive" "$seg"
    [[ "$seg" =~ gh[[:space:]]+label[[:space:]]+delete ]] && block "gh label delete" "$seg"
    if [ "${toks[1]:-}" = api ]; then check_gh_api "${toks[@]:2}"; fi
  fi
}

case "$tool" in
  mcp__*) block "mcp tool" "$tool" ;;
  Read|Write|Edit|MultiEdit|NotebookEdit)
    check_path "$tool" "$(jq -r '.tool_input.file_path // .tool_input.notebook_path // ""' <<<"$input")" ;;
  Grep|Glob)
    check_path "$tool" "$(jq -r '.tool_input.path // ""' <<<"$input")" ;;
  Bash)
    cmd=$(jq -r '.tool_input.command // ""' <<<"$input")
    [[ "$cmd" =~ $SECRET_RE ]] && block "secret reference" "$cmd"
    # globs/expansions next to a sensitive directory name can spell a secret path without matching SECRET_RE
    [[ "$cmd" =~ (\.cache|\.ssh|\.config|\.aws|\.gnupg|awesome-|owner|Keychains) && "$cmd" =~ [\*\?\[\$\`~\\] ]] && block "glob/expansion near sensitive path" "$cmd"
    while IFS= read -r seg; do check_segment "$seg"; done < <(printf '%s\n' "$cmd" | sed -E 's/(&|\||;|`|\(|\))/\n/g')
    # sh -c / eval wrappers hide the real command: scan their payload as one more segment
    [[ "$cmd" =~ (sh|bash|zsh)[[:space:]]+-c|eval[[:space:]] ]] && block "shell wrapper" "$cmd"
    ;;
esac
exit 0
