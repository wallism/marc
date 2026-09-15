---
tags: [development, governance, evals, prompt-quality, work-planning]
---

# Skill evals, starting with C#

**Status:** C# corpus built and validated; no model evaluations executed and no baseline exists.
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

Built, at [`evals/`](../../evals/README.md), sibling to the other non-published top-level directories:

```text
evals/
  README.md                       Corpus conventions and how to add a member
  marc-crew-csharp/
    rules.json                    All 77 rules extracted from the skill, with source anchors and polarity
    corpus.json                   The index: every case with class, expected verdict and title
    cases/<case-id>/
      case.json                   Identity, digest, class, rules scored, capture, expectations
      rubric.md                   Expected behavior for the scorer, never in reviewer input
      input/change.patch          The candidate diff
      input/after/**.cs           Post-change source, including the callers the case needs
      input/pr-description.md     Only where the case supplies candidate prose
      evidence/*.json             Only where the case needs its own evidence or a deliberate gap
    shared/ci-success.json        Exact-source CI evidence reused by cases that need nothing special
```

Run results are not stored here or anywhere in the repository; D-15 records where they go.

Validate with `npm run validate:evals`, and as part of `npm test` through [`eval-corpus.test.cjs`](../../src/quality/eval-corpus.test.cjs).

Conventions that make cases comparable:

- **Case identity is a digest, not a name.** `case.json` carries a `contentDigest` over `input/` and `evidence/`, recomputed by the validator, so a silent edit under an unchanged identity fails the check. Line endings are normalized so a Windows checkout does not change a case's identity.
- **Rubrics never reach the reviewer.** `rubric.md` and the `case.json` expectations stay out of the prepared reviewer input. Expected answers in the input invalidate the case.
- **Inputs are frozen and synthetic.** No consumer identity, credentials, exceptions or operational state. Source and base are fixed trees, so a rerun is the same case.
- **Each case declares forbidden findings, not just required ones.** An excluded style preference or an unrelated historical debt finding scores as a false alarm.
- **Evidence gaps are deliberate.** A case that withholds hosted evidence expects a blocked result naming the precise missing evidence, not a pass and not an invented defect.
- **Trusted consumer guidance is part of the case.** Each case supplies target frameworks, architecture and established contracts. This is usually what makes a defect a defect: `async void` is a defect because the case states there is no event framework, and a missing token is a defect because the case states the operation accepts one.

## Case classes

Five classes, 26 cases. The style-only and unrelated-debt probes folded into clean alternatives, because all three expect zero findings and can share a case without confusing attribution.

| Class | Cases | Case expects | Scores |
| --- | --- | --- | --- |
| `seeded-defect` | 14 | The specific defect found, with owning code, affected caller or invariant, concrete consequence and smallest useful correction. | Detection, evidence quality, severity |
| `clean-alternative` | 8 | A pass with no findings; a technical choice the reviewer may dislike is accepted. | False alarms |
| `insufficient-evidence` | 2 | Blocked, naming the exact missing evidence, with no invented defect and no execution. | Correct holds |
| `hostile-content` | 1 | Candidate instructions treated as review data; every trusted obligation unchanged; the real defect still found. | Injection resistance |
| `beyond-expertise` | 1 | Blocked with the missing expertise and source evidence. | Contract compliance |

### The built case set

Seeded defects, each paired against a clean case that looks similar:

| Case | Defect | Paired clean case |
| --- | --- | --- |
| `di-captive-dependency-and-shared-cache` | Singleton captures a scoped `DbContext` and mutates a plain dictionary | `legitimate-ownership` |
| `async-void-and-sync-over-async` | `async void` on a request path, plus `.GetAwaiter().GetResult()` | `legitimate-async-choices` |
| `cancellation-not-propagated` | New token accepted and passed to nothing | `legitimate-async-choices` |
| `disposal-and-escaping-scope` | Reader leaked on the failure path, scoped service in fire-and-forget work, unbounded fan-out | `legitimate-ownership` |
| `implementation-breaks-caller-promises` | Null returned against a non-null contract; required operation throws | `legitimate-abstractions` |
| `serialized-contract-and-external-input` | Wire property renamed; `!` on external input | — |
| `duplicated-business-rule` | Tax and rounding copied, then changed in one copy only | `independent-rules-and-new-case` |
| `coupled-dispatch-sites` | New enum member handled in two of three switches | `independent-rules-and-new-case` |
| `entangled-policies` | Tax exemption placed inside the email builder whose return value is persisted | `cohesive-growth` |
| `policy-bound-to-io` | Deterministic policy reaches for HTTP and the filesystem; new failure path untested | — |
| `speculative-abstraction` | Generic mapping framework and flag-driven helper for one caller, expecting advisory only | `legitimate-abstractions` |
| `exposed-mutable-internals` | Line collection exposed mutable; caller bypasses validation and leaves the total stale | — |
| `tenant-filter-and-query-per-item` | Tenant predicate dropped; query per row with supplied timing | `store-idioms-and-error-contract` |
| `failure-and-retry-consistency` | False success, cancellation misreported, non-idempotent retry, partial state | `store-idioms-and-error-contract` |

Probes: `stale-ci-evidence` and `runtime-claim-without-evidence` (holds), `candidate-instruction-override` (injection, self-repair approval and vote override in one case), `beyond-captured-selection` (the money rule moved into T-SQL outside the selection), `cosmetic-change-in-legacy-file` (style, unrelated debt and pre-existing analyzer warnings) and `legacy-target-framework` (net48 and C# 7.3).

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
| D-2 | 2026-09-15 | Corpus lives at root `evals/`, outside `skills/` and outside the trusted policy digest. | Accepted | `trustedPolicy` digests `src/quality`, `scripts`, `templates`, `AGENTS.md` and `skills` only, so a case edit cannot change a consumer's policy identity or invalidate an approval. Root placement also keeps it out of catalogue validation. |
| D-3 | 2026-09-15 | Cases carry a `contentDigest` over `input/` and `evidence/`; the validator recomputes it. | Accepted, implemented | A result is only meaningful against a known case. Line endings are normalized so a Windows checkout does not change identity. |
| D-4 | 2026-09-15 | Every case declares forbidden findings alongside required ones, and the validator requires at least one. | Accepted, implemented | The finding threshold's exclusions are behavior to measure, not commentary. |
| D-5 | 2026-09-15 | Report per-class scores; no single composite quality number. | Accepted | A composite hides the detection versus false-alarm trade-off that matters most. |
| D-6 | 2026-09-15 | Model execution remains explicitly requested per run, read-only and isolated. | Accepted | Preserves the existing assurance boundaries; an eval harness is not an execution authority. |
| D-7 | 2026-09-15 | `rules.json` is the coverage contract: every rule extracted from the skill needs a covering case, enforced by `npm test`. | Accepted, implemented | Turns "all the rules are covered" from a claim into a check. Adding a rule to a skill without adding a case now fails. |
| D-8 | 2026-09-15 | Seeded-defect cases stay one behavior each; clean cases may bundle several legitimate choices. | Accepted | A clean case expects zero findings, so bundling cannot confuse attribution. A defect case must localize the failure. |
| D-9 | 2026-09-15 | Each required finding lists the facts it must cite; detection alone does not score. | Accepted, implemented | Scores the four elements of the skill's finding anatomy rather than keyword matching. The validator requires at least three cited facts per finding. |
| D-10 | 2026-09-15 | Cases may declare `acceptableAdditionalFindings`. | Accepted | Real changes contain more than the seeded defect. Scoring a correct extra finding as a false alarm would train under-reporting. |
| D-11 | 2026-09-15 | Severity is scored, not just detection. | Accepted, implemented | Over-blocking damages the process as much as missing. `speculative-abstraction` expects a pass with advisories; `coupled-dispatch-sites` expects one blocking and one advisory finding, and inverting them fails. |
| D-12 | 2026-09-15 | The evidence, hostile-content and beyond-expertise classes score `requiredBehavior` instead of findings. | Accepted, implemented | Their correct result is a hold or a refusal, and the failure modes - false pass, invented defect, boundary breach - must be recorded separately. |
| D-13 | 2026-09-15 | The validator lives in `src/quality`, inside the policy digest; the corpus does not. | Accepted | Consistent with `catalogue-validation.cjs`. The trade-off is explicit: editing the validator changes the policy digest, editing a case does not. |
| D-15 | 2026-09-16 | Eval run results stay out of this repository. Write them to an external artifacts directory now; when a runner exists, to MARC-owned `marc-evals` Cloud Storage with a `marc_evals` BigQuery dataset, defined by this repository. Never a consumer's eval infrastructure, and never a shared bucket. | Accepted | Corrects a contradiction in D-2's layout, which declared a `runs/` folder inside the bundle although AGENTS.md and the enforcement boundary keep operational results out. RoleSage's `model-evals` module is the pattern to copy - cases in Git, artifacts and scores in cloud storage, local-only by default - but its bucket carries `prevent_destroy`, and its schema keys model substitution (`model_alias`, reasoning level) where MARC scores instruction change and needs the skill digest, `case_version` and `case_class` with per-class pass rates. Defining the module here keeps MARC's lifecycle independent of any consumer's Terraform while still permitting deployment into an existing project. Infrastructure waits until a runner produces results worth comparing across time. Only synthetic-case outputs may ever be uploaded, under the same sanitization rules as reports. |
| D-14 | 2026-09-16 | A consumer's own quality tooling stays in the consumer's build. MARC reads no analyzer output, gains no adapter for it, and requires only that hosted CI succeeded on the exact reviewed commit. No eval case is retired and no rule is narrowed. | Accepted | Recorded in [configuration](../configuration.md#your-own-quality-tools). Deterministic checkers were considered as replacements for detection cases; a successful build proves eligibility, never that a given check exists in it, so the review obligation is unchanged and the corpus stays at 26 cases. Suppressions, baselines and thresholds are consumer taste, and adapters for them would be unbounded work and policy inputs. Security scanning stays structured because MARC adjudicates that content itself. Cost reduction was explicitly not a goal of this decision. |

## Wins, pitfalls and dead ends

Running log. Add an entry whenever something measurably helps or fails, with enough detail to apply it to the next member.

| Date | Observation | Apply to other skills as |
| --- | --- | --- |
| 2026-09-15 | Win. Extracting the rules into `rules.json` before writing any case is what made coverage checkable. One skill plus one reference yielded 77 rules, including negatives that are easy to overlook when writing cases from memory. | Always extract first. The rule list is the specification; the cases are its tests. |
| 2026-09-15 | Win. Pairing each seeded defect with a near-identical clean case is what separates a calibrated reviewer from one that blocks on pattern names. Naming the pair in both rubrics under a "Contrast" heading makes miscalibration visible in one read. | Require the pair and cross-reference it in both rubrics. A corpus of defects alone is not scorable. |
| 2026-09-15 | Win. A member's declared exclusions are the cheapest false-alarm cases to build and the most likely to regress on a prompt edit. The C# finding threshold's exclusion list produced eight clean cases almost mechanically. | Derive probe cases from the exclusion list before inventing anything. |
| 2026-09-15 | Win. Per-case trusted guidance is what converts an arguable observation into a defect: `async void` is a defect because the case states there is no event framework; a missing token is a defect because the case states the API accepts one. | Write the guidance block first, then the code. If the defect is not a defect under some plausible guidance, the case is not ready. |
| 2026-09-15 | Win. One shared evidence file with a placeholder for the case's own source head, plus per-case evidence only where a gap or anomaly is the point, avoided about two dozen near-duplicate files. | Share the ordinary evidence; make every per-case evidence file mean something. |
| 2026-09-15 | Win. A digest over the case inputs makes silent edits fail the check. A scored result is worthless if the case can drift underneath it. | Digest the inputs, normalize line endings, and keep `case.json` out of its own digest so expectations can be corrected without re-identifying the inputs. |
| 2026-09-15 | Pitfall. The first pass wrote defect cases only and read as a competent corpus. It would have rewarded a reviewer that blocks on every pattern it recognizes, which is the failure mode most likely to make the process unusable. | Count clean and defect cases as you build. This corpus settled at roughly one clean case per two defect cases. |
| 2026-09-15 | Pitfall. `speculative-abstraction` is a seeded defect that must not block. Encoding that needed an explicit validator rule: a defect case expecting a pass must mark every required finding advisory. Without it the corpus silently permitted contradictory expectations. | Expect at least one case per member where the right answer is "real, but advisory". |
| 2026-09-15 | Pitfall. Three of the four probe classes have no required finding at all, so an expectation shape built only around findings cannot express them. `requiredBehavior` had to be added, with the failure modes recorded separately. | Design the case schema for holds and refusals from the start, not as an afterthought. |

## Delivery plan

### Task 1 — Corpus foundation

- [x] Resolved D-2 and created [`evals/`](../../evals/README.md) with its conventions.
- [x] Extracted all 77 rules from the skill, manifest and reference into `rules.json` with source anchors and polarity.
- [x] Defined the `case.json` and `corpus.json` fields, including `contentDigest`, class, rules scored, capture identity, required and forbidden findings.
- [x] Built the validator and its rejection tests: [`eval-corpus.cjs`](../../src/quality/eval-corpus.cjs), [`eval-corpus.test.cjs`](../../src/quality/eval-corpus.test.cjs), `npm run validate:evals`.

### Task 2 — C# case set

- [x] Built 14 seeded-defect cases across the C# families, each paired with a clean case that resembles it.
- [x] Built 8 clean alternatives, covering the declared exclusions, legacy target frameworks and non-EF store idioms.
- [x] Built the insufficient-evidence, hostile-content and beyond-expertise probes.
- [x] Verified full rule coverage mechanically rather than by assertion; `npm test` fails on an uncovered rule.
- [ ] Have the cases and rubrics reviewed independently, before they are used to judge any instruction change.

### Task 3 — Preparation and scoring command

- [ ] Add a command that prepares paired reviewer inputs from a case, withholding `rubric.md` and the expectation fields of `case.json`.
- [ ] Add a command that scores saved outputs against the rubric, per class, with false alarms and unsupported claims counted separately.
- [ ] Cover both with focused Node tests beside the module; no model call in any test.
- [ ] Emit results that cite base/head, corpus version, case `contentDigest`, model, settings, allowed tools and cost, written to the external artifacts directory named in D-15.

### Task 4 — Baseline and calibration

- [ ] With explicit authorization, record the C# baseline over the full case set with repeats.
- [ ] Trace each miss and false alarm to the responsible instruction text; log the findings above.
- [ ] Apply single-variable instruction changes only where a scored result supports them; revert regressions.

### Task 5 — Generalize

- [ ] Reduce the procedure to a checklist plus a case template that a new member's author can follow.
- [ ] Note which parts are member-specific (defect families, exclusions) and which are shared (probe classes, rubric, scoring).
- [ ] Update the affected member and root registers for any implemented behavioral change, and wire the corpus into the existing eval reminder only when it is ready to be relied on.

## Validation, risks and rollback

Validation for the tooling is the existing local path, run on 2026-09-15 with Node.js 24: `npm run build` (36 files), `npm run validate:catalogue` (31 skills, 22 manifests), `npm run validate:evals` (26 cases, 77 rules) and `npm test` (150 tests, including the migration fixture that now treats the new module as a trusted policy input). A passing test proves the corpus is well formed, never that a prompt is better.

Primary risks are overfitting the C# prompt to a small corpus, cases that leak their expected answer, a rubric that rewards verbose findings, treating a single comparison as a general quality claim, and letting eval material drift into published skill content or carry consumer identity. Mitigate with paired cases, independent rubric review, per-class reporting, explicit repeat budgets and D-2.

Two risks are specific to the corpus as built. The cases and their expectations were authored together, so an expectation that merely restates how one author reads the skill would be invisible until a reviewer disputes it: Task 2's remaining item exists for that. And the `mustCite` lists encode a judgment about what evidence a finding needs; if a real reviewer produces a materially better finding that cites different facts, the rubric is wrong, not the reviewer, and the case should be revised with a raised version.

Rollback for an unsuccessful instruction change is a revert to the reviewed version and a rerun of the affected cases. A corpus mistake is fixed by a new case version, not by editing a case that existing results already cite. Nothing here changes a consumer's pinned installation; consumer rollback stays the existing bundle upgrade procedure.

## Evidence and closeout record

| Area | Status on 2026-09-15 |
| --- | --- |
| Eval plan, structure and procedure | Documented here; thirteen decisions recorded, D-2 through D-13 settled while building. |
| C# rule extraction | 77 rules from `SKILL.md`, `crew.json` and the architectural review guide, each with a source anchor. |
| C# case corpus | 26 cases built and validated: 14 seeded defects, 8 clean alternatives, 2 evidence holds, 1 hostile-content probe, 1 beyond-expertise probe. Every rule has at least one covering case. |
| Corpus validation | `npm run validate:evals` passes; `npm test` passes at 150 tests including 13 new corpus tests with their rejection assertions. |
| Preparation and scoring commands | Not built. Nothing prepares reviewer inputs or scores outputs yet. |
| Model evaluations | None executed. No baseline exists for any member, and no claim is made about C# review quality. |
| Skill instructions and runtime behavior | Unchanged. No skill text was edited for this work. |
| Independent review of the cases | Not done. The cases and their expectations were authored in the same session and must be reviewed before they judge any instruction change. |
| Publication and consumer activation | Not performed. `evals` is outside the trusted policy digest, so no consumer identity or approval is affected. |

Keep this file under `docs/work/` while the C# evals remain open. When the C# corpus, scoring command and baseline are complete and the generalized checklist exists, move it under `docs/work/completed/`, update its status and tags, and repair inbound links.
