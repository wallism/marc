# C# architectural review guide

These review questions operationalize established design principles; they are not a checklist of mandatory patterns. Apply them to the changed behavior and its callers. A finding needs the evidence and proportionality required by [the skill](../SKILL.md). Equivalent working designs are acceptable.

## Business rules and SOLID

| Principle | Inspect for a concrete consequence |
| --- | --- |
| DRY — Don't Repeat Yourself | Does the change duplicate the same business decision so fixes can diverge? Locate its existing owner and all affected copies. Similar syntax or independently evolving rules alone do not justify sharing an abstraction. |
| Single responsibility | Are independently changing policies entangled, making a local change affect unrelated behavior? Identify those responsibilities and the resulting coupling; class length or constructor parameter count alone is not a defect. |
| Open/closed | Does an existing variation point allow the new behavior without destabilizing established cases? Repeated edits across coupled dispatch sites can justify an extension seam; a finite switch or one new case alone cannot. |
| Liskov substitution | Do implementations preserve the caller's promised inputs, outputs, invariants and failure semantics? Trace a real caller that breaks when implementations are substituted. |
| Interface segregation | Are consumers forced into unrelated operations or implementers into unsupported behavior? Split contracts when that dependency causes a concrete problem, rather than mechanically creating tiny interfaces. |
| Dependency inversion | Can business policy remain independent of replaceable I/O and presentation details? Identify hidden dependencies or cycles that obstruct change/testing; concrete value objects and pure helpers do not inherently need interfaces. |

DRY, encapsulation and responsibility boundaries are covered by Microsoft's [architectural principles](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/architectural-principles). The remaining SOLID questions draw on [Microsoft's C# SOLID discussion](https://learn.microsoft.com/en-us/archive/msdn-magazine/2014/may/csharp-best-practices-dangers-of-violating-solid-principles-in-csharp); that historical article is conceptual background, not authority for current language limitations or every suggested pattern. The qualifications above are MARC's review calibration.

Prefer the smallest design that meets current requirements. Separate domain decisions from transport, rendering and storage where that protects an actual boundary. Preserve encapsulated state transitions; exposing mutable internals can let callers bypass validation. Avoid speculative extension frameworks or shared helpers with unrelated caller-specific flags. Deterministic policy logic should be testable without unnecessary database/network setup; use the project's existing seams before introducing new layers.

## C# and .NET execution boundaries

Read the sections relevant to the changed path; absence of a framework or pattern does not create a finding.

- **Contracts and nullability:** Trace public API and serialized/persisted compatibility, including missing/default values and actual external inputs. Nullable annotations and `!` do not validate data at runtime. Keep invalid states and boundary failures explicit; choose the repository's established error contract. See [nullable reference types](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/null-safety/nullable-reference-types).
- **Dependency and resource ownership:** Inspect DI registrations as well as constructors. Check scoped dependencies retained by longer-lived objects, shared mutable singleton state, and disposal responsibility. Container-owned dependencies should not be disposed by borrowers; manually created resources need a defined owner. Service lookup inside business code can hide requirements, but scope factories and composition roots have legitimate roles. See [dependency injection guidelines](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/guidelines).
- **Async and concurrency:** Trace who awaits or otherwise supervises every task and how its scope survives completion. Inspect sync-over-async blocking in request/UI paths, `async void` outside required event contracts, work escaping disposed scopes, and unbounded fan-out. Propagate cancellation where the operation supports it; consider completed side effects before aborting or retrying. Identify a real interleaving for shared-state races. Async does not make objects thread-safe. No blanket `Task.Run`, `ConfigureAwait(false)` or `ValueTask` mandates: host and workload matter. See [async scenarios](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-scenarios) and [task lifetime ownership](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/keep-async-methods-alive).
- **Failure and consistency:** Check whether exceptions become false success, cancellation becomes an unrelated error, stack context is lost, or failure leaves partial state. Follow the actual transaction/compensation boundary and retry behavior; duplicated non-idempotent side effects need a concrete correction. Do not mandate exceptions versus result types or a distributed transaction without context. See [exception best practices](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions).
- **Data access and cost:** Trace deferred enumeration, repeated queries, unbounded materialization and query-per-item loops against the actual provider and workload. Preserve tenant filters and concurrency/consistency guarantees. Recommend bounded queries or batching where source or supplied measurements show the cost; avoid speculative micro-optimizations. [EF Core efficient querying](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying) gives provider-specific examples; do not impose EF APIs on other stores.

## Calibration examples

- A singleton retains a scoped, non-thread-safe data session used by concurrent requests: report the registration, ownership and affected calls. An interface with one implementation, by itself: no finding.
- A new pricing path copies an existing rounding rule but updates only one copy: trace the two paths and identify the shared rule. Two similar mappings for different external contracts, by themselves: no finding.
- A new implementation returns null where the interface promises a value and callers dereference it: report the violated contract. A working switch with a small closed set of cases: no automatic strategy-pattern recommendation.

Sources reviewed 2026-09-13. These links explain the stored guidance; they do not grant a reviewer network access. Where newer framework behavior is material and supplied evidence is insufficient, ask the Captain for that evidence under existing permissions. Source/contract checks do not establish live review quality.
