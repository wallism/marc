# MARC — Merge Assurance and Review Crew

MARC coordinates independent PR review, hosted CI evidence, bounded repairs and guarded merges. The Captain and crew read a repository's explicit configuration. Repository identity, technology guidance, artifact paths, runtime settings and accepted scan exceptions belong to that repository.

This guide describes the standalone MARC bundle: `src/quality/` and the `skills/marc-crew-*` catalogue. The existing simple/full review routes are preserved, with configured [specialists](crew.md) added when applicable. See [installation](installation.md) for pinned consumer integration.

## Set up a repository

Give your agent the [setup prompt](setup-prompt.md) and the repository you want reviewed. It discovers settings from that repository, shows every proposed value and its source, asks for missing values, and waits for your confirmation and overrides before writing configuration. If you omit the repository, it asks which one to use.

The [Python example](../examples/python/.marc/config.json) is a synthetic consumer with its own policy and guidance. It demonstrates configuration without private services. Replace its example identity, CI names and producer before use; it is not an installed CI pipeline.

From any directory, resolve settings without GitHub access or state mutation:

```powershell
node <MARC-bundle>/src/quality/marc.cjs --repo <consumer-checkout> config
```

Replace angle-bracket paths before running. The result is **resolution, not trust verification**. Operational commands require a clean consumer checkout on its configured target branch, current with its verified GitHub origin. An external bundle must also be clean and pinned to the full `toolCommit`. Existing in-repository installations use the same trusted checkout. Configuration and exception files must be tracked.

Skills use the same resolver and pass the resulting settings and guidance to fresh reviewers. They do not require repository names embedded in `SKILL.md` or rely on automatic JSON interpolation. Make the skill catalogue discoverable in the agent host while retaining its sibling layout and using the same pinned source as the controller. Codex and Cursor use `.agents/skills`; Claude Code uses `.claude/skills`. See [installation host selection](installation.md) and the [harness contract](../skills/marc-crew-captain/references/harnesses.md) for discovery checks and independent reviewer prerequisites.

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
| `agents` | Optional crew model/reasoning overrides; omit by default. See below. |
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
| `autoUpdate` | Boolean, defaults to `false` when omitted. Recommended off: `true` checks upstream during queue/capture and adds pin/config/generated-file updates to eligible PR branches, expanding scope and requiring fresh evidence and any applicable human approval. Explicit existing `true` settings stay enabled. See [automatic updates and alternatives](installation.md#automatic-updates). |

The policy sets `repository` (`owner/name` on github.com), `base`, `mode` (`report-only` or `automatic`), paired `producers` (`author` and `branchPrefixes`), required CI jobs/review gates, scope/repair limits, and sensitive/UI path patterns. Preserve required gates and protect configuration, instructions, scripts, CI and exception paths. New setups propose report-only mode. Existing authorization, routing and cumulative limits survive a configuration migration. The legacy flat producer fields serve older launchers; queue admission uses paired `producers`.

The digest binds reusable tool/skill bytes, every configured policy, guidance and exception file, and tracked consumer harness instructions described in [installation](installation.md). Changing them invalidates prior evidence. Global and untracked host instructions are outside that digest and require separate inspection. Load governance from trusted source, never a candidate PR. Use one durable state store and one coordinated controller location per repository; separate machines with separate stores cannot enforce a shared recovery/repair budget. Do not copy a legacy directory into another consumer or reset existing state to adopt new branding. Coordinate any state migration with the operator before activating a new host.

## Optional crew model overrides

Leave `agents` absent to use the Captain's model and reasoning settings. MARC does not add model defaults during setup. To opt in, add this section to the consumer's `.marc/config.json` (replace the illustrative values):

```json
"agents": {
  "defaults": { "model": "your-available-model", "reasoningEffort": "high" },
  "members": {
    "security": { "model": "your-review-model", "reasoningEffort": "max" },
    "csharp": { "reasoningEffort": "high" }
  }
}
```

Each field uses the member override, then `defaults`, then the Captain's setting. If a model is selected but no reasoning effort is set, use that model's harness default. Member keys are core role IDs (`simplicity`, `simple-tests`, `security`, `correctness`, `code-quality`, `test-integrity`, `browser`, `repair`) or configured specialist IDs such as `csharp`; the Captain itself is controlled by its launching task. Both the model and reasoning level must be available in the chosen harness. Unsupported overrides hold the run; MARC never silently substitutes a model.

The final **Crew used** table shows model and reasoning for each recorded session: **Same model (Captain)** / **Same reasoning effort (Captain)**, configured default, member override, or model default. Actual values are included when the harness exposes them; otherwise requested values are labelled as such. Missing execution evidence is shown as unconfirmed. When the harness exposes per-session token counts, the table adds a **Tokens** column and a total for the recorded sessions; sessions without exposed counts read **Not exposed**, and reports produced without any counts are unchanged. Consumption is shown for cost visibility only and never affects a decision. Changing configuration requires fresh review evidence.

## Your own quality tools

MARC does not read, configure, adjudicate or replace your quality tooling. Analyzers, linters, static analysis, formatters, coverage thresholds, complexity budgets and duplication detectors stay entirely yours. Run them in your build.

Your build's own result is the only connection they need. MARC requires a successful hosted CI run on the exact reviewed commit before a candidate is eligible, so whatever your build enforces is already a precondition for review:

- **Enforced.** A violation fails your build. The candidate is not eligible, and MARC holds or repairs it rather than approving it.
- **Reported as a warning.** Your build passes. MARC treats that as your deliberate decision not to enforce, and its reviewers do not convert those warnings into findings or invent style rules from them.

Either way, no adapter, configuration key or artifact is needed for the tool, and adding, upgrading, retuning or removing one needs no MARC change.

The boundary is deliberate. Suppressions, baselines and severity thresholds are your quality bar, and importing them would make MARC adjudicate it. MARC reviews what a build cannot decide: intended behavior, contracts, affected callers, runtime ownership, invariants and whether the evidence supports the change. That work does not shrink or grow with your analyzer set, because a successful run tells MARC the candidate is eligible, never which checks exist in it. Reviewers therefore keep reviewing their declared scope whatever tooling you run.

Security scanning is the exception, for a specific reason: MARC adjudicates dependency and secret findings itself, against severity thresholds, reviewed fingerprints and resolved-version evidence, so it needs structured content rather than a pass or fail. That is why the `scans` keys in the configuration contract above, and the CI wiring below, name those adapters and artifacts explicitly. If you ever need a quality tool's result to change a MARC decision, that is an adapter to implement and review, not a setting.

## Gitleaks exceptions and CI

For the GitHub alert location, credential revocation checks and when to add an exclusion, read [reviewing historical secrets](historical-secrets.md).

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

The controller supports `queue`, `capture`, `decide`, `checkpoint`, `report`, `merge` and `recover-ci` after the optional `--repo <checkout>` selector. Follow the Captain and [evidence contract](../skills/marc-crew-captain/references/evidence.md) for authority, independent review and frozen identities. Reports remain at `.quality/reports`; preserve historical bytes. Merge uses the configured target branch. Deployment is separate.

For an explicitly authorized sensitive-path decision, `decide`, `checkpoint`, `report` and `merge` accept a trailing `--operator-approval <absolute-external-file>`. Read the [operator channel, record schema and rebinding rules](operator-approval.md). Candidate files and audit copies never grant approval; this option satisfies only the applicable human path gate.

GitHub Actions is the implemented provider. Existing CI can validate other technologies, including Python; the bundled dependency adapters/classifiers cover NuGet/.NET and npm. The optional browser startup hook is ASP.NET-specific. Unknown dependency/build manifests should remain sensitive until an applicable review policy exists. Missing required tooling, expertise or evidence produces a hold.

Run shared tests with `node --test src/quality/*.test.cjs`. Set `MARC_TEST_ARTIFACTS` to an appropriate external directory when local policy requires it. The optional .NET hook smoke check takes an explicit `-ArtifactsPath`. Consumer integration tests live outside the reusable bundle.

Consumer configuration, accepted exceptions, reports and operational state stay in the consumer. Existing policy paths may remain for launcher compatibility. Upgrade or roll back the pinned bundle as a unit, preserving state and locks, and recapture invalidated evidence. See [installation](installation.md).

## Report-only CI reuse

The `report` command checks the existing workflow run for the latest reviewed source SHA before publication. When it still matches the captured successful run and attempt, the returned `commitMessage` includes `[skip ci]` and the evidence records `reportCiReuse`. Commit only the returned pair with that message. The merge guard checks source/base/policy, exact report paths and bytes, and current CI again. Source changes and stale, missing or unsuccessful source checks cannot qualify. An existing report-head run must finish successfully; no duplicate dispatch is needed. Historical reports keep their original contract. Post-merge target-branch CI remains required.

GitHub documents that [skip instructions](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs) suppress push/pull-request workflows, but not pull_request_target or manual dispatch. Required status checks may remain pending when skipped. Do not bypass repository protection or change branch rules: if the consumer requires checks on every report SHA, retain report-head CI using the existing bounded recovery path and record that consumer limitation. Reuse is a MARC evidence decision, not a forged GitHub check or permission to override protection.
