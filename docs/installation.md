# Pinned consumer installation

MARC uses one pinned skill catalogue and Node.js controller across harnesses. The installer supports project-local forwarding skills for Codex and Claude Code; Cursor uses the same discovery directory as Codex. GitHub Actions is the implemented CI provider. Local installer checks do not establish live harness compatibility; see [harness setup and verification](../skills/marc-crew-captain/references/harnesses.md). The optional browser adapter is ASP.NET/.NET 10-specific.

## Setup

If you arrived from skills.sh, start with the Captain's [getting-started reference](../skills/marc-crew-captain/references/getting-started.md). It is packaged with the Captain so the setup handoff also works when only that skill folder was downloaded.

First run the [setup prompt](setup-prompt.md). Confirm the target repository, policy, guidance, CI requirements, state locations, exception paths and operating authority. The prompt creates consumer configuration only after confirmation. MARC source stays generic.

Use a complete pinned Git checkout. From the consumer repository, add the bundle and select an immutable published commit:

```powershell
git submodule add https://github.com/wallism/marc.git .marc/tool
git -C .marc/tool checkout <full-MARC-commit>
git add .marc/tool .gitmodules
node .marc/tool/scripts/install-consumer.cjs --repo .
node .marc/tool/scripts/install-consumer.cjs --repo . --apply
```

The default remains Codex-compatible `.agents/skills`. For both Codex and Claude Code, use the same host selection for preview and application:

```powershell
node .marc/tool/scripts/install-consumer.cjs --repo . --hosts codex,claude-code
node .marc/tool/scripts/install-consumer.cjs --repo . --hosts codex,claude-code --apply
```

`--hosts claude-code` installs `.claude/skills`; `--hosts cursor` uses `.agents/skills`. Combining Codex and Cursor emits that directory once. Host selection controls only which forwarding files this invocation maintains; it is not saved in runtime configuration. Record the chosen command in the consumer README and reuse it on reruns/upgrades. Omitting a previously selected host never removes its files. All wrappers reference the same verified bundle, and ordinary reruns preserve differing files. Cursor also discovers Claude skills: when both directories exist, verify same-name discovery resolves to the same pinned instructions and disclose conflicting customizations before operation. Do not add a third copy under `.cursor/skills`.

The first installer invocation previews files with `created`, `updated`, `unchanged`, `preserved` and any bundle `upgrade`. Ordinary `--apply` reruns add missing forwarding files and preserve differing existing files. Unchanged files and already-pinned configuration keep their exact bytes and timestamps. First installation adds `toolCommit`; an existing different pin blocks application until an approved upgrade. The installer does not fetch upstream or decide which release is newer; the setup prompt performs that comparison read-only.

Use `--replace-existing` with `--apply` only after reviewing and approving a migration or upgrade. It replaces differing named command and skill forwarding files and updates the pin, so review customizations first. It does not create authority, change policy, import exceptions, move state, publish anything or run a review. Preserve uncommitted user work before setup. Missing discovery files do not automatically activate `crew.members`.

Commit the gitlink, `.gitmodules`, configuration and forwarding files together. Subsequent clones use `git submodule update --init -- .marc/tool`. Local development in the MARC source repository is separate from the pinned consumer submodule; updating one does not silently upgrade the other.

Verify with:

```powershell
node scripts/quality/bundle.cjs
node scripts/quality/marc.cjs --repo . config
```

The bootstrap verifies the Git submodule pin, configured `toolCommit`, actual commit and clean bundle before importing executable code. The controller separately verifies the consumer checkout before operational actions. Skills retain their names in the selected discovery directories and forward to the verified `skills/` catalogue in the bundle. No review logic is maintained twice. Listing or installing a skill from the catalogue alone does not install the controller.

Tracked consumer harness inputs under `.agents`, `.claude`, `.cursor` and `.codex`, including nested directories, plus `AGENTS.md`, `CLAUDE.md` and legacy `.cursorrules`, enter the trusted policy digest. Changes invalidate previous approvals; symlinked inputs are rejected. Keep local credentials and operational state out of tracked harness directories. Setup must separately inspect effective user/global instructions and permissions, which are outside that repository digest. Preserve or explicitly approve sensitive-path coverage for all installed harness inputs; adding discovery files never grants merge authority.

Installer and bootstrap repository checks resolve Windows 8.3 short paths to their native long spelling before comparing with Git. A short-path temporary directory is supported; a subdirectory passed as the consumer root is still rejected. Existing consumers receive the bootstrap correction when deliberately regenerating forwarding files with the upgraded pinned bundle and `--apply --replace-existing`.

## Skills.sh discovery

Start with `marc-crew-captain`; the [README quickstart](../README.md#install-and-run) installs it in a separate starter directory. CLI `--agent` selects where the downloaded instructions go. MARC installer `--hosts` selects consumer forwarding files later; they are different options for different stages. Claude Code, Codex and Cursor all use the same pinned controller after setup.

For an existing consumer, use its setup rerun workflow directly. Avoid installing catalogue copies over its forwarding files. If that has already happened, inspect the preview and customizations before a reviewed replacement as described in [getting started](../skills/marc-crew-captain/references/getting-started.md). Updating the skills CLI's downloaded copies does not upgrade the consumer's bundle or authorized member versions.

The [skills.sh FAQ](https://skills.sh/docs/faq) says leaderboard listings arise automatically from installs through `npx skills add <owner/repo>`, with ranking based on installation telemetry. No separate leaderboard submission is documented. The source stays in [wallism/marc](https://github.com/wallism/marc); the README badge links to its directory page. A badge is not proof of indexing or endorsement.

Before promoting a release, publish the reviewed setup changes to the public source, verify `npx skills add wallism/marc --list` exposes the current names, and verify a clean Captain installation includes `references/getting-started.md`. Then check the directory page after genuine user installs. Local-path checks do not establish that GitHub has the changes or that skills.sh has indexed them. Do not manufacture installs to affect ranking. The [CLI reference](https://github.com/vercel-labs/skills) documents selection and telemetry controls.

## Hosted CI

Initialize the exact consumer gitlink during checkout with `submodules: true`; do not follow the MARC branch tip. Existing `scripts/quality/scans.cjs` calls forward to the pinned scanner and read the consumer configuration, including its own ignore file. Run shared tests from `.marc/tool/src/quality` and consumer tests from their own location. Preserve the consumer's required jobs, artifact names, checkout history and pinned scanner/version checks.

MARC's own [contribution workflows](contribution-checks.md) run Node checks on branch pushes and catalogue/scenario checks on PRs. These workflows are for this tool repository; they are not a consumer CI adapter and do not emit the consumer scan/evidence artifact contract. Consumer installations retain their own required jobs and artifacts. A cancelled or waived hosted check is not a pass. The one-time extraction waiver does not disable ordinary consumer PR assurance requirements.

## Upgrade and rollback

### Automatic updates

**Automatic updates are on by default (`autoUpdate: true`, including when omitted).** Unless you set `autoUpdate: false` in the consumer's trusted `.marc/config.json`, every `queue` and `capture` invocation checks `https://github.com/wallism/marc.git` for the exact current `refs/heads/master` SHA. This follows master source, not release tags or a cached version number; it does not claim that an upstream build passed. Source-repository development without an external `toolCommit` does not self-update.

Before `capture`, the controller automatically commits and pushes the latest integration to that eligible PR's existing branch. It updates the `.marc/tool` gitlink, matching `toolCommit`, versions of already-configured crew members in `.marc/config.json`, and generated command/skill forwarding files. It preserves other settings and does not activate additional members. It uses an isolated Git index without checking out or executing PR code or the fetched installer. The commit has the observed PR head as its sole parent; a non-force push rejects a concurrent divergent change. Capture then reads the new live head and requires fresh exact-head CI and review evidence. Queue discovery checks availability without updating every listed PR.

**Expect extra MARC files in your PR's changed-files list.** An update can add new discovery files and refresh existing integration files, not just change a hash. The update result lists the exact paths so reviewers can recognize why they are present. The bundle and configuration are under `.marc/`; generated command files are under `scripts/quality/`, and skill forwarding files are under `.agents/skills/marc-crew-*/` and/or `.claude/skills/marc-crew-*/`. Existing discovery directories are retained; an installation with none uses the Codex/Cursor `.agents/skills` default. Source files inside the Git submodule normally appear in the consumer PR as a gitlink change rather than individual copied files. If the additional PR changes become distracting, set `autoUpdate: false` on the trusted target branch to opt out.

**The update belongs on the PR branch; the active controller pin belongs on the trusted target branch.** The current controller reviews the pin change using its existing trusted instructions. After the PR passes the existing gates and merges, fast-forward the controller target branch and initialize its submodule to adopt the new version. Never execute the PR's controller as the authority reviewing that same PR. Opt-out changes likewise take effect when on the trusted target branch. Automatic updates do not grant merge authority or bypass sensitive-path holds; they apply to eligible capture requests even in report-only mode.

An upstream/network error stops intake with an error rather than treating availability as current. Forks, drafts, unregistered producers, target-branch writes, mismatched pins, changed submodule routing, incompatible members, custom forwarding-file conflicts, and symlink collisions are refused. The trusted renderer generates integration files from upstream data; changes to that renderer itself need the explicit installation migration below. Removed catalogue members are not silently deleted from consumer discovery. Failed or uncertain pushes require inspecting remote state before retrying. No updates run during `decide`, `report`, `merge` or `recover-ci`, so an in-progress assessment keeps its captured tool identity. Shared locks, reports and cumulative budgets remain unchanged.

Rerun setup to discover missing members and available updates. With automatic updates enabled, ordinary supported pin upgrades need no additional upgrade approval; they use the PR intake path above. New member activation, configuration changes and installation migrations still need the setup proposal. With `autoUpdate: false`, setup may report available upgrades but asks before applying one. All skills and controller code share one bundle pin. Disclose unversioned content changes too.

Fetch and check out the selected full MARC commit inside the submodule, stage its gitlink, preview the installer, then deliberately regenerate changed forwarding files with `--apply --replace-existing`. Commit the updated pin, config and forwarding files together. Verify before activating the new controller.

For rollback, first opt out of automatic updates on the trusted target branch, then restore that same complete integration set from a known consumer commit and run `git submodule update --init -- .marc/tool`. Retain shared locks, recovery reservations, repair counts and historical reports. Recapture evidence after either direction; changed tool/configuration identity invalidates prior approvals. Do not automatically release a foreign lock or reset a budget.

## Skill naming

All published skill directories and frontmatter names use `marc-crew-<name>`, including `marc-crew-captain` and `marc-crew-creator`. Specialist manifest IDs and versions remain stable (for example, `csharp`); the controller resolves them under `skills/marc-crew-<id>`.

When upgrading from the earlier names, regenerate consumer forwarding files with the pinned installer and remove obsolete MARC forwarding files as part of the reviewed integration change. Update saved skill invocations to the new names. The renamed bundle changes trusted identity and requires fresh evidence; this source change does not upgrade consumers or change merge authority.
