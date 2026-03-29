---
paths:
  - "src/**/*.ts"
  - "server/**/*.ts"
  - "api/**/*.ts"
---

# Backend Rules

- Validate inputs at boundaries.
- Keep provider-specific integrations behind service or adapter layers.
- Avoid hard-coded environment values in handlers and services.
- Prefer small focused functions with explicit dependencies.
- Keep error handling consistent with existing project conventions.