---
paths:
  - "functions/api/**/*.js"
  - "docs/quick-access/ai-prompt-contract.md"
---

# AI Endpoint Contract Rules

Quality rules enforced through AI prompts must also be documented in
`docs/quick-access/ai-prompt-contract.md`.

This includes rules such as:
- language requirements
- thumbnail rules
- area naming rules
- extraction / normalization constraints
- write-path assumptions that a second AI endpoint could otherwise miss

When updating AI prompt rules:
1. update the endpoint prompt logic
2. update `docs/quick-access/ai-prompt-contract.md` in the same change
3. note any downstream data impact if the prompt change alters structured output
