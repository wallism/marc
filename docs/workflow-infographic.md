# MARC workflow infographic

![MARC Captain selects a simple or full independent review route, recruits relevant specialists, requires source CI, records evidence, and routes to holds, bounded repair or report CI and guarded merge. Deployment is separate.](assets/marc-workflow.png)

The diagram describes the implementation at `572b23ef5e642fe73e02e21538b413ba39836043`. Selected specialists supplement either route; the illustrated check marks are an example subset, not a fixed crew. UI impact requires full review and browser evidence. Passing source review leads to a report commit whose CI must pass before the guarded merge. MARC verifies target-branch CI after merging; deployment remains a separate manual action. Report-only mode records the decision without merging.

Unknown impact broadens review. Missing evidence or expertise holds; sensitive changes require the configured human decision. Repairs stay within the consumer policy budget and require recapture and fresh reviewers. Community contributions add deliberately installed, versioned specialists through the [crew contract](crew.md).

## Generation and verification

Created on 2026-09-13 using the built-in image-generation tool. The historical reference was preserved; this is a new asset. Visually checked spelling, contrast, arrows, conditional specialists/browser review, independent review routes, report CI, separate hold labels, bounded repair return and deployment separation against the [Captain](../skills/marc/SKILL.md), [crew contract](crew.md) and controller.

## Reproduction brief

```text
Use case: infographic-diagram.
Create a polished, highly legible landscape infographic for an open-source software repository README. Approximately 4:3 landscape. White background, navy text and outlines, pale blue/teal panels, green success path, amber repair loop, red hold paths. Crisp editorial vector-like illustration with generous spacing and minimal words. Subtle nautical crew theme: a small ship-wheel icon for the Captain, compass/routing motifs, no decorative pirate characters. Large typography, excellent contrast. Accurate clean arrows, no crossing through text.

Title exactly: "MARC"
Subtitle exactly: "Merge Assurance and Review Crew"

Explain the actual workflow with these exact labels:
Top: "One PR at a time" flows to central "Captain" with small sublabel "Freeze source • base • policy • tool".
Captain branches into two review routes:
Left panel "Simple" and "Focused tests".
Right panel "Full" with four compact boxes "Security", "Correctness", "Code quality", "Test integrity".
Label spanning these panels "Fresh, independent reviewers".
An amber arrow labelled "Risk or uncertainty" goes from Simple to Full.

Below these two routes, a shared pale teal panel titled "Relevant specialists" with four small equally styled chips "C#", "JavaScript", "Blazor", "Front end". Small explanatory line exactly "Selected from source, callers and trusted configuration". This is an optional selected subset, not all four on every PR. Show small selection check marks on only two chips as illustration. Label nearby "Only when relevant". Both Simple and Full may have selected specialists. A separate dashed box "Browser QA" with sublabel "UI impact" joins the assessment flow conditionally.

Both routes and the specialists feed the central box "Required gates + source CI", with small "Build • Tests • Scans".
Then flow to "Decision + evidence report".
Branch from this decision:
Green path "Pass" to "Report CI" and then "Guarded merge".
Red path to two clearly separate hold boxes: "Blocked: missing evidence" and "Human review: sensitive changes".
Amber path to "Bounded repair" with sublabel "Policy limit"; loop back to Captain labelled "Recapture + new reviews". Do not connect repair directly to merge.
Under Guarded merge, a separated dashed grey box "Deployment" with sublabel "Separate manual action"; use a dotted connector so deployment is visibly outside MARC.

Keep all text exactly spelled; do not invent other text or logos. Do not use old COQ naming or any consumer repository name. Avoid implying that optional specialists replace mandatory gates, that every specialist always runs, or that a report alone authorizes merging. Favor clarity over decorative elements; every arrow must have an unambiguous source and destination.
```
