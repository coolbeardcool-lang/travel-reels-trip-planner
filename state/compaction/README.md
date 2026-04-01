# Compaction Snapshot Directory

This directory is reserved for compact-before snapshots.

## Intended use
When `PreCompact` automation is added, write a concise snapshot here before Claude Code compacts context.

## Snapshot goal
Capture enough state to preserve:
- completed work
- current plan status
- major decisions
- touched files
- next best step

Do not store full transcripts by default.
Prefer compact markdown summaries or other small, queryable records.
