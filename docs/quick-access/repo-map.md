# Repo Map

## Purpose
- High-level map of the repository for low-token onboarding
- Read this before broad source exploration

## Core Areas
- .claude/ : Claude Code project rules, templates, and scoped instructions
- .github/workflows/ : CI/CD workflows
- docs/quick-access/ : low-token project summaries and navigation aids
- functions/api/ : backend/serverless API logic
- public/ : static assets
- scripts/ : utility and support scripts
- src/ : main frontend application source
- state/handoffs/ : resumable working state for continuation

## Main Entrypoints
- Package scripts: package.json
- Frontend bootstrap: src/main.jsx
- Frontend root component: src/App.jsx
- Build config: vite.config.js
- API area: functions/api/

## High-Change Areas
- src/
- scripts/
- functions/api/

## Large Files To Avoid Reading First
- generated files
- build output folders
- large asset files

## Recommended Read Order
1. docs/quick-access/repo-map.md
2. state/handoffs/latest.md
3. package.json
4. src/main.jsx
5. src/App.jsx
6. nearest relevant module only
7. functions/api/ only if the task involves backend or data endpoints