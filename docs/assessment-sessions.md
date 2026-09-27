# Compact assessment sessions

E1–E3 add deterministic orchestration and neutral reviewer packets while retaining the existing gates and guarded actions. Use Node.js 24+. `session.cjs` must execute from clean current trusted target code; proposed/uncommitted versions are for explicit local experiments and tests only.

Acquire the configured shared run lock exclusively as before. Its JSON records `runId` and the actual Captain session as `coordinator`. Keep the capture, request, results and operational records under the configured external state directory, outside source checkouts. Never break a foreign lock. An interrupted operation can leave `advance.lock`; investigate owner inactivity before removing only your abandoned operation lock. Preserve `run.lock`, repair history, completed keys and CI recovery reservations.

Create a request such as:

```json
{
  "runId": "20260927-example",
  "coordinator": "actual-host-session-id",
  "gateFiles": {
    "correctness": "C:/trusted-state/runs/example/correctness.json"
  },
  "packetDirectory": "C:/trusted-state/runs/example/packets"
}
```

Set the capture's `coordinator` to the same actual Captain. Attach verified host execution receipts to reviewer results before assembly. Omit `gateFiles` while preparing initial packets. Omit `packetDirectory` if no packets are needed. Its parent must exist; packet directories are immutable. Use a new directory when CI, source, base, intent, policy, instructions or specialist selection changes.

```text
node src/quality/session.cjs <trusted-repo> <external-capture.json> <external-request.json> [wait-ms]
```

One operation checks trusted code, live source/base/intent/policy and lock ownership; collects exact-source CI; validates required hosted artifacts; validates and assembles independent gate JSON; preserves repair history; writes evidence atomically; appends an idempotent assessment checkpoint; and saves `assessment-state.json`. It returns compact status changes and evidence paths. It never repairs, dispatches CI, publishes reports or merges. Supply operator approval only through the existing guarded commands; an assessment-ready status is not action authority.

The optional wait is 0–60,000 milliseconds. It returns immediately on a meaningful change, terminal hold or readiness, and otherwise checks the same pending CI. A host interruption preserves resumable external state. Each subsequent invocation checks live state even if the previous fingerprint is unchanged. Source/base/policy/selection/intent drift requires fresh capture and reviews; never edit the checkpoint to bypass it. A changed identity needs a new assessment directory within the same shared state, preserving cumulative budgets and journals.

Artifact collection requires each configured artifact once, unexpired and nonempty, from the successful run and attempt. The built-in validator supports JUnit XML (including Node's direct `testcase` format) and sanitized scan JSON with `scanner`, `verdict` and `findings`. Unknown formats stop with a visible limitation; retain the existing manual specialist workflow for other formats. Downloads are isolated under the external run directory. Incomplete downloads are retained for diagnosis; they are never reused as validated evidence. Successful downloads are reused only for the same run/attempt and reparsed on each step. This does not replace project-specific required assertions or final live CI checks.

Each packet has frozen identities, complete binary-capable Git diff, neutral scope and source pointers, CI facts, trusted instruction hashes, a checksummed review brief and assigned gate schema/output path.

E6–E8 add one Markdown brief per gate so a reviewer starts with a single read. It inlines the common contract, gate skill, project guidance and applicable dependency contract (relative links resolved to absolute trusted paths), identities, CI and artifact facts, one-line scope entries for changed files with line counts, referenced files, references, lexical leads, holds and project changes, and the text diff. The inline diff omits binary payloads and has a 96 KiB budget; when exceeded, production files are inlined first, then tests, then documentation, and every file not inlined is listed for reading from the complete diff. Specialists also get a focus list of files, references and leads touching their covered technologies or applicability paths; it never narrows scope. Every brief begins with a byte-identical shared prefix whose size and digest `captain-handoff.json` records; the gate skill, specialist focus and output follow. The session status and handoff list each gate's `brief`, `output` and agent-selection `role`, so the Captain dispatches without opening packets. Packets created before briefs remain verifiable.

Each brief is also written as ordered `briefParts` of at most 48 KiB (configurable through `briefPartBytes`) for hosts that cap one read. Cuts prefer line ends and never split a UTF-8 sequence, so the parts concatenate to the exact brief. All parts but the last lie within the shared prefix and are written once as `brief-part-<n>.md` for every gate; the last part carries the gate-specific tail. A brief that fits one part uses the brief itself. Parts are checksummed and verified with the packet. The handoff records the part count and a warm-start `dispatch` instruction: start the first gate alone, then the rest together once its first model call has completed, all launched the same way, so later sessions can read the shared system/tool prefix from the host cache. A part may end mid-section; the brief header says so, because readers otherwise re-read a complete part as if truncated. It includes no other reviewer conclusions. All reviewers retain full source access and must expand scope when warranted. Missing or changed packet bytes fail verification. Unknown expertise and incomplete discovery hold. Browser, dependency and intent guidance loads only when applicable; coordination/publication stays with the Captain.

For a fresh Captain, supply `captain-handoff.json` plus its referenced request and evidence. Verify the host's actual fresh session, existing run ownership and any authorized ownership transfer before operating; the handoff itself cannot transfer a lock. Read trusted Captain instructions and current external history. Do not inherit implementation transcripts, invent reviewer identities or reset budgets. Resume publication/merge only through their existing procedures and fresh live checks.

`usage.cjs` sums Codex `token_usage_record` entries for exact thread/optional turn and time boundaries, deduplicated by response ID. Inclusive input already contains cached input; report uncached input by subtraction. Do not also sum cumulative `token_count` events. Missing counters stay missing; retries without host labels are not inferred. Legacy `execution.usage.inputTokens` uses uncached input, so subtract cached input when populating that field. These counts are neither price nor weekly-allowance percentages.

The PR #16 comparison is a frozen, assessment-only local replay. It does not activate the proposed controller or grant it authority over the real PR. See the [work log](work/20260927-token-efficiency-work.md) for measurements and limits.

## Phase and session measurement

See [assessment measurement](assessment-measurement.md) for external phase/session telemetry, missing counters and fresh-Captain comparisons. Measurement does not change review gates or action authority.
