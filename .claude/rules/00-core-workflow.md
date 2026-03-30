# Core Workflow Rules

- Analyze before editing for any non-trivial task.
- Prefer the smallest safe scope of change.
- Reuse existing project patterns before introducing new abstractions.
- Avoid broad refactors unless they clearly reduce long-term cost.
- Before creating a new file, check whether an existing module is the better home.
- Before introducing a dependency, verify that current project tools cannot solve the problem.

## Blast Radius Declaration
Before executing a meaningful change, explicitly state:
- what will be changed
- what will not be changed
- any data or schema side effects

Keep this declaration compact.

## Long-Task Decomposition
If a task is likely to require broad exploration, extended reading, or multiple implementation phases:
- first identify the minimum relevant files
- split work into explicit phases
- define a checkpoint after each meaningful phase
- prefer stopping at a checkpoint over exhausting context

Use a sub-agent first when the task is mainly about scanning, phase planning, or resumability preparation.

## Completion Format
At the end of every meaningful unit of work, report:
- ✅ completed work
- ⚠️ problems or surprises found during execution
- 💡 optional follow-ups

Do not postpone this until the end of a long chain of tasks.
