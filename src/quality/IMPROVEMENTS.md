# Shared controller improvements

## 2026-09-25 — Automatic self-review authority

The owner explicitly requested automatic mode for MARC's own repository after its first successful report-only assessment. Set only its policy mode to automatic and align self-review guidance and the existing configuration test. Required reviews, exact-source CI, sensitive-path approval, integrity checks, budgets and deployment separation remain enforced. New consumer setup defaults and automatic tool updates remain unchanged. Activation on trusted master changes policy identity and requires fresh capture/review before pending PRs can merge.

## 2026-09-25 — Self-review policy fixture mappings

The first PR #6 self-review held two policy JSON files as unclassified. Map only the Python example policy and controller policy fixture to their actual Node consumers in self-review governance. A focused regression reproduces the original holds, verifies JavaScript selection after the mappings, and keeps an unknown JSON fixture held. Shared-impact broadening, required reviews, report-only mode and sensitive-path approval remain unchanged. Activation requires this governance on trusted master and a fresh capture; prior reports remain immutable.

## 2026-09-25 — Self-review bootstrap

Added MARC's own `.marc/` configuration using existing resolver and trusted-checkout guards, with report-only mode, updates off, inherited agents, 50 files, 3,000 lines, two repair cycles and portable external state. Repository-specific producer/CI/crew mappings stay in that governance directory. Hosted Node checks now emit JUnit artifacts and the shared Gitleaks wrapper emits sanitized scan evidence with an empty exception file. Focused integration checks cover defaults, producers, governance protection, specialist availability, artifact wiring and rejection of candidate controllers. Initial governance still requires maintainer landing before a trusted self-review can start; no runtime guard, merge authority or other consumer configuration was changed.

## 2026-09-24 — Reusable upgrade PR command

Added explicit scheduler-neutral upgrade preparation with a stable branch and one open PR, independent of intake auto-update settings. Shared trusted rendering keeps pin/config/member/generated files coherent after exact upstream CI verification. External ownership and pending-push records support retries, and branch commits append without force, including after squash merge. Shared run locking, existing reports, approvals and cumulative state remain intact; unfamiliar branches and ambiguous identities hold. Regression-first synthetic Git/GitHub tests cover repeated upgrades, no-op runs, upstream failure/drift, ownership/PR mismatch, races, report preservation and PR-creation recovery. No hosted workflows, live publication, consumer activation or deployment were performed. See [command contract](../../docs/upgrades.md).

## 2026-09-24 — Automatic updates are opt-in

Changed omitted `autoUpdate` to resolve to false and made upstream preflight require explicit true. Disabled/default intake makes no upstream update contact; existing explicit true keeps the updater and all exact upstream CI checks. The Python example now shows false. Routine PRs should not acquire unrelated tool/config/generated-file changes, fresh-evidence churn and sensitive-path approval holds by default. Existing consumers with explicit true need a deliberate config change to disable it; omitted settings change behavior when this version is adopted. Focused regressions verified the old default fails and explicit opt-in retains its checks and update behavior. No consumer configuration, updater implementation, merge authority or cumulative state was removed. See [installation guidance](../../docs/installation.md#automatic-updates).

## 2026-09-21 — Reuse CI for generated reports

The owner observed a duplicate pre-merge build after green source CI. New report publication rechecks the exact source run/attempt and returns a skip-CI commit message only with bound reuse evidence. Merge verifies the exact report pair and current source CI; pending/failed report CI, drift and historical reports keep their gates. Source artifacts/scans, post-merge CI, protection and budgets remain required. Local deterministic regression validation only; publication and consumer activation are separate.

## 2026-09-20 — Exact operator approval for sensitive paths

Replaced the unconditional human-path rejection with an explicit operator CLI channel bound to repository, PR, source, base, policy and the complete sensitive path set. External records have a strict schema, expiry and byte digest; candidate/evidence copies cannot authorize themselves. Decisions verify the committed path inventory and live identity, reports retain the audit, and merge reloads approval at its final boundary. All other gates and cumulative budgets remain intact. Regression coverage includes forged input, stale identities, additional sensitive changes, report audit mismatch and revocation before merge. See the [contract](../../docs/operator-approval.md) and [delivery record](../../docs/work/20260920-operator-approval-work.md). Publication and consumer activation require separate exact-commit checks.

## 2026-09-16 — Consumer quality tooling boundary

The owner asked whether third-party code evaluators could replace eval cases, then settled the simpler product question instead: a consumer's analyzers, linters and static analysis stay in the consumer's build and MARC integrates none of them. Documented in the configuration guide, the project entry point and the setup prompt. MARC already requires successful hosted CI on the exact reviewed commit, so an enforced rule fails the build and makes the candidate ineligible, while a rule left as a warning is the consumer's decision not to enforce and does not become a review finding. No adapter, configuration key or artifact is added for such tools, and changing one needs no MARC change. Setup must now leave that tooling alone rather than wiring it into MARC configuration. Security scanning keeps its structured adapters because MARC adjudicates dependency and secret findings itself against thresholds, reviewed fingerprints and resolved-version evidence. Review scope, reviewer obligations, gates, routing, budgets and merge authority are unchanged, and no eval case or skill rule was retired: a successful build proves eligibility, never which checks exist in it. Documentation and setup guidance only; no controller behavior, no model evaluation and no consumer activation. Catalogue validation passed. See [configuration](../../docs/configuration.md#your-own-quality-tools) and [work plan](../../docs/work/20260915-skill-evals-csharp-work.md).

## 2026-09-15 — Eval corpus contracts

The owner asked for evals for the C# specialist, with every rule in the skill covered. A new contribution check validates versioned eval corpora under `evals`, starting with `marc-crew-csharp`: 77 rules extracted from that member's skill, manifest and architectural reference, each carrying a source anchor and a polarity of must-find, must-not-find or conduct, and 26 cases across seeded defects, paired legitimate alternatives, insufficient evidence, hostile candidate content and impact beyond the captured selection. The validator checks case shape, exact source/base and policy identity, captured selection hashes, evidence references, class-specific expectations, severity consistency, a recomputed content digest over each case's inputs, and that no expectation file sits inside the reviewer input. It fails when any extracted rule has no covering case, so adding a rule to a skill without adding a case now breaks the check. Corpora live outside the trusted policy digest and outside catalogue validation, so a case edit cannot change a consumer's policy identity or invalidate an existing approval; the validator itself is an ordinary bundle module and is covered by the policy digest. Thirteen focused Node regressions retain the rejection assertions for uncovered rules, unknown rule references, contradictory class expectations, leaked expectations, unlisted case directories, missing evidence, malformed capture identity and silent edits to case inputs or evidence. No skill instruction was changed, no reviewer input is prepared, no output is scored and no model was called: this establishes the measurement material and its contracts, not a demonstrated review-quality result. Local validation only: `npm run build`, `npm run validate:catalogue`, `npm run validate:evals` and 150 Node tests passed on Node.js 24. See [work plan](../../docs/work/20260915-skill-evals-csharp-work.md) and [contribution checks](../../docs/contribution-checks.md#eval-corpora).

## 2026-09-15 — Reported token consumption

The owner asked to see token consumption in the Captain's report where the information is available. Execution records now accept an optional `usage` object of observed `inputTokens`, `cachedInputTokens` and `outputTokens`, validated for shape and rejected when malformed. The Crew used table gains a Tokens column and a recorded total whenever at least one session exposes counts, so reports prepared without them keep their exact previous bytes and historical rendering. Absent counts render as not exposed. Consumption is informational: it is not a gate, threshold or budget, no decision depends on it, and the still-running coordinating session is excluded from the total. Focused Node regressions cover valid, malformed and absent usage and unchanged legacy rendering; 138 existing tests continue to pass. Local validation only; no model evaluation, hosted CI, publication or consumer pin activation. See [Captain register](../../skills/marc-crew-captain/IMPROVEMENTS.md#2026-09-15--reported-token-consumption).

## 2026-09-15 — Dependency scope and assessment stages

The owner identified all-specialist selection after a narrow application lockfile repair and requested stage-by-stage crew/results. Nested npm dependency-only changes now use committed-blob classification and trusted area technologies while retaining full review; shared, unmapped, workspace and unsupported changes keep broad selection. Added an external append-only review/repair/CI journal and `marc-v3` stage rendering, preserving historical formats and current-source gates. Focused red/green regressions cover routing, retained sessions, journal corruption, locks and historical approval isolation. This internal tooling change needs no consumer product help update. Local validation only; normal bundle publication, upstream CI and consumer pin activation remain required.

## 2026-09-14 — Verified upstream updates and complete fixtures

Two new controller imports broke the migration fixture's manual dependency list. It now copies the real source tree and checks policy-hash invalidation for every top-level production CommonJS module while preserving synthetic governance and missing-input rejection tests. Upstream Node checks had already rejected the second broken commit, but intake only resolved the master SHA. Intake now requires the latest exact-master push run and both platform jobs, including successful syntax/build and test steps, bound to the same SHA and run attempt. Missing, pending, failed, stale, incomplete or unavailable evidence leaves the PR pin untouched and stops intake; no fallback commit, dispatch or retry is introduced. Regression cases reproduced both gaps before the change. Consumer CI, review gates, active controller pin and cumulative budgets remain separate.

Local validation: 131 Node tests passed, syntax checks and catalogue validation passed, and a read-only GitHub check rejected the known failed upstream commit before mutation. Windows temporary storage supplied the short-path alias required by the installation regression. No new hosted CI, upstream publication or consumer pin activation was performed for this change.

## 2026-09-14 — Optional crew model selections

Added optional validated agent settings and resolved per-role selections, preserving absent consumer defaults. Current captures require host-record execution attestations; decisions reject stale settings and observed substitutions. New report rendering lists each recorded crew session's model and reasoning provenance while retaining historical report bytes. Focused Node tests cover precedence, invalid configuration, report labels and decision enforcement; no live models or hosted CI were run. See [Captain register](../../skills/marc-crew-captain/IMPROVEMENTS.md#2026-09-14--optional-crew-model-selections).

## 2026-09-14 — Migration fixture dependency

The trusted-policy migration test copied the controller and crew modules without their required `host-instructions.cjs` dependency, causing `MODULE_NOT_FOUND` before any digest assertions ran. Added the dependency to the synthetic repository and verified that modifying it changes the policy hash. The existing migration test reproduced the failure before the fix and all four migration tests passed afterward on Node.js 24.10.0. This is internal test-fixture maintenance; runtime behavior and user help are unchanged. Hosted CI and consumer activation remain unverified.

## 2026-09-13 — Automatic master updates

Automatic updates also use the installer's shared deterministic renderer to add/refresh command and skill forwarding files for installed harnesses, preserving customizations by stopping on conflicts. The result lists every changed path and explains opt-out. Integration files can appear under `.marc`, `scripts/quality`, `.agents/skills` and `.claude/skills` in the same PR; this is an accepted default-on tradeoff. The real Git regression covers both harnesses, new discovery and refreshed bootstrap content.

Added `autoUpdate`, enabled when omitted, with mandatory upstream master resolution during queue/capture. Capture uses an isolated Git index to commit the exact gitlink, config pin and existing compatible member versions to an eligible PR branch, then captures its new head. No candidate code is executed. Canonical upstream checks, pin consistency, installation-contract compatibility and non-force pushes preserve existing trust and merge gates. The trusted target adopts the pin only after merge. Opt-out skips update contact; availability errors stop intake. Tests cover defaults/validation, offline checks, real Git publication, idempotence, dirty-work preservation, ineligible branches and concurrent pushes. Local validation only; no consumer update, hosted CI or deployment.

## 2026-09-13 — Historical secret guidance

Explained why old commits trigger secret findings, where to review GitHub alerts, and how verified revocation precedes an exact historical Gitleaks exclusion. Added [consumer guidance](../../docs/historical-secrets.md) with official GitHub references and clarified that alert closure and Gitleaks exclusions are separate. Documentation only; scan behavior and exception rules are unchanged.

## 2026-09-13 — Additive setup reruns

Installer reruns fill missing forwarding files, preserve customized files and skip identical writes, including configuration formatting and timestamps. Preview reports preserved files and bundle pin changes; applying a different existing pin requires deliberate replacement after setup approval. The prompt compares member versions and content read-only, offers upgrades and limits rerun confirmation to changes. A shared bundle prevents independent member upgrades. Red/green synthetic installation regressions cover ordinary and Windows short paths, customized guidance, missing members, unchanged configuration and pin-upgrade rejection. Consumer activation and operational authority remain separate.

## 2026-09-13 — Fifteen-language catalogue coverage

Added synthetic Git capture checks for every ranked language, explicit mapping and missing-expertise holds, Scratch browser companions and exact-version activation. Runtime routing and consumer authority are unchanged. See [coverage](../../docs/language-coverage.md).

## 2026-09-13 — Consistent crew skill naming

Updated catalogue validation, specialist resolution, trusted skill coverage and installation to `marc-crew-<name>`. Added a naming regression; stable member IDs and authority remain unchanged.

## 2026-09-13 — Windows short-path installation

Both initial hosted Windows runs failed because the runner's temporary directory used an 8.3 alias: Node's non-native realpath retained the alias while Git returned the long spelling. Use native realpath for repository-root and mounted-bundle identity comparisons in the installer and generated bootstrap. A real Windows short-path regression reproduced the original failure before the fix and now exercises installation, pin/content-drift rejection and upgrade/rollback through the alias. A nested consumer directory is still rejected. This changes path normalization, not pinning or merge authority.

## 2026-09-13 — Authoring utility classification

The crew-creation skill is discoverable authoring guidance, not review expertise. The contribution catalogue validator now explicitly recognizes `marc-crew-creator` without a specialist manifest and rejects attempts to attach one. All other non-core skills still require valid member manifests. A red/green test verifies discovery and the missing-member hold if a consumer attempts to select the utility. This extends the contribution-check work in the current checkout; runtime review permissions are unchanged.

## 2026-09-13 — Contribution CI and manual eval reminders

Added Node 24 syntax/test workflows for every branch push on Linux and Windows, plus PR catalogue validation and an explicit replay command for existing deterministic assurance scenarios. Fork PRs run the complete Node checks because origin receives no fork branch-push event. Catalogue regressions reject missing mandatory skills/manifests, invalid metadata/permissions and broken or escaping local references. Commit-bound prompt-change detection handles deleted inputs and divergent base history; it produces an advisory manual eval plan without model calls or an eval-pass claim. Contribution documentation explains coverage, limitations and the separate self-review activation prerequisites. Existing consumer review and merge authority are unchanged.

## 2026-09-13 — React web impact requires browser evidence

Adding the React member exposed that a confirmed React area containing only a `.js`/`.ts` Hook did not require browser evidence unless separately labeled `web`. A red regression reproduced the missing requirement. Treat captured `react` impact as browser-facing, retaining full review and the independent browser gate. Selection remains based on trusted configured areas, not an assumption that every JSX file is React. Tests cover companion selection, missing expertise, unrelated JSX/JS/docs and callers found only in the old revision. No consumer configuration is changed.

## 2026-09-13 — Bound indirect reference collection

The installed historical-PR smoke check exposed reference expansion beyond the documented 300-file limit and unrelated data matches. Enforce the limit while collecting matches and follow source or explicitly configured runtime areas. Direct changed files remain fully classified; uncertainty still broadens review. A failing 502-versus-300 regression verifies the correction.

## 2026-09-13 — Trusted crew selection and upgrade verification

Added declarative versioned C#, JavaScript, Blazor and front-end selection from frozen source, referenced callers and trusted impact areas. Decisions recompute selection and reject edited/stale identities, missing expertise, reused sessions and conflicting blocking results. Upgrade/rollback regression preserves foreign locks, repair history, recovery reservations and historical report bytes.

## 2026-09-13 — standalone layout and pinned integration

Moved the controller, adapters, fixtures and adjacent tests together into src/quality. Updated digest coverage and path resolution; added a pinned consumer bootstrap and installer that reject tool/configuration/gitlink drift before importing code. Review and merge semantics remain unchanged. Local regression tests cover real synthetic submodule installation. Hosted execution is not claimed.

## 2026-09-13 — IaC catalogue coverage

Added focused synthetic impact tests for source/parameter mappings, missing expertise, generic JSON exclusion and Bicep/generated-ARM companion selection. Existing router and runtime authority are unchanged. The 21 focused crew/catalogue/installation tests passed; syntax validation covered 26 JavaScript files. These fixtures do not claim semantic IaC caller discovery or cloud execution.

## 2026-09-13 — Harness-compatible consumer installation

Reason: the installer only emitted Codex discovery paths, while Claude Code requires `.claude/skills`; host rule/agent files also needed consistent trust coverage. Added explicit `--hosts` selection with the unchanged Codex default, shared Cursor paths and additive Claude forwarders. Existing preservation, replacement, pin and rollback rules remain in force. Tracked root/nested harness inputs now enter the policy digest and broaden crew review; synthetic policy examples protect those paths. Existing consumer policies are not rewritten.

Validation: new installation and host-governance regressions failed before implementation; focused Node tests passed on Node 24/Windows, including Windows short paths. Local validation only; live model smoke checks, hosted CI, publication and consumer activation are not claimed. Upgrading changes the trusted policy digest and requires fresh evidence. Rollback restores the complete consumer pin/config/forwarding integration set while retaining operational state.
