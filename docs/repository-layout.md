# Repository layout

MARC combines executable assurance tools with a shareable skill catalogue. The root contains project entry points; implementation and skill content have separate directories.

```text
README.md                 Project overview and setup entry
LICENSE                   MIT licence
AGENTS.md                 Contributor-agent guidance
CONTRIBUTING.md           Contribution and validation rules
IMPROVEMENTS.md           Short project improvement history
package.json              Local test commands, no runtime dependencies
src/quality/              Existing controller, adapters, tests and fixtures
  browser-host/           Optional ASP.NET UI hook and its smoke check
skills/
  marc/                   Captain SKILL.md, references and IMPROVEMENTS.md
  marc-*/                 One folder and improvement register per crew member
docs/                     Configuration, setup prompt and architecture guidance
examples/                 Synthetic consumers with no inherited exceptions
templates/                Empty consumer defaults
scripts/                  Installation/maintenance tools, when needed
```

## References and decisions

Reviewed on 2026-09-13:

- [vercel-labs/skills](https://github.com/vercel-labs/skills) separates CLI source, scripts, tests and a skills directory. Its documented discovery supports `skills/<name>/SKILL.md`. Adopt the source/catalogue separation; MARC keeps existing tests beside their modules to preserve relative imports during extraction.
- [mattpocock/skills](https://github.com/mattpocock/skills) uses a skills catalogue with docs and scripts, and provides a per-repository setup entry. Adopt discoverable skills and explicit consumer setup. MARC's guarded controller also needs its executable bundle; installing skill text alone is insufficient.
- [garrytan/gstack](https://github.com/garrytan/gstack) keeps skill-specific material with its skill and separates shared libraries, scripts and contributor documentation. Retain MARC's sibling references. Use a single `skills/` catalogue to keep the root compact as the crew grows.

These repositories informed placement, not MARC's review authority or workflow. No third-party source was copied from them. A stock skills installer may discover this catalogue, but full MARC execution requires the matching pinned controller and consumer configuration.

## Migration boundaries

Relocate existing `scripts/quality` modules together to `src/quality`; do not refactor their internal responsibilities during the move. Move the eight MARC skill folders together to `skills`, preserving their names and sibling references. Move the generic configuration guide and setup prompt to docs, Python consumer to examples, and empty ignore default to templates.

Update bundle-root resolution, trusted digest coverage, CLI instructions, test fixture paths and documentation links as one change. Tests must prove the relocated source still binds every required skill and consumer governance file, and reject a modified or unpinned external bundle.

Consumer policies, existing exception lists, runtime settings, reports and run state stay with the consumer. A consumer pins the whole bundle in a Git submodule and retains thin command/skill forwarding files for existing entry points. Never copy the consumer's Git history into this repository. Keep routing changes separate from extraction.
