# MARC per-PR crew selection infographic

![The Captain selects C# and JavaScript from a larger configured crew, plus core reviews for the chosen route. Wider impact or uncertainty broadens selection.](assets/marc-crew-selection.png)

Configured members are available expertise, not an instruction to run every member. This example assumes the changed source, affected callers and trusted mappings identify only C# and JavaScript, with no shared configuration or uncertain impact. Those two specialists supplement the core reviews for the chosen simple or full route. The other illustrated members remain available for other PRs.

The controller captures selected and omitted members with reasons; the Captain checks scope against the complete diff and affected callers. Shared configuration or uncertainty broadens selection. Missing required expertise holds the review. See the [crew guide](crew.md#consumer-selection) and [complete workflow](workflow-infographic.md).

## Generation and verification

Created using the built-in image-generation tool on 2026-09-13. The existing workflow image is retained. Visually checked labels, arrows, contrast, the selected subset, route alternatives and the broader-impact note. Local documentation link targets and `git diff --check` passed. The reproduction prompt below records the intended labels and example boundaries. This documentation change does not establish hosted CI or live review results.

## Reproduction prompt

```text
Use case: infographic-diagram.
Asset type: additional MARC repository README infographic.
Create a polished landscape infographic, white background, navy typography and outlines, pale blue panels and teal selected cards, subtle ship-wheel Captain icon. Minimal words, large readable text, generous space, crisp editorial vector-like illustration. No pirates, no logos, no invented text.
Title: "MARC selects the crew for each PR"
Subtitle: "Configured specialists are available. Relevant specialists run."
Three columns connected left to right:
Left heading "Configured crew" above eight compact cards: "C#", "JavaScript", "Python", "SQL", "React", "Blazor", "Terraform", "Go". All available; only C# and JavaScript highlighted teal.
Middle: small box "This PR" with "C# + JavaScript" and "No wider impact". Arrow down to ship-wheel box "Captain" with "Checks source + callers + trusted mappings". Arrow from configured crew to Captain, arrow from Captain to right column.
Right heading "Selected for this PR" above just two teal checked cards "C#" and "JavaScript". Below a large plus sign and a navy-outline box "Core reviews for the route" with two clearly separate text rows "Simple: focused tests" and "Full: security, correctness," followed by "code quality, test integrity". Simple and full are alternatives, not sequential or both obligatory.
Below columns a quiet light-grey strip: "Other specialists sit this PR out".
At bottom an amber bordered note: "Wider impact or uncertainty broadens selection".
Make clear this is an example with no wider affected technologies. Avoid implying that a file-extension filter alone determines selection or that every configured specialist runs. No merge/deploy diagram needed. Spell all text exactly. Use clear arrows without overlapping labels.
```
