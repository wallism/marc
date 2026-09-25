# Working on MARC

MARC is reusable PR assurance tooling. Its own self-review identity and governance belong in `.marc/`; keep other consumers' identities, all credentials, accepted exceptions and operational state out of this repository. Self-review uses the committed policy from clean current `master`, never candidate-owned governance.

Create a new branch before making changes in this repository. Use the `codex/` prefix unless the user specifies another branch name.

Read README.md and docs/repository-layout.md before structural changes. Runtime modules and their focused tests live together in src/quality; published skills live in skills, with references beside their owning skill. Preserve independent review, immutable source/base/policy identity, guarded actions, cumulative budgets and deployment separation.

Use Node.js 24 or later for local checks. Run focused node tests for changed behavior. The optional ASP.NET browser hook needs .NET 10 and an explicit external artifact directory. Do not run broad application builds, model evaluations or hosted CI unless requested. The initial extraction uses local validation because the owner has exhausted hosted build minutes.

Keep changes focused and update affected documentation. Update the member/component improvement register and root IMPROVEMENTS.md only for material changes to MARC's process, following the root register's scope. Routine documentation, infographic, formatting and repository housekeeping changes do not need entries unless they change how the process operates. Preserve third-party notices. Do not publish, deploy or change a consumer's merge authority merely because packaging changed. Do not delegate to subagents unless the user explicitly asks.
