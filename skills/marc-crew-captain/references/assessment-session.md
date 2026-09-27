# Assessment session handoff

Follow [compact assessment sessions](../../../docs/assessment-sessions.md) for the request schema, command, supported artifact formats, bounded waits and resumption. Use this deterministic controller for routine CI collection, artifact validation, gate assembly and ledger updates. Return its compact status and paths rather than pasting captures or transcripts into the Captain context.

Start reviewers in fresh independent sessions with only their packet path, assigned output, actual host identity and essential user constraints. Verify packet identities and hashes; provide access to all frozen source and the complete diff. Load the [common reviewer contract](reviewer.md) and gate skill, with dependency/browser guidance only where applicable. Preserve the existing full/simple routing rules and every required session. Host capacity limits mean wait for slots.

A fresh Captain receives `captain-handoff.json`, current external evidence/request/state paths, authority and actual ownership records. Check live identity and shared lock ownership before resuming. Never silently transfer another Captain's lock, reset budgets or reuse cached live state for a guarded action. Load [action procedures](controller-operations.md) before recovery, repair, publication or merge. An offline experimental handoff is never production authority.

## Combined review and measurement

Only a trusted policy containing `intentReview: "correctness-v1"` combines full-route correctness and intent. The packet carries nested intent requirements and both contracts. Count one session. Simple-route intent remains separate; `simpleRoute.reviewSchema: 1` requires comprehensive coverage in the simple reviewer. Do not activate candidate governance to assess itself.

For every dispatched Captain/reviewer/repair turn, retain actual host thread and turn IDs in an external measurement manifest. Include approval continuations and declared phase coverage; record missing telemetry rather than estimating it. Use [assessment measurement](../../../docs/assessment-measurement.md). A fresh Captain starts with `fork_turns: none` and a neutral handoff, never an implementation transcript or previous review conclusions.
