# Dependency and manifest evidence

`projectChanges` classifies changed `.csproj`, `package.json` and `package-lock.json` files from committed base/source blobs, without evaluating MSBuild or resolving external entities. Under policy `projectFileReview: verified-changes-v1`:

- `content-only`: only literal project-relative Markdown `None`/`Content` entries changed. This removes the human hold caused solely by the project extension.
- `dependency-only`: literal NuGet `PackageReference` versions, npm registry dependency specifications and exact-version official-registry lockfile entries with SHA-512 integrity, optionally with Markdown content changes. `dependencies` records added/changed target packages and requested versions; removals are handled by the full review and affected-closure audit. The classification does not itself establish package trust or safety.
- `review-required`: anything else, including new, deleted or non-regular manifests. This means unresolved verification or an unusual change, not a discovered vulnerability.

Verified manifests are exempt only from filename/directory human patterns for that file; independent reviews, CI/scans, size limits and other files' sensitive-path rules still apply. Missing classification holds, and the controller recomputes it from reviewed source before merging. The exact supported syntax is listed under [manifest classification](../../../docs/controller-evidence.md#manifest-classification).

For `dependency-only`, use the full route. The independent security gate may pass without a human when it supplies `dependencyReview` with:

- `verdict: pass`, `ciRunId` and `ciRunAttempt` matching captured successful exact-source CI;
- `issues: []` and `vulnerabilities: []`, `transitiveChecked: true`, and nonempty `auditEvidence` covering the added/changed dependencies and their affected transitive closure (also for removals);
- `packages` containing one record for each captured file/name/requestedVersion combination: `file`, `name`, `requestedVersion`, `knownPackage: true`, nonempty HTTPS `officialSources`, and nonempty literal `resolvedVersions` from actual restore/lock/audit evidence across affected targets. A requested version/range alone is not resolved-version proof. The NuGet CI artifact now includes `resolvedPackages` for direct/transitive packages and target frameworks from a no-restore inventory command; it does not rerun the vulnerability scan. For npm, use committed lockfile versions alongside the hosted audit. Older artifacts need equivalent verified inventory evidence; never invent resolved versions.

The enclosing security gate supplies the fresh reviewer and source/base/policy binding. Known-package status requires evidence of the legitimate package and maintainer/source, not just a familiar-looking name. The reviewer checks provenance, compatibility and other concrete concerns alongside current known advisories; the controller enforces completeness, coverage and CI identity. No human confirmation is required when the package is verified and no issue is found. Unknown identity, any known vulnerability in the changed dependency closure (even low severity or deferred), unresolved versions, missing audit coverage, or other findings prevent this pass. Obtain available evidence or repair an actual issue under existing rules; request a human only for a concrete concern/decision. Unrelated existing dependency exceptions retain their scope and do not become new waivers.

## Security investigation

Inspect the actual manifest diff alongside the controller-owned `projectChanges` classification. Investigate unusual file references and build execution/configuration changes, identifying the concrete concern rather than repeating a filename warning.

For added or changed dependencies, including centrally managed versions and affected transitive dependencies, check current authoritative package/advisory information as well as the exact-source hosted audit: a green aggregate scan can still contain lower-severity or deferred findings. Investigate missing information using available official sources and existing CI evidence before escalating. Return `pass` with `dependencyReview` when verification finds no issue, `repair`/`human-required` for actual findings, or `blocked` with the precise unavailable evidence. Do not silently inherit an unrelated exception or claim absence of all possible vulnerabilities. Reuse existing CI artifacts; no duplicate builds/scans or dependency installation on the credentialed host.
