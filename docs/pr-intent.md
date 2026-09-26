# PR intent and optional companions

MARC's `marc-crew-*` skills form its assurance system. `marc-companion-*` skills are optional user helpers: default setup does not install them, the Captain does not invoke them, and they are not selectable reviewers. They share the repository catalogue for individual discovery and installation.

The first companion is [PR intent](../skills/marc-companion-pr-intent/SKILL.md). It consults the request, linked ticket and associated work files, corroborates the problem from code, and proposes why the PR is needed and its expected outcome. Inaccessible or unclear sources prompt a specific question. It shows existing wording beside its proposal and waits for human acceptance before changing only the PR's intent paragraph. It does not edit tickets or documents unless separately asked.

Select the companion explicitly, choosing your harness as usual:

```powershell
npx skills add wallism/marc --skill marc-companion-pr-intent --agent codex --copy
```

This selects the published repository version; local unpushed additions are not yet available from that command. You can also invoke the local `SKILL.md` directly. The companion is self-contained and does not require MARC installed. Installing it never activates a controller or changes consumer merge authority.

## Writing intent

Use one plain top-level paragraph, separated by blank lines:

```text
INTENT: Correct addition so valid operands consistently produce their mathematical sum, including the intermittent case where 1 + 1 returned 3.
```

The paragraph may wrap across lines and include several related outcomes. Describe the problem and expected result, rather than implementation steps. Fenced examples, block quotes and HTML comments are ignored. Empty or duplicate paragraphs require clarification. No paragraph means existing MARC behavior applies without an intent assessment. Authors can supply intent manually; the companion is never required.

## Assessment and human action

Both simple and full routes require an independent static assessment when intent is present. The reviewer inspects changed source, affected callers and test code. It runs no candidate code, tests, services, browser session or CI. Ordinary MARC validation continues under its existing rules.

Near the top, the report shows a succinct assessment: aligned, partially aligned, misaligned or unclear; high/medium/low confidence with a reason; and a few decisive source references. Confidence is qualitative, not a measured probability or approval threshold. Full evidence and historical intent remain in the audit JSON.

Misalignment or insufficient evidence holds approval. A suggested repair states the change and why it addresses the unmet outcome, prominently labelled **approval required**. Disconnected runs leave this action in the report. An operator returning to the running chat may explicitly approve implementation. Existing non-intent repair rules remain unchanged, but overlapping intent proposals cannot bypass approval through another gate. Intent is never rewritten without human confirmation. Approved code repairs still require the ordinary new capture and independent validation.

## Changing intent without repeating the whole review

Use the Captain's trusted external evidence:

```powershell
node .marc/tool/src/quality/marc.cjs --repo <trusted-consumer> refresh-intent <previous-evidence.json> <new-evidence.json>
```

The new output path must not exist. The controller verifies current PR origin, source, base and policy, including earlier verified report-only commits. It updates captured intent and invalidates only its assessment and report preparation. Routing, other reviews, exact-source CI and cumulative repair history remain intact. Reassess only intent, then decide and report normally; historical reports stay immutable. Unrelated description edits do not invalidate intent. An unchanged intent produces a no-op copy.

Queue keys account for intent changes; live intent is rechecked before decisions, publication and merging. Source/base/policy changes retain normal invalidation rules. Missing trusted prior evidence cannot be replaced with candidate audit files. Intent removal follows the absent-intent rule and should be visible in the operator update. See the [assessment contract](../skills/marc-crew-captain/references/intent.md) for fields and handoffs.
