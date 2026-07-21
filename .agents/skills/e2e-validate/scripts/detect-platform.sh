#!/bin/bash
# ──────────────────────────────────────────────────────────────────
# Platform Detection Script — Auto-detect project type
# ──────────────────────────────────────────────────────────────────
# Usage: bash scripts/detect-platform.sh [project-dir]
# Output: Platform type (ios, cli, api, web, fullstack, generic)
# ──────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_DIR="${1:-.}"
cd "$PROJECT_DIR"

HAS_IOS=0
HAS_CLI=0
HAS_API=0
HAS_WEB=0

# ─── iOS Detection ───
if [ -n "$(find . -maxdepth 3 \( -name '*.xcodeproj' -o -name '*.xcworkspace' -o -name 'Package.swift' \) 2>/dev/null | head -1)" ]; then
  HAS_IOS=1
fi

# ─── CLI Detection ───
if [ -f Cargo.toml ] && grep -q '\[\[bin\]\]' Cargo.toml 2>/dev/null; then
  HAS_CLI=1
fi
if [ -f go.mod ] && { [ -f main.go ] || [ -d cmd/ ]; }; then
  HAS_CLI=1
fi
if [ -f pyproject.toml ] && grep -q '\[project\.scripts\]' pyproject.toml 2>/dev/null; then
  HAS_CLI=1
fi
if [ -f package.json ] && grep -q '"bin"' package.json 2>/dev/null; then
  HAS_CLI=1
fi

# ─── API Detection ───
API_SIGNALS=$(find . -maxdepth 4 \( \
  -name 'routes*' -o \
  -name 'handlers*' -o \
  -name 'controllers*' -o \
  -name 'swagger*' -o \
  -name 'openapi*' -o \
  -name 'api*' -path '*/routes/*' -o \
  -name 'server.ts' -o -name 'server.js' -o \
  -name 'app.ts' -o -name 'app.js' -o \
  -name 'main.py' -path '*/api/*' \
\) 2>/dev/null | head -1)
if [ -n "$API_SIGNALS" ]; then
  HAS_API=1
fi
# Also check for framework config
if [ -f package.json ]; then
  grep -qE '"(express|fastify|koa|hapi|nest|hono)"' package.json 2>/dev/null && HAS_API=1
fi
if [ -f requirements.txt ] || [ -f pyproject.toml ]; then
  grep -qiE '(fastapi|flask|django|starlette|sanic)' requirements.txt pyproject.toml 2>/dev/null && HAS_API=1
fi

# ─── Web Frontend Detection ───
WEB_SIGNALS=$(find . -maxdepth 4 \( \
  -name '*.jsx' -o -name '*.tsx' -o \
  -name '*.vue' -o -name '*.svelte' -o \
  -name 'next.config*' -o -name 'nuxt.config*' -o \
  -name 'vite.config*' -o -name 'angular.json' -o \
  -name 'gatsby-config*' -o -name 'remix.config*' \
\) 2>/dev/null | head -1)
if [ -n "$WEB_SIGNALS" ]; then
  HAS_WEB=1
fi

# ─── Determine Platform ───
if [ "$HAS_IOS" -eq 1 ]; then
  echo "ios"
elif [ "$HAS_CLI" -eq 1 ]; then
  echo "cli"
elif [ "$HAS_WEB" -eq 1 ] && [ "$HAS_API" -eq 1 ]; then
  echo "fullstack"
elif [ "$HAS_API" -eq 1 ]; then
  echo "api"
elif [ "$HAS_WEB" -eq 1 ]; then
  echo "web"
else
  echo "generic"
fi
