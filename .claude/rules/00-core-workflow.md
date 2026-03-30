# Core Workflow Rules

- For non-trivial tasks, analyze before editing.
- Prefer the smallest safe scope of change.
- Use existing project patterns before introducing new abstractions.
- Avoid broad refactors unless they clearly reduce long-term cost.
- Before creating a new file, check whether an existing module is the better home.
- Before introducing a dependency, verify that current project tools cannot solve the problem.
- When uncertain, inspect recent diffs, quick-access notes, and module entrypoints before reading large files.

## Plan Declaration (before executing any layer or task)
Before writing code, explicitly state:
- What will be changed (files/modules list)
- What will NOT be changed (scope boundary)
- Any data or schema side effects

This is the blast radius declaration. It costs one line and prevents misaligned expectations.

## Layer Completion Format
At the end of every layer, task, or meaningful unit of work, report in this exact structure:
- ✅ what was completed
- ⚠️ problems or surprises found during execution
- 💡 optional follow-ups (non-blocking, for the user to decide)

Do not batch up completion reports. Report immediately after each unit is done.