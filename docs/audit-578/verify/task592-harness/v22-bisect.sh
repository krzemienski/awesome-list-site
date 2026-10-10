#!/usr/bin/env bash
rev=$1; d=/tmp/v22b-$rev; rm -rf $d; mkdir $d; cd /home/runner/workspace
git archive $rev client shared server scripts vite.config.ts tsconfig.json package.json postcss.config.js tailwind.config.ts components.json | tar -xf - -C $d
ln -s /tmp/v22/node_modules $d/node_modules; cd $d
BUILD_REVISION=$rev timeout 200 npx vite build > build.log 2>&1 || { echo "$rev build-fail"; exit; }
echo "$rev $(node scripts/validation/bundle-budget.mjs 2>&1 | grep -m1 initial)"
rm -rf $d
