# Token Guardrails

- Treat token usage as a constrained resource.
- Prefer quick-access notes, diffs, entrypoints, and interfaces before full-file reads.
- Do not reread large files without a concrete reason.
- Do not scan the full repository unless the task truly requires repo-wide reasoning.
- If the task expands, re-evaluate the minimum required context before reading more.

## Escalation Rule
When context is insufficient:
1. expand scope gradually
2. summarize what is already known
3. continue with the cheapest next read

## Limit-Aware Behavior
If context budget appears at risk:
- stop broad exploration
- write or update `state/handoffs/latest.md`
- preserve the next best step
- prefer a clean resumable boundary over one more large read
