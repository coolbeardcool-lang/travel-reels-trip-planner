---
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
---

# Testing Rules

- Prefer minimal tests that verify the changed behavior.
- Reuse existing test helpers before creating new ones.
- Avoid brittle snapshot growth unless justified.
- Keep fixtures small and directly relevant.