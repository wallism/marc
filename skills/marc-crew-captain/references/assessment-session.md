# Assessment session handoff

Follow [compact assessment sessions](../../../docs/assessment-sessions.md) for the request schema, command, supported artifact formats, bounded waits and resumption. This deterministic controller handles routine CI collection, required artifact validation, gate assembly, append-only checkpoints and ledger updates while retaining the shared run lock and cumulative budgets. Return its compact status and paths rather than pasting captures or transcripts into the Captain context.

The controller verifies every packet and brief before returning them; its status and `captain-handoff.json` list each gate's brief, output and agent-selection `role`, so do not open packets. Dispatch reviewers as described in the [harness contract](harnesses.md#dispatch).

## Resuming

A fresh Captain starts with `fork_turns: "none"` (or the host's equivalent) and receives only `captain-handoff.json`, the current external evidence/request/state paths, authority and actual ownership records, never an implementation transcript or previous review conclusions. Verify current authority, live identities and shared lock ownership before resuming. Never silently transfer another Captain's lock or reuse cached live state for a guarded action. An offline experimental handoff is never production authority.

## Phase and session measurement

For every dispatched Captain/reviewer/repair turn, retain actual host thread and turn IDs in an external measurement manifest. Include approval continuations and declared phase coverage; record missing telemetry rather than estimating it. Use [assessment measurement](../../../docs/assessment-measurement.md).
