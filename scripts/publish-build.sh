#!/usr/bin/env bash
# Publish build: refuse a workspace that is not GitHub main, production build,
# then trim development-only bulk from the publish image (the 8 GiB image limit
# counts ignored files).
#
# REPLIT_PUBLISH_IMAGE_TRIM=1 exists only in Replit's production environment,
# so the trim step can never delete workspace files.
set -euo pipefail

MAIN_REF=refs/remotes/origin/main

refuse_publish() {
  echo "publish-build: $1" >&2
  echo "publish-build: publish only a git checkout of GitHub main. Sync the workspace first: git fetch origin && git merge --ff-only origin/main (see .claude/skills/replit-deploy/SKILL.md, step 2)." >&2
  exit 1
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
  local head_tree main_tree
  head_tree=$(git rev-parse --verify --quiet 'HEAD^{tree}') \
    || refuse_publish "no git HEAD in $(pwd), so this build cannot prove it matches GitHub main."
  main_tree=$(git rev-parse --verify --quiet "$MAIN_REF^{tree}") \
    || refuse_publish "$MAIN_REF is missing, so this build cannot prove it matches GitHub main."
  if [ "$head_tree" != "$main_tree" ]; then
    echo "publish-build: HEAD $(git rev-parse --short HEAD) differs from origin/main $(git rev-parse --short "$MAIN_REF") (git diff --stat origin/main HEAD):" >&2
    git --no-pager diff --stat "$MAIN_REF" HEAD >&2
    refuse_publish "this build would ship files that are not GitHub main's."
  fi
  echo "publish-build: HEAD $(git rev-parse --short HEAD) has the same files as origin/main $(git rev-parse --short "$MAIN_REF")."
}

require_head_on_origin_main

npm run build

if [ "${REPLIT_DEPLOYMENT:-}" = "1" ] || [ "${REPLIT_PUBLISH_IMAGE_TRIM:-}" = "1" ]; then
  node scripts/deployment/trim-publish-image.mjs --apply
fi
