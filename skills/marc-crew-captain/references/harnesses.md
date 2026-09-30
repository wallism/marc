# Harness setup and independent review

MARC's canonical skills and Node.js controller are shared. A harness supplies discovery, shell/file access, independent agent sessions and any required candidate isolation. Installing a skill proves none of the other capabilities. Use Node.js 24+, Git and the consumer's authenticated GitHub CLI on the trusted controller; keep candidate execution isolated as required by the Captain.

## Discovery

| Harness | Installer selection | Project discovery | Independent review |
| --- | --- | --- | --- |
| Codex | Default or `--hosts codex` | `.agents/skills` | A fresh collaboration subagent with `fork_turns: "none"` where available; apply resolved model/reasoning selections below. |
| Claude Code | `--hosts claude-code` | `.claude/skills` | A new non-fork subagent via the available Agent tool; explicitly supply canonical skill and evidence paths because parent skill loading is not inherited. |
| Cursor | `--hosts cursor` | `.agents/skills` | A new subagent with clean context; pass the same explicit handoff and collect its actual identity and result. |

Select multiple hosts with a comma-separated list. Cursor supports `.agents/skills` and also reads `.claude/skills`; identical wrappers must lead to the same canonical skill. If customizations disagree, report the conflict and resolve it through the consumer's existing setup process before operating. Do not assume which duplicate wins. Do not copy the review logic into harness-specific agents or rules.

## Handoffs

Give each reviewer a self-contained generated review brief. It carries the gate objective, verified consumer/bundle paths, immutable source/base SHAs and policy digest, the trusted gate skill, common reviewer contract and sibling references, intent, compact scope, CI facts, the frozen diff, read-only constraints and one external output path; specialists also receive member version/hash and selection hash. The reviewer reads the canonical instructions explicitly; Claude Code and Cursor subagents read the brief as their first action because parent skill loading is not inherited. Small starting context must not restrict necessary investigation.

The spawn message names only the brief path (or its ordered `briefParts`, below), the actual host session ID requirement and essential user constraints, including tenant/security/data rules and existing user decisions a fresh agent cannot infer. Never paste brief, diff or log contents into the message or open them in the Captain context: that repeats them as Captain output and history. Keep implementation conclusions out of the handoff as authority. A host's built-in agent name is not a reviewer session ID.

Every brief in a packet set begins with a byte-identical shared prefix (recorded as `sharedPrefix` in `captain-handoff.json`) and ends with the gate-specific part. Prompt caches match exact prefixes per model, so cross-session reuse happens only where a host starts the fresh session with the brief bytes as its initial prompt; a read tool call after a gate-specific message does not share. Use such an initial-prompt mode only when it also satisfies the identity, fresh-context, model/reasoning and read-only requirements here.

Where a host caps a single read below the brief size (Claude Code's Read stops near 25k tokens), give the reviewer its ordered `briefParts` instead of the brief path, stating each part's line count from `briefPartLines` (for example "part 1: 499 lines"), because hosts show an empty numbered line after a final newline and readers otherwise page past a complete part. The parts concatenate to the exact brief, each fits the configured part size, and all but the last are the same files for every gate.

## Dispatch

Warm-start: start the first session alone (the [risk assessor](../../marc-crew-risk/SKILL.md) when trusted policy enables `riskAssessment`, otherwise the first required read-only reviewer), then every remaining reviewer together once its first model call has completed, up to the host's available slots. Caches are written when a request completes, so sessions started at the same moment cannot share even an identical system prompt ([measured basis](../../../docs/work/20260927-token-efficiency-work.md)). Launch every reviewer the same way (in Claude Code, all as background agents): sessions launched differently have different prompts and share no cache. Then wait once for all of them with the host's blocking wait or completion notifications rather than polling, and start remaining gates in fresh sessions as slots free. A capacity or tool limit means waiting for a slot or running fresh reviewers serially, never skipping a gate or reusing another reviewer's conversation. Serialize shared browser/session access; a required browser gate still gets its own agent.

Keep independent reviews free of other reviewers' conclusions until each has returned its own verdict. Each agent writes only its assigned external gate JSON and returns a terse verdict, blocking findings and artifact path; it does not write the shared evidence JSON or PR files. MARC validates the captured identities, reads these compact results and consults detailed artifacts only to resolve findings or conflicts. Do not paste exploration transcripts or bulk logs into the Captain context.

## Identities and limits

Use the actual session/agent identifier returned by the host or its execution record for `reviewer`, and record the actual Captain identity in `coordinator`. Keep repair-session identities in the shared ledger. Never invent IDs, substitute role names, resume a previous reviewer for a new gate/candidate, or approve in the Captain's own context. If the host cannot expose the required identities or launch independent sessions, stop with that prerequisite. Preserve configured model/reasoning; do not silently substitute a faster built-in exploration model. Reviewers need only source/evidence reads and their result output, not merge authority or candidate execution permissions.

Retain the same shared run lock and cumulative budgets across harnesses; changing harness does not reset a run or authorize concurrent Captains. Changes to source, base, bundle or policy require fresh evidence. Effective local/global instructions and host permissions must be inspected separately from the tracked policy digest; contradictory instructions are a hold. Harness migration does not authorize publication, merge, deployment, scheduling or broader permissions.

## Model selection at dispatch

Use `agentSelections[<role-id>]` from trusted `marc config` for every reviewer, simplicity session and authorized repair (strip `crew:` from specialist gate names). Each model/reasoning selection has a `source` and `value`. `member` and `default` values must be passed through the host's actual spawn controls, not just written in a prompt. For Codex pass `model` and `reasoning_effort` with `fork_turns: "none"`; for other harnesses use their supported equivalent. Check availability of both values in the running harness before dispatch. An unavailable override or inability to honor it is a hold, never a silent fallback.

For `captain`, preserve the Captain's setting using verified host inheritance or explicit known values; do not assume a built-in role inherits it. For `model-default`, use the selected model's harness default reasoning and do not carry an incompatible Captain effort across. Omitted `agents` requires no model configuration. Keep setup examples optional; never populate default consumer model settings. See the brief [JSON guide](../../../docs/configuration.md#optional-crew-model-overrides).

The Captain attaches `execution` to each gate and routing result, and appends `{ reviewer, execution }` to `repairExecutions` for each repair, retaining history across recaptures. Copy the resolved selection into `execution.settings`. Set `applied: true` only after a host spawn/execution record confirms application or supported inheritance, and put a reference to that record in `evidence`. Record host-exposed values under `actual: { model, reasoningEffort }` and, when known, the Captain's values under `captain` using the same keys. Omit unknown actual values; reviewer self-identification is not host evidence. A rejected or mismatching selection remains a hold. The report's final Crew used table includes these sessions and visibly distinguishes inheritance, configured defaults, overrides and unconfirmed values. The Captain shows this table in chat even when shortening the report.

## Token consumption

Record each session's observed token consumption under `execution.usage` as `{ inputTokens, cachedInputTokens, outputTokens }` when the host exposes it. Use `inputTokens` for input the model processed fresh, including cache writes, `cachedInputTokens` for input served from cache, and `outputTokens` for generated tokens, including reasoning. Copy whole numbers from the host's own record for that exact session; never estimate, extrapolate from another session, ask the reviewer to self-report, or convert to money. Omit `usage`, or any count the host does not expose, rather than filling a gap.

Claude Code keeps per-message `usage` for each subagent in its transcript, observed at `<user transcript directory>/<project>/<parent session>/subagents/agent-<id>.jsonl`, where the file name carries the same agent identifier recorded as `reviewer`; sum that session's records. Codex and Cursor expose per-session usage through their own records. Confirm the location and field meanings in the running harness version before recording, and omit the field when unavailable.

Consumption is cost and capacity visibility, not evidence quality. It never becomes a gate, threshold, budget or review criterion, and a large or small count neither supports nor undermines a verdict. A malformed recorded count is rejected; an absent one is reported as not exposed. Reports show per-session and total counts rounded for reading, with exact values in the adjacent JSON. The Captain's own coordinating session is still running when the report is written, so it is excluded from the total; report it separately in chat if the host exposes it.

Before a real run, check the required operational capabilities in the installed harness version and mode; local installer tests do not prove live discovery or independent sessions. See the [live harness smoke check](../../../docs/installation.md#live-harness-smoke-check).
