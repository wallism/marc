# Shared controller improvements

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
