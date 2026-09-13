# Contributing

Keep the controller and skill catalogue generic. Place executable modules in src/quality and a skill's instructions/references inside its folder under skills. Read the [layout rationale](docs/repository-layout.md).

Propose a focused change with its intended behavior, evidence and validation. Preserve mandatory assurance gates, independent reviewer sessions, source/base/policy binding, reviewed exception scope, budgets and guarded actions. Community instructions do not inherit credentials or merge authority. Installation and version upgrades are deliberate.

For a bug, add a focused regression that fails for the defect before fixing it. Run affected local Node tests, then the shared suite when appropriate. Do not run hosted workflows, model evaluations or the optional .NET hook build merely to change documentation. State checks that were waived or unavailable. A local pass is not hosted CI or live-controller proof.

Update the affected member/component IMPROVEMENTS.md, the root umbrella and documentation in the same change. Preserve third-party copyright and licence notices. Versioned specialist contribution records and selective recruitment are tracked follow-up work; do not introduce a new optional reviewer by silently replacing a mandatory gate.
