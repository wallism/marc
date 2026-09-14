# MARC improvements

## Register scope

Record material changes to MARC's process: review criteria, routing, evidence gates, authority, budgets, supported capabilities and operational behavior. Update the affected member/component register and add a terse linked entry here in the same change.

Do not record routine documentation, infographic, formatting, file moves or repository housekeeping unless they materially change how the process operates. Judge the behavioral effect, not the file type: a skill instruction that changes a review decision qualifies; a diagram explaining existing behavior does not. Keep ordinary PR assessments in reports and preserve historical entries.

| Date | Component | Improvement | Details |
| --- | --- | --- | --- |
| 2026-09-15 | Eval corpora | Added a versioned C# eval corpus and a contribution check that fails when any rule extracted from a skill has no covering case. | [Controller](src/quality/IMPROVEMENTS.md#2026-09-15--eval-corpus-contracts), [work plan](docs/work/20260915-skill-evals-csharp-work.md) |
| 2026-09-15 | Controller and Captain | Reported observed per-session and total token consumption in the Crew used table, as visibility only. | [Controller](src/quality/IMPROVEMENTS.md#2026-09-15--reported-token-consumption), [Captain](skills/marc-crew-captain/IMPROVEMENTS.md#2026-09-15--reported-token-consumption) |
| 2026-09-15 | Controller and Captain | Scoped verified application dependency selection and retained review, repair and CI stages in reports. | [Controller](src/quality/IMPROVEMENTS.md#2026-09-15--dependency-scope-and-assessment-stages), [Captain](skills/marc-crew-captain/IMPROVEMENTS.md#2026-09-15--dependency-scope-and-assessment-stages) |
| 2026-09-14 | Controller and Captain | Replaced manual fixture dependencies and required exact upstream platform CI before pin updates; protected master with both Node checks. | [Controller](src/quality/IMPROVEMENTS.md#2026-09-14--verified-upstream-updates-and-complete-fixtures), [Captain](skills/marc-crew-captain/IMPROVEMENTS.md#2026-09-14--upstream-ci-before-pin-updates) |
| 2026-09-14 | Register policy | Limited entries to material process changes; excluded routine documentation and visual updates. | [Captain](skills/marc-crew-captain/IMPROVEMENTS.md#2026-09-14--material-process-changes-only), [creator](skills/marc-crew-creator/IMPROVEMENTS.md#2026-09-14--material-process-changes-only) |
| 2026-09-14 | README | Summarized setup responsibilities and recommended starting with the supplied process before team-specific customization. | [Captain register](skills/marc-crew-captain/IMPROVEMENTS.md#2026-09-14--readme-setup-and-customization-guide) |
| 2026-09-14 | README | Made optional crew model overrides and report labels visible from the project entry point. | [Captain register](skills/marc-crew-captain/IMPROVEMENTS.md#2026-09-14--readme-model-selection-guide) |
| 2026-09-14 | Controller and Captain | Added optional crew model/reasoning overrides and explicit inheritance/override reporting, with no configured model defaults. | [Controller register](src/quality/IMPROVEMENTS.md#2026-09-14--optional-crew-model-selections), [Captain register](skills/marc-crew-captain/IMPROVEMENTS.md#2026-09-14--optional-crew-model-selections) |
| 2026-09-14 | Prompt research | Documented prioritized prompt improvements, source comparisons and a phased validation plan; implementation remains proposed. | [Work plan](docs/work/20260914-prompt-improvements-work.md), [creator record](skills/marc-crew-creator/IMPROVEMENTS.md#2026-09-14--prompt-improvement-research-plan) |
| 2026-09-14 | Migration tests | Included the host-instruction dependency in the synthetic policy repository and checked its policy-hash coverage. | [Controller register](src/quality/IMPROVEMENTS.md#2026-09-14--migration-fixture-dependency) |
| 2026-09-13 | Controller and Captain | Added default-on master checks and guarded PR pin/integration-file updates before capture, with visible changed paths, opt-out and target-branch activation after merge. | [Controller register](src/quality/IMPROVEMENTS.md#2026-09-13--automatic-master-updates), [update contract](docs/installation.md#automatic-updates) |
| 2026-09-13 | Captain and installation | Added a skills.sh discovery quickstart and packaged setup handoff covering Claude Code, Codex and Cursor, with pinned consumer migration and publication boundaries. | [Captain register](skills/marc-crew-captain/IMPROVEMENTS.md#2026-09-13--skillssh-setup-entry), [installation](docs/installation.md#skillssh-discovery) |
| 2026-09-13 | Secret-scan documentation | Explained historical findings, GitHub alert navigation and verified revocation before exact Gitleaks exclusions. | [Controller register](src/quality/IMPROVEMENTS.md#2026-09-13--historical-secret-guidance), [guide](docs/historical-secrets.md) |
| 2026-09-13 | Installation and Captain | Added explicit Claude Code forwarding support while preserving the Codex default and shared Cursor discovery; bound tracked harness instructions into policy identity and documented independent handoffs. | [Controller register](src/quality/IMPROVEMENTS.md#2026-09-13--harness-compatible-consumer-installation), [Captain register](skills/marc-crew-captain/IMPROVEMENTS.md#2026-09-13--harness-handoffs), [installation](docs/installation.md) |
| 2026-09-13 | Captain documentation | Clarified configured versus per-PR selected specialists, with a C#/JavaScript example and dedicated infographic covering core reviews and broader impact. | [Captain register](skills/marc-crew-captain/IMPROVEMENTS.md#2026-09-13--per-pr-selection-explanation), [README](README.md#which-crew-members-run-for-a-pr) |
| 2026-09-13 | Setup and installation | Made reruns additive, preserved customizations and unchanged files, and required explicit bundle upgrade approval with member-version disclosure. | [Installer register](src/quality/IMPROVEMENTS.md#2026-09-13--additive-setup-reruns), [setup prompt](docs/setup-prompt.md) |
| 2026-09-13 | Scratch and creator | Added version 1.0.0; reviewed and refined binary-source provenance and citations. | [Member](skills/marc-crew-scratch/IMPROVEMENTS.md), [creator lessons](skills/marc-crew-creator/references/creation-review.md) |
| 2026-09-13 | PHP and creator | Added version 1.0.0; reviewed and refined output-context boundaries. | [Member](skills/marc-crew-php/IMPROVEMENTS.md), [creator lessons](skills/marc-crew-creator/references/creation-review.md) |
| 2026-09-13 | Delphi/Object Pascal and creator | Added version 1.0.0; reviewed and refined designer-resource dependencies. | [Member](skills/marc-crew-delphi/IMPROVEMENTS.md), [creator lessons](skills/marc-crew-creator/references/creation-review.md) |
| 2026-09-13 | Go and creator | Added version 1.0.0; reviewed and refined bounded resource retention. | [Member](skills/marc-crew-go/IMPROVEMENTS.md), [creator lessons](skills/marc-crew-creator/references/creation-review.md) |
| 2026-09-13 | Fortran and creator | Added version 1.0.0; reviewed and refined effective storage ownership. | [Member](skills/marc-crew-fortran/IMPROVEMENTS.md), [creator lessons](skills/marc-crew-creator/references/creation-review.md) |
| 2026-09-13 | Rust and creator | Added version 1.0.0; reviewed and refined safe API proof obligations. | [Member](skills/marc-crew-rust/IMPROVEMENTS.md), [creator lessons](skills/marc-crew-creator/references/creation-review.md) |
| 2026-09-13 | R and creator | Added version 1.0.0; reviewed and refined data identity and filtering. | [Member](skills/marc-crew-r/IMPROVEMENTS.md), [creator lessons](skills/marc-crew-creator/references/creation-review.md) |
| 2026-09-13 | SQL and creator | Added version 1.0.0; reviewed and refined migration transition evidence. | [Member](skills/marc-crew-sql/IMPROVEMENTS.md), [creator lessons](skills/marc-crew-creator/references/creation-review.md) |
| 2026-09-13 | Visual Basic and creator | Added version 1.0.0; reviewed and refined compiler-control limits. | [Member](skills/marc-crew-visual-basic/IMPROVEMENTS.md), [creator lessons](skills/marc-crew-creator/references/creation-review.md) |
| 2026-09-13 | Java and creator | Added version 1.0.0; reviewed and refined shutdown completion semantics. | [Member](skills/marc-crew-java/IMPROVEMENTS.md), [creator lessons](skills/marc-crew-creator/references/creation-review.md) |
| 2026-09-13 | C++ and creator | Added version 1.0.0; reviewed and refined ownership versus synchronization. | [Member](skills/marc-crew-cpp/IMPROVEMENTS.md), [creator lessons](skills/marc-crew-creator/references/creation-review.md) |
| 2026-09-13 | C and creator | Added version 1.0.0; reviewed and refined compilation-context checks. | [Member](skills/marc-crew-c/IMPROVEMENTS.md), [creator lessons](skills/marc-crew-creator/references/creation-review.md) |
| 2026-09-13 | Python and creator | Added version 1.0.0; reviewed and refined failure-path evidence. | [Member](skills/marc-crew-python/IMPROVEMENTS.md), [creator lessons](skills/marc-crew-creator/references/creation-review.md) |
| 2026-09-13 | All skills and controller | Standardized published skill names on `marc-crew-<name>`, including the Captain; updated references and validation. | [Naming and migration](docs/installation.md#skill-naming), [controller register](src/quality/IMPROVEMENTS.md#2026-09-13--consistent-crew-skill-naming) |
| 2026-09-13 | Setup and crew authoring | Added discovery exclusions, evidence-based technology inventory, grouped creation approval and a resumable pending-PR/pin-activation handoff. | [Discovery contract](docs/technology-discovery.md), [creator record](skills/marc-crew-creator/IMPROVEMENTS.md#2026-09-13--discovery-exclusions-and-resumable-activation) |
| 2026-09-13 | Installation | Fixed Windows 8.3 path aliases being rejected as different repositories; added an installation regression through a real short path. | [Root cause and regression](src/quality/IMPROVEMENTS.md#2026-09-13--windows-short-path-installation) |
| 2026-09-13 | Setup and crew authoring | Propose creating missing technology expertise and contributing it back to MARC through a PR, with separate consumer activation. | [Crew creator handoff](skills/marc-crew-creator/IMPROVEMENTS.md#2026-09-13--setup-expertise-gap-handoff), [setup prompt](docs/setup-prompt.md) |
| 2026-09-13 | Crew authoring | Added research-led member creation with flexible technical criteria and preserved operational safeguards. | [Crew creator](skills/marc-crew-creator/IMPROVEMENTS.md) |
| 2026-09-13 | Contribution checks | Added branch-push Node checks, PR catalogue/scenario validation and manual prompt-eval reminders. | [Checks and limits](docs/contribution-checks.md), [component register](src/quality/IMPROVEMENTS.md#2026-09-13--contribution-ci-and-manual-eval-reminders) |
| 2026-09-13 | React and controller | Added a React web reviewer with official-source guidance and confirmed-area selection; retained full review/browser assurance for Hooks without JSX. | [React member](skills/marc-crew-react/IMPROVEMENTS.md), [routing regression](src/quality/IMPROVEMENTS.md#2026-09-13--react-web-impact-requires-browser-evidence) |
| 2026-09-13 | C# | Added practical DRY/SOLID and runtime ownership criteria with an explicit exclusion of style disputes. | [Version 1.1.0 scope and validation](skills/marc-crew-csharp/IMPROVEMENTS.md#2026-09-13--practical-architectural-review-version-110) |
| 2026-09-13 | Documentation | Added a README infographic of the implemented review, specialist, CI, repair and merge flow. | [Image, explanation and generation brief](docs/workflow-infographic.md) |
| 2026-09-13 | Controller | Enforced the reference collection limit and excluded unrelated data matches. | [Regression and reason](src/quality/IMPROVEMENTS.md#2026-09-13--bound-indirect-reference-collection) |
| 2026-09-13 | Captain and controller | Added identity-bound specialist selection, fresh-session checks and upgrade/rollback proof. | [Captain](skills/marc-crew-captain/IMPROVEMENTS.md#2026-09-13--versioned-specialist-handoffs), [controller](src/quality/IMPROVEMENTS.md#2026-09-13--trusted-crew-selection-and-upgrade-verification) |
| 2026-09-13 | C#, JavaScript, Blazor and front end | Added versioned review scopes, read-only contracts and applicability tests. | [C#](skills/marc-crew-csharp/IMPROVEMENTS.md), [JavaScript](skills/marc-crew-javascript/IMPROVEMENTS.md), [Blazor](skills/marc-crew-blazor/IMPROVEMENTS.md), [front end](skills/marc-crew-frontend/IMPROVEMENTS.md) |
| 2026-09-13 | Captain, crew and controller | Established a standalone source/catalogue layout with consumer-owned configuration and pinned installation. | [Layout and migration boundaries](docs/repository-layout.md) |

This starts MARC's standalone history. Prior consumer reports, approvals and operational ledgers stay in their original repositories and are not imported. Local validation and publication status belong in the extraction record; a source move does not establish hosted CI or live activation. Each member owns an improvement register; the later specialist entry records the routing change separately from extraction.

## 2026-09-13 — GitHub Actions and deferred mercenaries

Added the basic [GitHub Actions reviewer](skills/marc-crew-github-actions/IMPROVEMENTS.md) and updated [creator lessons](skills/marc-crew-creator/references/creation-review.md). Deferred external mercenary integration until instruction containment, dependency inspection and content-bound approval have an established design. Runtime authority and consumer activation are unchanged.

## Component registers

- [React](skills/marc-crew-react/IMPROVEMENTS.md)

- [marc-crew-captain](skills/marc-crew-captain/IMPROVEMENTS.md)
- [marc-crew-code-quality](skills/marc-crew-code-quality/IMPROVEMENTS.md)
- [marc-crew-correctness](skills/marc-crew-correctness/IMPROVEMENTS.md)
- [marc-crew-repair](skills/marc-crew-repair/IMPROVEMENTS.md)
- [marc-crew-security](skills/marc-crew-security/IMPROVEMENTS.md)
- [marc-crew-simple-tests](skills/marc-crew-simple-tests/IMPROVEMENTS.md)
- [marc-crew-simplicity](skills/marc-crew-simplicity/IMPROVEMENTS.md)
- [marc-crew-test-integrity](skills/marc-crew-test-integrity/IMPROVEMENTS.md)
- [Shared controller and installation](src/quality/IMPROVEMENTS.md)

## 2026-09-13 — Lean infrastructure crew

Created and reviewed [Bicep](skills/marc-crew-bicep/IMPROVEMENTS.md), [Terraform](skills/marc-crew-terraform/IMPROVEMENTS.md), then [ARM templates](skills/marc-crew-arm-templates/IMPROVEMENTS.md), each 1.0.0. Each refinement informed the creator before the next member. [Shared IaC scope](docs/iac-review.md) selects consequential CNCF/Azure guidance, documents file extensions and preserves existing mapping, evidence and execution boundaries. No consumer-specific configuration was imported.
