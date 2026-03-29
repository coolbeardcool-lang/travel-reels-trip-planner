#!/bin/bash
set -euo pipefail

# Only run in Claude Code remote (web) environment
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install dependencies
npm install

# Start dev server in background for live preview on port 5173
if ! lsof -i :5173 -t > /dev/null 2>&1; then
  nohup npm run dev -- --host 0.0.0.0 --port 5173 > /tmp/vite-dev.log 2>&1 &
  echo "Dev server starting on port 5173..."
fi
