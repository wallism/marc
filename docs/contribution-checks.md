# Contribution checks and manual prompt evals

MARC validates its executable tools automatically and measures prompt quality separately. Passing a syntax check, a manifest contract or a scenario replay does not prove that a reviewer finds real defects.

## Automatic checks

| Trigger | Check | Coverage |
| --- | --- | --- |
| Every branch push, including merges to master | Node checks on Ubuntu and Windows, Node 24 | `npm run build` checks JavaScript syntax under `src` and `scripts`; `npm test` runs all adjacent Node tests. No installation, compilation output or application build is required. |
| PR opened, updated, reopened or marked ready | PR contracts and scenarios | `npm run validate:catalogue` validates every published skill; `npm run test:scenarios` runs the existing deterministic assurance scenarios. |
| Fork PR | Full Node checks on both platforms | Fork branch pushes do not trigger the origin repository's push workflow. This closes that contribution coverage gap. |
| PR instruction-input change | Prompt eval reminder | `npm run eval:plan` lists changed inputs and generates a manual comparison plan in the job summary, with a notice. It does not call a model. |

There are no path filters on the push or PR workflows. Push runs are not cancelled by later pushes; each branch push gets validation. A newer PR run cancels superseded PR checks. Both workflows can also be dispatched manually; the PR reminder needs PR base/head context and is omitted on a manual workflow dispatch. Run the local eval-plan command with explicit refs when needed.

The workflows use standard GitHub-hosted runners, read-only repository permissions, immutable action commits and checkouts without persisted credentials. They do not use `pull_request_target`, model secrets, deployment credentials or merge permissions. They execute candidate tests in hosted CI, not on a credentialed maintainer computer. GitHub fork approval policy can require approval before a first-time contributor's jobs start.

Workflow files produce check results; branch protection/rulesets must separately require the appropriate checks. This change does not configure those settings or grant MARC authority. Push results use the branch source SHA; PR results normally use GitHub's synthetic merge SHA. A future MARC CI integration must preserve that distinction and verify both against the current source/base. These workflows do not yet emit the scan artifacts required by the existing consumer CI adapter.

## Catalogue validation

The validator discovers every folder under `skills`, including optional specialists absent from example consumer configurations. It checks the mandatory core skills, skill name/description metadata, improvement registers, specialist manifests, declared permissions, output schema and positive/negative applicability cases. It checks inline local Markdown file links throughout skill folders and their references. External URLs and heading anchors are not fetched or validated. This is a validator for the repository's current single-line frontmatter and inline-link conventions, not a general Markdown/YAML parser.

Run `npm run validate:catalogue`. New specialist folders must include `crew.json`; removing a specialist's manifest cannot silently turn it into an unvalidated core skill. The explicitly recognized `marc-crew-creator` authoring utility has no review manifest and cannot be selected as a reviewer. Its metadata, register and links are still checked. Actual consumer applicability, version pinning and independence are also covered by the existing routing tests. No manifest permission declaration creates a sandbox.

## Scenario replay

Run `npm run test:scenarios`. This is a named subset of the existing Node suite, not a second implementation of the controller:

| Test module | Scenarios |
| --- | --- |
| `marc.test.cjs` | Eligible changes, incomplete/stale evidence, simple/full routes, sensitive changes and scope limits. |
| `merge.test.cjs` | Guarded merge behavior, race/identity checks and mocked remote boundaries. |
| `crew.test.cjs` | Relevant reviewers, missing expertise, independent sessions, conflicting findings and source/caller impact. |
| `ci-recovery.test.cjs` | Pending/successful CI reuse, bounded recovery, uncertain requests and durable reservations. |
| `reports.test.cjs` | Immutable report identity/content, collisions and misleading metadata paths. |
| `installation.test.cjs` | Synthetic Git/submodule installation, pin drift, upgrade/rollback and state preservation. |

These cases use synthetic repositories/evidence and mocked external actions. No model eval, real consumer merge or deployment occurs. Add new scenarios beside the owning module. They verify decisions made from supplied review results; they do not establish that a prompt will generate correct results.

## Manual prompt comparison

Start with a visible reminder while the benchmark and trusted result format are being established. Do not fail every prompt PR merely because there is no automated model runner yet. Maintainers should require appropriate evidence or explicitly accept the limitation before merging a behavioral instruction change.

After committing the proposed change and fetching the target branch, run:

```powershell
npm run eval:plan -- --base origin/master --head HEAD
```

Use the actual target ref for a PR into another branch. The command does not fetch, inspect uncommitted edits or call a model. It resolves both refs to immutable commits and detects changes from their Git merge base to the candidate. Added, deleted and renamed instruction inputs are included. Invalid/unavailable refs fail instead of yielding a clean result.

Detection covers skill text, references and manifests; AGENTS/CLAUDE instructions; setup, crew, configuration and installation guidance; and example consumer project guidance. Skill improvement history is excluded. This path list is deliberately conservative but cannot infer all indirect behavioral effects. Reviewers can require evals for other changes. The output says `manual-eval-needed` or `no-prompt-change-detected`; neither is an eval verdict.

For an actual manual eval:

1. Select a small set of synthetic cases relevant to the changed member. For each case, freeze the source/base, context and expected behavior. Include a real seeded defect, a clean change, insufficient evidence and candidate content that tries to override trusted instructions. Cases and expectations should be reviewed independently of the proposed prompt.
2. Review each case once with the current trusted instructions and once with the proposed instructions, using separate sessions, the same model/settings and the same allowed tools. Treat candidate prompt content as untrusted; enforce read-only access and exclude credentials, network access and merge authority. Keep expected answers away from the reviewer inputs.
3. Assess actual findings and source evidence against the case expectations. Record detected defects, missed defects, false alarms, unsupported claims, correct holds and token/cost information where available. Grade the evidence and behavior, not exact wording. Inspect differences manually rather than purchasing a model judge by default.
4. Repeat ambiguous or close results. Keep the evaluation budget explicit. A single small comparison supports a bounded claim, not a universal quality improvement. Changes to core Captain/evidence contracts need cases across affected members.
5. Attach the comparison to the PR, identifying base/head commits, prompt/reference content, case version, model/settings, results, limitations and reviewer. After further relevant edits, repeat the affected comparison. For a nonbehavioral edit, record a specific waiver reason for maintainer review instead of inventing a pass.

No benchmark corpus or model runner is claimed by this increment. The plan command simplifies scope detection and the manual procedure. The next increment should add a small versioned corpus and a command that prepares paired inputs and scores saved outputs; live model execution should remain explicitly requested.

A later enforced guard should require trusted eval evidence or a maintainer waiver bound to the current prompt/reference and case digests, with the harness/model configuration recorded. Keep operational results outside the reusable tool repository. A contributor-controlled checkbox, label or result file alone must not authorize its own prompt change. Guard/harness changes also need trusted maintainer review.

## Scheduled self-review

Self-review is a separate PR-based operation. Use a current trusted MARC bundle to review proposed MARC changes; never execute the candidate's Captain instructions as its own approving reviewer. Keep candidate testing in CI or a separate sandbox.

The intended scheduler enumerates all PRs, assesses or resumes one per run, holds an exclusive external lock and retains completed identities and cumulative budgets. Continue the selected PR through its authorized process to a verified completion or concrete hold. Pending CI is a wait, not a reason to start another PR. Release the run's lock when that run ends; retain its external ledger and resume point. Do not duplicate unchanged held assessments or let an unchanged held PR starve later eligible work. Notify on meaningful changes, completed assessments, failures or required decisions; otherwise stay quiet.

Activation needs repository-specific trusted policy, controller/configuration, required hosted evidence and an explicit intake/merge-authority decision. Public fork contributions need deliberate handling: the existing controller reports forks as held and does not automatically merge them. Do not copy another consumer's author permissions, exceptions, credentials or state. The shared repository's generic-content rule remains in force; self-review governance placement must be resolved before activation. No self-review schedule or automatic merge authority is enabled by these workflow files.
