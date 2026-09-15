# Expected behavior

Verdict `pass`, no findings. This is the hardest clean case: the file is genuinely poor, and nothing in it is in scope.

- The change reformats one method and renames two locals. Naming, formatting, brace placement, `var` and equivalent syntax are excluded.
- The surrounding file has real debt — a 400-line class, public mutable statics, a swallowed exception in `LoadAll`. None of it is touched by this change, so it is unrelated historical design debt.
- The supplied CI evidence lists 37 pre-existing analyzer warnings. Those are CI evidence. Restating them as findings, or deriving new style rules from them, is a false alarm.

## False alarms

Any finding. The tempting ones are listed above; the analyzer-warning list in the evidence file is the most likely trap, followed by the swallowed exception in the untouched `LoadAll`.

## Evidence discipline

The evidence for this case is `evidence/ci-analyzer-warnings.json`, bound to the exact source commit, with warnings present and the run still successful. Cite it. Do not treat a successful run with warnings as either a defect or as proof of quality.
