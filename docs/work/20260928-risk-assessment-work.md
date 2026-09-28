# Risk assessment — research and design

Date: 2026-09-28. Status: implemented as opt-in, hardening-only evidence. Merge-rule changes by level are a later, separate decision.

## Goal

Rate each PR **low**, **medium** or **high** risk. A later change will use the level in the hold/merge decision: medium keeps current rules, low softens them and high hardens them. Because a low rating will eventually relax gates, the assessor must be independent and must never rate low by default.

## Research

- **Codebase as a tree** — John Kim, [How I Review AI Code](https://www.youtube.com/watch?v=b2QkhmQ0sT0) (2026). Review depth should follow blast radius. Trunk code (entry points, shared state, infrastructure with many dependents) deserves deep reading; leaf code (isolated or feature-gated) needs little more than validation. His safety questions: what behavior must not change, how bad a failure could be, and whether the change can be rolled back through gating. One-way doors need more review. Style nits belong to static checks. MARC adopts the tree as the human-facing model and rollback as the only mitigation.
- **Just-in-time defect prediction** — Kamei et al. (2013) and later work group change-level risk into [size, diffusion, purpose, history and experience](https://www.researchgate.net/figure/Summary-of-change-measures-Kamei-et-al-2013_tbl1_308911535). Diffusion (spread across subsystems and files) maps to tree position. MARC's skill avoids author-experience metrics: they are privacy-sensitive and not reviewable from the frozen diff.
- **Diff-aware deployment risk** — [Prime Video, 2026](https://arxiv.org/abs/2607.06766). Structural complexity and change classification were strong signals, while raw added/deleted line counts were noisy. This matches the simplicity router's rule that size never establishes safety.
- **One-way/two-way doors and blast radius in PRs** — [a common PR classification practice](https://github.com/BotHarness/BotHarness/issues/293) states reversibility and worst plausible failure for every PR.

## Decisions

| Question | Decision | Reason |
| --- | --- | --- |
| Placement | New core skill `marc-crew-risk`, not a selectable specialist | Needed for every enabled PR and for later merge rules; separate from the simplicity route, which decides review depth |
| Assessor | Fresh independent read-only session | A low rating will later relax gates; the Captain or implementer must not rate its own PR |
| Mitigations | Only reversibility (default-off gating) lowers a rating | Review gates already judge tests and visual proof; counting proof twice would soften twice |
| Combination | Worst of position, reversibility and sensitivity floors | Explainable in a report; no weighted scores |
| Trunk source | Agent inference plus optional trusted `riskTrunkPatterns`; a match forces high | Declared patterns can only raise; absence proves nothing |
| Uncertainty | At least medium, recorded in `unknowns` | Unknowns keep current rules; they never earn low |
| Human-approval paths | Not trunk automatically | Governance and blast radius differ; in MARC nearly every PR touches a human path |
| Adoption | `policy.riskAssessment: 1` | Existing consumers keep their digest and behavior |
| Enforcement now | Hardening only | High forces full review; missing, stale, inconsistent or shared-session ratings hold. No level relaxes a gate |
| Timing | Warm-start first session after routing | A high rating on a simple route switches to full before other reviewers start |

## Evidence contract

The session writes a top-level `risk` object, not a gate: `level`, `position` (`leaf`/`branch`/`trunk`), `reversibility` (`gated`/`revertible`/`one-way`), `triggers`, `unknowns`, plus the standard identity fields, reviewer, summary and evidence. The controller checks that the level is at least its position and reversibility, not low with unknowns, high for declared trunk, high only on the full route, not low beside routing risks, and from its own session. Reports show the level, dimensions, triggers and unknowns in each review stage.

## Later work

- Use the level in the hold/merge decision (the soften/harden rules).
- Consider `riskTrunkPatterns` for MARC's own policy. The owner approved enabling `riskAssessment` there on 2026-09-28 with none declared.
- Add manual prompt-eval cases for leaf, gated trunk, one-way migration and unknown-caller PRs.
