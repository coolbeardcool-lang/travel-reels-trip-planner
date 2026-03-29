# Token Guardrails

- Treat token usage as a constrained resource.
- Prefer indexes, quick-access notes, and diffs before full-file reads.
- Do not reread large files without a concrete reason.
- Do not scan the full repository unless the task explicitly requires repo-wide reasoning.
- Do not restate the entire task unless needed to resolve ambiguity.
- Do not dump long logs, generated files, or lockfiles unless essential to the current decision.
- If a task expands in scope, re-evaluate the minimum required context before reading more.
- If the context budget appears at risk, produce a compact handoff instead of exhausting context.