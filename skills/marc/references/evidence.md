# Gate evidence contract, version 1

`capture` creates an external JSON document. Capture-owned fields are `schema`, `repository`, `pr`, `sourceHead`, `base`, `policyHash`, `state`, `draft`, `author`, `headRepository`, `branch`, `target`, `baseIncluded`, `files`, `changedLines`, `projectChanges`, and `ci`. Only the trusted controller recaptures these. `repairCycles` comes from the cumulative external ledger.

`changedLines` counts additions plus deletions using explicit Git rename detection at 50% similarity. Unchanged moves contribute zero; edits within recognized moves still count. Unrecognized moves/replacements remain full additions/deletions. NUL-delimited parsing preserves unusual filenames, and binary/unmeasurable entries exceed the configured limit. The consumer policy sets the inclusive `maxChangedLines` and `maxFiles` limits; `simpleRoute` sets advisory guides with a rationale required above either. The `files` inventory and report/merge guards deliberately retain rename detection disabled, so both old and new paths remain visible to security and scope checks. Capture and the final merge guard use the same line-count function; historical report counts are not rewritten, and changed policy requires fresh capture/review.

`projectChanges` classifies changed `.csproj`, `package.json` and `package-lock.json` files from committed base/source blobs and regular-file tree entries. With policy `projectFileReview: verified-changes-v1`, `content-only` removes the human hold caused solely by the project extension. This supports unconditional `None`/`Content` `Include`/`Update` entries for literal project-relative `.md` files, with optional `CopyToOutputDirectory`/`CopyToPublishDirectory` values `Never`, `PreserveNewest` or `Always`. The classifier compares the remaining project structure, including dependencies and build settings. It reads XML without evaluating MSBuild or resolving external entities.

`dependency-only` supports unconditional NuGet `PackageReference` entries with literal versions and ordinary asset metadata, npm dependency sections with registry version specifications, and npm v3 lockfiles with exact versions, official registry URLs and SHA-512 integrity. It can include ordinary Markdown content changes. `dependencies` records the added/changed target packages and requested versions; removed dependencies are handled by the full review and affected-closure audit. NuGet configuration metadata remains in the captured record for review. Dependency-only classification does not itself establish package trust or safety.

Other changes are `review-required`: project/assembly references, imports/targets/tasks, changed build properties or npm scripts, conditions, globs, path traversal, expressions, links/target paths, unusual sources, non-Markdown content references, missing/symlinked files and unsupported syntax. New/deleted/non-regular manifests also remain held. This is unresolved verification or an unusual change, not a claim of a discovered vulnerability. `markdownFiles` lists the regular Markdown references inspected, including unchanged entries used for comparison. Verified content/dependency-only manifests are exempt from filename/directory human patterns for that file; independent reviews, CI/scans and size limits still apply, and other changed files retain their own sensitive-path rules. Missing classification stays held. Before merging, the controller recomputes the classification from reviewed source, rejecting edited, missing or stale records. Historical reports without the field keep their original rendering.

For `dependency-only`, use the full route. The independent security gate may pass without a human when it supplies `dependencyReview` with:

- `verdict: pass`, `ciRunId` and `ciRunAttempt` matching captured successful exact-source CI;
- `issues: []` and `vulnerabilities: []`, `transitiveChecked: true`, and nonempty `auditEvidence` covering the added/changed dependencies and their affected transitive closure (also for removals);
- `packages` containing one record for each captured file/name/requestedVersion combination: `file`, `name`, `requestedVersion`, `knownPackage: true`, nonempty HTTPS `officialSources`, and nonempty literal `resolvedVersions` from actual restore/lock/audit evidence across affected targets. A requested version/range alone is not resolved-version proof. The NuGet CI artifact now includes `resolvedPackages` for direct/transitive packages and target frameworks from a no-restore inventory command; it does not rerun the vulnerability scan. For npm, use committed lockfile versions alongside the hosted audit. Older artifacts need equivalent verified inventory evidence; never invent resolved versions.

The enclosing security gate supplies the fresh reviewer and source/base/policy binding. Known-package status requires evidence of the legitimate package and maintainer/source, not just a familiar-looking name. The reviewer checks provenance, compatibility and other concrete concerns alongside current known advisories; the controller enforces completeness, coverage and CI identity. No human confirmation is required when the package is verified and no issue is found. Unknown identity, any known vulnerability in the changed dependency closure (even low severity or deferred), unresolved versions, missing audit coverage, or other findings prevent this pass. Obtain available evidence or repair an actual issue under existing rules; request a human only for a concrete concern/decision. Unrelated existing dependency exceptions retain their scope and do not become new waivers.

Each independent reviewer fills only its named `gates` entry:
The reviewer saves that entry as a standalone JSON artifact at its assigned external path. MARC checks the identity fields and then assembles it into the shared `gates` document; reviewers do not concurrently edit that document. `reviewer` records the actual fresh-agent session identifier, not a made-up role label. Return the artifact path and a terse summary to avoid copying investigation logs into the parent context.

```json
{
  "verdict": "blocked",
  "sourceHead": "copy captured full SHA",
  "base": "copy captured full SHA",
  "policyHash": "copy captured policy digest",
  "reviewer": "actual independent session identifier",
  "summary": "One or two sentences stating the outcome and evidence limits.",
  "evidence": ["repo/path.cs:123 and the observed test command/result or artifact URL"],
  "findings": []
}
```

Verdicts: `pass`, `repair`, `human-required`, `blocked`. A finding has `severity` (`blocking` or `advisory`), `file`, `line`, `detail`, `evidence`, and `recommendedChange`. Cite observed behavior and the real owning seam. A pass has no blocking findings, nonempty evidence and a real reviewer identity. Unsupported speculation is not a finding. Missing access/coverage is blocked. Critical privacy/security/money issues stay explicit even when snapshots pass.

`browser` uses the same gate structure when needed. A reviewer can set `requiresBrowser: true`; the orchestrator must then supply browser evidence. Do not assert runtime behavior from source alone.

Browser evidence also references the external runtime record: captured source/build provenance, URL and data environment, listener reuse or isolated startup attempts, readiness, effective persona/permissions, chosen tool and capability fallbacks, expected/observed checkpoints, sanitized artifacts and process cleanup. Follow [browser-runtime.md](browser-runtime.md). A missing listener triggers provisioning discovery, not an immediate blocked verdict. An explicit retry records fresh observations separately without rewriting historical reports or reusing gates against changed identities.

Reports are append-only evidence artifacts owned by this workflow, outside `docs` because their names and structured content are machine-generated per commit. The work document under `docs/work` is their indexed entry point. Never include tokens, raw resumes, candidate data, secret matches or unrestricted command logs. Preserve sanitized facts and safe source/artifact references. CI artifacts expire; preserve the important counts, scanner summaries and findings in the gate evidence rather than relying exclusively on URLs.

The PR report describes the reviewed source commit and captured base. Its own report-only commit cannot include its eventual SHA without another commit. The controller verifies that the later head differs only by the exact generated report files, then checks CI for that head. Merge outcome belongs in the external run ledger and GitHub's merge history. Reports are audit evidence, not signatures: the trusted controller and its external ledger remain the authority.

## Report names and presentation

The controller adds `reportCreatedAt` when first preparing publication, using a canonical UTC minute such as `2026-09-12T10:45:00.000Z`. Persist that value in the external evidence before rendering. It produces the pair `.quality/reports/pr-24/20260912-1045-24.json` and `.md`; the Markdown also displays the timestamp explicitly as UTC. Source/base SHAs, policy digest and independent gate identities remain unchanged inside both artifacts. A later verification derives paths from the persisted timestamp, never the current clock. Do not manually change it after report publication.

New preparations also persist `reportFormat: "marc-v1"`, which renders the MARC heading. Missing `reportFormat` preserves the former Chief of Quality heading for both SHA-named and timestamped historical reports; unknown formats fail closed. Preparing an already timestamped report preserves its existing format. Never add the marker to previously published evidence. Byte verification of historical reports does not waive the current policy digest or authorize a merge after the rename.

Evidence without `reportCreatedAt` uses legacy SHA filenames and its original Markdown bytes for verification. Preserve those historical files. Only new regular-file additions in the owning PR's exact legacy or valid timestamp namespace are metadata; edits/deletions, foreign PR names, malformed dates and symlinks are still reviewed changes. A minute collision stops rather than overwriting either file. Recheck the completed-assessment ledger; only an actually new assessment may be prepared in a later minute with a fresh publication timestamp.

On completion, render the generated Markdown body in chat and link to the Markdown file's normal GitHub `blob/<report-head>/...` view, pinned to the verified report commit. Keep subsequent report CI and merge outcomes outside that immutable report body. If the response cannot accommodate the full body, include the decision and gate table plus the rendered link. Historical SHA-named reports can use the same rendered-link format; no rename or new report commit is needed merely to improve presentation.

## CI recovery investigation

`recover-ci` accepts a current capture and, for a rerun, a separate trusted external investigation. This is an operator/MARC assessment of actual logs and artifacts, not candidate-supplied text. Keep raw logs and sensitive values out of it. Example (replace identities and evidence with observed values):

```json
{
  "sourceHead": "full 40-character captured source SHA",
  "runId": 123456,
  "runAttempt": 1,
  "reason": "infrastructure",
  "testOrScanFailure": false,
  "summary": "Runner disconnected before validation; no test or scan failure was observed.",
  "evidence": ["absolute path to sanitized investigation or exact GitHub job URL"]
}
```

Allowed reasons are `infrastructure` and `artifacts-unavailable`. The latter requires successful required jobs, unavailable `test-results` or `quality-scans` artifacts and no retained usable evidence. Cancellation/timeouts/failures require investigation; never set `testOrScanFailure: false` without checking. Missing/duplicated jobs are held. CI capture records `runId`, `runAttempt` and `conclusion` for binding; do not edit capture-owned fields.

The immutable request record stores PR/head/base/policy, timestamp, CI state, action and investigation before the POST. One recovery request total per PR/head survives new run directories and policy changes. The separate accepted receipt proves only API acceptance. After any request, wait and recapture CI; verify the exact run SHA and inspect the actual results/artifacts. The recovery command never modifies a capture, approves a review or merges. To recover a final report head, capture that current head separately; retain the original source assessment unchanged.

## Simplicity route

Optional `routing` uses the standard gate fields plus `route: simple|full` and `risks: string[]`. Missing routing requires full review. A simple decision must be current, pass, contain evidence and no risks/findings, stay within the overall PR limits and have no UI behavior impact. It requires `changeKind: additive-tests|documentation|local-change`, verified against the complete diff by both MARC and the independent focused reviewer. These labels do not establish safety by themselves. Follow the [simplicity rules](../../marc-simplicity/SKILL.md): additive cases and reviewed baselines without production changes, ordinary documentation without runtime/instruction/policy changes, or a small local production change with traced callers and boundaries. Test or prose length alone does not require full review.

`policy.simpleRoute.recommendedMaxFiles` and `recommendedMaxChangedLines` are advisory guides. Above either, require a nonblank `routing.sizeRationale` explaining why the complete scope remains simple and where the extra size comes from. This rationale cannot waive actual risks, existing findings, CI, scans, sensitive paths, or the overall configured file/line limits. Reports display the change kind and supplied size rationale. MARC records its own session as router. The deterministic controller enforces structured evidence and hard guards; semantic classification and rationale quality remain independent review judgments. A policy change invalidates older approvals; historical reports retain their original fields and rendering.

A simple candidate contains `gates.simple-tests` instead of the four specialist entries. Remove only untouched capture placeholders before review; actual specialist results forbid downgrading. This gate uses the standard fields plus `testDecision: existing-sufficient|updated|not-needed|needs-test` and `testRationale`. Only the first three can pass, with evidence and rationale. CI, scans, identity, sensitive-path holds, repair limits and final merge checks are unchanged. Reports identify the route and omitted reviews without fabricating passes. Reroute after source/base/policy changes.
