#!/usr/bin/env bash
# Wrapper script to run Puppeteer mobile screenshot capture

# Find node executable
NODE_PATH=$(/usr/bin/find /opt/homebrew/bin /usr/local/bin -name "node" 2>/dev/null | head -1)

if [ -z "$NODE_PATH" ]; then
  echo "Error: Node.js not found"
  exit 1
fi

# Run the mobile capture script
"$NODE_PATH" "$(dirname "$0")/capture-mobile-view.mjs"
