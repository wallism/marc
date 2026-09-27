const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildPackets, verifyPacket, requiredGates } = require('./review-packets.cjs');
const root = path.resolve(__dirname, '../..');
const e = { repository: 'example/repo', pr: 1, sourceHead: 'a'.repeat(40), base: 'b'.repeat(40), policyHash: 'p',
  files: ['src/code.js'], repairCycles: 1, repairReviewers: ['repair'], repairExecutions: [],
  ci: { sourceHead: 'a'.repeat(40), status: 'complete', verdict: 'pass' },
  gates: { security: { summary: 'PRIVATE OTHER REVIEWER CONCLUSION' } }, intent: { status: 'absent', hash: 'i' } };
const section = (file, body) => `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n@@ -1 +1 @@\n${body}\n`;
// Synthetic Git: complete binary diff, text diff and -z numstat for the same files.
const fakeGit = files => (...args) => {
  assert.ok(args.includes(e.base) && args.includes(e.sourceHead));
  if (args.includes('--binary')) return 'COMPLETE DIFF';
  if (args.includes('--numstat')) return files.map(([file, body]) => `1\t${body.length}\t${file}\0`).join('');
  return files.map(([file, body]) => section(file, body)).join('');
};
const setup = t => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-packets-'));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  return path.join(parent, 'packets');
};
const slash = file => file.replaceAll('\\', '/');
test('packets contain complete neutral evidence and correct gates while retaining expansion and budgets', t => {
  const context = { repoRoot: root, bundleRoot: root, policy: { reviewGates: ['correctness', 'security'], uiPathPatterns: [] } };
  const result = buildPackets(e, context, { directory: setup(t), git: fakeGit([['src/code.js', '+changed line']]) });
  assert.equal(result.packets.length, 2);
  const packet = JSON.parse(fs.readFileSync(result.packets[0].path));
  assert.ok(!JSON.stringify(packet).includes('PRIVATE OTHER')); assert.equal(fs.readFileSync(packet.diff.path, 'utf8'), 'COMPLETE DIFF');
  assert.match(packet.expansion, /Full source remains available/); assert.equal(verifyPacket(packet, e), true);
  assert.equal(JSON.parse(fs.readFileSync(result.handoff)).repairCycles, 1);
  for (const field of ['sourceHead', 'base', 'policyHash']) assert.throws(() => verifyPacket(packet, { ...e, [field]: 'stale' }), /Stale/);
  assert.throws(() => verifyPacket(packet, { ...e, ci: {} }), /CI/);
  fs.writeFileSync(packet.diff.path, 'INCOMPLETE DIFF'); assert.throws(() => verifyPacket(packet, e), /changed/);
  fs.unlinkSync(packet.scope.path); assert.throws(() => verifyPacket(packet, e));
});
test('one brief per gate inlines contracts, scope and diff behind a byte-identical shared prefix', t => {
  const context = { repoRoot: root, bundleRoot: root, policy: { reviewGates: ['correctness', 'security'], uiPathPatterns: [] } };
  const result = buildPackets(e, context, { directory: setup(t), git: fakeGit([['src/code.js', '+changed line']]) });
  const handoff = JSON.parse(fs.readFileSync(result.handoff));
  const briefs = result.packets.map(p => fs.readFileSync(p.brief, 'utf8'));
  const prefix = Buffer.from(briefs[0]).subarray(0, handoff.sharedPrefix.bytes);
  for (const [i, brief] of briefs.entries()) {
    assert.ok(Buffer.from(brief).subarray(0, handoff.sharedPrefix.bytes).equals(prefix));
    assert.match(brief, /\n### Independent reviewer contract\n/); assert.ok(!/\n# /.test(brief.slice(1))); assert.match(brief, /\+changed line/);
    assert.match(brief, /- \+1 -13 src\/code\.js/); assert.ok(!brief.includes('PRIVATE OTHER'));
    assert.ok(brief.includes(slash(result.packets[i].output)));
    assert.match(Buffer.from(brief).subarray(handoff.sharedPrefix.bytes).toString(), new RegExp(`^## Your assignment: ${result.packets[i].gate}`));
  }
  // One shared size hint covers the largest brief, so readers need not page.
  const kib = Number(/Size: at most (\d+) KiB/.exec(briefs[0])[1]);
  assert.ok(briefs.every(brief => Buffer.byteLength(brief) <= kib * 1024));
  assert.ok(Buffer.byteLength(briefs[0]) > (kib - 1) * 1024 || briefs.some(brief => Buffer.byteLength(brief) > (kib - 1) * 1024));
  // Relative reference links resolve from the external brief location.
  assert.ok(briefs[0].includes(`](${slash(root)}/skills/marc-crew-captain/references/language-impact.md)`));
  assert.deepEqual(result.packets.map(p => p.role), ['correctness', 'security']);
  const packet = JSON.parse(fs.readFileSync(result.packets[1].path));
  fs.appendFileSync(packet.brief.path, 'tampered'); assert.throws(() => verifyPacket(packet, e), /changed/);
  delete packet.brief; assert.equal(verifyPacket(packet, e), true);
});
test('shared prefix digests change with frozen evidence', t => {
  const context = { repoRoot: root, bundleRoot: root, policy: { reviewGates: ['correctness'], uiPathPatterns: [] } };
  const a = JSON.parse(fs.readFileSync(buildPackets(e, context, { directory: setup(t), git: fakeGit([['src/code.js', '+one']]) }).handoff));
  const b = JSON.parse(fs.readFileSync(buildPackets(e, context, { directory: setup(t), git: fakeGit([['src/code.js', '+two']]) }).handoff));
  assert.notEqual(a.sharedPrefix.sha256, b.sharedPrefix.sha256);
});
test('over-budget diffs inline production first and name every file left out', t => {
  const context = { repoRoot: root, bundleRoot: root, policy: { reviewGates: ['correctness'], uiPathPatterns: [] } };
  const files = [['README.md', '+' + 'd'.repeat(400)], ['src/code.test.js', '+' + 't'.repeat(400)], ['src/code.js', '+production']];
  const result = buildPackets({ ...e, files: files.map(f => f[0]) }, context, { directory: setup(t), git: fakeGit(files), inlineDiffBytes: 750 });
  const brief = fs.readFileSync(result.packets[0].brief, 'utf8');
  assert.match(brief, /\+production/); assert.match(brief, /\+t{400}/); assert.ok(!brief.includes('d'.repeat(400)));
  assert.match(brief, /### Not inlined \(1\)\n\n- README\.md/);
});
test('specialist briefs add a technology focus without narrowing the complete scope', t => {
  const context = { repoRoot: root, bundleRoot: root, policy: { reviewGates: [], uiPathPatterns: [] } };
  const impact = { files: ['docs/a.md', 'src/Service.cs', 'src/code.js'], changedFiles: ['src/Service.cs', 'src/code.js'], technologies: ['csharp', 'javascript'],
    references: [{ file: 'src/Service.cs', line: 3, kind: 'identifier', symbol: 'Run', from: 'src/Other.cs', revision: e.base }],
    lexicalReferences: [{ file: 'src/Service.cs', line: 9, kind: 'lexical', symbol: 'command', from: 'src/code.js', revision: e.sourceHead }],
    reasons: ['src/Service.cs:3: identifier reference to Run from src/Other.cs (base).', 'src/code.js: app area'], holds: [] };
  const crew = { selectionHash: 's', impact, holds: [], selected: [{ id: 'javascript', version: '1.0.0', contentHash: 'h', skill: 'skills/marc-crew-javascript/SKILL.md' }] };
  const result = buildPackets({ ...e, files: impact.changedFiles, crew }, context,
    { directory: setup(t), git: fakeGit([['src/Service.cs', '+cs'], ['src/code.js', '+js']]) });
  const brief = fs.readFileSync(result.packets.find(p => p.gate === 'crew:javascript').brief, 'utf8');
  const [shared, focus] = brief.split('## Specialist focus');
  assert.match(shared, /- src\/Service\.cs:3 identifier `Run` <- src\/Other\.cs \(base\)/);
  assert.match(shared, /Lexical leads[^\n]*\(1\)\n\n- src\/Service\.cs:9 lexical `command` <- src\/code\.js \(source\)/);
  assert.match(shared, /### Referenced unchanged files \(1\)\n\n- docs\/a\.md/);
  assert.match(shared, /- src\/code\.js: app area/); assert.ok(!/Selection reasons[\s\S]*identifier reference to Run/.test(shared));
  assert.match(focus, /Covers: javascript/); assert.match(focus, /- src\/code\.js\n/); assert.ok(!focus.includes('- src/Service.cs\n'));
  assert.match(focus, /Above, 0 references and 1 lexical leads involve these technologies/); assert.ok(!focus.includes('`command`'));
  assert.match(brief, /"memberVersion": "1\.0\.0"/);
});
test('required gates retain intent, specialist and browser expertise on both routes', () => {
  assert.deepEqual(requiredGates({ ...e, routing: { route: 'simple' }, intent: { status: 'present' },
    crew: { selected: [{ id: 'javascript' }], requiresBrowser: true } }, { reviewGates: ['security'], uiPathPatterns: [] }),
  ['simple-tests', 'intent', 'crew:javascript', 'browser']);
});
