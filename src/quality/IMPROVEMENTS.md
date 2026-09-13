# Shared controller improvements

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
