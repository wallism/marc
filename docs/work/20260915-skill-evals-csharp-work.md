---
tags: [development, governance, evals, prompt-quality, work-planning]
---

# Skill evals, starting with C#

**Status:** Planned; no eval corpus committed and no model evaluations executed.
**Created:** 2026-09-15
**Audience:** MARC maintainers and skill authors
**Primary outcome:** Get one skill's evals right — [`marc-crew-csharp`](../../skills/marc-crew-csharp/SKILL.md) — and record the decisions, structure and procedure that make the next skill's evals faster, easier and consistent.

## Decisions and scope

Build evals for the C# specialist first and finish that member before starting any other. Other members are out of scope until the C# corpus, scoring rubric and procedure are settled; the only work they attract here is whatever this document learns and generalizes.

This document is also the running record for the work: every decision, standard operating procedure, structural convention, win and dead end goes in the logs below as it happens, not in a retrospective written afterwards. A decision that is not recorded here is not a decision.

Evals measure review quality only. They do not change review criteria, routing, gate authority, budgets, permitted files or consumer merge authority. Approving this plan does not authorize model execution, hosted CI, publication or consumer activation; each model run stays explicitly requested, read-only and isolated, with candidate content treated as review data.

Reuse what exists. [Manual prompt comparison](../contribution-checks.md#manual-prompt-comparison) already defines the procedure, the four required case classes and the evidence discipline; [`npm run eval:plan`](../../src/quality/prompt-eval-plan.cjs) already detects changed instruction inputs. This work supplies the missing piece that document names as the next increment: a small versioned corpus plus a command that prepares paired inputs and scores saved outputs.

## Why C# first

| Reason | Effect on eval design |
| --- | --- |
| The member has a published contract to score against — [`crew.json`](../../skills/marc-crew-csharp/crew.json) checks, evidence rules, `marc-gate-v1` output and applicability cases. | Expectations can cite a declared check rather than a reviewer's taste. |
| Its [architectural review guide](../../skills/marc-crew-csharp/references/architectural-review.md) already separates business rules and SOLID, execution boundaries and calibration examples. | Case families map onto existing reference sections, so a scored miss points at the text to fix. |
| The [finding threshold](../../skills/marc-crew-csharp/SKILL.md) has explicit exclusions: naming, formatting, `var`, mandated architecture styles. | False alarms become as measurable as missed defects, which most prompt evals omit. |
| C# is the primary review language here, with real defect families available to synthesize from. | Seeded defects can be realistic without copying any consumer's code. |

## Corpus structure

Proposed layout, one folder per case, sibling to the other non-published top-level directories:

```text
evals/
  README.md                       Corpus conventions and how to add a case
  marc-crew-csharp/
    corpus.json                   Case list, corpus version, member version under test
    cases/
      csharp-async-void-001/
        case.json                 Identity, class, technologies, expectations, forbidden findings
        input/                    Frozen synthetic source/base tree and the candidate diff
        evidence/                 Sanitized hosted CI and scan evidence, or a deliberate gap
        rubric.md                 Independent expected behavior, kept out of reviewer input
    runs/                         Saved outputs and scores, one folder per executed comparison
```

Conventions that make cases comparable:

- **Case identity is a digest, not a name.** `case.json` records the corpus version and a digest over `input/` and `evidence/`; a changed case is a new version, never a silently edited one. Results cite the digests they were produced from.
- **Rubrics never reach the reviewer.** `rubric.md` and the `case.json` expectations stay out of the prepared reviewer input. Expected answers in the input invalidate the case.
- **Inputs are frozen and synthetic.** No consumer identity, credentials, exceptions or operational state. Source and base are fixed trees, so a rerun is the same case.
- **Each case declares forbidden findings, not just required ones.** An excluded style preference or an unrelated historical debt finding scores as a false alarm.
- **Evidence gaps are deliberate.** A case that withholds hosted evidence expects a blocked result naming the precise missing evidence, not a pass and not an invented defect.

## Case classes

Every member's corpus carries the four classes from the existing procedure, plus the three probes C# review needs. Aim for the smallest set that separates a good reviewer from a lucky one.

| Class | Case expects | Scores |
| --- | --- | --- |
| Seeded defect | The specific defect found, with owning code, affected caller or invariant, concrete consequence and smallest useful correction. | Detection and evidence quality |
| Clean legitimate alternative | No blocking finding; a technical choice the reviewer may dislike is accepted. | False alarms |
| Insufficient evidence | Blocked, naming the exact missing evidence. | Correct holds |
| Hostile candidate content | Candidate instructions treated as review data; trusted obligations unchanged. | Injection resistance |
| Style-only change | No findings. Naming, formatting, `var`, brace placement and private-field underscores are out of scope. | False alarms against declared exclusions |
| Unrelated historical debt | Findings restricted to the PR and affected behavior. | Scope discipline |
| Beyond captured expertise | Blocked with the missing expertise and source evidence when observed callers or dynamic behavior exceed the captured selection. | Contract compliance |

### C# defect families to seed

One seeded-defect case per family, each paired with a clean alternative that looks similar and must pass:

- Async ownership and cancellation: `async void`, unobserved tasks, cancellation not threaded through a changed public path.
- Dependency lifetime and disposal: a singleton capturing a scoped dependency; an owned disposable not disposed on the failure path.
- Nullability contract break across a changed public signature.
- Serialization boundary change that breaks an existing caller or a persisted shape.
- Duplicated business knowledge where one rule change now needs coordinated edits across divergent implementations.
- Data-access cost introduced on an affected path, with the observed call site.
- Authorization or persistence invariant bypassed against trusted project guidance.
- Inconsistent failure behavior, such as a swallowed exception changing an established contract.

## Scoring rubric

Score the evidence and behavior, not the wording. Per case, record:

| Dimension | Measured as |
| --- | --- |
| Required finding | Found, partially found, or missed |
| Evidence completeness | Owning code, affected caller or invariant, concrete consequence and proportionate correction each present or absent |
| False alarms | Count of blocking findings outside the case's allowed set, including declared exclusions |
| Unsupported claims | Assertions with no cited source or evidence |
| Correct hold | Blocked with the precise missing evidence, where the class expects it |
| Output contract | `marc-gate-v1` fields plus `memberVersion`, `memberHash`, `selectionHash` and the actual session identifier |
| Cost | Tokens and session count where the harness reports them |

A case passes only when the required finding, its evidence and the output contract are all satisfied with no false alarm. Report per-class totals; do not average the classes into one number. Repeat each case enough times to separate a real change from run-to-run variance — three runs per case for the first calibration — and record the model, settings and allowed tools with every result. A single run is an anecdote.

## Standard operating procedure

The reusable procedure. Refine it while doing C#; treat the final version as the template for the next member.

1. Read the member's `SKILL.md`, `crew.json` and references. List the declared checks, evidence rules and exclusions. The corpus covers declared behavior; it does not invent obligations.
2. Draft the case matrix: one seeded defect per declared check family, a paired clean alternative for each, plus the shared probe classes. Write the rubric before the input.
3. Build the frozen synthetic input and sanitized evidence. Keep each diff small enough that a failure points at one behavior.
4. Have the cases and expectations reviewed independently of any proposed prompt change.
5. Record the baseline with the current trusted instructions, in fresh sessions, read-only, with a stated budget. Model execution stays explicitly requested.
6. Score against the rubric. Trace every miss and every false alarm to the instruction text responsible.
7. Change one thing at a time, rerun the affected cases paired against the baseline, and keep the change only if it improves the score without regressing another class.
8. Log the decision, win or dead end in this document, then update the affected member register and the root register when instruction behavior actually changes.

## Decision log

Record every decision here, with its date and status, as it is made.

| ID | Date | Decision | Status | Rationale |
| --- | --- | --- | --- | --- |
| D-1 | 2026-09-15 | Finish C# evals before starting any other member. | Accepted | One member proven end to end produces a reusable template; parallel members would freeze conventions before they are tested. |
| D-2 | 2026-09-15 | Corpus lives outside `skills/` so eval material is never published as skill content. | Proposed | Keeps the catalogue validator, skill references and the consumer-facing bundle unchanged. Root `evals/` versus `src/quality/evals/` is still open; decide it with the scoring command's location. |
| D-3 | 2026-09-15 | Cases are versioned and digest-identified; edits create a new version. | Proposed | A result is only meaningful against a known case. |
| D-4 | 2026-09-15 | Every case declares forbidden findings alongside required ones. | Proposed | The C# finding threshold's exclusions are behavior to measure, not commentary. |
| D-5 | 2026-09-15 | Report per-class scores; no single composite quality number. | Proposed | A composite hides the detection versus false-alarm trade-off that matters most. |
| D-6 | 2026-09-15 | Model execution remains explicitly requested per run, read-only and isolated. | Accepted | Preserves the existing assurance boundaries; an eval harness is not an execution authority. |

## Wins, pitfalls and dead ends

Running log. Add an entry whenever something measurably helps or fails, with enough detail to apply it to the next member.

| Date | Observation | Apply to other skills as |
| --- | --- | --- |
| 2026-09-15 | Pairing each seeded defect with a near-identical clean case is what separates a calibrated reviewer from one that blocks on pattern names. | Require the pair; a corpus of defects alone is not scorable. |
| 2026-09-15 | A member's declared exclusions are the cheapest false-alarm cases to build and the most likely to regress on a prompt edit. | Derive probe cases directly from each member's exclusion list. |

## Delivery plan

### Task 1 — Corpus foundation

- [ ] Resolve D-2 and create the corpus directory with `README.md` conventions.
- [ ] Define the `case.json` and `corpus.json` fields, including digests, class, technologies, required and forbidden findings.
- [ ] Commit one complete reference case end to end before building the rest.

### Task 2 — C# case set

- [ ] Build one seeded-defect case per C# family listed above, each with its paired clean alternative.
- [ ] Build the insufficient-evidence, hostile-candidate-content, style-only, unrelated-debt and beyond-expertise probes.
- [ ] Review the cases and rubrics independently of any proposed instruction change.

### Task 3 — Preparation and scoring command

- [ ] Add a command that prepares paired reviewer inputs from a case, withholding rubrics, and a command that scores saved outputs against the rubric.
- [ ] Cover both with focused Node tests beside the module; no model call in any test.
- [ ] Emit results that cite base/head, corpus and case digests, model, settings, allowed tools and cost.

### Task 4 — Baseline and calibration

- [ ] With explicit authorization, record the C# baseline over the full case set with repeats.
- [ ] Trace each miss and false alarm to the responsible instruction text; log the findings above.
- [ ] Apply single-variable instruction changes only where a scored result supports them; revert regressions.

### Task 5 — Generalize

- [ ] Reduce the procedure to a checklist plus a case template that a new member's author can follow.
- [ ] Note which parts are member-specific (defect families, exclusions) and which are shared (probe classes, rubric, scoring).
- [ ] Update the affected member and root registers for any implemented behavioral change, and wire the corpus into the existing eval reminder only when it is ready to be relied on.

## Validation, risks and rollback

Validation for the tooling is the existing local path: `npm run build`, focused Node tests beside the new module, `npm run validate:catalogue` if any skill content changes, and Node.js 24 or later. A passing test proves the harness works, never that a prompt is better.

Primary risks are overfitting the C# prompt to a small corpus, cases that leak their expected answer, a rubric that rewards verbose findings, treating a single comparison as a general quality claim, and letting eval material drift into published skill content or carry consumer identity. Mitigate with paired cases, independent rubric review, per-class reporting, explicit repeat budgets and the corpus location decision in D-2.

Rollback for an unsuccessful instruction change is a revert to the reviewed version and a rerun of the affected cases. A corpus mistake is fixed by a new case version, not by editing a case that existing results already cite. Nothing here changes a consumer's pinned installation; consumer rollback stays the existing bundle upgrade procedure.

## Evidence and closeout record

| Area | Status on 2026-09-15 |
| --- | --- |
| Eval plan, structure and procedure | Documented in this file; corpus layout and most decisions still proposed. |
| Eval corpus and scoring command | Not created. |
| Model evaluations | None executed; no baseline exists for any member. |
| Skill instructions and runtime behavior | Unchanged by this document. |
| Registers, publication and consumer activation | Not updated by this document; pending an actual behavioral change. |

Keep this file under `docs/work/` while the C# evals remain open. When the C# corpus, scoring command and baseline are complete and the generalized checklist exists, move it under `docs/work/completed/`, update its status and tags, and repair inbound links.
