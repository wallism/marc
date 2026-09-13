# Pinned consumer installation

MARC currently supports Codex consumer forwarding skills, GitHub Actions and local Node.js execution. The JavaScript suite has been checked on Windows; Unix paths are supported by the resolver but a hosted Linux run is not claimed for the initial extraction. The optional browser adapter is ASP.NET/.NET 10-specific.

## Setup

First run the [setup prompt](setup-prompt.md). Confirm the target repository, policy, guidance, CI requirements, state locations, exception paths and operating authority. The prompt creates consumer configuration only after confirmation. MARC source stays generic.

Use a complete pinned Git checkout. From the consumer repository, add the bundle and select an immutable published commit:

```powershell
git submodule add https://github.com/wallism/marc.git .marc/tool
git -C .marc/tool checkout <full-MARC-commit>
git add .marc/tool .gitmodules
node .marc/tool/scripts/install-consumer.cjs --repo .
node .marc/tool/scripts/install-consumer.cjs --repo . --apply
```

The first installer invocation previews files. Use `--replace-existing` with `--apply` only when deliberately migrating known MARC entry points. It replaces only named command and skill forwarding files, and adds the pin to the existing configuration. It does not create authority, change policy, import exceptions, move state, publish anything or run a review. Preserve uncommitted user work before setup.

Commit the gitlink, `.gitmodules`, configuration and forwarding files together. Subsequent clones use `git submodule update --init -- .marc/tool`. Local development in the MARC source repository is separate from the pinned consumer submodule; updating one does not silently upgrade the other.

Verify with:

```powershell
node scripts/quality/bundle.cjs
node scripts/quality/marc.cjs --repo . config
```

The bootstrap verifies the Git submodule pin, configured `toolCommit`, actual commit and clean bundle before importing executable code. The controller separately verifies the consumer checkout before operational actions. Skills retain their current names under `.agents/skills`, but forward to the verified `skills/` catalogue in the bundle. No review logic is maintained twice. Listing or installing a skill from the catalogue alone does not install the controller.

Installer and bootstrap repository checks resolve Windows 8.3 short paths to their native long spelling before comparing with Git. A short-path temporary directory is supported; a subdirectory passed as the consumer root is still rejected. Existing consumers receive the bootstrap correction when deliberately regenerating forwarding files with the upgraded pinned bundle and `--apply --replace-existing`.

## Hosted CI

Initialize the exact consumer gitlink during checkout with `submodules: true`; do not follow the MARC branch tip. Existing `scripts/quality/scans.cjs` calls forward to the pinned scanner and read the consumer configuration, including its own ignore file. Run shared tests from `.marc/tool/src/quality` and consumer tests from their own location. Preserve the consumer's required jobs, artifact names, checkout history and pinned scanner/version checks.

MARC's own [contribution workflows](contribution-checks.md) run Node checks on branch pushes and catalogue/scenario checks on PRs. These workflows are for this tool repository; they are not a consumer CI adapter and do not emit the consumer scan/evidence artifact contract. Consumer installations retain their own required jobs and artifacts. A cancelled or waived hosted check is not a pass. The one-time extraction waiver does not disable ordinary consumer PR assurance requirements.

## Upgrade and rollback

Fetch and check out the selected full MARC commit inside the submodule, stage its gitlink, preview the installer, then deliberately regenerate changed forwarding files with `--apply --replace-existing`. Commit the updated pin, config and forwarding files together. Verify before activating the new controller.

For rollback, restore that same complete integration set from a known consumer commit and run `git submodule update --init -- .marc/tool`. Retain shared locks, recovery reservations, repair counts and historical reports. Recapture evidence after either direction; changed tool/configuration identity invalidates prior approvals. Do not automatically release a foreign lock or reset a budget.
