# MARC workflow infographic

![MARC selects fresh independent reviews and relevant specialists, with C# and JavaScript checked as an example subset, records model settings, and checks source, report and post-merge target-branch CI. Holds, bounded repair and separate manual deployment remain visible.](assets/marc-workflow.png)

The diagram describes the review implementation at `0639299ed3838be5761325ac842a201839ce596d`. It focuses on PR assurance; installation and configuration are covered in the [separate setup diagram](setup-infographic.md).

Selected specialists supplement either the simple or full route. Green checks on C# and JavaScript identify the members used in this example; React and Terraform illustrate available but unselected expertise. This is an illustrative subset, not a fixed crew or a file-extension-only selection rule. Source, affected callers and trusted configuration determine the actual selection. UI impact requires full review and browser evidence.

Crew model and reasoning settings inherit the Captain unless configured defaults or member overrides apply. Reports identify inherited or configured selections and distinguish requested settings from actual values when telemetry is unavailable. See [crew model settings](configuration.md#optional-crew-model-overrides).

Passing source review leads to a report commit whose CI must pass before guarded merge. MARC then verifies target-branch CI and stops the queue if it fails. Deployment remains a separate manual action. Report-only mode completes report CI without merging.

Unknown impact broadens review. Missing evidence or expertise holds; sensitive changes require the configured human decision. Repairs stay within the consumer policy budget and require recapture and fresh reviewers. Community contributions add deliberately installed, versioned specialists through the [crew contract](crew.md).

## Generation and verification

Originally created on 2026-09-13; refreshed on 2026-09-14 using the built-in image-generation tool. The final revision restores two selected-specialist checkmarks and keeps operational update mechanics outside this diagram, while retaining the model/reasoning callout and post-merge CI verification.

Visually checked spelling, contrast, arrows, the selected subset, conditional browser review, independent routes, report CI, separate hold labels, bounded repair return and deployment separation against the [Captain](../skills/marc-crew-captain/SKILL.md) and configuration guide. Local documentation links and `git diff --check` were checked. No runtime, hosted-CI or live consumer validation is implied.

## Final edit prompt

The edit target was the preceding 2026-09-14 refresh. This prompt records the final requested changes; the image above is the resulting asset.

```text
Use case: infographic-diagram. Edit the supplied MARC workflow infographic. Preserve its existing visual style, all wording and structure except two precise changes.
1. Remove the entire "MARC update check" box and its sublabel. Connect "One PR at a time" directly to "Captain". Reflow upward to use the freed space elegantly. There must be no mention of updates anywhere.
2. In "Relevant specialists", replace the three broad category chips with FOUR concrete specialist chips: "C#", "JavaScript", "React", "Terraform". Put a prominent green circular checkmark next to C# and JavaScript ONLY. React and Terraform remain neutral unselected chips without ticks or crosses. Add small legend "Example: checked members run". Retain "Only when relevant" and "Selected from source, callers and trusted configuration". This clearly depicts selecting two of four example available specialists.
Preserve: MARC title and full expansion; Captain frozen source/base/policy/tool; model + reasoning inheritance and optional overrides callout; Simple focused tests and Full four reviewers as alternatives, risk/uncertainty escalation; conditional Browser QA; source gates/CI; decision/evidence report with model settings; green report CI -> guarded merge -> verify target-branch CI; separate manual deployment; two distinct red holds; bounded repair returning to Captain for recapture + new reviews. Clear arrows, no text crossings. Keep typography large, minimal wording, white/navy/blue/teal palette, original landscape proportions. Do not add new workflow steps.
```
