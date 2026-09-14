# Harness setup and independent review

MARC's canonical skills and Node.js controller are shared. A harness supplies discovery, shell/file access, independent agent sessions and any required candidate isolation. Installing a skill proves none of the other capabilities. Use Node.js 24+, Git and the consumer's authenticated GitHub CLI on the trusted controller; keep candidate execution isolated as required by the Captain.

## Discovery and handoffs

| Harness | Installer selection | Project discovery | Independent review |
| --- | --- | --- | --- |
| Codex | Default or `--hosts codex` | `.agents/skills` | A fresh collaboration subagent with `fork_turns: "none"` where available; apply resolved model/reasoning selections below. |
| Claude Code | `--hosts claude-code` | `.claude/skills` | A new non-fork subagent via the available Agent tool; explicitly supply canonical skill and evidence paths because parent skill loading is not inherited. |
| Cursor | `--hosts cursor` | `.agents/skills` | A new subagent with clean context; pass the same explicit handoff and collect its actual identity and result. |

Select multiple hosts with a comma-separated list. Cursor supports `.agents/skills` and also reads `.claude/skills`; identical wrappers must lead to the same canonical skill. If customizations disagree, report the conflict and resolve it through the consumer's existing setup process before operating. Do not assume which duplicate wins. Do not copy the review logic into harness-specific agents or rules.

Each handoff includes the verified consumer/bundle paths, captured source/base/policy identity, gate name, canonical skill and sibling references, relevant frozen source and CI evidence, read-only review scope, and one external result path. Each specialist also receives its member version/hash and selection hash. The reviewer reads the canonical instructions explicitly. Keep implementation conclusions out of the handoff as authority. A host's built-in agent name is not a reviewer session ID.

Use the actual session/agent identifier returned by the host or its execution record for `reviewer`, and record the actual Captain identity in `coordinator`. Keep repair-session identities in the shared ledger. Never invent IDs, substitute role names, resume a previous reviewer for a new gate/candidate, or approve in the Captain's own context. If the host cannot expose the required identities or launch independent sessions, stop with that prerequisite. Preserve configured model/reasoning; do not silently substitute a faster built-in exploration model. Reviewers need only source/evidence reads and their result output, not merge authority or candidate execution permissions.

Tool limits may require serial fresh reviewers. Retain the same shared run lock and cumulative budgets across harnesses; changing harness does not reset a run or authorize concurrent Captains. Changes to source, base, bundle or policy require fresh evidence. Effective local/global instructions and host permissions must be inspected separately from the tracked policy digest; contradictory instructions are a hold. Harness migration does not authorize publication, merge, deployment, scheduling or broader permissions.

## Model selection at dispatch

Use `agentSelections[<role-id>]` from trusted `marc config` for every reviewer, simplicity session and authorized repair (strip `crew:` from specialist gate names). Each model/reasoning selection has a `source` and `value`. `member` and `default` values must be passed through the host's actual spawn controls, not just written in a prompt. For Codex pass `model` and `reasoning_effort` with `fork_turns: "none"`; for other harnesses use their supported equivalent. Check availability of both values in the running harness before dispatch. An unavailable override or inability to honor it is a hold, never a silent fallback.

For `captain`, preserve the Captain's setting using verified host inheritance or explicit known values; do not assume a built-in role inherits it. For `model-default`, use the selected model's harness default reasoning and do not carry an incompatible Captain effort across. Omitted `agents` requires no model configuration. Keep setup examples optional; never populate default consumer model settings. See the brief [JSON guide](../../../docs/configuration.md#optional-crew-model-overrides).

The Captain attaches `execution` to each gate and routing result, and appends `{ reviewer, execution }` to `repairExecutions` for each repair, retaining history across recaptures. Copy the resolved selection into `execution.settings`. Set `applied: true` only after a host spawn/execution record confirms application or supported inheritance, and put a reference to that record in `evidence`. Record host-exposed values under `actual: { model, reasoningEffort }` and, when known, the Captain's values under `captain` using the same keys. Omit unknown actual values; reviewer self-identification is not host evidence. A rejected or mismatching selection remains a hold. The report's final Crew used table includes these sessions and visibly distinguishes inheritance, configured defaults, overrides and unconfirmed values; include this table in the final chat even when shortening the rest of the report.

## Token consumption

Record each session's observed token consumption under `execution.usage` as `{ inputTokens, cachedInputTokens, outputTokens }` when the host exposes it. Use `inputTokens` for input the model processed fresh, including cache writes, `cachedInputTokens` for input served from cache, and `outputTokens` for generated tokens, including reasoning. Copy whole numbers from the host's own record for that exact session; never estimate, extrapolate from another session, ask the reviewer to self-report, or convert to money. Omit `usage`, or any count the host does not expose, rather than filling a gap.

Claude Code keeps per-message `usage` for each subagent in its transcript, observed at `<user transcript directory>/<project>/<parent session>/subagents/agent-<id>.jsonl`, where the file name carries the same agent identifier recorded as `reviewer`; sum that session's records. Codex and Cursor expose per-session usage through their own records. Confirm the location and field meanings in the running harness version before recording, and omit the field when unavailable.

Consumption is cost and capacity visibility, not evidence quality. It never becomes a gate, threshold, budget or review criterion, and a large or small count neither supports nor undermines a verdict. A malformed recorded count is rejected; an absent one is reported as not exposed. Reports show per-session and total counts rounded for reading, with exact values in the adjacent JSON. The Captain's own coordinating session is still running when the report is written, so it is excluded from the total; report it separately in chat if the host exposes it.

## Verification and evidence limits

Local Node regressions exercise default Codex installation, additive Claude installation, shared Cursor paths, preservation/replacement, pin rejection, rollback and tracked instruction digest changes. They do not launch models or prove skill discovery in a live harness.

When a live harness smoke check is explicitly authorized, use a synthetic pinned consumer in report-only mode:

1. Record harness version/mode and installer command. Confirm the Captain is discoverable (for example `/marc-crew-captain` in Claude Code); inspect duplicate discovery if multiple host directories exist.
2. Invoke only an installation check: verify the bundle and read the canonical Captain and a sibling reference. Confirm paths and pin; do not process a real PR.
3. Ask for two fresh read-only synthetic reviews with different bounded inputs. Retain actual Captain/reviewer identities, separate results and evidence that neither reviewer inherited the other's conversation. Verify unavailable capabilities produce a hold.
4. Record discovery, canonical loading and independent-session results separately. No live merge, hosted CI, model quality claim or automatic authority follows from this smoke check.

Live Codex, Claude Code and Cursor smoke results are not claimed by this change. Required operational capabilities must be checked in the installed harness version/mode before a real run.

## Official references

Checked 2026-09-13: [Claude Code skills](https://code.claude.com/docs/en/skills), [Claude Code subagents](https://code.claude.com/docs/en/sub-agents), [Cursor skills](https://cursor.com/docs/skills), [Cursor subagents](https://cursor.com/docs/subagents). These document discovery and context isolation; actual MARC handoff and identity compatibility still requires the checks above.
