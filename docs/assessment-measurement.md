# Assessment measurement

E5 measures assessment sessions without changing review gates, routing or approval authority. E4 was removed after the fresh comparison failed to demonstrate an efficiency benefit; the separate correctness and intent reviews and original simple-route rules remain in force.

## External usage manifest

Use actual host thread AND turn identities. List every assessment, reviewer, repair and approval-continuation turn; split a turn into phases only with nonoverlapping time windows. Preserve raw host logs outside source repositories. A held run with no continuation should say so in `coverage`; an absent continuation is not an estimate of future completion cost.

```json
{
  "schema": 1,
  "identity": {
    "repository": "example/project",
    "sourceHead": "frozen-source-sha",
    "base": "frozen-base-sha",
    "policyHash": "policy-hash",
    "toolCommit": "tool-sha",
    "intentHash": "captured-intent-hash"
  },
  "coverage": "Assessment through final hold; no repair or approval continuation occurred.",
  "startedAt": "2026-09-27T01:00:00Z",
  "completedAt": "2026-09-27T01:01:00Z",
  "sessions": [{
    "role": "captain",
    "phase": "assessment",
    "threadId": "actual-host-thread",
    "turnId": "actual-host-turn",
    "transcript": "C:/external-state/session.jsonl",
    "startedAt": "2026-09-27T01:00:00Z",
    "completedAt": "2026-09-27T01:01:00Z"
  }]
}
```

Run `node src/quality/usage.cjs <external-manifest.json> <new-external-usage.json>`. Missing transcript files produce explicit missing telemetry; malformed records or conflicting/overlapping attribution fail. Input includes cache, output includes reasoning. Cumulative host `token_count` events are ignored; exact response IDs are deduplicated. Null totals mean a required count is unavailable, not zero. Settings come from the host's matching turn context. Retries remain unknown unless `retries: { count, evidence }` cites observed retry receipts; do not infer retries from calls or errors. Session latency uses recorded start/completion boundaries and may overlap other sessions; overall elapsed time is separate.

The exported `compareUsage(before, after)` reports measured differences and source/base/intent/settings mismatches. It does not treat a single paired run as causal proof or convert tokens into money/allowance. Pair fresh non-inheriting Captains and reviewers, the same immutable source and evidence, model/effort and concurrency. Do not supply prior review conclusions. Record workload/hold differences and known defects, false alarms, intent mismatches and correct holds alongside cost; unrun controls remain unmeasured. Implementation and benchmark administration are separate costs.

Alternative models/reasoning remain a separately requested experiment. First remove avoidable work, then compare fixed defect and clean controls with quality, token categories and latency together. Lower token usage alone cannot authorize a weaker gate.
