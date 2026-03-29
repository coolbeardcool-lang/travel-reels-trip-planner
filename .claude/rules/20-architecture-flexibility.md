# Architecture Flexibility Rules

- Prefer config-driven behavior over hard-coded logic.
- Centralize constants, thresholds, provider mappings, and schedules.
- Isolate vendor-specific code behind adapters or service boundaries.
- Keep business rules separate from UI, transport, and framework glue.
- Prefer small composable modules over a single large multi-purpose file.
- When adding new behavior, design for the likely next variation.
- Any unavoidable hard-coded value should be documented and easy to replace.