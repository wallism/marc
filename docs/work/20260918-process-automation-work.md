# Event-driven intake and cloud execution

Date: 2026-09-18

Status: Proposed future work; no implementation or activation authorized by this document.

## Objective

Start MARC when eligible pull requests need attention and allow the full process to run without a developer's machine being awake. Preserve the Captain's existing review, repair, evidence and guarded-action contracts while keeping the trigger and execution host replaceable.

The current operating arrangement discussed is a scheduled run on a developer machine using Codex. The proposals below cover both improving intake and moving execution to the cloud. Consumer identities, credentials, actual schedules and operational records belong outside this reusable repository.

## Existing foundations

MARC already defines queue admission, a shared run lock, durable run records, cumulative budgets and evidence bound to source, base and policy identities. These remain authoritative. A notification is a request to inspect current repository state, not evidence or permission to review, repair or merge a candidate.

Relevant contracts:

- [Captain process](../../skills/marc-crew-captain/SKILL.md)
- [Harness capabilities and independent sessions](../../skills/marc-crew-captain/references/harnesses.md)
- [Consumer configuration and durable state](../configuration.md)
- [Installation and pinned bundles](../installation.md)

## Intake options

| Option | Operation | Trade-off |
| --- | --- | --- |
| Lightweight polling | A service checks GitHub periodically, for example every 60–120 seconds, and launches an agent only for actionable work. | Simple initial implementation; detection delay and API usage. A local installation still depends on that machine. |
| GitHub webhook | A receiver validates deliveries and records work for a worker to process. | Prompt detection; requires a reachable receiver, authentication, durable delivery handling and reconciliation. |
| GitHub Actions events | Repository events start a trusted dispatch or processing workflow. | Native repository integration; workflow permissions, concurrency, persistence and interruption handling need explicit design. |
| Managed app events | Eligible hosted tasks respond to supported GitHub activity. | Least custom trigger infrastructure if the account and execution environment meet MARC's requirements. |

Initially cover PR opening, reopening, readiness after draft and source commit updates. Define handling for closure, draft conversion, base changes, relevant CI completion and explicit retries. Existing active runs should continue waiting for CI according to the Captain contract; an event must not start a second Captain for the same work.

Reconcile at startup and periodically so missed events, downtime and changed prerequisites do not strand work. Keep reconciliation quiet when nothing actionable changes.

## Execution options

### Built-in Codex cloud and hosted tasks

Codex cloud provides isolated coding environments and a GitHub integration with automatic PR reviews. Automatic Code Review is a useful review capability, but does not by itself prove support for the complete MARC workflow.

Documentation checked during this discussion on 2026-09-18 also describes GitHub event-triggered tasks on eligible ChatGPT web/mobile plans. Those tasks can use available skills and connected tools, but do not retain a local folder or worktree between runs. Availability in the intended account and compatibility with MARC remain unverified.

Before choosing this route, demonstrate trusted bundle loading, shell and GitHub access, independent reviewer identities, model selection, persistent shared state, candidate isolation and guarded publication/merge operations. A successful single review is insufficient proof of full compatibility.

### GitHub Actions with Codex

The official Codex GitHub Action runs Codex from workflow events. Its documented API-key setup requires budgeting for model API usage separately from runner usage; do not assume an existing desktop subscription covers it.

Standard hosted runners provide fresh execution environments. MARC would need a durable authoritative store for records and budgets, plus coordination that survives runner termination. Workflow artifacts or caches alone should not be treated as a transactional ledger or lock. Repository-wide workflow concurrency can supplement that coordination, but does not replace recovery or reconciliation.

Load the controller, prompts, skills and policy from verified trusted sources. Candidate-controlled workflow or instruction changes must not acquire controller credentials or authority. Keep privileged publication and merge operations separate from candidate execution.

### Dedicated cloud worker

A dedicated Linux VM with persistent storage is the closest architectural match to the current filesystem-based controller and state model. Azure or another VM provider could host it. This is the provisional recommendation for migrating the full existing process with limited redesign, subject to a capability trial and cost review.

Install Node.js 24+, Git, GitHub CLI, the pinned MARC bundle and the chosen agent harness. Run a supervised worker service, retain state on persistent storage, and provide backups, logs and failure notifications. Use isolated environments for any candidate execution; a separate Git worktree is not a security boundary.

A container worker with external durable storage and a queue is another option if operational needs justify more infrastructure. A short-lived function can receive events, while a suitable worker owns long-running reviews and CI waits.

## Proposed integration boundary

```text
PR activity / reconciliation
            |
            v
Trusted intake -> durable pending work -> one Captain per repository
                                             |
                                             v
                              Existing MARC review and action process
                                             |
                                             v
                              Reports, run state and notifications
```

The trigger adapter receives only enough information to identify potential work. The worker re-fetches repository state and applies trusted admission policy before launching the Captain. A harness adapter supplies the actual execution mechanism, such as Codex CLI non-interactive mode, without duplicating MARC's review rules.

Required behavior:

- Validate webhook signatures and permitted repositories; treat event bodies and PR prose as untrusted data.
- Persist pending work before acknowledging accepted delivery; deduplicate delivery IDs and coalesce repeated candidate notifications.
- Preserve distinctions between pending, running, incomplete, held and completed work. Discovery or dispatch is not completion.
- Coordinate all launch paths with the existing shared run lock and ledger. Define dispatcher ownership so it does not take a lock the Captain then cannot acquire.
- Recheck current source, base, policy and bundle identity before reusing evidence or taking guarded actions.
- Recognize MARC's own report and repair commits through existing trusted records, avoiding review loops without ignoring meaningful source changes.
- Preserve cumulative repair/recovery budgets across retries, restarts and harness changes.
- Record interrupted runs as incomplete and provide a bounded resume path. Do not automatically break a stale lock or blindly repeat an uncertain merge.
- Notify on meaningful changes, completed work, failures or required decisions; stay quiet on unchanged holds.

## Delivery sequence

1. **Capability and cost check.** Compare the available managed cloud offering, GitHub Actions and a VM against the harness contract. Confirm authentication, model availability, independent sessions, storage, isolation and expected operating costs. Select a host based on evidence.
2. **Report-only trial.** Use a synthetic consumer and pinned bundle to prove independent reviews and a valid report. Test restart persistence and conflicting dispatches. Live model trials require separate explicit authorization.
3. **Trigger and recovery implementation.** Add the selected intake adapter, durable dispatch state and reconciliation. Start with manual dispatch for diagnosis, then exercise PR events and interruption recovery.
4. **Consumer migration.** Quiesce the local schedule and ensure no active run remains. Back up and migrate the authoritative state, preserving spent budgets and source/report identities. Verify the cloud controller before enabling intake. Keep only one operational owner.
5. **Authorized activation.** Enable the consumer's existing approved operating mode only after the trial passes. Hosting changes do not grant additional repair, publication, merge or deployment authority.

Rollback stops and quiesces the cloud worker, reconciles uncertain remote actions, and returns the latest authoritative state to the local controller before its schedule is resumed. Never restore an old ledger that loses spent budgets or completed actions.

## Acceptance criteria for implementation

- An eligible PR triggers processing without a developer machine; drafts and ineligible PRs follow policy.
- Duplicate deliveries and concurrent launch paths do not produce concurrent Captains or duplicate reports.
- Missed events and restarts are reconciled without losing pending work or resetting budgets.
- Independent reviewers have real session identities and apply the configured model/reasoning selections.
- Source, base or policy changes invalidate stale evidence; report-only commits and meaningful repairs are handled correctly.
- CI pending, CI failure, authentication loss, model limits and unavailable isolation remain truthful waits or holds.
- A crash around publication or merge causes remote-state verification before retry.
- Local-to-cloud cutover and rollback preserve a single authoritative ledger and operational owner.
- Focused Node tests cover dispatch/state behavior with mocked boundaries. Report local tests, live harness proof, hosted checks and consumer activation separately.

## Decisions still required

- Execution host and whether built-in managed tasks satisfy the full harness contract.
- Polling, webhook or workflow trigger, and reconciliation cadence.
- Authentication, approved action permissions and notification destination.
- Durable state location, backup/recovery arrangements and service ownership.
- Model and infrastructure budgets, retention and any required browser runtime.

## Sources and verification limits

These sources were consulted in the discussion on 2026-09-18. Recheck availability and documentation before implementation; no account-specific cloud trial, deployment or migration has been performed.

- [Codex cloud](https://learn.chatgpt.com/docs/cloud)
- [Codex GitHub review integration](https://learn.chatgpt.com/docs/third-party/github)
- [Scheduled and event-triggered tasks](https://learn.chatgpt.com/docs/automations?surface=app)
- [Official Codex GitHub Action](https://learn.chatgpt.com/docs/github-action)
- [Codex non-interactive execution](https://learn.chatgpt.com/docs/non-interactive-mode)
- [GitHub webhook events](https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request)
- [GitHub webhook practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks)
- [GitHub-hosted runners](https://docs.github.com/en/actions/concepts/runners/github-hosted-runners)
- [GitHub workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)

This document records future work only. Material process changes should update the affected component register and root improvement register when implemented; this planning document does not claim those capabilities are active.
