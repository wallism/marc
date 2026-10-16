# Relevant impact discovery

MARC combines model judgment about consequences with deterministic, resumable reference searches. The controller captures every changed file. The Captain reads the diff and owning code, then records whether each changed scope needs caller inspection. Independent reviewers verify those decisions; a search result or stop rationale is not approval.

## Decide whether to expand

The rule applies to ordinary functions and public, protected, internal or private class methods, as well as interface members. Inspect the changed behavior first. Follow callers when a changed return contract, exception, side effect, authorization boundary, state transition, dispatch behavior or data contract can affect them. Stop when source evidence establishes that the change is local and no caller assumption changes. Apply the same judgment at each outward step. Do not traverse all uses of a containing class or interface simply because one member changed.

For a new member, inspect its implementation, dependencies and any new call sites. An interface addition also needs compatibility checks for other implementations, mocks, generated implementations and default/abstract dispatch where applicable. Adding a public method is not blanket proof of safety: overload resolution, inheritance, reflection, initialization and shared state can still be consequential. Evidence of such effects warrants expansion. Existing methods that merely share the interface do not automatically enter scope.

C# method hunks are scoped to recognized members. JavaScript and other recognized functions retain their declaration scopes. Constructors, properties and unsupported syntax conservatively retain type/file scope for the model to inspect. This is lexical assistance, not Roslyn or compiler-level binding.

## Capture and record decisions

`capture <PR> <new-evidence.json> [discovery-plan.json]` initially records `crew.impact.reviewScopes`. Each scope has an immutable revision, path, symbol list and ID. Pending decisions hold approval but are normal Captain work, not a request for human approval. The Captain completes them before dispatching the required independent reviews.

A plan is an external JSON file:

```json
{
  "schema": 1,
  "base": "captured base SHA",
  "sourceHead": "captured source SHA",
  "policyHash": "captured policy hash",
  "decisions": [
    {
      "scope": "scope ID from captured evidence",
      "action": "stop",
      "reason": "Concrete explanation of why caller assumptions are unchanged",
      "evidence": ["revision:path:line"]
    }
  ]
}
```

Use `follow` when references need inspection. Recapture with the plan; that search produces immediate reference evidence and new scopes, each requiring its own decision. Repeat until the relevant behavior is understood. Missing evidence, unreadable source or an unresolved boundary remains a hold. Empty rationale/evidence, duplicate scope decisions, stale identities and unreachable decisions are rejected or held. Never generate blanket stop decisions to clear a hold. Independent reviewers inspect the full diff, verify stop rationales and request additional scope when needed. Changed plans require recapture and new matching selection/review evidence. The controller recomputes selection from Git and the plan at decision time; captured inventory fields are not editable authority.

## Precision

Exact identifier matches are leads. Namespace/import segments, positional record parameter names, ordinary comments/strings, known C# namespace collisions and unrelated JavaScript local bindings do not establish type dependencies. Real qualified type uses, Razor component tags, explicit local module/resource references, and relevant interface/implementation relationships remain visible. Each captured reference records its source path, symbol, kind, line and revision. Base and source trees stay separate; a removed caller remains inspectable without constructing a chain across revisions.

Tests and registration files remain evidence but do not automatically propagate into more searches. Trusted technology mappings recruit relevant expertise; they do not prove every file in an area is a dependency. Dynamic dispatch, aliases, reflection, framework conventions and unsupported syntax still require reviewer judgment.

## Resumable scans

Discovery reads immutable Git objects and executes no candidate code. Raw token searches are grouped into 128 tokens. Source inspection proceeds in pages of 600 operations (namespace indexing and reference matching); 600 candidates and 300 affected files are no longer terminal coverage limits. The namespace index completes before matching so page boundaries cannot change collision resolution. Completed scope searches automatically drain up to 100 pages per call. A larger search remains explicitly paused, never silently complete.

For a read-only workbench, run:

```powershell
node <bundle>/src/quality/discovery.cjs <repository> <request.json> <new-output.json> [previous-output.json]
```

A `review` request contains `mode`, `base`, `sourceHead` and an optional `plan`. It discovers pending scopes and replays their decisions without fetching or changing branches. Formal controller capture uses the consumer's trusted technology mappings and policy identity; this workbench is diagnostic evidence, not a substitute for a captured assessment.

A `scan` request adds explicit `roots` (`revision`, `file`, `names`) and an optional `batchSize` from 1 to 10000. Pass a paused output as the last argument to resume. Checkpoints retain parsed progress metadata, accumulated references, next scopes and cumulative inspection counts, not source text. They are bound to the algorithm, both Git revisions, changed inventory and roots, and checked for accidental corruption. Store them outside candidate checkouts. Checksums are integrity checks, not authentication; checkpoints are never accepted as approval evidence. Final controller decisions replay the plan from Git. Output files are new files so historical evidence is retained.

The legacy exhaustive lexical helper remains available for diagnostics and language regression tests. Production controller capture uses the model-directed path, not its automatic multi-round traversal. Tool upgrades require a new pin and fresh policy/source/base-bound evidence. No CI, independent review, sensitive-path or merge authority is waived.
