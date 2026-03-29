---
paths:
  - "src/**/*.tsx"
  - "src/**/*.jsx"
  - "src/**/*.ts"
  - "src/**/*.js"
  - "src/**/*.css"
  - "src/**/*.scss"
  - "public/**/*"
  - "index.html"
  - "vite.config.*"
  - "package.json"
---

# Frontend Rules

- For frontend tasks, prefer reading `package.json`, `src/main.jsx`, and the nearest relevant component before broader source exploration.
- Prefer component reuse over duplication.
- Keep presentation and business logic separated where practical.
- Avoid embedding API assumptions directly in view components.
- Keep components small and focused.
- Prefer existing design patterns in the codebase before introducing new state patterns.
- When debugging UI issues, inspect the nearest entrypoint and rendering path before scanning unrelated modules.