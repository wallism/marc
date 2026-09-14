# MARC eval corpora

Versioned synthetic cases that measure review quality for one crew member at a time. This directory is evaluation material, not published skill content: nothing here is installed as a skill, discovered by the catalogue validator, or read by the controller at run time.

One folder per member. Each member folder holds:

```text
rules.json     Every rule extracted from that member's skill and references, with source anchors
corpus.json    The index: corpus version, member under test, universal rules, and every case with
               its class, expected verdict and title. Read this first; titles are checked against
               each case.json, so the index cannot drift
cases/<id>/    One case: case.json, rubric.md, input/change.patch, input/after/*.cs
               and, where the case needs them, input/pr-description.md and evidence/*.json
shared/        Evidence reused by cases that do not need their own
runs/          Saved outputs and scores from executed comparisons
```

## Rules

`rules.json` is the coverage contract. Every rule the member's `SKILL.md` and references impose has an entry with:

- `id` — stable kebab-case identifier cited by cases and results.
- `category` — `mandate`, `analysis`, `runtime`, `evidence`, `threshold`, `scope`, `conduct`, `output`, `principle`, `boundary`.
- `polarity` — `must-find` (the reviewer must report this when present), `must-not-find` (reporting it is a false alarm), or `conduct` (behavior or output obligation).
- `source` — the file and section the rule comes from.
- `requirement` — the obligation in one sentence.

A rule with no case covering it is a coverage gap. `node --test src/quality/eval-corpus.test.cjs` fails on one.

## Cases

`case.json` fields:

| Field | Meaning |
| --- | --- |
| `id`, `caseVersion` | Case identity. Change the content, bump the version. |
| `contentDigest` | SHA-256 over every file under `input/` and `evidence/`, with line endings normalized. The validator recomputes it, so a silent edit under an unchanged identity fails the check. Results cite it alongside the case version. |
| `class` | `seeded-defect`, `clean-alternative`, `insufficient-evidence`, `hostile-content` or `beyond-expertise`. |
| `rules` | Rule ids this case scores. Universal rules from `corpus.json` are scored on every case and need not be listed. |
| `capture` | Frozen synthetic capture identity: `sourceHead`, `base`, `policyHash`, `files`, `changedLines`, `ci`, and the captured `selection` the output must copy. |
| `consumerGuidance` | Trusted project guidance supplied with the case, including target frameworks and established contracts. |
| `evidence` | Paths to sanitized evidence, or `[]` for a deliberate gap. |
| `expectedVerdict` | `pass`, `repair`, `human-required` or `blocked`. |
| `requiredFindings` | Each with `rule`, `where` and `mustCite` — the facts a finding has to carry to count. |
| `forbiddenFindings` | Findings that score as false alarms, each naming the rule it violates. |
| `requiredBehavior` | For the evidence, hostile-content and beyond-expertise classes: the behavior expected instead of, or alongside, a named finding. |
| `acceptableAdditionalFindings` | Real findings beyond the required set that must not be scored as false alarms. |
| `notes` | Why the case is built this way. |

`rubric.md` states the expected behavior in prose for the human scorer. Neither `rubric.md` nor the expectation fields of `case.json` are ever included in prepared reviewer input.

## Adding a member

1. Extract that member's rules into `rules.json` with source anchors before writing any case.
2. Reuse the shared probe classes; replace the defect families with the member's own.
3. Keep every case's diff small enough that one failure points at one behavior, except clean cases, which may bundle several legitimate choices because they expect no findings at all.
4. Run `npm run validate:evals` and `node --test src/quality/eval-corpus.test.cjs`. The validator checks case shape, capture identity, evidence references, class rules, patch and source presence, that no expectation file sits inside the reviewer input, and that every rule in `rules.json` is scored by at least one case. Adding a rule with no case fails the check.

## What this corpus does not do

It prepares nothing and runs nothing. There is no model runner here, no scoring command yet, and no executed baseline. A validated corpus says the cases are well formed and cover the skill's rules; it says nothing about how any reviewer performs on them.

See [the C# eval work document](../docs/work/20260915-skill-evals-csharp-work.md) for the decisions and procedure behind this layout.
