#!/usr/bin/env bash
# Build the repo Dockerfile at a clean commit, push it to the Cloudflare
# registry, point wrangler.jsonc at the new tag and deploy cf.awesome.video.
#
#   deploy/cloudflare/release.sh            # build + push + deploy HEAD
#   deploy/cloudflare/release.sh --no-deploy  # build + push only
#
# Public (VITE_*) build inputs come from the repo .env; values are never
# echoed. Runtime secrets are NOT handled here: upload them with
# `wrangler secret put` (see docs/DEPLOYMENT.md#cloudflare-containers).
set -euo pipefail

repo=$(git rev-parse --show-toplevel)
cf="$repo/deploy/cloudflare"
cd "$repo"

if [[ -n $(git status --porcelain --untracked-files=no) ]]; then
  echo "release: working tree has uncommitted changes; commit first so the image maps to one revision" >&2
  exit 1
fi

rev=$(git rev-parse HEAD)
tag=${rev:0:8}
account=$(sed -n 's#.*registry.cloudflare.com/\([0-9a-f]*\)/.*#\1#p' "$cf/wrangler.jsonc")
image="registry.cloudflare.com/$account/awesome-video-cf:$tag"

# Read KEY=VALUE (or KEY = "VALUE", as copied from .replit) from .env without
# sourcing it (no shell evaluation).
env_value() {
  [[ -f "$repo/.env" ]] || return 0
  sed -n "s/^$1[[:space:]]*=[[:space:]]*//p" "$repo/.env" | tail -n 1 |
    sed -e 's/[[:space:]]*$//' -e 's/^["'\'']//' -e 's/["'\'']$//'
}

build_args=(--build-arg "BUILD_REVISION=$rev")
# Development Clerk instance until cutover: Clerk rejects proxied Frontend API
# calls for development instances, so the proxy URL stays empty.
build_args+=(--build-arg "VITE_CLERK_PROXY_URL=")
for name in VITE_CLERK_PUBLISHABLE_KEY VITE_CONTACT_VARIANT VITE_AMPLITUDE_API_KEY \
  VITE_MIXPANEL_TOKEN VITE_POSTHOG_KEY VITE_POSTHOG_HOST VITE_GA_MEASUREMENT_ID; do
  value=$(env_value "$name")
  if [[ -n $value ]]; then
    build_args+=(--build-arg "$name=$value")
    echo "release: build arg $name set"
  else
    echo "release: build arg $name empty"
  fi
done

echo "release: building $image for linux/amd64"
docker buildx build --platform linux/amd64 "${build_args[@]}" -t "awesome-video-cf:$tag" --load "$repo"

echo "release: pushing $image"
(cd "$cf" && npx --no-install wrangler containers push "awesome-video-cf:$tag")

sed -i.bak "s#awesome-video-cf:[0-9a-f]\{7,40\}\"#awesome-video-cf:$tag\"#" "$cf/wrangler.jsonc"
rm -f "$cf/wrangler.jsonc.bak"
echo "release: wrangler.jsonc now references $tag (commit it)"

if [[ ${1:-} == "--no-deploy" ]]; then exit 0; fi

# A deploy that only changes `image` leaves the running instance on its old
# image indefinitely (observed 2026-10-13; cloudflare/containers#233), so
# recreate the container application. The old container keeps answering until
# the new one takes over (70 s to 6 min observed); the database is external and
# the Durable Object storage belongs to the Worker, so nothing is lost.
cd "$cf"
npm run check
app_id=$(npx --no-install wrangler containers list 2>/dev/null |
  sed -n 's/^│ \([0-9a-f-]\{36\}\) │ awesome-video-cf-awesomevideoapp .*/\1/p' | head -n 1)
if [[ -n $app_id ]]; then
  echo "release: deleting container application $app_id"
  # One finite answer: `yes |` would die of SIGPIPE (141) under pipefail
  # after a successful delete and abort the deploy below.
  npx --no-install wrangler containers delete "$app_id" <<<"y" >/dev/null
fi
npx --no-install wrangler deploy --message "image $tag"
echo "release: deployed $tag; confirm https://cf.awesome.video/api/version reports $rev"
