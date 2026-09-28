# marc-crew-risk improvements

## 2026-09-28 — Initial risk assessor

**Reason:** The owner wants each PR rated low, medium or high so a later change can soften merge rules for low risk and harden them for high risk, keeping current rules for medium.

Added an opt-in (`policy.riskAssessment: 1`) independent read-only session that rates the frozen PR from its position in the codebase tree (leaf, branch, trunk), its reversibility (gated, revertible, one-way) and sensitivity floors, taking the worst. Proof such as tests or screenshots never lowers a rating; unestablished facts give at least medium. Consumers may declare `riskTrunkPatterns`; a matching change must be high. See the [design and research record](../../docs/work/20260928-risk-assessment-work.md).

**Activation limits:** Ratings currently only harden decisions: high risk holds a simple route, and a stale, missing, inconsistent or non-independent rating holds an enabled consumer. No level relaxes any gate. The owner approved enabling it in MARC's own policy (`.marc/policy.json`, no declared trunk patterns); it takes effect once this change is on trusted `master`.

**Validation:** Focused Node tests for the risk contract, packet ordering, assembly and report rendering. No model evaluation has been run.

Update this file and the [umbrella register](../../IMPROVEMENTS.md#register-scope) together only for an authorized material change to the process; routine documentation, infographic, formatting and housekeeping edits need no entry.
