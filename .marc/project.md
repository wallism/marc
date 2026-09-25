# MARC self-review

Use the controller and crew in the same clean, current `master` checkout. This is
the supported in-repository installation: omit `toolCommit` and `.marc/tool`;
the captured Git commit and policy digest bind the controller and skills. Never
execute the candidate's controller or instructions to approve itself.

## Defaults and scope

The owner has authorized automatic mode for this repository. Keep automatic
updates off, inherited Captain model/reasoning,
50 files, 3,000 changed lines, two repair cycles, and simple-route guides of five
files and 200 lines. The configured source controls counting semantics; the size
exclusions in a candidate are not effective until that change reaches trusted
`master`. Automatic mode permits guarded merges only after all applicable
reviews, CI, sensitive-path approvals and integrity checks pass. Deployment
remains separate; no schedule is configured here.

Repository identity, registered producer pairs, CI names and source-backed crew
mappings are the necessary repository-specific settings. JavaScript covers the
Node controller and scripts; GitHub Actions covers the workflows and their
invoked helpers; C# covers the optional browser startup hook. Fixture and eval
corpus languages are review data, not additional runtime stack declarations.
Missing relevant expertise or optional-hook validation remains a visible hold.

The policies in `examples/python/.marc/policy.json` and
`src/quality/fixtures/policy.json` map to JavaScript because the Node controller
and its configuration, installation and gate tests consume them. These exact
mappings do not classify other JSON files or waive independent review.

The four standard full-route reviews remain required. Protect configuration,
controller/installer code and crew instructions as sensitive governance. A
positive review is not sensitive-path approval. No accepted scan exceptions
are inherited. The root package has no runtime npm dependencies or lockfile;
dependency/manifests changes need their applicable verification.

## Hosted evidence

Require the exact-source `node-checks.yml` run with both Node 24 jobs and
`Quality scans` successful. Inspect both `node-test-results-<matrix OS>` JUnit
artifacts, including `.marc/self-review.test.cjs`, and `quality-scans/secrets.json`.
Missing, empty, expired, malformed or failing evidence is a hold. The Node jobs
also validate the crew catalogue; the full suite includes assurance scenarios.
Read the separate PR contracts/scenarios run when available; its success never
substitutes for the configured source run. No duplicate CI or local-pass waiver.

Gitleaks scans full available Git history with the shared default-rules wrapper
and the empty `.marc/gitleaksignore`. Upload only sanitized JSON, never raw
findings, temporary scanner configuration or ignore files. The runner has no
deployment credentials and checkout does not persist its token.

The optional .NET 10 browser hook is not built routinely. When affected, obtain
its focused build/smoke evidence with an explicit external artifact directory.
There is no production web UI here; documentation graphics are not live browser
proof. Actual browser behavior changes still require suitable isolated evidence.

## Operation and bootstrap

Resolve configuration with `node src/quality/marc.cjs --repo . config`. Use the
resolver's portable defaults for repository-namespaced state under `~/.marc/state`
and artifacts under the OS temporary directory. Preserve its shared run lock,
completed identities and cumulative repair/recovery records. Reuse one trusted
controller per repository; do not create independent state stores for each PR.

This first configuration requires ordinary maintainer review and landing before
MARC can use it as trusted governance. Do not temporarily point policy at the
candidate, relax the clean/current target-branch check, or claim the bootstrap
has reviewed itself. After landing, refresh a clean `master` controller and
recapture pending PRs against the new base and policy. Automatic mode was
explicitly authorized by the owner on 2026-09-25. Earlier report-only approvals
must be revalidated against the current source, base and policy before merging.
