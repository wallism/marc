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
test('packets contain complete neutral evidence and correct gates while retaining expansion and budgets', t => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-packets-'));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const context = { repoRoot: root, bundleRoot: root, policy: { reviewGates: ['correctness', 'security'], uiPathPatterns: [] } };
  const result = buildPackets(e, context, { directory: path.join(parent, 'packets'), git: (...args) => {
    assert.ok(args.includes('--binary')); assert.ok(args.includes(e.sourceHead)); return 'COMPLETE DIFF';
  } });
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
test('required gates retain intent, specialist and browser expertise on both routes', () => {
  assert.deepEqual(requiredGates({ ...e, routing: { route: 'simple' }, intent: { status: 'present' },
    crew: { selected: [{ id: 'javascript' }], requiresBrowser: true } }, { reviewGates: ['security'], uiPathPatterns: [] }),
  ['simple-tests', 'intent', 'crew:javascript', 'browser']);
});

test('combined packets request nested intent from one reviewer and preserve simple-route independence', t => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-combined-packets-'));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const policy = { reviewGates: ['correctness', 'security'], uiPathPatterns: [], intentReview: 'correctness-v1', simpleRoute: { reviewSchema: 1 } };
  const current = { ...e, intentReview: policy.intentReview, intent: { status: 'present', hash: 'frozen-intent' } };
  const result = buildPackets(current, { repoRoot: root, bundleRoot: root, policy }, {
    directory: path.join(parent, 'packets'), git: () => 'complete diff' });
  assert.deepEqual(result.packets.map(p => p.gate), ['correctness', 'security']);
  const packet = JSON.parse(fs.readFileSync(result.packets[0].path));
  assert.equal(packet.outputSchema.intent.intentHash, 'frozen-intent');
  assert.ok(packet.instructions.some(i => i.path.endsWith('intent.md')));
  assert.deepEqual(requiredGates({ ...current, routing: { route: 'simple' } }, policy), ['simple-tests', 'intent']);
  assert.throws(() => buildPackets({ ...current, intentReview: undefined }, { repoRoot: root, bundleRoot: root, policy }, {
    directory: path.join(parent, 'mismatch'), git: () => '' }), /policy mismatch/);
});
