# Technology discovery and pending crew contributions

Setup inventories the consumer independently of its existing technology list and the router's supported extensions. This is agent-led discovery, not an executable ignore filter or a new configuration schema.

## Discovery exclusions

Apply these case-insensitive defaults before language identification. Group excluded paths by category; do not open, research or recommend a member solely because these files exist.

| Category | Default exclusions |
| --- | --- |
| Office documents and PDFs | `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.pdf` |
| Images | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.ico`, `.bmp`, `.tif`, `.tiff` |
| Audio and video | `.mp3`, `.wav`, `.flac`, `.ogg`, `.mp4`, `.mov`, `.webm`, `.avi` |
| Archives and compiled output | `.zip`, `.7z`, `.gz`, `.dll`, `.exe`, `.pdb`, `.class`, `.pyc` |
| Dependency and generated directory segments | `node_modules/`, `bin/`, `obj/`, `.venv/`, `__pycache__/` |

Inventory tracked files; do not traverse Git internals, secret stores, dependency installations or generated output. Do not scan MARC's own bundle as consumer technology. Check root and nested manifests, imports and build configuration outside exclusions to identify dependencies. Do not blanket-exclude Markdown, JSON, YAML, XML, SVG, scripts, lockfiles or an entire documentation directory: these can define runtime behavior or contain a documentation application.

Show the applied categories and any consumer overrides with reasons in discovery output. Save confirmed overrides in consumer project guidance, not invented `.marc/config.json` keys. A tracked/generated directory containing authored code needs an evidence-backed override. Excluded documents such as `.docx` remain excluded from language research; if application/build references establish runtime use, record that dependency and review the consuming code and applicable asset/security requirements. This does not create a DOCX specialist requirement.

These exclusions apply only to language research and specialist recommendations. They never remove changed files, suppress secret scans or policy gates, override router holds, or establish that an asset is safe.

## Identify and compare

Use extensions as clues, then confirm with contents, manifests, imports and CI/build commands. For unfamiliar or ambiguous formats, consult current primary documentation only when local evidence is insufficient; group the lookup by format/framework and reuse it within setup. Record unresolved uncertainty rather than repeatedly looking up each file. Stop when scope and coverage can be supported.

For each confirmed technology, report representative paths, language/framework scope, available exact member versions, active coverage, missing expertise, and router/area mapping gaps separately. Group related formats into a bounded specialty rather than creating one member per extension. For example, Bicep and Terraform source can justify two specialists; Terraform scope should follow the actual providers and modules. JavaScript does not alone prove React.

Return one recommended authoring list with proposed member IDs or extensions to existing members, source-backed responsibilities, companion members, exclusions, required research/tests, and separate scanner/runtime prerequisites. Do not assign an available version to an unwritten member. Distinguish creation from activating an existing member or upgrading a reviewed bundle that already contains it. If nothing needs authoring, say so.

Ask one grouped question: **Would you like me to create the recommended crew members using the Create a MARC crew member skill in the MARC source repository?** Allow the user to select a subset in their reply. This confirms local authoring only; preserve any existing publication authorization, otherwise leave a local contribution and PR draft. Full consumer configuration confirmation remains a separate decision and must not delay accepted source authoring.

## Pending PR and resumption

Use `skills/marc-crew-creator/SKILL.md` in a separate MARC source checkout. An open or failed PR may take days: finish the authorized contribution and hand off rather than wait indefinitely, repeatedly poll, or pin an unreviewed branch. No automatic monitoring is created unless requested.

After authoring approval, save a consumer-local handoff outside tracked source unless the user chooses a reviewed, sanitized location. Record:

- Consumer and MARC source checkout locations, current bundle pin and relevant configuration identity.
- Recommended member scopes/versions once authored, evidence paths, and proposed area/detection changes.
- Source branch/commit, PR URL if published, actual check/review status and unresolved findings; use `not published` or `not verified` where appropriate.
- Completed setup work, missing expertise and affected review limitations, and the next resumption instruction.

Keep private consumer identities and state out of the upstream contribution. Retain the last trusted consumer pin and existing members while pending; do not add nonexistent members or erase existing holds. Other PRs may proceed only if ordinary impact selection and all existing gates permit them. For a new consumer, describe any accepted partial configuration as incomplete/report-only, not ready for assurance, and explicitly map confirmed unsupported technologies so missing expertise cannot disappear through omission.

Resume instruction: **Resume the pending crew contribution from this handoff. Verify its current PR, merge and check status; if a reviewed commit containing the members is available, propose the exact consumer pin, member versions and areas for activation. Otherwise report the remaining prerequisite without changing the pin.** Refresh changed facts and affected discovery, not the whole setup from scratch.

## Activate after acceptance

Verify the contribution was merged into the intended upstream branch and identify a full immutable commit containing it with the required successful checks. A closed PR, successful branch build or elapsed time alone is insufficient. Inspect intervening bundle changes and actual manifests. No release tag is required; never use a floating branch as the pin.

Show the old/new full SHA, exact member versions, areas/detection coverage, forwarding changes and validation plan. Obtain confirmation unless this precise activation is already authorized; creation approval alone does not authorize a future unknown bundle. Follow [upgrade and rollback](installation.md#upgrade-and-rollback): update the submodule gitlink and `toolCommit` together, preview and regenerate forwarding files, validate catalogue and focused shared/consumer tests, and commit the integration set together when authorized. Preserve policies, exceptions, locks, reports and spent budgets. Recapture affected assurance evidence after activation; neither a merged contribution nor local validation proves consumer hosted CI or an operational rollout.
