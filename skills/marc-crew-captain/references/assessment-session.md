# Assessment session handoff

Follow [compact assessment sessions](../../../docs/assessment-sessions.md) for the request schema, command, supported artifact formats, bounded waits and resumption. Use this deterministic controller for routine CI collection, artifact validation, gate assembly and ledger updates. Return its compact status and paths rather than pasting captures or transcripts into the Captain context.

The controller verifies every packet and brief before returning them in its status; that status and `captain-handoff.json` list each gate's brief, output and agent-selection `role`, so do not open packets. Start reviewers in fresh independent sessions with only their brief path (or ordered `briefParts` when the host caps one read below the brief size), actual host identity and essential user constraints. Warm-start: dispatch the first gate alone, then all remaining gates in the next turn up to available slots. Each brief inlines the [common reviewer contract](reviewer.md), gate skill, project guidance and applicable dependency guidance, and leaves all frozen source and the complete diff available. Preserve the existing full/simple routing rules and every required session. Host capacity limits mean wait for slots.

A fresh Captain receives `captain-handoff.json`, current external evidence/request/state paths, authority and actual ownership records. Check live identity and shared lock ownership before resuming. Never silently transfer another Captain's lock, reset budgets or reuse cached live state for a guarded action. Load [guarded actions](guarded-actions.md) before recovery, repair, publication or merge. An offline experimental handoff is never production authority.

## Phase and session measurement

For every dispatched Captain/reviewer/repair turn, retain actual host thread and turn IDs in an external measurement manifest. Include approval continuations and declared phase coverage; record missing telemetry rather than estimating it. Use [assessment measurement](../../../docs/assessment-measurement.md). A fresh Captain starts with `fork_turns: none` and a neutral handoff, never an implementation transcript or previous review conclusions.
