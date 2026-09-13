# MARC setup infographic

![MARC setup progresses from choosing a repository and harness through inspection, crew and policy proposals, confirmation, installation and validation. Missing expertise has an optional proposal path. Reruns preserve existing setup; setup does not start reviews or authorize merging.](assets/marc-setup.png)

This diagram summarizes the [setup prompt](setup-prompt.md) and the README's [setup responsibilities](../README.md#what-setup-does). It is separate from the [PR review workflow](workflow-infographic.md).

The Captain inspects the target repository before proposing crew members, exact versions, scope and policy. Missing expertise prompts a proposal to create or extend a member with separate approval; the diagram does not imply that an unavailable member can be installed as working configuration. First setup presents the complete configuration for confirmation before applying authorized changes.

Reruns preserve existing customizations, reviewed exceptions and shared state. Configuration changes require confirmation; missing forwarding files can be repaired without repeating approval. Validation reports unresolved prerequisites and the next invocation. It does not establish live reviewer capability or grant permission to process PRs or merge.

## Generation and verification

Created on 2026-09-14 using the built-in image-generation tool. Visually checked labels, numbered sequence, direct proposal-to-confirmation route, optional expertise-gap branch, rerun notes and separation from review/merge authorization against the setup prompt. Local Markdown link targets and `git diff --check` were checked. Documentation and illustration only; no runtime, hosted-CI or live consumer validation.

## Reproduction prompt

```text
Use case: infographic-diagram. Create a new separate MARC setup infographic for an open-source repository README. Landscape 4:3, polished editorial vector-like style, white background, navy text/outlines, pale blue panels, teal highlights, amber conditional path, restrained green completion. Large readable type, generous spacing, very few words, ship-wheel icon for Captain, no pirate characters or invented slogans. Visually match a professional MARC workflow chart.

Title exactly "MARC setup"
Subtitle "From your repository to a configured crew"

Layout: six numbered cards on a clear serpentine path: top row 1 -> 2 -> 3, then down from 3 to 4 at bottom right, then 4 -> 5 -> 6 moving left. Arrowheads clear and outside cards. Each card has a simple icon and the following exact short text:
1 "Choose repository"
   "Path or URL"
   "Codex • Claude Code • Cursor"
2 "Captain inspects"
   "Source • Architecture • Tests • CI"
3 "Propose crew + policy"
   "Relevant expertise • Versions • Scope"
4 "Review + confirm"
   "Settings • Permissions • Changes"
5 "Install + configure"
   "Pinned MARC • Crew • Shared state"
6 "Validate + hand off"
   "Checks • Prerequisites • Next step"

Between the two rows place a compact amber optional branch from card 3:
"Missing expertise?" -> "Propose new or extended member"
under it "Separate approval", with a return arrow to card 4. Make this a clearly optional proposal path, not an automatic authoring action. Do not suggest installing invented members.

Below the main flow, two simple compact note strips:
"Reruns preserve existing setup"
"Confirm configuration changes"
And a visually distinct dashed footer:
"Setup does not start PR reviews or authorize merging"

Do not add automatic review/merge/deploy steps, code snippets, file paths, technical internals, update mechanism boxes, credentials, unsupported success promises, or external skill loading. Validation can reveal prerequisites, so do not label completion 'ready to merge' or show every prerequisite as passed. Green only accents the handoff icon. Maintain concise exact labels and easily followed non-overlapping arrows.
```

### Connector refinement

The first generated image placed the optional proposal on the only path between steps 3 and 4. Apply this edit to preserve a direct main route:

```text
Edit the supplied MARC setup infographic. Keep all text, cards, icons, colours, numbers, and placement unchanged. Fix only the connector between step 3 and step 4 so the amber missing-expertise box is a TRUE OPTIONAL SIDE BRANCH instead of the only route. Add a clear NAVY solid main arrow directly from step 3 "Propose crew + policy" to step 4 "Review + confirm", bypassing the optional box along the left side of the right column. Use right-angle bends in the blank center area with ample margin, no overlap with any cards, numbers, text, or existing arrows. Keep the existing amber 3 -> Missing expertise -> 4 route as the optional branch. The main navy direct route must be visually clear. Change nothing else.
```
