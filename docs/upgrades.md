# Reusable upgrade PRs

Leave `autoUpdate: false` and keep MARC upgrades in a dedicated maintenance PR. Updating during ordinary PR intake mixes tool and configuration changes into feature work, adds CI/review churn and can trigger sensitive-path human approval. Developers can use their own scheduler or run this command whenever they want an upgrade:

```powershell
node .marc/tool/src/quality/upgrade.cjs --repo C:/path/to/trusted-consumer
```

This command writes to GitHub: it pushes the upgrade branch and creates a PR if needed. It is independent of the `autoUpdate` setting. It does not install a schedule. Use Node.js 24+, Git with commit author identity configured, and authenticated GitHub CLI/Git credentials able to read upstream Actions evidence and write the consumer branch and PR. Scheduled runs must have those credentials available without an interactive prompt.

Run the script **from the clean, pinned MARC bundle on the clean current trusted consumer target branch**, with `--repo` naming that checkout. The normal controller checks the origin, target branch and installed pin. Before each run, safely fast-forward that trusted checkout and initialize `.marc/tool` to its recorded gitlink. If it has local work, use a separate clean controller checkout. Never check out the proposed upgrade branch or execute its controller to run this command. A stale or dirty trusted checkout stops the command; it does not stash or reset work.

## One branch and one open PR

The default branch is `codex/marc-upgrade`. Choose a different stable name once if your workflow needs one:

```powershell
node .marc/tool/src/quality/upgrade.cjs --repo C:/path/to/trusted-consumer --branch deps/marc-upgrade
```

Keep using the same branch name and the same persistent, operator-controlled MARC state directory on later runs, including across scheduler hosts. Changing names creates separate upgrade streams. The command does not add itself to the consumer's producer policy: if Captain should process the PR, the authenticated PR author and chosen branch prefix must already be authorized by that policy. Creating a PR grants no merge authority.

- With an available upgrade, the command resolves upstream `master` and requires the latest exact-commit push run plus successful Linux and Windows Node build/test jobs. Missing, pending, failed or unavailable evidence stops the run; it does not pick an older green commit.
- Test evidence accepts the current `Tests with review evidence` step or the legacy `Run npm test` name. Exactly one matching step must succeed per platform; duplicate, skipped, pending or failed steps still stop the upgrade.
- The first run creates the branch and PR. Later runs append newer pin, existing member-version and generated integration changes to that same branch, which updates the existing PR automatically. The PR number, title, discussion and human-edited body remain intact. The trusted renderer reads fetched Git objects; it never executes fetched code.
- An unchanged pin produces no commit or push. A retry after a successful push but failed PR creation discovers the branch and creates or reuses the PR. Ownership and pending-push records live under the resolved state directory's `upgrade-pr/` folder. Preserve that folder between runs; do not reconstruct ownership from candidate PR prose.
- After the PR merges, the next available upgrade reuses the branch name and creates a new PR. If the old branch still exists, an ordinary merge-shaped commit includes both the current target and previous branch as parents, with the new upgrade based on the target tree. This also supports squash merges without force pushing. If GitHub deleted the merged branch, it is recreated.
- A PR closed without merging is a hold: reopen it to resume the same PR. An existing branch without an ownership record, a divergent branch, ambiguous PR identity or a concurrent conflicting push also stops for inspection. The script never claims an unrelated branch, force pushes or deletes a branch.

While a PR is open, newer target-branch commits are not automatically merged or rebased into it. Updates append to its existing source and preserve added operator work and historical reports. Resolve any target conflicts through your normal workflow; then recapture the current source/base/policy identities. Customized forwarding files or incompatible generator changes require an explicit installation migration rather than overwriting them.

## Scheduling and approval

Use your existing CI scheduler, task runner or local scheduling tool. A weekly run is a reasonable starting point for fewer review interruptions; daily runs keep the pending PR fresher. Persist the state directory and serialize runs for a repository. The command acquires the same exclusive `runLock` as Captain, refuses an existing lock, and releases only its own lock. Do not automatically remove abandoned locks; inspect them. `--help` prints usage. Successful runs emit JSON with `status` (`current`, `updated`, or `created` when recovering PR creation without a new push), the verified upstream `commit`, consumer `head` and PR number/URL when applicable. Errors exit nonzero; schedulers can notify on errors or changes and stay quiet for `current`.

Every newer source commit invalidates source-bound review evidence and any prior exact approval. Base or policy changes likewise require fresh capture and an explicit new approval decision when the human gate applies. Show the new diff and identities to the operator; never copy an old approval to the new source or expand its scope. Existing approvals, run records, completed keys, repair/recovery budgets and historical reports remain untouched. See the [operator approval contract](operator-approval.md).

All consumer CI, independent review, scans, browser checks, report integrity and guarded merge safeguards remain in place. After the upgrade passes those gates and merges, deliberately fast-forward the trusted controller target branch and initialize its submodule before executing the new bundle. The upgrade command neither merges nor activates its proposed pin and never deploys. “Latest upgrade proposed” and “latest version installed” are separate outcomes.
