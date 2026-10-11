#!/usr/bin/env bash
# Publish build: production build, then trim development-only bulk from the
# publish image (the 8 GiB image limit counts ignored files).
#
# REPLIT_PUBLISH_IMAGE_TRIM=1 exists only in Replit's production environment,
# so the trim step can never delete workspace files.
set -euo pipefail

npm run build

if [ "${REPLIT_DEPLOYMENT:-}" = "1" ] || [ "${REPLIT_PUBLISH_IMAGE_TRIM:-}" = "1" ]; then
  node scripts/deployment/trim-publish-image.mjs --apply
fi
