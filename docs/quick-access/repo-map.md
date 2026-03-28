# Repo Map

## Purpose
- High-level map of the repository for low-token onboarding

## Core Areas
- .github/workflows/ : CI/CD workflows
- scripts/ : utility and support scripts
- src/ : main frontend application source
- public/ : static assets if used by the app

## Main Entrypoints
- App bootstrap: src/main.jsx
- App root component: src/App.jsx
- Build config: vite.config.js
- Package scripts: package.json

## High-Change Areas
- src/
- scripts/

## Large Files To Avoid Reading First
- large generated files
- build output folders if later added

## Recommended Read Order
1. docs/quick-access/repo-map.md
2. package.json
3. src/main.jsx
4. src/App.jsx
5. target module only