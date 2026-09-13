# From skill discovery to a working MARC installation

The Captain is the starting point for MARC (Merge Assurance and Review Crew). Installing this folder with the skills CLI downloads instructions and bundled references. It does not install the Node.js controller, the complete crew or consumer configuration. Individual reviewers depend on the Captain's shared evidence contracts and handoffs; installing one alone does not establish a working review gate.

## Complete setup

1. Establish the explicit target repository path or URL and intended harnesses. Ask for the target when absent; a starter directory or the MARC source repository is not an inferred consumer. Local setup requires Git and Node.js 24 or later. GitHub Actions is the implemented CI provider.
2. Locate an existing MARC installation read-only. Preserve its pin, configuration, wrappers, policy and operational state. If none exists, obtain a complete checkout from [wallism/marc](https://github.com/wallism/marc) separately from the consumer and identify the full published commit to propose. Inspect the source before executing its scripts. If the source is inaccessible, report that prerequisite; do not improvise missing controller files.
3. Read that checkout's `README.md`, `docs/setup-prompt.md`, `docs/installation.md` and `docs/configuration.md`. Follow the setup prompt from the selected bundle as the authoritative setup workflow. It discovers settings, presents the full first-install proposal and waits for confirmation before writing consumer configuration. Existing installations use its focused rerun/upgrade flow. A floating web document or downloaded catalogue copy does not override the installed bundle.
4. Install the complete approved bundle as the consumer's `.marc/tool` Git submodule with matching full `toolCommit`. Use its installer with the selected hosts for both preview and application: `--hosts claude-code`, `--hosts codex`, `--hosts cursor`, or `--hosts codex,claude-code`. Claude Code uses `.claude/skills`; Codex and Cursor share `.agents/skills`. Record the selection for upgrades. Follow the bundle's harness contract for duplicate discovery and effective instructions.
5. If catalogue copies already occupy those names in the consumer, preview and disclose them. Ordinary installer reruns preserve differing files. Review any customizations before an approved `--replace-existing` migration; inspect CLI-created symlinks and remove only the identified conflicting MARC links through a reviewed migration before writing wrappers, never write through them into shared/global skill storage. Preserve unrelated skills and files. A separate starter directory avoids this collision.
6. Verify the consumer bootstrap and configuration using `node scripts/quality/bundle.cjs` and `node scripts/quality/marc.cjs --repo . config` from the consumer root. Load the canonical Captain and shared references from the verified bundle. Check required independent-review capabilities under the intended harness before operation; discovery and local installer checks alone do not prove live harness compatibility.

Setup preserves shared state, locks, cumulative budgets and existing authority. New consumers start with a proposed report-only mode. Missing capabilities remain prerequisites. Setup does not start PR processing, schedule automation, grant merge authority or deploy.

## User prompt

In the agent session where this skill is installed:

> Use marc-crew-captain to set up MARC for the repository at <absolute path or URL>, using <Claude Code, Codex and/or Cursor>. Follow the setup workflow and show the proposed configuration before applying it.

After setup, open the consumer repository in the intended harness and use its pinned Captain entry. Use MARC's approved bundle upgrade workflow for operational updates; `npx skills update` only updates catalogue copies.
