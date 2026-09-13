# Crew configuration and contributions

The Captain retains the existing full and simple policy routes. Optional technology specialists add assurance to either route; they cannot replace security, correctness, test or browser requirements. The specialist catalogue covers C#, JavaScript/TypeScript, React web, Blazor and front-end interactions. A language reviewer does not imply a language-specific scanner or runtime adapter exists.

## Consumer selection

Setup uses the [technology discovery and contribution handoff](technology-discovery.md): explicit discovery exclusions, evidence-based language identification, one recommended authoring list and a separate creation decision. Pending contributions retain missing-expertise holds and the existing pin until reviewed bundle activation is confirmed.

Set `crew` in the trusted consumer `.marc/config.json`:

```json
{
  "schema": 1,
  "members": [
    { "id": "csharp", "version": "1.1.0" },
    { "id": "javascript", "version": "1.0.0" },
    { "id": "blazor", "version": "1.0.0" },
    { "id": "frontend", "version": "1.0.0" }
  ],
  "areas": [
    {
      "paths": ["^src/Shared/"],
      "technologies": ["blazor"],
      "reason": "Shared services are consumed by the server-rendered UI."
    }
  ]
}
```

This is the value of `crew`, not a complete consumer configuration. Areas record source-backed dependency/caller relationships that cannot be reliably inferred from filenames, including dynamic loading, dependency injection, runtime Markdown or nonstandard technologies. Each matching area adds technologies; it cannot suppress detected impact. The existing `technologies` field documents the whole stack for reviewers; it does not install or trust code. Confirm the member list, exact versions, every area and all omissions during setup. Missing `crew` preserves legacy generic review; new setup must explicitly present that omission and its limits if specialist support is deferred.

Capture reads the actual diff and searches both immutable trees for filename and declared-type/function references. It follows up to four rounds, 128 new identifiers per round and 300 affected files before broadening to all configured expertise. This is an over-approximation, not a complete semantic graph. Dynamic/reflection relationships require configured areas and independent caller review. Source inspection failure holds; budget uncertainty broadens review. Shared manifests, configuration and instructions broaden selection. Unknown behavioral paths require a configured mapping; unsupported detected technologies require an installed specialist. Configuration examples do not establish expertise.

The controller records selected and omitted versions and reasons, affected paths, detected technologies, holds and a selection hash. The front-end member applies to web markup/styles or combined Blazor and JavaScript impact. Blazor/web impact and browser-facing JSX/TSX require full review and independent browser evidence. C# or JavaScript alone can retain a valid simple route, with the selected specialist added to the focused test gate. Documentation without runtime/instruction impact can omit optional specialists. Mandatory gates remain governed by the existing policy.

The Captain checks the scope against the complete diff and affected callers. If a reviewer finds missing expertise, return blocked with source evidence; update the trusted configuration through an authorized change and recapture. Candidate instructions cannot install members, alter trusted areas, select a different version or approve their own policy change. A blocking finding cannot disappear through voting or replacement reviewers.

## React web consumers

The [React member](../skills/marc-react/SKILL.md), version 1.0.0, reviews React-specific behavior alongside JavaScript and front-end expertise. Its [review guide](../skills/marc-react/references/react-review.md) links official sources and distinguishes defects from preferences. Add it only to consumers with confirmed React web code. A React consumer's `crew` value can be:

```json
{
  "schema": 1,
  "members": [
    { "id": "javascript", "version": "1.0.0" },
    { "id": "frontend", "version": "1.0.0" },
    { "id": "react", "version": "1.0.0" }
  ],
  "areas": [
    {
      "paths": ["^client/src/"],
      "technologies": ["react", "web"],
      "reason": "Source and imports confirm this area contains React web components and their Hooks."
    }
  ]
}
```

Confirm and replace the example path from actual manifests/imports/callers. Map Hooks in `.js`/`.ts`, nonstandard component extensions and shared consumers where necessary. JSX/TSX alone selects JavaScript/front-end, not React: other frameworks use that syntax. The top-level descriptive `technologies` list alone does not drive selection. Existing bounded reference discovery reads both revisions; explicit areas cover relationships it cannot infer.

Captured `react` impact conservatively requires full review and independent browser evidence, even without JSX. A `react` area without an available configured React member holds. React Native is outside this member's coverage; do not map it as React web. This adds no React runtime provisioning adapter: the consumer must provide suitable isolated runtime/CI guidance, or required evidence remains blocked. Installing the bundle or its discovery wrappers does not opt an existing consumer into this member. No existing consumer configuration is changed by this addition.

## Contribution contract

When setup discovers missing expertise, propose an available member's activation or a reviewed bundle upgrade if it supplies the required coverage. Otherwise propose creating or extending a member with the crew creator and contributing it through a PR back to MARC. Present the technology evidence, scope, companions, exclusions and validation needs with the setup proposal. Author in a separate MARC source checkout using generic guidance and synthetic examples. Contribution and consumer activation are separate steps; missing-expertise holds remain until the reviewed member is available in the consumer's confirmed pinned configuration and review evidence is recaptured. See the [setup prompt](setup-prompt.md).

Use [marc-crew-creator](../skills/marc-crew-creator/SKILL.md) to create or improve a member. It guides primary-source research, technology-specific quality criteria, practical finding thresholds and integration checks. Shared operational safeguards remain fixed; architectural prescriptions can vary with the ecosystem. It is an authoring utility, not a selectable specialist, and has no `crew.json`. Example request: `Use marc-crew-creator to add a Rust member to MARC; research official guidance and leave consumer activation unchanged.`

The [C# review guide](../skills/marc-csharp/references/architectural-review.md) explains the member's practical DRY/SOLID and runtime criteria, evidence threshold and exclusions. Version 1.1.0 expands review guidance without changing applicability, permissions or gate schema. Consumers upgrading from 1.0.0 must update both the bundle pin and their exact C# member version; other members remain at 1.0.0.

Place each specialist under `skills/marc-<id>/` with `SKILL.md`, `crew.json` and `IMPROVEMENTS.md`. Use the [C# member](../skills/marc-csharp/crew.json) as a complete contribution example. Keep supporting references beside the skill. All trusted skill/reference bytes are included in policy identity.

| Manifest field | Contract |
| --- | --- |
| `schema`, `compatibility` | `1`, `marc-crew-v1`. Unknown versions fail closed. |
| `id`, `version` | Stable lowercase specialty ID and exact three-part semantic version. |
| `specialty`, `scope` | Plain name and bounded responsibilities; explain overlaps. |
| `covers` | Canonical technology IDs for which this member supplies expertise. A composite reviewer can supplement other members. |
| `applicability` | Arrays `anyTechnologies`, `allTechnologies`, `pathPatterns`; a nonempty matching alternative selects the member. Empty alternatives never match everything. |
| `inputs`, `checks`, `evidenceRules` | Required frozen artifacts, specialty checks and evidence/stop rules. |
| `permissions` | Exactly `source:read`, `evidence:read`, `result:write`. The last permits only the assigned external result file. No execution, network, credentials, installs, source writes or merge authority. |
| `outputSchema` | `marc-gate-v1`: standard verdict/source/base/policy/session/summary/evidence/findings plus member and selection identity. See the [evidence contract](../skills/marc/references/evidence.md). |
| `cases` | At least two synthetic applicability cases with `technologies`, `files`, `selected`; include positive, negative and overlap cases relevant to the specialty. |

Change the member version when its contract/instructions change; preserve the ID. A bundle commit versions the core Captain, mandatory gates and repair skills. Consumer members use exact manifest versions, within an immutable bundle pin. Content hashes and the effective policy digest prevent unchanged version labels from reusing altered instructions. Every source/base/config/policy/tool/member change requires fresh capture and review; rollback does not authorize replaying old approvals.

Installation is deliberate: review contribution instructions, references, scope, claimed coverage, permissions and focused tests before adding the bundle version to trusted consumer configuration. The installer creates discovery wrappers, not authority to use every discovered member. Host permissions/isolation must enforce these boundaries; JSON permission declarations do not create a sandbox. Do not ship executable specialist hooks as implicit reviewer setup.

Run `node --test src/quality/crew.test.cjs` and validate each changed skill's metadata. Add meaningful source/caller and gate regressions when extending the router; manifest examples alone do not prove review quality. Update the member and umbrella registers together. Other ecosystems can contribute the same declarative contract, trusted area mappings and synthetic tests without access to any private consumer repository.
