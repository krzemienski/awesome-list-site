#!/usr/bin/env bash
# Shared driver helpers for the public full-run E2E suite.
export AGENT_BROWSER_DEFAULT_TIMEOUT=45000
BASE="http://localhost:5000"
EVID="e2e-evidence/public-fullrun"
SESS="${SESS:-qa}"

AB(){ timeout 35 npx agent-browser --session "$SESS" "$@"; }

nav(){ # nav <path>  (networkidle never settles under Vite HMR ws — use fixed settle)
  AB open "$BASE$1" >/dev/null 2>&1
  AB wait --load domcontentloaded >/dev/null 2>&1
  AB wait 1300 >/dev/null 2>&1
}
shot(){ AB screenshot "$EVID/$1" >/dev/null 2>&1; }   # shot <file.png>
url(){ AB get url 2>/dev/null; }
# evaljs: pass JS on stdin, prints result
evaljs(){ AB eval --stdin 2>/dev/null; }
clicktid(){ AB click "[data-testid=\"$1\"]" >/dev/null 2>&1; }  # click by data-testid
clicktext(){ AB find text "$1" click >/dev/null 2>&1; }
settle(){ AB wait "${1:-700}" >/dev/null 2>&1; }

# pass <case> <observed> ; fail <case> <observed>
PASS(){ printf 'PASS | %s | %s\n' "$1" "$2"; }
FAIL(){ printf 'FAIL | %s | %s\n' "$1" "$2"; }
# cmp_eq <case> <actual> <expected> <note>
cmp_eq(){ if [ "$2" = "$3" ]; then PASS "$1" "$4 ($2==$3)"; else FAIL "$1" "$4 ($2 != $3)"; fi; }
