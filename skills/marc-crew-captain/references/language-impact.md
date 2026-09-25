# Relevant scope across languages

Apply this alongside the selected member's review guide. These are shared evidence rules, not additional authority or a complete language parser.

- Start with actual changed behavior in both revisions, including bodies whose names/signatures did not change. Identify the owning symbol, module or data contract. Follow callers upward and dependencies downward while the effect can propagate.
- Treat search hits as leads. Confirm symbol identity and the relationship in source before describing an unchanged file as affected. A common name, comment, test name, directory, package membership or shared import alone does not establish behavioral impact. Do not enumerate an entire project, package or include tree by default.
- Include relevant tests, registration, generated code and resources when they exercise or bind that behavior. Trace the particular binding or consumer, not all neighboring declarations. Tests/startup files are not blanket search roots; investigate an actual shared helper or registration change when the diff warrants it.
- Stop each chain at a demonstrated unchanged contract or irrelevant use. Do not stop just because a budget was reached, no text hits were returned, or a function was not renamed. Identify necessary unresolved relationships as evidence gaps and block.
- Keep reports compact: deduplicate paths, state the concrete relationship and cite owning code. Summarize ruled-out scope instead of logging every inspected file. Never discard genuine dependencies merely to meet a preferred report size.

## Language-specific relationships

Use the relevant row and other rows when crossing language boundaries. Confirm names, case rules, overloads and target configuration using consumer source and supplied evidence.

| Language | Trace when affected; avoid blanket expansion |
| --- | --- |
| Python | Function/method callers, import aliases/re-exports, decorators, callbacks, inheritance and mutable state. Resolve actual imported objects; a module name or `__init__` import does not implicate every package member. |
| C | Function callers/pointers, macros, shared structures and ABI consumers. Bind headers and active preprocessing to the supported build; an include does not make every translation unit behaviorally affected. |
| C++ | Overloads, methods, virtual dispatch, template instantiations, callbacks, ownership and ABI consumers. Trace the affected member/instantiation through actual include/module consumers, not the whole class/header tree from a common spelling. |
| Java | Methods, interfaces/implementations, inheritance, package/static imports, callbacks and actual injection/reflection bindings. Distinguish fully qualified types; a shared package or annotation does not implicate every class. |
| C# | Methods, interfaces, overloads, inheritance, partial/generated types, dependency injection and serialization consumers. Resolve namespaces, aliases and bindings; a registration does not implicate every service or startup-name match. |
| JavaScript/TypeScript | Imports/exports, re-exports, aliases, callbacks/events, components and runtime data contracts. Resolve the affected export and configured path alias; do not enumerate a whole barrel, all event handlers or an entire entry point. |
| Visual Basic .NET | Functions/Subs/properties, overloads, interfaces, partial types, events (`Handles`/`AddHandler`), late binding and cross-assembly callers. Account for case-insensitive names and confirmed bindings; a shared designer/namespace does not implicate every control/class. |
| SQL | Routines, tables/columns, views, triggers, constraints, migration compatibility and application query consumers. Use actual dialect/schema and quoted-name rules; inspect dynamic SQL and embedded query strings semantically. A name in a comment, sample or unrelated schema is not a dependency. |
| R | Function bindings, environments, package exports, S3/S4 dispatch, formulas/nonstandard evaluation, data shape and native calls. Establish the actual binding and data contract; do not include every package function or script using a common column name. |
| Rust | Functions/methods, `use` aliases/re-exports, traits/implementations, macros, feature/target configuration and FFI. Follow the changed item and actual uses; a module import or generic trait name does not implicate a whole crate. |
| Fortran | Procedures, module `USE`/`ONLY` and renames, generic interfaces, procedure pointers, shared storage and C bindings. Account for case-insensitive names, fixed/free form and build context; do not expand all members from one `USE` or common variable spelling. |
| Go | Functions/methods, receivers, implicit interfaces, package aliases, callbacks, goroutine/channel contracts, build tags and cgo. Resolve actual callers/implementations; imports or a common method name alone do not implicate every file. |
| Delphi/Object Pascal | Unit exports, methods/overloads, interfaces, procedure variables, initialization/finalization and DFM/FMX event/property bindings. Use case-insensitive identity and readable designer evidence; one `uses` clause or form name does not implicate the entire unit/resource tree. |
| PHP | Functions/methods, namespaces/aliases, traits/interfaces, actual include/autoload and callback/router bindings, templates and query consumers. Verify the resolved callable and host behavior; do not treat every Composer class or route as a caller. |
| Scratch | Exact target/block IDs, custom-block calls, broadcasts/receivers, shared versus sprite-local variables, clones and referenced assets in verified decoded evidence. Names or printable archive bytes are insufficient; list only sprites/assets reached by the changed relationship. |

Infrastructure belongs in scope through a concrete changed provisioning/configuration/runtime contract. An application identifier resembling `serviceAccount`, a README mention or a common startup filename is not that evidence. Relevant infrastructure changes still require its specialist and normal gates.

## Controller assistance and its limits

[Discovery](../../../docs/impact-discovery.md) uses bounded lexical leads, not language services. Common types, `function`/`def`/`func` declarations and exported JavaScript variables can seed searches; it does not recognize every native function form or reliably resolve case-insensitive/qualified names. Python indentation, C/C++ declarators, Rust `fn`, Go receivers, R assignments, VB/SQL/Fortran/Delphi routines, macros and dynamic dispatch need semantic reviewer attention. Literal JS/TS relative imports and local web resources have additional support; native package/import graphs are not resolved universally.

Common native comments and ordinary strings are filtered; interpolation, embedded SQL, generated declarations and unusual/nested literal syntax can still hide real relationships or produce misleading leads. Inspect these when changed behavior reaches them. Scratch archives/binary blobs do not seed textual discovery. Require source-bound readable evidence; absence of lexical leads is not a clean review.

Discovery budgets and unreadable-source holds remain enforced. Missing expertise requires trusted configuration and recapture; reviewers cannot edit frozen inventories or waive holds. This shared Captain clarification leaves member manifests/applicability and consumer pins unchanged; adoption changes bundle/policy identity and requires fresh evidence.
