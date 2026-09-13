# Lean infrastructure review

Bicep, Terraform and ARM template members review deployment intent and supplied evidence. They do not provision infrastructure or certify a whole cloud environment. Prioritize changes to resource identity and data retention, privileges and exposure, secret handling, dependency provenance and evidence coverage. Consider cost, availability and recovery when the changed resource affects an established workload requirement; avoid speculative architecture redesign.

## Selected guidance

Research checked 2026-09-13. The [CNCF project best-practices index](https://contribute.cncf.io/projects/best-practices/) and [security guidelines](https://contribute.cncf.io/projects/best-practices/security/) inform controlled review, least privilege, secret protection and dependency assessment. These are selected principles applied to IaC, not a CNCF compliance checklist. Badging, committee structures, blanket tool adoption and unrelated recommendations are outside these members' scope. Existing MARC gates retain their authority.

For Azure, [Well-Architected IaC guidance](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/infrastructure-as-code-design) informs repeatable configuration, appropriate module ownership and quality checks. Apply service-specific recommendations only when supported by the affected workload and supplied primary-source evidence. No automatic migration or prescribed module size is required.

## Evidence and execution

Read the changed definitions, parameters and affected callers in both frozen revisions. Bind supplied previews to source, input identities, target scope/environment, tool/provider versions and relevant state observation. Use sanitized evidence without exposing secret values. Stale previews, targeted plans and unevaluated sections cannot prove the omitted changes safe. Identify the unresolved consequence and evidence needed; do not demand live execution for a harmless documentation change.

Reviewers must not run init, plan, what-if, deployment scripts, providers or external data programs. Such commands can execute code, download dependencies or contact credentialed services even when described as validation. The Captain arranges authorized isolated evidence; approval of a PR does not authorize apply, deletion, state repair or deployment. Source cannot prove live drift, recovery capability or effective cloud policy by itself.

## Selection

All three members start at 1.0.0. Confirm trusted areas using technologies `bicep`, `terraform` or `arm-templates`; the current impact classifier does not infer them. Bicep applicability recognizes `.bicep` and `.bicepparam`; Terraform recognizes `.tf`, `.tf.json`, `.tfvars`, `.tfvars.json` and `.terraform.lock.hcl`. Path applicability alone does not classify impact or remove missing-mapping holds. ARM JSON and parameter JSON require content-confirmed area mappings: ordinary JSON is not ARM.

For example, add `{ "id": "bicep", "version": "1.0.0" }` to the confirmed member list and an area `{ "paths": ["^infra/azure/"], "technologies": ["bicep"], "reason": "Confirmed Bicep deployments and their parameter files." }`. Replace the example from actual source. Map shared modules to their callers; narrow mixed directories appropriately. Generated ARM also needs its Bicep source and compiler provenance, with both members when both representations require review. Add the GitHub Actions member for workflow logic and language members for invoked code.

Discovery is not activation. Unsupported or unmapped behavior continues to hold. No IaC runner, scanner, cloud adapter or mercenary mechanism is added. Extend these criteria gradually through concrete findings and community review.
