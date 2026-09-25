# Top-15 language coverage

The fixed work list is the [TIOBE September 2026 index](https://www.tiobe.com/tiobe-index/), checked 2026-09-13. TIOBE measures popularity; this is a reproducible selection, not a claim of language quality or universal usage share. Visual Basic here means .NET; Classic Visual Basic is ranked separately. A pre-existing member counts as one completed language.

| Rank | Language | Member ID | Result |
| --- | --- | --- | --- |
| 1 | Python | [python](../skills/marc-crew-python/SKILL.md) | Created 1.0.0; reviewed and refined |
| 2 | C | [c](../skills/marc-crew-c/SKILL.md) | Created 1.0.0; reviewed and refined |
| 3 | C++ | [cpp](../skills/marc-crew-cpp/SKILL.md) | Created 1.0.0; reviewed and refined |
| 4 | Java | [java](../skills/marc-crew-java/SKILL.md) | Created 1.0.0; reviewed and refined |
| 5 | C# | [csharp](../skills/marc-crew-csharp/SKILL.md) | Skipped: existing 1.1.0 |
| 6 | JavaScript | [javascript](../skills/marc-crew-javascript/SKILL.md) | Skipped: existing 1.0.0 |
| 7 | Visual Basic | [visual-basic](../skills/marc-crew-visual-basic/SKILL.md) | Created 1.0.0; reviewed and refined |
| 8 | SQL | [sql](../skills/marc-crew-sql/SKILL.md) | Created 1.0.0; reviewed and refined |
| 9 | R | [r](../skills/marc-crew-r/SKILL.md) | Created 1.0.0; reviewed and refined |
| 10 | Rust | [rust](../skills/marc-crew-rust/SKILL.md) | Created 1.0.0; reviewed and refined |
| 11 | Fortran | [fortran](../skills/marc-crew-fortran/SKILL.md) | Created 1.0.0; reviewed and refined |
| 12 | Go | [go](../skills/marc-crew-go/SKILL.md) | Created 1.0.0; reviewed and refined |
| 13 | Delphi/Object Pascal | [delphi](../skills/marc-crew-delphi/SKILL.md) | Created 1.0.0; reviewed and refined |
| 14 | PHP | [php](../skills/marc-crew-php/SKILL.md) | Created 1.0.0; reviewed and refined |
| 15 | Scratch | [scratch](../skills/marc-crew-scratch/SKILL.md) | Created 1.0.0; reviewed and refined |

Members are created and author-inspected sequentially. Each new member records the defect, legitimate alternative, evidence gap, hostile-input inspection and resulting refinement; transferable feedback is incorporated into the creator before the next member. This does not claim independent reviewer evaluation.

## Selection and activation

Automatic source detection already exists for Python (.py), Java (.java), C# (.cs), JavaScript/TypeScript (.js/.mjs/.cjs/.ts and JSX/TSX), SQL (.sql), Rust (.rs), Go (.go) and PHP (.php). C, C++, Visual Basic, R, Fortran, Delphi and Scratch require confirmed trusted areas. The controller is unchanged. Unknown unmapped behavior still holds; discovering a member does not enable it.

Use canonical technology IDs c, cpp, visual-basic, r, fortran, delphi and scratch. An area adds expertise; it cannot remove detected technologies. Confirm actual consumers before mapping shared headers, generated code, notebooks or designer resources. For example, a confirmed C library can add:

```json
{ "paths": ["^src/native/"], "technologies": ["c"], "reason": "Confirmed C implementation and C headers." }
```

If those headers also serve C++ callers, include cpp and its member. For browser-hosted Scratch, map the project to both scratch and web, configure frontend, and retain independent browser evidence. A .sb3 archive requires a verified readable representation; its filename or screenshot cannot establish logic correctness.

All 13 new members are 1.0.0. The existing csharp 1.1.0 and javascript 1.0.0 members were inspected and skipped without changes. Consumer setup must separately confirm exact bundle pin, members and areas. No new language runner, scanner, compiler or database adapter is included.

## Validation and limits

For current impact scope, all members inherit the Captain's [language-specific caller and relevance rules](../skills/marc-crew-captain/references/language-impact.md). Lexical assistance varies by syntax; supported reviewer expertise does not promise complete automatic caller discovery. Synthetic Git regressions cover native comment/string noise and retained identifier leads across the 14 text languages, opaque Scratch archives, and Go/Python/Java test propagation. These checks do not compile those languages or evaluate model behavior.

Each new member passed skill metadata validation and the full catalogue validator after author inspection. Focused integration checks cover actual Git capture for all 15 languages, missing-expertise holds, required trusted mappings, browser companions, exact versions and pinned installation. See the adjacent language-coverage and existing crew/installation tests under src/quality. Author scenarios are not independent model evaluations or language-runtime execution.

Final local validation on Node 24.10.0: all 116 Node tests passed; catalogue validation covered 27 skills and 18 specialist manifests; syntax validation covered 25 JavaScript files; 211 local Markdown file links resolved. All 13 new skills and the updated creator passed metadata validation. No language-runtime/model evaluations were run, and no evaluation waiver or consumer activation is asserted. Hosted CI is separate from these local results.
