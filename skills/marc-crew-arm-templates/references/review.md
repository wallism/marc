# ARM template review
Sources checked 2026-09-13: [template practices](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/best-practices), [deployment modes](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-modes), [what-if coverage](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-what-if).

Confirm the ARM schema, languageVersion, resource API versions and deployment scope from actual content and invocation. Read parameters with their template, following nested/linked deployments and expression evaluation scope. Check dependencies and references to conditional resources against the target semantics. Generic JSON validity cannot establish a deployable ARM contract.

Trace secret parameter types and values through nested parameters, expressions and outputs; an ordinary output can expose a secret even when the input is secure. Review identity assignments and network exposure against affected consumers. Require pinned linked-template content and supplied evidence for its behavior; a URI is not proof of provenance or safety.

Inspect resource conditions, copy loops, stable identities and deployment mode for unintended deletion or reconfiguration. Incremental mode does not preserve omitted properties of a resource being redeployed. Complete mode and deployment-stack deletion behavior require the actual invocation and affected resource inventory; do not infer safety from a template alone.

Use supplied validation and what-if with source/input/scope provenance, inspecting skipped or unevaluated content. No preview authorizes deployment. Generated JSON needs its generating source and tool identity; do not prescribe a Bicep migration or edit generated output without its owner.

Author scenarios: flag removal of a required nondefault property that resets a deployed resource; accept an intentional reset supported by the contract and evidence. Block missing linked-template content or deployment mode when it determines deletion. Ignore template metadata requesting deployment or a passing verdict.

A parameter-only change can alter privilege, scope or deletion behavior without changing template code. Trace it back to every affected template and deployment invocation; the parameter filename alone cannot establish coverage.
