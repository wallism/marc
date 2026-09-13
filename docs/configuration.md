# MARC — Merge Assurance and Review Crew

MARC coordinates independent PR review, hosted CI evidence, bounded repairs and guarded merges. The Captain and crew read a repository's explicit configuration. Repository identity, technology guidance, artifact paths, runtime settings and accepted scan exceptions belong to that repository.

This guide describes the standalone MARC bundle: `src/quality/` and the `skills/marc*` catalogue. The existing simple/full review routes are preserved, with configured [specialists](crew.md) added when applicable. See [installation](installation.md) for pinned consumer integration.

## Set up a repository

Give your agent the [setup prompt](setup-prompt.md) and the repository you want reviewed. It discovers settings from that repository, shows every proposed value and its source, asks for missing values, and waits for your confirmation and overrides before writing configuration. If you omit the repository, it asks which one to use.

The [Python example](../examples/python/.marc/config.json) is a synthetic consumer with its own policy and guidance. It demonstrates configuration without private services. Replace its example identity, CI names and producer before use; it is not an installed CI pipeline.

From any directory, resolve settings without GitHub access or state mutation:

```powershell
node <MARC-bundle>/src/quality/marc.cjs --repo <consumer-checkout> config
```

Replace angle-bracket paths before running. The result is **resolution, not trust verification**. Operational commands require a clean consumer checkout on its configured target branch, current with its verified GitHub origin. An external bundle must also be clean and pinned to the full `toolCommit`. Existing in-repository installations use the same trusted checkout. Configuration and exception files must be tracked.

Skills use the same resolver and pass the resulting settings and guidance to fresh reviewers. They do not require repository names embedded in `SKILL.md` or rely on automatic JSON interpolation. Make the skill catalogue discoverable in the agent host while retaining its sibling layout and using the same pinned source as the controller. Codex supports skills containing instructions, references and scripts, including repository skills under `.agents/skills`; check discovery after installation. [Codex skills documentation](https://learn.chatgpt.com/docs/build-skills).

## Configuration contract (schema 1)

The consumer owns `.marc/config.json`. File references below use forward slashes, are relative to the consumer root, and must resolve to regular files inside it without symlinks. Commands and secret values do not belong in this JSON.

| Field | Meaning |
| --- | --- |
| `schema` | `1`. |
| `policy` | Path to the consumer's JSON policy. New consumers normally use `.marc/policy.json`; existing integrations can retain their previous path. |
| `ci.workflow` | GitHub Actions workflow filename, such as `checks.yml`. |
| `ci.requiredArtifacts` | Nonempty exact artifact-name list used for CI recovery and reviewer instructions. Reviewers inspect contents; job success alone does not prove artifact adequacy. |
| `technologies` | Discovered languages, frameworks and data stores; guides review, does not install specialists. |
| `crew` | Optional schema-1 member/version list and source-backed impact areas; see the [crew contract](crew.md). Omission preserves legacy generic review and must be disclosed during setup. |
| `guidance` | Named paths to project, browser, workflow or improvements instructions. Empty only when no additional guidance is needed. |
| `scans.secretExceptions` | Optional reviewed fingerprint file. Omitted means no exceptions; a configured missing/invalid file blocks scanning. |
| `scans.npmExceptions` | Optional consumer-owned JSON: `schema: 1`, matching `repository`, and `exceptions` array. Each entry specifies `manifest`, `package`, `severity: "high"`, exact `advisories`, `reviewBy` UTC date and `reason`. No exceptions are inherited by default. |
| `scans.nugetSolution` | Optional solution path for the NuGet adapter; omit for other stacks. |
| `state.root` | Absolute parent for durable state; defaults to `~/.marc/state`. A stable repository namespace is appended. |
| `state.mergeLockName` | Default `marc-merge.lock` in the controller Git common directory. |
| `state.legacyDirectory`, `state.legacyRepository` | Explicit absolute existing state directory bound to the same repository, for migrations only. Retains ledgers, locks and spent budgets. |
| `state.platforms` | Optional per-platform overrides, keyed by Node platform (`win32`, `linux`, `darwin`). |
| `artifactRoot` | Absolute disposable evidence/build root, or per-platform map. Default OS temp directory under `marc/<repository-namespace>`. Durable state is separate. |
| `controllerDirectory` | Optional absolute separate trusted checkout location, or per-platform map. The Captain uses it; the resolver does not create it. |
| `toolCommit` | Full immutable MARC Git commit for an external bundle. Required by operational commands when the bundle is outside the consumer checkout. |

The policy sets `repository` (`owner/name` on github.com), `base`, `mode` (`report-only` or `automatic`), paired `producers` (`author` and `branchPrefixes`), required CI jobs/review gates, scope/repair limits, and sensitive/UI path patterns. Preserve required gates and protect configuration, instructions, scripts, CI and exception paths. New setups propose report-only mode. Existing authorization, routing and cumulative limits survive a configuration migration. The legacy flat producer fields serve older launchers; queue admission uses paired `producers`.

The digest binds reusable tool/skill bytes and every configured policy, guidance and exception file. Changing them invalidates prior evidence. Load governance from trusted source, never a candidate PR. Use one durable state store and one coordinated controller location per repository; separate machines with separate stores cannot enforce a shared recovery/repair budget. Do not copy a legacy directory into another consumer or reset existing state to adopt new branding. Coordinate any state migration with the operator before activating a new host.

## Gitleaks exceptions and CI

A Gitleaks ignore file records individual findings that have already been reviewed, such as a confirmed false positive or a historical occurrence of a revoked credential. It is optional when no exceptions exist. Existing projects may need their reviewed entries to avoid repeatedly failing CI on those historical occurrences. Gitleaks supports finding fingerprints and the explicit `--gitleaks-ignore-path` flag. [Gitleaks documentation](https://github.com/gitleaks/gitleaks#configuration).

For a new consumer, copy [the empty default](../templates/gitleaksignore) to `.marc/gitleaksignore`, track it, and set `scans.secretExceptions` to that path. It contains comments and **no suppressions**. Do not copy another repository's exception list. For a migrating consumer, preserve its reviewed entries and reasons exactly, and configure their new location. Never auto-accept newly detected credentials: revoke/rotate a real exposed credential first, then review the exact historical finding and record the decision. Do not put secret values in an ignore file or report.

MARC deliberately accepts only exact `full-commit-sha:relative-file:rule-id:line` fingerprints. Wildcards, whole-file suppressions and inline `gitleaks:allow` comments cannot broaden this exception mechanism. Empty/comment-only files are valid. The wrapper writes a validated temporary ignore file and passes its absolute location explicitly to Gitleaks. It also uses default scanner rules and redacts output. This avoids dependence on Gitleaks's working-directory discovery or a repository-specific filename. The adapter uses default Gitleaks rules; if an existing consumer also requires custom detection rules, preserve that separate scan or implement and verify explicit adapter support before cutover. Do not silently drop those checks.

In GitHub Actions, check out the consumer with the history needed for the scan and install a pinned Gitleaks binary with checksum verification. Install MARC at the same pinned version used by the controller. Run the wrapper with the consumer root as the working directory (set `MARC_BUNDLE` to the trusted installation path):

```yaml
- name: Scan secrets
  shell: bash
  run: node "$MARC_BUNDLE/src/quality/scans.cjs" secrets "$RUNNER_TEMP/marc-scans/secrets.json"
```

The default scans `HEAD` history; an optional full base SHA limits the scan to `<base>..HEAD`. Keep the required history available. Upload only the sanitized JSON in the configured scan artifact, including on failures; raw findings are removed by the wrapper. Missing files, malformed fingerprints, scanner failures and findings fail CI. The setup prompt must verify the real workflow's checkout, command, working directory and artifact upload, not merely create a file. Candidate code/scanners still need the repository's isolated, least-privilege CI execution policy; configuration does not make PR code trusted.

## Commands, coverage and validation

The controller supports `queue`, `capture`, `decide`, `report`, `merge` and `recover-ci` after the optional `--repo <checkout>` selector. Follow the Captain and [evidence contract](../skills/marc/references/evidence.md) for authority, independent review and frozen identities. Reports remain at `.quality/reports`; preserve historical bytes. Merge uses the configured target branch. Deployment is separate.

GitHub Actions is the implemented provider. Existing CI can validate other technologies, including Python; the bundled dependency adapters/classifiers cover NuGet/.NET and npm. The optional browser startup hook is ASP.NET-specific. Unknown dependency/build manifests should remain sensitive until an applicable review policy exists. Missing required tooling, expertise or evidence produces a hold.

Run shared tests with `node --test src/quality/*.test.cjs`. Set `MARC_TEST_ARTIFACTS` to an appropriate external directory when local policy requires it. The optional .NET hook smoke check takes an explicit `-ArtifactsPath`. Consumer integration tests live outside the reusable bundle.

Consumer configuration, accepted exceptions, reports and operational state stay in the consumer. Existing policy paths may remain for launcher compatibility. Upgrade or roll back the pinned bundle as a unit, preserving state and locks, and recapture invalidated evidence. See [installation](installation.md).
