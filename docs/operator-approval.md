# Operator approval for sensitive paths

The trusted controller accepts an explicit `--operator-approval <absolute-external-file>` on `record-approval`, `decide`, `checkpoint`, `report` and `merge`. This satisfies only the `humanPathPatterns` gate for the exact listed sensitive paths. Human approvals are also recorded in the PR description for future agents and auditors, without changing committed files or HEAD. Existing quality-report protection, project/dependency verification, CI, independent reviews, scans, browser checks, source/report integrity, repair/recovery budgets and merge locks remain required. Deployment remains separate.

## Record the decision in the PR

After actual human confirmation and creation of the trusted external record, run:

```powershell
node .marc/tool/src/quality/marc.cjs --repo C:/trusted/project record-approval E:/operator/evidence.json --operator-approval E:/operator/approval.json
```

This appends a marked **Human approval record** with the approver, recorded UTC time, scope, reviewed source, target base, policy digest, record ID/hash, expiry and approved paths. It explains that the note records a human decision without changing HEAD. Existing prose, INTENT and earlier approval entries remain intact. Repeating the same record is a no-op; an altered or duplicated matching entry holds for investigation. A new approval adds a new historical entry. Expiry does not erase the historical decision.

The command checks operator input, current identity and registered producer. It rereads body and HEAD before writing and verifies both afterward; observed concurrent changes stop the operation. GitHub description updates are not an atomic compare-and-swap: a concurrent edit in the read/write window cannot be guaranteed against. Serialize MARC's own description writers and inspect uncertain updates before retrying. Oversized descriptions hold rather than discard existing text. No commit, build, CI dispatch or automatic reviewer pass is produced.

The description is an audit reference, not a trusted approval source or a native GitHub review. Merge still requires the explicit external capability and rechecks the matching public entry before its guarded push. Removing or altering the entry holds the merge; expired or revoked external approval cannot be revived by leaving the text in place.

Use this strategy for every consumer PR. Other human decisions, such as approving an intent-related repair, are recorded by the Captain with the same who/when/source facts, decision type and exact scope. Retain their authority in the trusted ledger/handoff under the existing contract; permission to repair must not become a `sensitive-paths` merge approval. Preserve the current INTENT and avoid adding another literal INTENT paragraph in approval prose.

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

Supply the same authorized file on every applicable command. No flag means no approval, even if a report, description or evidence field contains a valid-looking approval. Do not supply it on queue, capture or CI recovery. The live target must still match the approved base. Approval recording and decisions accept a verified report-only extension of the reviewed source; source or report tampering still holds. Report creation still requires the reviewed source or verified prior-report parent.

## Audit and rebinding

A successful sensitive-path decision includes `humanApproval` with the record and SHA-256 of its exact file bytes. If approval precedes publication, the report retains it in `humanApprovalAudit` and the assessment stage. If approval arrives later, the original report remains a historical held assessment. The PR description records the later decision; do not rewrite the report, its audit field or historical gates, or create another report solely for approval.

Report generation saves an immutable receipt in the trusted external state's `report-receipts` directory. It binds source/base/policy, intent, report identity, prior report chain, CI reuse and original approval audit to hashes of both report files. Merge verifies those bytes independently of the current decision. Later approval and independent resolution of a governance gate therefore require no report rewrite. Current gates, actual source inventory, explicit approval, exact-source CI, expiry/revocation and final race checks remain mandatory. Receipts are not approvals and must never come from candidate files.

For reports prepared before receipts existed, run `record-approval` against the retained original external evidence first. The controller verifies the complete published pair against that evidence and its historical decision before saving a receipt. Then have the responsible reviewer resolve only the approved governance finding in current external evidence, retaining the original finding in the report and journal. Run `decide` and `merge` with the external approval. Preserve other unchanged reviews, CI and cumulative budgets. Missing original evidence or mismatched identity requires reassessment; do not reconstruct authority from PR text. Inspect names/scope for personal information before publication.

Source, base, policy, repository or PR drift invalidates approval. Updating the trusted tool changes the policy digest, even if the consumer policy JSON is unchanged. Adding a report-only commit uses the existing report guard; any other source changes require recapture. Never edit an old approval or historical report to make it match. Preserve the original and obtain an explicit decision for a new record after showing the old/new identities and concrete changed scope. Prior conversational approval is not a standing waiver. Legacy ad hoc records are not imported automatically; review their schema and identities and issue a separately authorized new record. Rebinding never resets completed keys, run ownership, repair/recovery budgets or other evidence.
