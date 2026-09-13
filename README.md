# MARC — Merge Assurance and Review Crew

[![skills.sh](https://skills.sh/b/wallism/marc)](https://skills.sh/wallism/marc)

MARC's Captain coordinates independent PR review, hosted CI evidence, bounded repairs and guarded merges. Each consumer supplies its repository policy, technology guidance and operational configuration.

Start with the [setup prompt](docs/setup-prompt.md), then read the [configuration and command guide](docs/configuration.md). First setup confirms proposed settings. **Automatic updates are on by default:** PR intake checks MARC's latest `master` commit and updates eligible PR branches before review capture. Expect MARC pin and generated integration files in the PR's changed-files list. Set `autoUpdate: false` to opt out if that becomes distracting. The trusted controller adopts the new pin after the PR merges. See [update behavior, file locations and branch ownership](docs/installation.md#automatic-updates).

The [Captain](skills/marc-crew-captain/SKILL.md) leads the simplicity, simple-tests, security, correctness, code-quality, test-integrity and repair skills. Configured [language, framework and front-end specialists](docs/crew.md) supplement the current simple/full routes based on captured source, callers and trusted dependency relationships. Deployment remains separate.

![MARC workflow: independent reviews and relevant specialists, with C# and JavaScript checked as an example selected subset; optional model settings, source and report CI, guarded merge and target-branch CI verification, bounded repair and clear holds. Deployment is separate.](docs/assets/marc-workflow.png)

MARC is for repositories that want independent PR assurance, auditable decisions and bounded repairs while retaining their own policy and CI. Specialists run when relevant; missing evidence holds the PR. [Read the workflow and diagram notes](docs/workflow-infographic.md).

## Which crew members run for a PR?

**Configured specialists are available to the Captain; only those relevant to the PR are selected to run.** A large project can configure many members without calling them all into every review.

For example, a PR affecting only C# and JavaScript selects those two specialists, alongside the core reviews required by its route: focused tests for a valid simple route, or security, correctness, code quality and test integrity for a full route. Unrelated specialists sit that PR out.

The Captain checks the complete diff and affected callers against the captured selection and trusted dependency mappings. Selection considers affected behavior, not just changed file extensions: a C# change affecting Blazor can also require Blazor and front-end expertise. Shared configuration changes or uncertain impact broaden selection; missing required expertise holds the review.

![Example: many specialists are configured, but a PR affecting only C# and JavaScript selects those two plus the core reviews for its simple or full route. Wider impact or uncertainty broadens selection.](docs/assets/marc-crew-selection.png)

See [crew selection rules](docs/crew.md#consumer-selection) and the [infographic notes](docs/crew-selection-infographic.md).

## Crew models and reasoning

By default, crew members use the Captain's model and reasoning settings; no model configuration is needed. You can optionally set crew-wide defaults or per-member overrides in the consumer's `.marc/config.json`. The model and reasoning level must be available in your harness. See the [optional JSON configuration](docs/configuration.md#optional-crew-model-overrides).

Reports end with a **Crew used** table showing each session's model and reasoning selection, including **Same model (Captain)** and **Same reasoning effort (Captain)** when inherited. Overrides and configured defaults are labelled; actual values are shown when exposed by the harness, otherwise requested values are identified as such.

## What setup does

![MARC setup: choose a repository and harness, inspect the source and CI, propose crew and policy, confirm settings, install and configure, then validate and hand off. Missing expertise prompts a separate proposal. Setup does not start PR reviews or authorize merging.](docs/assets/marc-setup.png)

[Read the setup diagram notes](docs/setup-infographic.md).

The [setup agent](docs/setup-prompt.md) is instructed to:

- Inspect the target repository's source, manifests, architecture guidance, tests and CI to identify its technologies and operational requirements.
- Propose appropriate available crew members, exact versions and evidence-backed mappings between repository areas and technologies.
- Explain selected expertise, overlaps, unsupported technologies, uncertainty and omitted specialists.
- Recommend creating or extending members where coverage is missing, with separate approval for that work.
- Identify the intended agent harnesses and preserve existing configuration, customizations, reviewed exceptions and shared operational state.
- Explain default-on automatic updates, their effect on PR files and how to opt out.
- Present the complete configuration for confirmation on first setup; on reruns, present only changes requiring approval. Missing forwarding files can be repaired without another confirmation.
- Apply authorized changes, validate the setup and report unresolved prerequisites and the next invocation.

Setup alone does not start PR processing or authorize automatic merging.

## Install and run

We recommend starting with the supplied skills and process. Once MARC is working well for your team, clone or fork the repository if you want to tailor the skills or workflow to your team or company. Repository-specific policy and settings already belong in your consumer configuration; a maintained fork gives you a place for changes to MARC itself. See [configuration](docs/configuration.md) and [contributing](CONTRIBUTING.md).

**New here? Start with `marc-crew-captain`.** You can use the [setup prompt](docs/setup-prompt.md) directly, or discover the catalogue through [skills.sh](https://skills.sh/wallism/marc):

```powershell
npx skills add wallism/marc --list
```

To install the Captain as a setup entry point, use a separate starter directory outside your consumer repository:

```powershell
mkdir marc-start
cd marc-start
npx skills add wallism/marc --skill marc-crew-captain --agent claude-code --copy
```

Use `--agent codex` or `--agent cursor` for those harnesses, or `--agent codex claude-code` for both. Open that starter directory in your agent and ask: **“Use marc-crew-captain to set up MARC for the repository at <absolute path or URL>, using <your harnesses>.”** The Captain walks through the existing setup and confirmation workflow. After setup, open the consumer repository to use its pinned Captain.

The skills CLI installs the setup instructions; **a working MARC installation also needs the complete pinned bundle and consumer configuration below**. Individual crew skills depend on shared contracts and Captain handoffs. See [catalogue installation and discovery](docs/installation.md#skillssh-discovery) for existing installations and publication details.

Pin the complete Git bundle in the consumer's `.marc/tool` submodule, and use the same full commit as `toolCommit` in its `.marc/config.json`. Initialize the submodule in local checkouts and CI. Expose the catalogue through the consumer host's skill directories using thin forwarding files; keep the actual skill instructions with the pinned bundle. Discovery does not select a specialist: the trusted configuration pins allowed members and versions. See [installation](docs/installation.md).

The installer defaults to Codex-compatible `.agents/skills`, also supported by Cursor. Select `--hosts codex,claude-code` to add Claude Code's `.claude/skills` wrappers alongside it. All harnesses share the same controller, pin and operational state. See [harness prerequisites and verification limits](skills/marc-crew-captain/references/harnesses.md) before running independent reviews.

```powershell
node .marc/tool/src/quality/marc.cjs --repo . config
```

Configuration resolution is read-only and does not establish authorization to run the workflow. Operational commands require a clean current trusted consumer target branch and the clean pinned tool bundle.

## Crew foundations and external skills

The [basic GitHub Actions member](skills/marc-crew-github-actions/SKILL.md) reviews workflows using MARC's existing review and evidence rules. See [selection and scope](docs/crew.md#github-actions).

External skills used as “mercenary crew members” are deferred. MARC currently supports reviewed members shipped in its pinned catalogue; a skill URL does not enlist a reviewer. Revisit mercenaries after establishing how to inspect their dependencies, contain conflicting instructions and bind approval to reviewed content. No external skill safety guarantee or loading mechanism is provided today.

## Gitleaks and consumer exceptions

Secret scans can find credentials in old commits, even after they have been removed from current files. In GitHub, open the repository's **Security and quality → Secret scanning** alerts. Verify that exposed credentials have been replaced where needed and the old values revoked before excluding their historical occurrences from MARC's separate Gitleaks scan. See [reviewing historical secrets](docs/historical-secrets.md) for the steps and official GitHub guidance.

New consumers start with an [empty ignore file](templates/gitleaksignore); reviewed exclusions stay in the consumer repository. See [Gitleaks configuration and CI](docs/configuration.md#gitleaks-exceptions-and-ci) for setup.

## Development

Use Node.js 24 or later and run `npm test`; no npm install or runtime dependency is needed. Source and adjacent tests are under `src/quality`, published skills under `skills`, and synthetic consumers under `examples`. The optional ASP.NET hook requires .NET 10 and an explicit external artifact root. See [repository layout](docs/repository-layout.md), [contributing](CONTRIBUTING.md) and [improvements](IMPROVEMENTS.md).

Every branch push, including a merge to `master`, runs JavaScript syntax checks and the Node suite on Linux and Windows. PRs also validate the complete skill catalogue, replay deterministic assurance scenarios and show a reminder when instruction inputs change. Fork PRs run the Node checks explicitly because their branch pushes do not reach this repository. See [contribution checks and manual prompt evals](docs/contribution-checks.md).

The implemented CI provider is GitHub Actions. Built-in dependency adapters/classifiers cover .NET/NuGet and npm; other technologies use their own hosted checks and confirmed project guidance. The Python example demonstrates configuration, not a Python scanner. Missing required evidence or expertise is a hold.

Prompt evals remain manual; these workflows do not call models or authorize merges. Scheduled MARC self-review requires its own trusted controller configuration and operating authority. MIT licensed; see [LICENSE](LICENSE).

## Infrastructure specialists

[Bicep](skills/marc-crew-bicep/SKILL.md), [Terraform](skills/marc-crew-terraform/SKILL.md) and [ARM templates](skills/marc-crew-arm-templates/SKILL.md) provide lean IaC review, each at version 1.0.0. See [scope, extensions, CNCF/Azure guidance and activation mappings](docs/iac-review.md). These reviewers consume supplied evidence and do not run infrastructure commands.
