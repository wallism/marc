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
  const result = capture(base, commit(), ['src/anchor.js']);
  assert.deepEqual(result.files, ['src/anchor.js', ...languages.map(([id, ext]) => `tests/${id}.${ext}`)].sort());
  assert.deepEqual(result.holds, []);
  assert.equal(result.references.length, languages.length * 2);
  assert.ok(result.references.every(r => r.from === 'src/anchor.js' && r.symbol === 'ImpactAnchor'));
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
  write('src/anchor.js', 'function ImpactAnchor() { return 1; }');
  write('src/anchor_test.go', 'func TestGo() { ImpactAnchor(); }');
  write('src/anchor_test.py', 'class TestPython:\n    result = ImpactAnchor()');
  write('src/AnchorTest.java', 'class TestJava { int result = ImpactAnchor(); }');
  write('src/unrelated.js', 'function other() { TestGo(); TestPython(); TestJava(); }');
  const base = commit();
  write('src/anchor.js', 'function ImpactAnchor() { return 2; }');
  const result = capture(base, commit(), ['src/anchor.js']);
  assert.deepEqual(result.files, ['src/AnchorTest.java', 'src/anchor.js', 'src/anchor_test.go', 'src/anchor_test.py']);
  assert.deepEqual(result.holds, []);
});
