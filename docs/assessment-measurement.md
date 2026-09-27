# Assessment measurement and combined review

E4 adds explicit policy choices; E5 measures complete assessment sessions. These are proposals until adopted through the consumer's trusted policy process. The self-review `.marc/policy.json` proposal does not authorize its own assessment, activate a consumer, publish or merge.

## Review policy

`intentReview: "correctness-v1"` uses one independent full-route correctness session for correctness and structured static intent. Its result contains `intent` with the normal intent fields plus verdict, summary, evidence and findings. Parent identity, reviewer and execution are authoritative; duplicated nested identity or a separate intent result holds. Other full-review gates and selected specialists remain independent. Omission preserves separate intent review. Simple review retains separate intent.

Intent mismatches, partial alignment, uncertainty, stale hashes, missing evidence and suggested repairs hold. Intent repairs always require explicit human approval. Refreshing intent invalidates the entire combined correctness session while preserving other reviews and cumulative history; a new correctness reviewer must examine the updated contract. Removing intent still requires replacing that cleared correctness result.

`simpleRoute.reviewSchema: 1` requires the independent `simple-tests` reviewer to provide source-backed `coverage` arrays for correctness, security, codeQuality and testIntegrity. It is one comprehensive session, plus selected expertise and separate intent where applicable. The new `report-presentation` routing kind requires explicit evidence that persisted evidence, approval behavior and runtime contracts are unchanged. Stored markers, serialization fields, ancestry/byte verification and approval interpretation changes require full review. Small diffs alone never qualify. Existing risk, uncertainty, CI, human-path and specialist holds remain.

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
