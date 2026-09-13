# Lessons from member author inspection

Apply these checks where the technology warrants them; do not accumulate mandatory patterns. Each lesson below corrected a concrete draft gap during the sequential 2026-09-13 language pass.

## Python

For lifecycle criteria, name the meaningful failure, cancellation or early-exit observation that would support the finding or clean alternative. Do not turn this into blanket test requirements unrelated to the changed contract.

## C

For compiled or generated code, establish which source branches and language mode actually reach each supported target. Review public boundary consumers separately; do not equate a filename or one build with all configurations.

## C++

Separate independent safety properties in review questions: ownership, synchronization and error guarantees are not interchangeable. Include a clean example that satisfies one through an external contract rather than a preferred abstraction.

## Java

For asynchronous stop/retry APIs, distinguish request, acknowledgment and completed side effects. Calibrate exception advice to whether the caller propagates, translates or consumes cancellation.

## Visual Basic

When recommending a compiler or lint control, state its relevant blind spot and inspect the runtime boundary it cannot prove. Do not replace a local defect fix with wholesale policy tightening.

## SQL

For persisted contracts, inspect intermediate rollout states and recovery limits, not just final-state correctness. Distinguish restoring structure from recovering data and keep execution authority separate from review.

## R

For data transformations, inspect semantic identity and excluded records as well as shape/type. A structurally valid output can still refer to the wrong entities; keep domain-method judgments outside declared expertise.

## Rust

For safety wrappers, review the full permitted input contract rather than only current call sites. Examples must distinguish enforced constraints from documented assumptions that public callers can violate.

## Fortran

Compiler/runtime configuration can change state ownership without a source-level declaration change. Trace the effective settings into caller concurrency and distinguish a configuration-dependent risk from an unconditional language claim.

## Go

For resource/performance smells, establish lifetime and workload bounds before calling them defects. Include a bounded clean case so a useful heuristic cannot become an unconditional ban.

## Delphi/Object Pascal

For designer or packaged projects, include declarative resources that bind behavior to code. Require readable evidence tied to the captured bytes and avoid claiming full coverage from text source alone.

## PHP

At language boundaries, follow the value into the receiving interpreter and evaluate protections for that context. A sanitizer or type check in the producing language is not universal downstream safety.

## Scratch

For non-text source, define provenance and usable finding locations before claiming reviewability. Bind decoded artifacts to original bytes, use actual representation lines plus stable semantic IDs, and keep extraction separate from execution.

## 2026-09-13 — GitHub Actions review boundaries

Distinguish provenance from safety: a pinned dependency is stable, not necessarily safe. Define evidence gaps for referenced implementations and applicability mappings for supporting files. External authoring or validation instructions must not expand a generated reviewer's permissions; mercenary integration is deferred. Applied while reviewing the new GitHub Actions member.

## 2026-09-13 — Bicep evidence coverage

Preview success is not complete coverage: check omitted/unevaluated resources and bind evidence to actual inputs and target scope. Keep broad framework guidance selective and consequence-based.

## 2026-09-13 — Terraform safeguard lifetime

Inspect the lifetime of a safeguard itself: a configuration-local protection may vanish when the protected declaration is removed. Avoid claiming safety from a guard name alone.

## 2026-09-13 — ARM parameter ownership

Configuration-only changes can alter runtime authority. Follow parameter files to their owning template and invocation; ambiguous serialization extensions do not establish technology or scope.
