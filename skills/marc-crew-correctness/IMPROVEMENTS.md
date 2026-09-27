# marc-crew-correctness improvements

## 2026-09-27 — Check previously accepted states when guards change

The fresh E6–E9 PR16 assessment passed a change that added a `reportCreatedAt` precondition and removed the `merge` exemption, blocking operator-approved merges of PRs with still-supported legacy SHA-named reports. The reviewer read the code but did not consider the legacy state; three earlier fresh reviews had flagged it. When a guard is added or an exemption removed, list the states the old code accepted and confirm each is still handled or deliberately retired. A seeded-defect and clean-alternative pair in the repository's `evals/marc-crew-correctness` corpus cover it; model detection rates remain unmeasured.

## 2026-09-27 — Remove E4 and retain E5 measurement

Restore separate correctness and intent sessions, original intent-only refresh and the original simple-route rules after the owner rejected E4. Keep E1–E3 and E5 phase/session measurement unchanged. The fresh comparison showed higher overall input, output and elapsed time; it did not justify the proposed gate changes. Historical experiment results remain recorded; no trusted policy was activated.

## 2026-09-27 — Structured intent in one correctness session

**Withdrawn:** E4 review-policy changes described in this entry were removed at the owner's request after the fresh comparison. E5 measurement remains; see the removal entry above.

Under explicit correctness-v1 policy, inspect intended outcomes alongside correctness and return nested static intent evidence with a single reviewer identity. Mismatches still hold for human action. Separate full-review gates remain independent.

## 2026-09-27 — Focused reviewer contract

Load the common independent-review contract and applicable specialized evidence only. Neutral packets retain complete diff access, frozen identities, scope expansion and existing gates. See [assessment sessions](../../docs/assessment-sessions.md). Local validation and an experimental PR replay do not activate consumer policy.

## 2026-09-13 — Consistent crew skill naming

Standardized published names, paths and references on `marc-crew-<name>`. Preserved reviewer IDs, manifest versions and operational instructions.

## 2026-09-13 — standalone layout

Moved this member into its own published skill folder, preserving its instructions and sibling references. Consumer configuration remains explicit; controller commands now resolve under `src/quality`. This starts standalone member history without importing consumer reports or inventing historical entries. See [layout decisions](../../docs/repository-layout.md).

Update this file and the [umbrella register](../../IMPROVEMENTS.md#register-scope) together only for an authorized material change to the process; routine documentation, infographic, formatting and housekeeping edits need no entry.
