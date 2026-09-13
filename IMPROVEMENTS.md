# MARC improvements

| Date | Component | Improvement | Details |
| --- | --- | --- | --- |
| 2026-09-13 | Installation | Fixed Windows 8.3 path aliases being rejected as different repositories; added an installation regression through a real short path. | [Root cause and regression](src/quality/IMPROVEMENTS.md#2026-09-13--windows-short-path-installation) |
| 2026-09-13 | Setup and crew authoring | Propose creating missing technology expertise and contributing it back to MARC through a PR, with separate consumer activation. | [Crew creator handoff](skills/marc-crew-creator/IMPROVEMENTS.md#2026-09-13--setup-expertise-gap-handoff), [setup prompt](docs/setup-prompt.md) |
| 2026-09-13 | Crew authoring | Added research-led member creation with flexible technical criteria and preserved operational safeguards. | [Crew creator](skills/marc-crew-creator/IMPROVEMENTS.md) |
| 2026-09-13 | Contribution checks | Added branch-push Node checks, PR catalogue/scenario validation and manual prompt-eval reminders. | [Checks and limits](docs/contribution-checks.md), [component register](src/quality/IMPROVEMENTS.md#2026-09-13--contribution-ci-and-manual-eval-reminders) |
| 2026-09-13 | React and controller | Added a React web reviewer with official-source guidance and confirmed-area selection; retained full review/browser assurance for Hooks without JSX. | [React member](skills/marc-react/IMPROVEMENTS.md), [routing regression](src/quality/IMPROVEMENTS.md#2026-09-13--react-web-impact-requires-browser-evidence) |
| 2026-09-13 | C# | Added practical DRY/SOLID and runtime ownership criteria with an explicit exclusion of style disputes. | [Version 1.1.0 scope and validation](skills/marc-csharp/IMPROVEMENTS.md#2026-09-13--practical-architectural-review-version-110) |
| 2026-09-13 | Documentation | Added a README infographic of the implemented review, specialist, CI, repair and merge flow. | [Image, explanation and generation brief](docs/workflow-infographic.md) |
| 2026-09-13 | Controller | Enforced the reference collection limit and excluded unrelated data matches. | [Regression and reason](src/quality/IMPROVEMENTS.md#2026-09-13--bound-indirect-reference-collection) |
| 2026-09-13 | Captain and controller | Added identity-bound specialist selection, fresh-session checks and upgrade/rollback proof. | [Captain](skills/marc/IMPROVEMENTS.md#2026-09-13--versioned-specialist-handoffs), [controller](src/quality/IMPROVEMENTS.md#2026-09-13--trusted-crew-selection-and-upgrade-verification) |
| 2026-09-13 | C#, JavaScript, Blazor and front end | Added versioned review scopes, read-only contracts and applicability tests. | [C#](skills/marc-csharp/IMPROVEMENTS.md), [JavaScript](skills/marc-javascript/IMPROVEMENTS.md), [Blazor](skills/marc-blazor/IMPROVEMENTS.md), [front end](skills/marc-frontend/IMPROVEMENTS.md) |
| 2026-09-13 | Captain, crew and controller | Established a standalone source/catalogue layout with consumer-owned configuration and pinned installation. | [Layout and migration boundaries](docs/repository-layout.md) |

This starts MARC's standalone history. Prior consumer reports, approvals and operational ledgers stay in their original repositories and are not imported. Local validation and publication status belong in the extraction record; a source move does not establish hosted CI or live activation. Each member owns an improvement register; the later specialist entry records the routing change separately from extraction.

## Component registers

- [React](skills/marc-react/IMPROVEMENTS.md)

- [marc](skills/marc/IMPROVEMENTS.md)
- [marc-code-quality](skills/marc-code-quality/IMPROVEMENTS.md)
- [marc-correctness](skills/marc-correctness/IMPROVEMENTS.md)
- [marc-repair](skills/marc-repair/IMPROVEMENTS.md)
- [marc-security](skills/marc-security/IMPROVEMENTS.md)
- [marc-simple-tests](skills/marc-simple-tests/IMPROVEMENTS.md)
- [marc-simplicity](skills/marc-simplicity/IMPROVEMENTS.md)
- [marc-test-integrity](skills/marc-test-integrity/IMPROVEMENTS.md)
- [Shared controller and installation](src/quality/IMPROVEMENTS.md)
