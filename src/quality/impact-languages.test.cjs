const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { discoverReferences } = require('./impact.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-impact-languages-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, stdio: 'pipe' }).trimEnd();
  const write = (file, content) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), content); };
  const commit = () => { git('add', '.'); git('-c', 'core.hooksPath=', '-c', 'user.name=Fixture', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture'); return git('rev-parse', 'HEAD'); };
  git('init');
  return { git, write, commit, capture: (base, head, changed) => discoverReferences(base, head, changed, git, () => true) };
}

// These test lexical leads across language boundaries, not compiler resolution.
// Every text language keeps a code reference while rejecting its native comments
// and ordinary strings. Scratch is opaque and requires decoded review evidence.
const languages = [
  ['python', 'py', 'value = 8 // ImpactAnchor(2)', '# ImpactAnchor\nnote = "ImpactAnchor"\nnote2 = """ImpactAnchor"""'],
  ['c', 'c', 'int value = ImpactAnchor(2);', '// ImpactAnchor\n/* ImpactAnchor */\nchar *note = "ImpactAnchor";'],
  ['cpp', 'cpp', 'int value = ImpactAnchor(2);', '// ImpactAnchor\n/* ImpactAnchor */\nauto note = "ImpactAnchor";'],
  ['java', 'java', 'int value = ImpactAnchor(2);', '// ImpactAnchor\n/* ImpactAnchor */\nString note = "ImpactAnchor";'],
  ['csharp', 'cs', 'int value = ImpactAnchor(2);', '// ImpactAnchor\n/* ImpactAnchor */\nstring note = @"ImpactAnchor";'],
  ['javascript', 'js', 'const value = ImpactAnchor(2);', '// ImpactAnchor\n/* ImpactAnchor */\nconst note = `ImpactAnchor`;'],
  ['visual-basic', 'vb', 'Dim value = ImpactAnchor(2)', "' ImpactAnchor\nREM ImpactAnchor\nDim value = 0 : Rem ImpactAnchor\nDim note = \"ImpactAnchor\""],
  ['sql', 'sql', 'SELECT "ImpactAnchor"(2);', "-- ImpactAnchor\n/* ImpactAnchor */\nSELECT 'ImpactAnchor';"],
  ['r', 'R', 'value <- ImpactAnchor(2)', '# ImpactAnchor\nnote <- "ImpactAnchor"'],
  ['rust', 'rs', "fn consume<'a, 'b>(x: &'a str, y: &'b str) { ImpactAnchor(2); }", '// ImpactAnchor\n/* ImpactAnchor */\nlet note = r#"ImpactAnchor"#;'],
  ['fortran', 'f90', 'value = ImpactAnchor(2)', '! ImpactAnchor\nnote = "ImpactAnchor"'],
  ['go', 'go', 'value := ImpactAnchor(2)', '// ImpactAnchor\n/* ImpactAnchor */\nnote := `ImpactAnchor`'],
  ['delphi', 'pas', 'value := ImpactAnchor(2);', "// ImpactAnchor\n{ ImpactAnchor }\n(* ImpactAnchor *)\nnote := 'ImpactAnchor';"],
  ['php', 'php', '$value = ImpactAnchor(2);', '// ImpactAnchor\n# ImpactAnchor\n/* ImpactAnchor */\n$note = "ImpactAnchor";']
];

test('all catalogue languages reject native comment/string noise without removing code references', t => {
  const { write, commit, capture } = fixture(t);
  write('src/anchor.js', 'export function ImpactAnchor(value) { return value > 1; }');
  for (const [id, ext, code, noise] of languages) {
    write(`tests/${id}.${ext}`, code);
    write(`unrelated/${id}.${ext}`, noise);
    write(`unrelated/${id}-substring.${ext}`, code.replaceAll('ImpactAnchor', 'ImpactAnchorElsewhere'));
  }
  write('unrelated/fixed.for', 'C ImpactAnchor\nc ImpactAnchor\n* ImpactAnchor\n      END');
  write('unrelated/main.tf', '#[ImpactAnchor]\ndescription = "ImpactAnchor"');
  write('unrelated/game.sb3', 'PK\u0003\u0004 printable ImpactAnchor bytes');
  const base = commit();
  write('src/anchor.js', 'export function ImpactAnchor(value) { return value > 2; }');
  const head = commit(), result = capture(base, head, ['src/anchor.js']);
  assert.deepEqual(result.files, ['src/anchor.js', 'tests/javascript.js']);
  assert.deepEqual(result.holds, []);
  // Native code matches remain inspectable across languages, but a shared name
  // alone cannot recruit unrelated technology. Noise is absent from BOTH lists.
  const edges = [...result.references, ...result.lexicalReferences];
  for (const revision of [base, head]) {
    assert.deepEqual(result.references.filter(r => r.revision === revision).map(r => r.file), ['tests/javascript.js']);
    assert.deepEqual(result.lexicalReferences.filter(r => r.revision === revision).map(r => r.file).sort(),
      languages.filter(([id]) => id !== 'javascript').map(([id, ext]) => `tests/${id}.${ext}`).sort());
  }
  assert.equal(edges.length, languages.length * 2);
  assert.ok(edges.every(r => r.from === 'src/anchor.js' && r.symbol === 'ImpactAnchor'));
  assert.ok(result.lexicalReferences.every(r => r.kind === 'lexical'));
});

test('Scratch archive bytes cannot seed a textual reference search', t => {
  const { write, commit, capture } = fixture(t);
  write('projects/game.sb3', 'PK\u0003\u0004 function ImaginaryCode() { return 1; }');
  write('src/unrelated.js', 'function unrelated() { return ImaginaryCode(); }');
  const base = commit();
  write('projects/game.sb3', 'PK\u0003\u0004 function ImaginaryCode() { return 2; }');
  assert.deepEqual(capture(base, commit(), ['projects/game.sb3']).files, ['projects/game.sb3']);
});

test('Go, Python and Java test conventions stop further expansion but keep test evidence', t => {
  const { write, commit, capture } = fixture(t);
  const anchors = [
    ['src/anchor.go', 'func ImpactAnchor() int { return 1; }', 'src/anchor_test.go'],
    ['src/anchor.py', 'def ImpactAnchor():\n    return 1', 'src/anchor_test.py'],
    ['src/Anchor.java', 'class Anchor { static int ImpactAnchor() { return 1; } }', 'src/AnchorTest.java']
  ];
  for (const [file, code] of anchors) write(file, code);
  write('src/anchor_test.go', 'func TestGo() { ImpactAnchor(); }');
  write('src/anchor_test.py', 'class TestPython:\n    result = ImpactAnchor()');
  write('src/AnchorTest.java', 'class TestJava { int result = Anchor.ImpactAnchor(); }');
  write('src/unrelated.go', 'func other() { TestGo(); }');
  write('src/unrelated.py', 'def other():\n    return TestPython()');
  write('src/Other.java', 'class Other { TestJava test; }');
  const base = commit();
  for (const [file, code] of anchors) write(file, code.replace('return 1', 'return 2'));
  const head = commit(), result = capture(base, head, anchors.map(([file]) => file));
  assert.deepEqual(result.files, anchors.flatMap(([file, , testFile]) => [file, testFile]).sort());
  for (const [file, , testFile] of anchors) for (const revision of [base, head])
    assert.ok(result.references.some(r => r.from === file && r.file === testFile && r.revision === revision),
      `${file} retains its native test caller in ${revision}`);
  assert.deepEqual(result.holds, []);
});
