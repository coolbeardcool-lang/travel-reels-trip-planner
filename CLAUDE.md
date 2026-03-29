# CLAUDE.md

## Mission
This project must be handled with strict token efficiency, analyze-before-execute discipline, modular flexibility, and resumable execution practices.

The default priorities are:
1. minimize token usage without sacrificing correctness
2. analyze before changing anything
3. prefer flexible design over hard-coded implementation
4. keep files and docs small, composable, and indexable
5. actively prevent token waste
6. preserve resumability when limits are reached
7. maintain PR traceability and quick-access summaries for future low-token continuation

---

## Mandatory Working Order
For any non-trivial task, follow this order:

1. understand the task and constraints
2. inspect only the minimum context needed
3. propose 2-4 feasible approaches
4. compare them on:
   - token cost
   - implementation complexity
   - blast radius
   - maintainability
   - reversibility
5. choose the best option
6. **before executing**: state the affected files/modules explicitly (blast radius declaration)
7. execute in the smallest safe scope
8. at completion, report in this format:
   - ✅ completed work
   - ⚠️ problems discovered during execution
   - 💡 optional follow-ups (non-blocking)
9. update PR summary and handoff artifacts if applicable

If one option is clearly superior, execute directly.
If there is no clear winner and the choice depends on product, business, or human preference, stop and ask the user to choose.

---

## Token Efficiency Rules
Always prefer the cheapest reliable path.

Required:
- read summaries, indexes, diffs, interfaces, and entrypoints before full files
- narrow scope before opening large files
- reuse quick-access notes instead of rereading large sources
- inspect only relevant modules and dependencies
- prefer local edits over broad rewrites
- use targeted search, symbol-level reading, and diff-based reasoning whenever possible

Avoid:
- full-repo scanning unless strictly necessary
- rereading the same large file without a specific reason
- loading unrelated files “just in case”
- repeating already-established context
- dumping long logs, generated artifacts, or lockfiles unless essential
- parallel exploration of many branches if one can be eliminated early

When context is insufficient, expand scope gradually rather than globally.

---

## Analysis Before Execution
Before any meaningful code or file change:
- define the problem
- identify assumptions
- list feasible approaches
- select the best option based on cost vs. value
- then execute

If assumptions are material and cannot be inferred from existing context, ask only the smallest possible clarification question set.

Do not ask for confirmation when a clear engineering best option exists.

---

## Design for Change
Assume requirements, providers, thresholds, schedules, and module boundaries may change.

Prefer:
- configuration over hard-coded values
- adapters over direct provider coupling
- interfaces over concrete dependencies
- centralized constants/config
- feature flags or config switches for expected variability
- separation of business rules from delivery/UI glue

Do not hard-code unless explicitly justified:
- environment-specific URLs
- model names
- schedules
- thresholds
- secrets
- business rules likely to change
- provider-specific assumptions in shared logic

Any justified hard-coded value must be easy to find and replace.

---

## File Size and Modularity
Keep files and documents small enough for efficient local reasoning.

Rules:
- split files by responsibility, not arbitrarily
- avoid oversized files that are expensive to reread
- keep docs modular and indexable
- maintain quick-access summaries for important modules/files
- when a file becomes expensive to understand safely, prefer refactoring into smaller units

Do not create “god files” for convenience.

---

## Reading Strategy
Default reading order:
1. task statement
2. relevant quick-access note
3. repo map or module index
4. recent diff / PR summary
5. interface/type definitions
6. targeted source sections
7. full file only if still necessary

Never begin with full-file reading if a narrower path exists.

---

## Token Guardrails
Before major reading or implementation work:
- estimate whether summaries, diffs, or targeted reads are sufficient
- avoid escalating to full-context reads unless needed

If token usage is trending high:
1. stop broad exploration
2. summarize current findings compactly
3. write/update the handoff state
4. continue only on the smallest viable next step

If the task cannot be completed safely within the likely remaining limit, prefer a resumable partial completion over context exhaustion.

---

## Limit Handling
If approaching any token, tool, or platform limit:

Required actions:
1. stop before failure if possible
2. write or update `state/handoffs/latest.md`
3. record:
   - completed work
   - pending work
   - blockers
   - touched files
   - next best step
   - whether human input is required
4. if the environment supports automation or scheduling, prepare a resume step for the next reset window
5. if human judgment is required, do not auto-continue; wait for the user

Important:
This file defines the policy only. Actual automatic resume depends on external automation, workflow, hook, or scheduler support.

---

## PR Traceability
Every PR must include a compact summary for future low-token continuation.

Include:
- improvement summary
- why the change was made
- scope of change
- impacted files/modules
- risks / compatibility notes
- follow-up items
- quick-access updates required

If there is no PR, still prepare the equivalent summary in the working notes when the change is substantial.

---

## Quick-Access Requirement
Important modules and large files should have a quick-access note under `docs/quick-access/`.

Each quick-access note should contain:
- purpose
- entrypoints
- key dependencies
- configurable areas
- common edit patterns
- fragile areas
- recent notable changes

Quick-access notes must be shorter and cheaper to read than the source itself.

---

## Output Discipline
Prefer outputs that are:
- concise
- structured
- decision-oriented
- non-redundant
- diff-aware
- explicit about uncertainty

Provide long explanations only when requested.

---

## Stop Conditions
Stop and ask the user when:
- multiple approaches are similarly valid and depend on preference
- a decision involves product, policy, legal, or business trade-offs not inferable from context
- the change is high-risk without confirmation
- credentials, environment, or external access are missing
- required information is not recoverable from available context
- a merge conflict requires choosing between data versions (always state which version you intend to take and why before resolving)
- a Notion/database schema change affects existing data (always state data impact before executing)

Otherwise proceed with the best engineering option.

---

## Companion Artifacts
Use and maintain:
- `docs/quick-access/` for low-token summaries
- `docs/decisions/` for major design decisions
- `.claude/templates/PR_TEMPLATE.md` for PR summaries
- `.claude/templates/HANDOFF_TEMPLATE.md` for resumable state capture
- `state/handoffs/latest.md` for the latest continuation state

When resuming work, read these artifacts before broad source inspection.