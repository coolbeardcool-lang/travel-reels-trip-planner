# CLAUDE.md

## Mission
This project should be handled with:
- strict token efficiency
- analyze-before-execute discipline
- modular flexibility
- resumable execution

Default priorities:
1. minimize token usage without sacrificing correctness
2. inspect only the minimum context needed
3. prefer small, reversible changes
4. keep docs and modules composable and cheap to reread
5. preserve resumability when limits are approached
6. leave compact traces for future continuation

## Core Working Order
For any non-trivial task:
1. understand the task and constraints
2. inspect the minimum relevant context
3. choose the cheapest reliable approach
4. declare blast radius before execution
5. execute in the smallest safe scope
6. leave a compact completion / handoff trace if needed

If one option is clearly best, proceed.
If the decision depends on product, business, policy, or user preference, stop and ask.

## Token Discipline
Always prefer:
- quick-access notes, indexes, diffs, and entrypoints before full files
- targeted search before broad reading
- local edits before broad rewrites
- gradual scope expansion instead of repo-wide scanning

Avoid:
- rereading large files without a concrete reason
- scanning unrelated files “just in case”
- repeating already-established context
- dumping long logs, generated artifacts, or lockfiles unless essential

## Long-Task and Resumability Policy
If a task is likely to require broad exploration or multiple phases:
- split it into explicit phases
- define a checkpoint after each meaningful phase
- update `state/handoffs/latest.md` before stopping or when nearing limits
- prefer resumable partial completion over context exhaustion

## Sub-agent Usage Policy
Use project sub-agents selectively to reduce main-context growth.

Prefer sub-agents for:
- repo scanning
- blast-radius discovery
- long-task phase splitting
- handoff / resumability preparation

Main thread should retain:
- final decision-making
- scope confirmation
- code and file changes
- final reporting

Do not use sub-agents for:
- trivial single-file edits
- deterministic small fixes
- formatting-only work

## Design for Change
Assume providers, thresholds, schedules, and boundaries may change.

Prefer:
- config over hard-coded values
- adapters over direct coupling
- centralized constants
- separation of business rules from UI / transport glue
- small modules over oversized files

Any unavoidable hard-coded value must be easy to find and replace.

## Stop Conditions
Stop and ask when:
- multiple approaches are similarly valid and depend on preference
- a change has product, policy, legal, or business trade-offs
- the change is high-risk without confirmation
- required access or information is missing
- a merge conflict or schema change may cause ambiguous data loss

Otherwise proceed with the best engineering option.

## Companion Artifacts
Use and maintain:
- `docs/quick-access/`
- `docs/decisions/`
- `.claude/templates/PR_TEMPLATE.md`
- `.claude/templates/HANDOFF_TEMPLATE.md`
- `state/handoffs/latest.md`
- `.claude/agents/`

When resuming work, read the cheapest relevant artifact before broad source inspection.
