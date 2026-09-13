---
tags: [research, development, governance, prompt-quality, work-planning]
---

# MARC prompt improvements

**Status:** Research documented; implementation and model evaluations not started.
**Created:** 2026-09-14
**Research:** 2026-09-13 to 2026-09-14
**Audience:** MARC maintainers and skill authors
**Primary outcome:** Improve the clarity and reliability of Captain and crew instructions while preserving existing assurance boundaries.

## Decisions and scope

The user requested research into Matt Pocock's skills, comparison with Microsoft, Anthropic and OpenAI guidance, and a work document. The opportunities below are proposals, not approved prompt changes or demonstrated performance gains. Documentation approval does not authorize model evaluations, hosted CI, publication or consumer activation.

Use the existing catalogue and controller. Preserve independent reviews, immutable source/base/policy/member identity, guarded actions, cumulative budgets, required evidence and deployment separation. No new reviewer, host integration or merge authority is needed merely to improve wording or document structure.

Recommended sequence: **baseline cases → Captain structure and reference clarity → calibrated examples and requirement traceability → repair closeout**. Improve descriptions alongside the affected skills. Retain technical judgment where context matters; make operational procedures and completion evidence precise.

## Method and sources

Read source skills covering authoring, code review, TDD, diagnosis, codebase design, implementation, research and handoffs. Compared these with MARC's Captain, core gates, creator, representative specialists, references and contribution guidance. This was source inspection, not a benchmark of either repository. Popularity and author claims do not establish comparative effectiveness.

Matt Pocock references are pinned to inspected commit `3cca18b368ae95cdbdebbff572ccafa662551015`. Vendor documentation was read on 2026-09-14; verify current host behavior before implementing a platform-specific change. External instructions were research material, not adopted operating authority.

| Source | Applicable learning |
| --- | --- |
| [Writing for agents](https://github.com/mattpocock/skills/blob/3cca18b368ae95cdbdebbff572ccafa662551015/skills/productivity/writing-for-agents/SKILL.md) | Separate ordered steps from conditional reference, give pointers clear triggers, and define observable completion. |
| [Code review](https://github.com/mattpocock/skills/blob/3cca18b368ae95cdbdebbff572ccafa662551015/skills/engineering/code-review/SKILL.md) | Distinguish standards conformance from implementation of intended requirements; cite the originating requirement. |
| [Testing examples](https://github.com/mattpocock/skills/blob/3cca18b368ae95cdbdebbff572ccafa662551015/skills/engineering/tdd/tests.md) | Show behavioral tests alongside implementation-coupled and tautological counterexamples. |
| [Diagnosing bugs](https://github.com/mattpocock/skills/blob/3cca18b368ae95cdbdebbff572ccafa662551015/skills/engineering/diagnosing-bugs/SKILL.md) | Establish a symptom-specific feedback loop, verify the original scenario after repair, and remove temporary instrumentation. |
| [Microsoft Agent Skills, C#](https://learn.microsoft.com/en-us/agent-framework/agents/skills?pivots=programming-language-csharp) | Separate discovery, loading, resources and execution; document compatibility and runner requirements. Tool-allowlist support varies by implementation. |
| [Claude Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) | Load metadata, instructions and resources progressively; distinguish product runtime constraints and review the complete trusted bundle. |
| [Claude authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) | Use direct reference links, concrete examples, task-appropriate discretion and evaluation-led iteration across intended models. |
| [OpenAI Skills guide](https://developers.openai.com/api/docs/guides/tools-skills) | Explicit invocation improves predictability; local and hosted packaging differ; skill discovery does not establish instruction authority or permission. |

## Current repository evidence

Paths inspected on 2026-09-14 use the current `marc-crew-*` names. Earlier discussion used names that have since changed. Recheck each target before implementation; the catalogue is evolving.

| Surface | Existing capability and remaining opportunity |
| --- | --- |
| [Captain](../../skills/marc-crew-captain/SKILL.md) | Already defines terminal outcomes, fresh sessions and an ordered PR workflow. Detailed recovery and operational branches compete with the main sequence. |
| [Correctness](../../skills/marc-crew-correctness/SKILL.md) | Already checks intended behavior and callers. Make requirement-to-implementation evidence explicit rather than adding another mandatory gate. |
| [Code quality](../../skills/marc-crew-code-quality/SKILL.md) | Separates material findings from preferences, but the instruction to use the gstack review lens lacks a precise local reference. |
| [Test integrity](../../skills/marc-crew-test-integrity/SKILL.md) and [repair](../../skills/marc-crew-repair/SKILL.md) | Already require meaningful defect-specific red/green evidence. Examples and original-scenario closeout can make these requirements easier to apply. |
| [C# examples](../../skills/marc-crew-csharp/references/architectural-review.md), [React guide](../../skills/marc-crew-react/references/react-review.md), [creator](../../skills/marc-crew-creator/SKILL.md) | Already contain practical calibration or require it. Extend only where useful examples are missing; do not duplicate existing guidance across the expanded catalogue. |
| [Harness guidance](../../skills/marc-crew-captain/references/harnesses.md) | Already separates discovery, explicit handoffs, session identity and execution capability. Portability is an existing concern, not a newly discovered missing feature. |
| [Contribution checks](../contribution-checks.md) | Already specifies manual paired prompt comparisons. Deterministic scenario replay validates controller decisions, not model review quality. |

## Opportunities

| ID | Priority | Proposed change | Completion evidence |
| --- | --- | --- | --- |
| P1 | High; first | Establish a small versioned set of representative cases before rewriting. Reuse the manual comparison procedure and existing synthetic fixtures where suitable. | Cases cover seeded defects, clean alternatives, missing evidence and hostile candidate instructions; expectations are independent of the proposed prompt. |
| P2 | High | Restructure the Captain around the main sequence; move conditional details behind direct, explicit read triggers. Keep universal safeguards visible. | Every existing obligation has an identified destination; all branch references resolve; comparisons check that required material is read when applicable. |
| P3 | High | Extend defect/legitimate-alternative examples where current reviewers need calibration, initially inspecting JavaScript, Blazor, frontend and test integrity. | Examples show the concrete consequence and why a similar clean case is acceptable; comparisons measure missed defects and false alarms. |
| P4 | High | Make correctness findings trace intended requirements to code and evidence, including missing, partial or unrequested behavior. | Findings cite the requirement and owning code; absent decisions or evidence produce the appropriate existing hold rather than invented intent. |
| P5 | Medium | Add observable completion criteria to relevant review steps. | A reviewer accounts for applicable callers, invariants, evidence and unresolved gaps without a mandatory catalogue of irrelevant checks. |
| P6 | Medium | Strengthen repair closeout with the confirmed cause, original triggering scenario and instrumentation cleanup. | Defect-specific red/green plus the original scenario result, or a specific unresolved prerequisite; all execution remains authorized and isolated. |
| P7 | Medium | Replace vague references such as the gstack lens with reviewed, precisely scoped local guidance or a pinned dependency. | A fresh reviewer can identify exactly what to consult; no implicit external skill installation or workflow execution is required. |
| P8 | Medium | Sharpen descriptions to state purpose, activation conditions and relevant exclusions; document host requirements where needed. | Discovery cases distinguish authoring from review and adjacent specialties. Mandatory gate assignment continues to come from trusted orchestration. |

## Conflicting strategies and adaptation

| Tension | MARC decision for the proposed work |
| --- | --- |
| Short prompts versus adequate instruction | Reduce clutter based on observed outcomes, not a line-count target. A shorter prompt alone is not evidence of better review. |
| Progressive disclosure versus nested references | Link required conditional material directly from the entrypoint; add contents lists where long references need navigation. Preserve digest coverage for moved instructions. |
| Reviewer discretion versus rigid checklists | Keep evidence and output contracts strict; allow contextual investigation and legitimate technical alternatives. Preserve executable enforcement for mechanical rules. |
| Automatic skill discovery versus mandatory reviews | Use descriptions for discovery and explicit trusted handoffs for required gates. Availability does not imply selection or permission. |
| Shared format versus shared runtime | Keep canonical content reusable, but verify host loading, dependency access, isolation and fresh-session support separately. Do not copy platform-specific invocation flags as universal behavior. |
| Different prompt placement | Microsoft/Claude describe system-prompt discovery metadata; OpenAI's Responses shell guide describes user-prompt skill input. Do not rely on skill text having a universal priority. |
| Convenient latest versions versus frozen evidence | A host's latest/default version facility must not change instruction bytes during a captured assessment. Preserve MARC's verified pin and pre-capture update process. |
| Aggressive debugging or blanket testing versus bounded assurance | Adopt the feedback-loop lesson proportionately. Do not import mandatory hypothesis counts, routine user checkpoints, broad suites or candidate execution on a credentialed host. |

The extra vendor guides reinforce the six original opportunities. They raise evaluation priority and refine disclosure, discovery and portability; they do not justify weaker gates, a host rewrite, or wholesale adoption of another skill collection.

## Delivery plan

### Task 1 — Baseline and scope

- [x] Document the research, current seams, tensions and proposed priorities.
- [ ] Reinspect targeted skills and select the smallest useful first slice.
- [ ] Define representative cases, expected behavior and a bounded comparison budget.
- [ ] When model execution is explicitly authorized, record the current-prompt baseline using the existing procedure. Until then, distinguish prepared cases from executed evaluations.

### Task 2 — Captain structure and reference clarity

- [ ] Inventory existing obligations before moving text; implement P2 and P7 without changing operational semantics.
- [ ] Apply relevant P5/P8 refinements; keep direct reference links and required invariants discoverable.
- [ ] Validate links/catalogue contracts and compare affected cases; record any evidence limitation explicitly.

### Task 3 — Review calibration and intended behavior

- [ ] Implement P3/P4 for selected core gates and specialists, preserving existing scope and finding thresholds.
- [ ] Compare real defects, clean alternatives and missing-intent cases; retain useful changes and revise or revert regressions.
- [ ] Update the creator guidance only where a demonstrated lesson should govern future authoring.

### Task 4 — Repair and closeout

- [ ] Implement P6 without broadening repair authority, permitted files, execution access or cumulative budgets.
- [ ] Complete focused validation and document findings, missed cases and limitations.
- [ ] Update affected member/component registers and the root register with actual implemented changes.
- [ ] Record publication and consumer activation separately if later authorized; use fresh capture/review for changed trusted instructions.

## Validation, risks and rollback

Follow [manual prompt comparison](../contribution-checks.md#manual-prompt-comparison). Freeze source/base, prompt/reference content, case version, model/settings and allowed tools. Keep expected answers out of reviewer inputs. Assess actual findings, evidence, missed defects, false alarms, unsupported claims and correct holds. Repeat close results within the agreed budget. Broaden across models/hosts only when claimed support and the change warrant it.

For instruction changes, run the existing catalogue/link checks. Use Node.js 24+ and focused Node regressions if tooling, schema or selection behavior changes; a wording-only test does not establish prompt quality. Broad builds, hosted CI and model runs remain outside this documentation task.

Primary risks are losing obligations while moving text, hiding required references, overfitting examples and turning heuristics into false-positive rules. Mitigate with the obligation inventory and paired cases. Preserve critical guardrails even where repeated context is necessary for independent agents.

Keep implementation changes small and separately reviewable. Revert an unsuccessful prompt/reference change to the reviewed version and repeat affected checks; do not reuse approvals from a different policy identity or reset operational budgets. Consumer rollback follows the existing bundle upgrade/rollback procedure, not edits to a pinned installation.

## Evidence and closeout record

| Area | Status on 2026-09-14 |
| --- | --- |
| Research and work plan | Documented from the inspected sources and repository conventions. |
| Skill instructions and runtime behavior | Unchanged by this documentation task. |
| Model quality improvement | Unproven; no model evaluations executed. |
| Hosted CI, publication, consumer activation and deployment | Not performed by this task. |

Keep this file under `docs/work/` while implementation or validation remains open. Once completed or explicitly closed with residual limitations recorded, move it under `docs/work/completed/`, update its status/tags and repair inbound links. This follows the dated work-document convention without importing another repository's operational configuration or documentation tooling.
