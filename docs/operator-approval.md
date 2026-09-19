# Operator approval for sensitive paths

The trusted controller accepts an explicit `--operator-approval <absolute-external-file>` on `decide`, `checkpoint`, `report` and `merge`. This satisfies only the `humanPathPatterns` gate for the exact listed sensitive paths. Existing quality-report protection, project/dependency verification, CI, independent reviews, scans, browser checks, source/report integrity, repair/recovery budgets and merge locks remain required. Deployment remains separate.

## Trusted channel

An authorized operator supplies the CLI argument and creates the record in an operator-controlled directory outside **every Git checkout**, including candidate worktrees. Restrict directory write access to the operator/trusted controller and keep it out of candidate builds, CI artifact extraction and reviewer/repair sandboxes. A location outside Git alone is not proof of human authorization: the trusted harness must verify the actual human instruction before invoking this option. Never copy candidate claims into this directory or accept a candidate-selected path. Do not run candidate code with access to the directory or operator credentials.

The controller does not discover approvals in PR descriptions, labels, comments, repository files, evidence JSON, historical reports or environment variables. There is no approval-creation command. `approvedBy` documents the operator; it is not a signature or authenticated identity provider. Trust comes from the operator-controlled invocation and filesystem, as with the trusted controller itself. This is not a sandbox against processes already running with operator privileges.

The loader rejects relative paths, Git-contained files, symlink/junction path components, hardlinks, oversized/non-regular files, invalid JSON and invalid records. It returns an in-process capability; copied JSON cannot supply that capability. Each command reloads the external file. Merge reloads it again immediately before the guarded push, rejecting removal, replacement or expiry.

## Record contract

All fields below are required; unknown fields fail closed. Use full lowercase Git SHAs, a 64-character SHA-256 policy digest, a positive integer PR number and real UTC timestamps with milliseconds. `approvedUtc` cannot be in the future and `expiresUtc` must still be in the future. The dates below are illustrative; choose an explicit validity window appropriate to the actual decision.

```json
{
  "schema": 1,
  "kind": "sensitive-paths",
  "approved": true,
  "id": "operator-decision-20260920-1",
  "approvedBy": "authorized maintainer",
  "approvedUtc": "2026-09-20T00:00:00.000Z",
  "expiresUtc": "2026-09-27T00:00:00.000Z",
  "scope": "Approve the inspected integration changes at these exact identities only.",
  "repository": "example/project",
  "pr": 7,
  "sourceHead": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "base": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "policyHash": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  "paths": [".marc/config.json", ".marc/tool"]
}
```

`paths` must be the complete, exact set of changed paths subject to the human gate after existing verified-manifest exemptions. They are literal repository-relative paths with `/` separators: no duplicates, wildcards or traversal. Source/base Git identities bind the complete changes at those paths, including content, file mode, deletion and submodule gitlinks. The controller compares evidence paths with the committed diff before using approval. Rename detection is disabled for this inventory, so both sensitive old and new names need coverage. A missing or additional sensitive path requires a new decision. Approval cannot satisfy unresolved project/dependency verification.

```powershell
node .marc/tool/src/quality/marc.cjs --repo C:/trusted/project decide E:/operator/evidence.json --operator-approval E:/operator/approval.json
node .marc/tool/src/quality/marc.cjs --repo C:/trusted/project report E:/operator/evidence.json C:/candidate/project --operator-approval E:/operator/approval.json
node .marc/tool/src/quality/marc.cjs --repo C:/trusted/project merge E:/operator/evidence.json --operator-approval E:/operator/approval.json
```

Supply the same authorized file on every applicable command. No flag means no approval, even if a report or evidence field contains a valid-looking approval. Do not supply it on queue, capture or CI recovery. The live target must still match the approved base. Before report creation, the live PR source must match; merge permits only the existing verified report-only extension of that source.

## Audit and rebinding

A successful sensitive-path decision includes `humanApproval` with the record and SHA-256 of its exact file bytes. New report evidence retains this in `humanApprovalAudit` and the current assessment stage. The human report names the approval, operator, digest and paths. This records a human gate satisfied even when another gate holds the PR. Audit copies are informational; merge requires the same external record, matching audit, unchanged report bytes and all other gates. Inspect operator names/scope for personal information before publishing reports.

Source, base, policy, repository or PR drift invalidates approval. Updating the trusted tool changes the policy digest, even if the consumer policy JSON is unchanged. Adding a report-only commit uses the existing report guard; any other source changes require recapture. Never edit an old approval or historical report to make it match. Preserve the original and obtain an explicit decision for a new record after showing the old/new identities and concrete changed scope. Prior conversational approval is not a standing waiver. Legacy ad hoc records are not imported automatically; review their schema and identities and issue a separately authorized new record. Rebinding never resets completed keys, run ownership, repair/recovery budgets or other evidence.
