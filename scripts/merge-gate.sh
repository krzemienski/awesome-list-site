#!/usr/bin/env bash
# Merge gate (#84): check the combined tree of origin/main + <branch> before merging.
# Usage: scripts/merge-gate.sh [branch]      (default: main, i.e. a gate run on origin/main itself)
# Exit codes: 0 pass, 10 merge conflict, 11 tsc, 12 build, 13 eslint regression, 14 package.json/lockfile changed,
#             2 usage or setup error.
# Gate commands run unpiped so their own exit status is what the gate reports.
set -u -o pipefail

BR="${1:-main}"
MAIN_CLONE="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
GATE_ROOT="$(mktemp -d)"
T="$GATE_ROOT/gate"
B="$GATE_ROOT/base"   # pristine origin/main: type-aware ESLint reads the file on disk, so --stdin cannot give a baseline

cleanup() {
  cd "$MAIN_CLONE" || true
  rm -f "$T/node_modules" "$B/node_modules"
  git worktree remove --force "$T" 2>/dev/null
  git worktree remove --force "$B" 2>/dev/null
  git worktree prune
  rm -rf "$GATE_ROOT"
}
trap cleanup EXIT
trap 'echo "GATE ABORTED" >&2; exit 130' INT TERM

fail() { # fail <code> <step> <detail>
  echo "GATE FAIL [$2]: $3" >&2
  exit "$1"
}

cd "$MAIN_CLONE" || fail 2 setup "cannot enter $MAIN_CLONE"
git fetch -q origin main || fail 2 setup "git fetch origin main failed"
git ls-remote -q --exit-code --heads origin "$BR" >/dev/null 2>&1
case $? in
  0) git fetch -q origin "$BR" || fail 2 setup "cannot fetch; refusing to gate a stale ref"
     REF="origin/$BR" ;;
  2) REF="" ;; # not on origin: a local-only branch is allowed
  *) fail 2 setup "cannot fetch; refusing to gate a stale ref (git ls-remote failed)" ;;
esac
if [ -n "$REF" ]; then
  :
elif git rev-parse --verify -q "refs/heads/$BR" >/dev/null; then
  REF="$BR"
else
  fail 2 setup "branch '$BR' not found on origin or locally"
fi
echo "gate: merging $REF ($(git rev-parse --short "$REF")) into origin/main ($(git rev-parse --short origin/main))"

git worktree add -q --detach "$T" origin/main || fail 2 setup "git worktree add failed"
cd "$T" || fail 2 setup "cannot enter scratch worktree"

echo "== step: merge"
if ! MERGE_OUT="$(git merge --no-commit --no-ff "$REF" 2>&1)"; then
  CONFLICTS="$(git diff --name-only --diff-filter=U)"
  if [ -n "$CONFLICTS" ]; then
    echo "$CONFLICTS"
    fail 10 merge "conflict merging $REF into origin/main"
  fi
  fail 2 setup "git merge failed without conflicts: $MERGE_OUT"
fi

# Only what npm installs can make the symlinked node_modules stale; a change to
# package.json "scripts" alone cannot.
install_fields_changed() {
  git diff --quiet origin/main -- package-lock.json || return 0
  git diff --quiet origin/main -- package.json && return 1
  node -e '
    const pick = (s) => { const p = JSON.parse(s); return JSON.stringify(["dependencies", "devDependencies",
      "optionalDependencies", "peerDependencies", "overrides", "engines", "workspaces"].map((k) => p[k])); };
    process.exit(pick(process.argv[1]) === pick(process.argv[2]) ? 1 : 0);
  ' "$(git show origin/main:package.json)" "$(cat package.json)"
}
if install_fields_changed; then
  git diff --stat origin/main -- package.json package-lock.json
  fail 14 deps "dependencies or package-lock.json changed; the symlinked node_modules would be stale. Run npm ci in a scratch tree and check by hand."
fi

# Link only now so the merge saw a clean tree (node_modules is in .git/info/exclude).
ln -s "$MAIN_CLONE/node_modules" node_modules || fail 2 setup "cannot symlink node_modules"

# Merge commit object (no ref moved, no hooks) so BUILD_REVISION names the combined tree.
if [ -f "$(git rev-parse --git-path MERGE_HEAD)" ]; then
  MERGE_SHA="$(git commit-tree "$(git write-tree)" -p HEAD -p MERGE_HEAD -m "merge-gate $REF")" \
    || fail 2 setup "git commit-tree failed"
else
  MERGE_SHA="$(git rev-parse HEAD)"
fi
echo "gate: merged tree $MERGE_SHA"

echo "== step: tsc"
npx tsc --noEmit -p . --incremental false || fail 11 tsc "type errors in the combined tree"

echo "== step: build"
BUILD_REVISION="$MERGE_SHA" npm run build || fail 12 build "npm run build failed on the combined tree"

echo "== step: eslint (changed files vs origin/main)"
error_count() { # reads JSON from stdin, prints total errorCount
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let n=0;try{for(const f of JSON.parse(s))n+=f.errorCount}catch{n=-1}console.log(n)})'
}
git worktree add -q --detach "$B" origin/main || fail 2 setup "git worktree add (baseline) failed"
ln -s "$MAIN_CLONE/node_modules" "$B/node_modules" || fail 2 setup "cannot symlink node_modules (baseline)"
# Lint both sides with the merged tree's rules, so a change that adds a rule
# counts existing violations on both sides (a ratchet) instead of failing
# every file it touches.
for cfg in eslint*.config.* tsconfig.eslint.json; do
  [ -f "$cfg" ] && { cp "$cfg" "$B/$cfg" || fail 2 setup "cannot copy $cfg into the baseline"; }
done
worse=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  now="$(npx eslint -f json "$f" | error_count)"
  if [ -f "$B/$f" ]; then
    base="$(cd "$B" && npx eslint -f json "$f" | error_count)"
  else
    base=0
  fi
  if [ "$now" -lt 0 ] || [ "$base" -lt 0 ]; then
    echo "  $f: eslint produced no JSON (now=$now base=$base)"
    worse=1
  elif [ "$now" -gt "$base" ]; then
    echo "  $f: WORSE  origin/main=$base  merged=$now"
    npx eslint "$f"
    worse=1
  else
    echo "  $f: ok     origin/main=$base  merged=$now"
  fi
done < <(git diff --name-only --diff-filter=ACMR origin/main | grep -E '\.(ts|tsx|js|jsx|mjs|cjs)$')
[ "$worse" -eq 0 ] || fail 13 eslint "a changed file has more ESLint errors than on origin/main"

echo "GATE PASS: $REF merges cleanly into origin/main; tsc, build and eslint-regression all pass"
