#!/usr/bin/env bash
# Publish build: refuse a workspace whose build inputs are not GitHub main's,
# stamp exactly that main commit, production build, then trim development-only
# bulk from the publish image (the 8 GiB image limit counts ignored files).
#
# REPLIT_PUBLISH_IMAGE_TRIM=1 exists only in Replit's production environment,
# so the trim step can never delete workspace files.
set -euo pipefail

MAIN_REF=refs/remotes/origin/main
TRIM_SCRIPT=scripts/deployment/trim-publish-image.mjs
# Public settings the workspace .env mirrors from .replit [userenv.*], plus the
# legacy client/.env (Vite never reads it: envDir is the repo root). Any other
# key either changes what the build bakes in or may be a secret, so it is
# refused by name. Values are never printed.
PUBLIC_DOTENV_KEYS="VITE_SITE_URL VITE_SITE_TITLE VITE_SITE_DESCRIPTION VITE_DEFAULT_THEME VITE_CONTACT_VARIANT VITE_GA_MEASUREMENT_ID VITE_MIXPANEL_TOKEN VITE_POSTHOG_KEY VITE_POSTHOG_HOST VITE_AMPLITUDE_API_KEY"
# Root files the build tools search for and that main does not have. Vite takes
# the first vite.config.* it finds in this order (js, mjs, ts, ...), so an extra
# one would replace main's vite.config.ts; PostCSS and browserslist files change
# the emitted CSS.
UNTRACKED_BUILD_CONFIG="vite.config.js vite.config.mjs vite.config.cjs vite.config.mts vite.config.cts postcss.config.js postcss.config.cjs postcss.config.mjs postcss.config.ts postcss.config.mts postcss.config.cts .postcssrc .postcssrc.json .postcssrc.yaml .postcssrc.yml .postcssrc.js .postcssrc.cjs .postcssrc.mjs .postcssrc.ts .postcssrc.mts .postcssrc.cts .browserslistrc browserslist"
MAIN_COMMIT=""
SCAN_DIR=""

cleanup() {
  if [ -n "$SCAN_DIR" ]; then rm -rf "$SCAN_DIR"; fi
}
trap cleanup EXIT

refuse_publish() {
  echo "publish-build: $1" >&2
  echo "publish-build: publish only a git checkout of GitHub main. Sync the workspace first: git fetch origin && git merge --ff-only origin/main (see .claude/skills/replit-deploy/SKILL.md, step 2)." >&2
  exit 1
}

show_first_lines() {
  printf '%s\n' "$1" | sed -n '1,20p' >&2
}

# Replit publishes the workspace HEAD, which can carry autosave or Agent commits
# that GitHub never saw. Comparing trees lets Replit's empty "Published your
# App" commits through, because they keep their parent's tree. The ref comes
# from the deploy sync's fetch, not a fetch here: the build container may have
# no GitHub credentials, and a stale ref can only fail the build or match a tree
# that was on main.
require_head_on_origin_main() {
  command -v git >/dev/null 2>&1 \
    || refuse_publish "git is not installed, so this build cannot prove it matches GitHub main."
  # Every pathspec below must cover the whole tree, so work from its root.
  local root head_tree main_tree
  root=$(git rev-parse --show-toplevel 2>/dev/null) \
    && cd "$root" \
    || refuse_publish "$(pwd) is not inside a git checkout, so this build cannot prove it matches GitHub main."
  head_tree=$(git rev-parse --verify --quiet 'HEAD^{tree}') \
    || refuse_publish "no git HEAD in $(pwd), so this build cannot prove it matches GitHub main."
  main_tree=$(git rev-parse --verify --quiet "$MAIN_REF^{tree}") \
    || refuse_publish "$MAIN_REF is missing, so this build cannot prove it matches GitHub main."
  MAIN_COMMIT=$(git rev-parse --verify --quiet "$MAIN_REF^{commit}") \
    || refuse_publish "$MAIN_REF is not a commit, so this build cannot prove it matches GitHub main."
  if [ "$head_tree" != "$main_tree" ]; then
    echo "publish-build: HEAD $(git rev-parse --short HEAD) differs from origin/main $(git rev-parse --short "$MAIN_REF") (git diff --stat origin/main HEAD):" >&2
    git --no-pager diff --stat "$MAIN_REF" HEAD >&2
    refuse_publish "this build would ship files that are not GitHub main's."
  fi
}

# The stamp is origin/main's commit, never HEAD's: HEAD may be Replit's empty
# "Published your App" commit, which GitHub does not have. A caller value naming
# another commit would make /api/version lie, so it is refused (without echoing
# the untrusted value); one equal to the target is accepted and changes nothing.
require_revision_is_main() {
  if [ -n "${BUILD_REVISION:-}" ] && [ "$BUILD_REVISION" != "$MAIN_COMMIT" ]; then
    echo "publish-build: BUILD_REVISION in the environment is not origin/main's commit $MAIN_COMMIT." >&2
    echo "publish-build: unset it; this build stamps origin/main." >&2
    exit 1
  fi
  BUILD_REVISION=$MAIN_COMMIT
  export BUILD_REVISION
}

# dotenv takes its file list, override flag and parser from DOTENV_* variables,
# so one set in the build environment can load any file over the declared
# mirror. Names only.
require_no_dotenv_redirect() {
  local names
  names=$(awk 'BEGIN { for (name in ENVIRON) if (name ~ /^DOTENV_/) print name }') \
    || refuse_publish "could not read the build environment."
  if [ -n "$names" ]; then
    echo "publish-build: dotenv settings in the build environment (names only):" >&2
    show_first_lines "$names"
    refuse_publish "dotenv could load files and values that are not the declared public config."
  fi
}

# A dotenv file the build may read must be a regular file whose every line is a
# plain KEY=value for a key in PUBLIC_DOTENV_KEYS. Vite expands $VAR and ${VAR}
# in .env values (dotenv-expand), which would copy a secret into a browser key,
# and dotenv reads a quote that does not close on its line as a multi-line value.
# So a line with $, a backtick, a backslash or a carriage return, a quote that
# does not wrap the whole value, or no key is refused. Key names and line numbers
# are printed, never values.
require_public_dotenv() {
  local file=$1 bad
  if [ ! -e "$file" ] && [ ! -L "$file" ]; then return 0; fi
  if [ -L "$file" ] || [ ! -f "$file" ]; then
    refuse_publish "$file is not a regular file, so what dotenv loads from it cannot be proven."
  fi
  bad=$(awk -v allowed="$PUBLIC_DOTENV_KEYS" '
    function reject(why) { print "line " NR ": " why }
    BEGIN { n = split(allowed, names, " "); for (i = 1; i <= n; i++) ok[names[i]] = 1 }
    /^[[:space:]]*(#|$)/ { next }
    {
      line = $0
      if (index(line, "$") || index(line, "`") || index(line, "\\") || index(line, "\r")) {
        reject("interpolation, escape or control character"); next
      }
      sub(/^[[:space:]]*(export[[:space:]]+)?/, "", line)
      eq = index(line, "=")
      if (eq == 0) { reject("no key"); next }
      key = substr(line, 1, eq - 1)
      sub(/[[:space:]]+$/, "", key)
      if (key !~ /^[A-Za-z_][A-Za-z0-9_]*$/) { reject("unparsable key"); next }
      if (!(key in ok)) { reject("key " key " is not declared public config"); next }
      value = substr(line, eq + 1)
      sub(/^[[:space:]]+/, "", value)
      sub(/[[:space:]]+$/, "", value)
      q = substr(value, 1, 1)
      if (q == "\"" || q == "\047") {
        if (length(value) < 2 || substr(value, length(value), 1) != q || index(substr(value, 2, length(value) - 2), q)) {
          reject("quote does not wrap exactly the value on this line")
        }
      } else if (index(value, "\"") || index(value, "\047")) {
        reject("stray quote")
      }
    }' "$file") || refuse_publish "could not read the key names in $file."
  if [ -n "$bad" ]; then
    echo "publish-build: $file is not plain public config (key names and line numbers only):" >&2
    show_first_lines "$bad"
    refuse_publish "secrets belong in Replit Secrets, and other keys or syntax change what the build bakes in."
  fi
}

# git against a throwaway index holding origin/main's tree. The workspace index
# is not trusted: assume-unchanged, skip-worktree, staged adds and a stale stat
# cache can all hide what is on disk. Line-ending conversion is off so the bytes
# git compares are the bytes the build reads. File mode is off because no build
# step reads it (tsc, Vite, esbuild and Tailwind read content only, and a
# changed type, content or missing file still counts).
scan_git() {
  GIT_INDEX_FILE="$SCAN_DIR/index" git \
    -c core.autocrlf=false -c core.safecrlf=false -c core.fileMode=false \
    -c core.fsmonitor=false -c core.untrackedCache=false "$@"
}

# What the build reads is files on disk (client/, shared/, server/, the Vite,
# Tailwind, PostCSS and TypeScript config, client/public copied verbatim into
# dist/public), not the commit. HEAD's tree matching main's says nothing about
# an edited, deleted or extra file, so compare the files themselves.
#   - Tracked files must match main's, package.json and package-lock.json
#     included: they decide which dependencies the build installs.
#   - Untracked files are refused, except inside the trim script's evidence
#     directories: no build step reads them and the publishing copy deletes
#     them. attached_assets is deliberately not one of them (see below).
#   - Under client/, shared/ and server/ every untracked file is refused,
#     ignored or not and whatever .git/info/exclude says, because tsc, Vite,
#     esbuild and Tailwind read them. The two exceptions are JSON data files in
#     .omc/state (agent session state: tsc skips dot directories, Tailwind
#     skips Git-ignored files, and no tracked source names .omc, so nothing
#     imports them) and the legacy client/.env checked like .env below.
#   - Root build config that main lacks (see UNTRACKED_BUILD_CONFIG) and any
#     root dotenv file besides .env are refused, ignored or not. vite.config.ts
#     loads .env through dotenv, and Vite also reads .env.local, .env.production
#     and .env.production.local.
#   - .env and client/.env may exist only as plain public config
#     (require_public_dotenv).
#   - attached_assets is Git-ignored but aliased as @assets in vite.config.ts,
#     so any file in it is a build input Git cannot vouch for: it must be empty,
#     except in the production build copy (marker set), where it is removed
#     by `trim-publish-image.mjs --pre-build` before the build.
#   - client/public is served verbatim, so even the .omc/state JSON exception
#     does not apply there.
# Nothing is deleted or modified. Other ignored files (platform and agent
# directories, node_modules, dist, .cache) are not compared.
require_workspace_files_match_main() {
  # `node` runs the trim script, so run it only if it is main's copy.
  [ "$(git hash-object --no-filters -- "$TRIM_SCRIPT" 2>/dev/null)" = "$(git rev-parse --verify --quiet "$MAIN_COMMIT:$TRIM_SCRIPT")" ] \
    || refuse_publish "$TRIM_SCRIPT differs from origin/main's, so its evidence list cannot be trusted."
  local evidence dir name
  local excludes=() config_paths=()
  evidence=$(node "$TRIM_SCRIPT" --list-evidence) \
    || refuse_publish "could not read the evidence directories from $TRIM_SCRIPT."
  [ -n "$evidence" ] || refuse_publish "$TRIM_SCRIPT listed no evidence directories."
  while IFS= read -r dir; do
    excludes+=(":(exclude,literal)$dir")
  done <<<"$evidence"
  for name in $UNTRACKED_BUILD_CONFIG; do
    config_paths+=(":(literal)$name")
  done

  SCAN_DIR=$(mktemp -d) || refuse_publish "could not create a scratch directory for the file comparison."
  { scan_git read-tree --no-sparse-checkout "$MAIN_COMMIT^{tree}" && scan_git update-index -q --refresh; } \
    || refuse_publish "could not compare the workspace files with $MAIN_REF."

  local drift extra inputs config
  drift=$(scan_git diff-files --name-status -- .) \
    || refuse_publish "could not compare tracked files with $MAIN_REF."
  if [ -n "$drift" ]; then
    echo "publish-build: tracked files differ from origin/main (git status letter, path):" >&2
    show_first_lines "$drift"
    refuse_publish "this build would ship files that are not GitHub main's."
  fi

  extra=$(scan_git ls-files --others --exclude-standard -- . "${excludes[@]}") \
    || refuse_publish "could not list untracked files."
  if [ -n "$extra" ]; then
    echo "publish-build: untracked files in the workspace:" >&2
    show_first_lines "$extra"
    refuse_publish "this build would ship files that are not GitHub main's."
  fi

  inputs=$(scan_git ls-files --others -- client shared server \
    | awk '(!/^(client|shared|server)\/(.+\/)?\.omc\/state\/.+\.jsonl?$/ || /^client\/public\//) && $0 != "client/.env"') \
    || refuse_publish "could not list untracked files under client, shared and server."
  if [ -n "$inputs" ]; then
    echo "publish-build: untracked or ignored files where the build reads inputs:" >&2
    show_first_lines "$inputs"
    refuse_publish "this build could ship files that are not GitHub main's."
  fi

  config=$(scan_git ls-files --others -- "${config_paths[@]}" ':(glob).env*' | awk '$0 != ".env"') \
    || refuse_publish "could not list build configuration and dotenv files."
  if [ -n "$config" ]; then
    echo "publish-build: build configuration or dotenv files that origin/main does not have:" >&2
    show_first_lines "$config"
    refuse_publish "this build would bake in values that are not GitHub main's."
  fi
  require_public_dotenv .env
  require_public_dotenv client/.env

  if [ -L attached_assets ] || [ -e attached_assets ]; then
    local assets_entries
    # In the production build copy (marker set) a populated directory is removed
    # before the build, so only a symlink or non-directory is refused there.
    if [ -L attached_assets ] || [ ! -d attached_assets ] \
      || { ! is_publish_copy && { ! assets_entries=$(ls -A attached_assets) || [ -n "$assets_entries" ]; }; }; then
      refuse_publish "attached_assets is not a readable empty directory; vite.config.ts aliases it as @assets and Git ignores it, so its files cannot be vouched for."
    fi
  fi
}

is_publish_copy() {
  [ "${REPLIT_DEPLOYMENT:-}" = "1" ] || [ "${REPLIT_PUBLISH_IMAGE_TRIM:-}" = "1" ]
}

require_head_on_origin_main
require_revision_is_main
require_no_dotenv_redirect
require_workspace_files_match_main

echo "publish-build: HEAD $(git rev-parse --short HEAD) and the workspace files match origin/main $(git rev-parse --short "$MAIN_REF"); stamping BUILD_REVISION=$BUILD_REVISION."

# Production copy only: drop attached_assets first so a true @assets dependency
# fails the build rather than being embedded.
if is_publish_copy; then node "$TRIM_SCRIPT" --pre-build; fi

npm run build

if is_publish_copy; then
  node "$TRIM_SCRIPT" --apply
fi
