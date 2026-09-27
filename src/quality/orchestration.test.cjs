const { test } = require('node:test');
const assert = require('node:assert/strict');
const { advance, assemble, junit, waitForChange } = require('./orchestration.cjs');
const { codexUsage } = require('./usage.cjs');
const e = { repository: 'example/repo', pr: 1, sourceHead: 'a'.repeat(40), base: 'b'.repeat(40), policyHash: 'p',
  coordinator: 'captain', repairCycles: 1, repairReviewers: ['repairer'], repairExecutions: [{ reviewer: 'repairer' }], gates: {} };
const gate = { sourceHead: e.sourceHead, base: e.base, policyHash: e.policyHash, reviewer: 'independent',
  verdict: 'pass', summary: 'Observed clean control', findings: [], evidence: ['source:1'] };
function fixture() {
  let state, saved, checkpoints = 0, live = 0;
  const io = { verifyOwner() {}, verifyLive() { live++; }, readState: () => state, readResults: () => ({ correctness: gate }),
    collectCi: () => ({ verdict: 'pass', status: 'complete' }), artifacts: () => [{ tests: 2 }],
    decide: () => ({ eligible: true, reasons: [] }), saveEvidence: value => { saved = value; },
    checkpoint: () => { checkpoints++; }, saveState: value => { state = value; } };
  const request = { runId: 'run', coordinator: 'captain' };
  return { io, request, run: value => advance(value || e, request, io), snapshot: () => ({ state, saved, checkpoints, live }) };
}
test('resumed and interrupted assembly preserves identities, results and cumulative budgets', () => {
  const f = fixture(); assert.equal(f.run().changed, true); assert.equal(f.run(f.snapshot().saved).changed, false);
  assert.equal(f.snapshot().checkpoints, 1); assert.equal(f.snapshot().live, 4);
  assert.equal(f.snapshot().saved.repairCycles, 1); assert.deepEqual(f.snapshot().saved.repairExecutions, e.repairExecutions);
  const interrupted = fixture(), persist = interrupted.io.saveState;
  interrupted.io.saveState = () => { throw Error('host interrupted'); };
  assert.throws(() => interrupted.run(), /interrupted/);
  interrupted.io.saveState = persist; assert.equal(interrupted.run(interrupted.snapshot().saved).changed, true);
  assert.equal(interrupted.snapshot().saved.repairCycles, 1);
});
test('foreign ownership and source/base/policy/selection/intent drift fail closed', () => {
  for (const field of ['sourceHead', 'base', 'policyHash', 'intent', 'crew']) {
    const f = fixture(); f.run();
    assert.throws(() => f.run({ ...e, [field]: field === 'intent' ? { hash: 'new' } : field === 'crew' ? { selectionHash: 'new' } : 'new' }), /drift/);
  }
  const f = fixture(); f.io.verifyOwner = () => { throw Error('foreign lock'); }; assert.throws(() => f.run(), /foreign/);
  const g = fixture(); g.io.verifyLive = () => { throw Error('live drift'); }; assert.throws(() => g.run(), /live drift/);
});
test('pending and failed CI never fetch artifacts or initiate recovery; unavailable artifacts hold', () => {
  for (const status of ['pending', 'failed', 'missing']) {
    const f = fixture(); f.io.collectCi = () => ({ verdict: 'blocked', status });
    f.io.artifacts = () => { assert.fail('must not download'); };
    f.io.decide = () => ({ eligible: false, reasons: [status] });
    assert.equal(f.run().status, status === 'pending' ? 'pending-ci' : 'held');
  }
  const f = fixture(); f.io.artifacts = () => { throw Error('expired'); };
  f.io.decide = value => ({ eligible: value.ci.verdict === 'pass', reasons: ['artifact hold'] });
  assert.equal(f.run().status, 'held'); assert.equal(f.snapshot().saved.ci.verdict, 'blocked');
});
test('gate assembly rejects stale, substituted and nonindependent reviews; preserves known defect', () => {
  assert.throws(() => assemble(e, { correctness: { ...gate, base: 'stale' } }), /stale/);
  for (const reviewer of ['captain', 'repairer']) assert.throws(() => assemble(e, { correctness: { ...gate, reviewer } }), /Independent/);
  assert.throws(() => assemble(e, { correctness: gate, security: gate }), /Independent/);
  const bad = { ...gate, verdict: 'repair', findings: [{ severity: 'blocking', detail: 'Known defect' }] };
  const result = assemble(e, { correctness: bad });
  assert.throws(() => assemble(result, { correctness: gate }), /Preserve/);
  assert.deepEqual(assemble(result, {}).gates.correctness, bad);
});
test('JUnit validation accepts Node tests and rejects empty, failed, malformed or entity evidence', () => {
  assert.deepEqual(junit('<?xml version="1.0"?><testsuites><testcase name="a"/><testcase name="b"><skipped/></testcase></testsuites>'), { tests: 2, skipped: 1 });
  for (const xml of ['<testsuites/>', '<testsuites><testcase></testsuites>', '<testsuites><testcase/><error/></testsuites>',
    '<testsuite errors="1"><testcase/></testsuite>', '<!DOCTYPE x><testsuites><testcase/></testsuites>', '<testsuites><testcase/></testsuites><testsuites/>'])
    assert.throws(() => junit(xml));
});
test('bounded waits stop on a meaningful transition and never exceed requested intervals', async () => {
  let clock = 0, calls = 0;
  const result = await waitForChange(() => ({ status: 'pending-ci', changed: ++calls === 3 }),
    { waitMs: 20000, intervalMs: 5000, now: () => clock, sleep: async ms => { clock += ms; } });
  assert.equal(result.changed, true); assert.equal(clock, 10000);
  await assert.rejects(waitForChange(() => {}, { waitMs: 60001 }), /Bounded/);
});
test('Codex usage deduplicates responses and excludes cumulative events and other sessions/turns', () => {
  const r = { type: 'token_usage_record', payload: { thread_id: 'one', turn_id: 'turn', response_id: 'r', usage: { input_tokens: 100, cached_input_tokens: 80, output_tokens: 10 } } };
  const usage = codexUsage([r, r, { type: 'event_msg', payload: r.payload }, { ...r, payload: { ...r.payload, thread_id: 'other' } }], { threadId: 'one', turnId: 'turn' });
  assert.equal(usage.calls, 1); assert.equal(usage.inputTokens, 100); assert.equal(usage.uncachedInputTokens, 20); assert.equal(usage.duplicates, 1);
  const missing = codexUsage([{ ...r, payload: { ...r.payload, usage: { input_tokens: 100, output_tokens: 10 } } }], { threadId: 'one' });
  assert.deepEqual(missing.missing, ['cachedInputTokens']); assert.equal(missing.uncachedInputTokens, undefined);
});
