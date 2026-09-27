const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assessmentUsage, compareUsage } = require('./usage.cjs');
const identity = { repository: 'synthetic/repo', sourceHead: 'source', base: 'base', policyHash: 'policy', toolCommit: 'tool', intentHash: 'intent' };
const session = { threadId: 'thread', turnId: 'turn', role: 'captain', phase: 'assessment', startedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T00:00:02Z' };
const usage = (id, input = 100) => ({ timestamp: '2026-01-01T00:00:01Z', type: 'token_usage_record', payload: {
  thread_id: 'thread', turn_id: 'turn', response_id: id, usage: { input_tokens: input, cached_input_tokens: 80, output_tokens: 5 } } });
const settings = { type: 'turn_context', payload: { turn_id: 'turn', model: 'model', effort: 'medium' } };
const manifest = sessions => ({ schema: 1, identity, sessions, startedAt: session.startedAt, completedAt: session.completedAt,
  coverage: 'Assessment held; no approval continuation occurred.' });
test('phase accounting deduplicates response records, includes continuation and records settings/latency', () => {
  const continuation = { ...session, turnId: 'continuation', phase: 'approval-continuation' };
  const records = [settings, usage('one'), usage('one'), { type: 'event_msg', payload: { type: 'token_count', total: 999999 } }];
  const r = assessmentUsage(manifest([session, continuation]), e => e.turnId === 'turn' ? records :
    [ { ...settings, payload: { ...settings.payload, turn_id: 'continuation' } }, { ...usage('two'), payload: { ...usage('two').payload, turn_id: 'continuation' } } ]);
  assert.equal(r.total.calls, 2); assert.equal(r.total.inputTokens, 200); assert.equal(r.total.uncachedInputTokens, 40);
  assert.equal(r.phases['approval-continuation'].calls, 1); assert.equal(r.sessions[0].duplicates, 1);
  assert.equal(r.wallTimeMs, 2000); assert.equal(r.total.sessionTimeMs, 4000);
  assert.equal(r.total.retries, null); assert.ok(r.total.missing.includes('retries'));
});
test('missing counters and unavailable sessions never silently become zero totals', () => {
  const missing = usage('one'); delete missing.payload.usage.input_tokens;
  const r = assessmentUsage(manifest([session]), () => [settings, missing]);
  assert.equal(r.total.inputTokens, null); assert.equal(r.total.uncachedInputTokens, null);
  const empty = assessmentUsage(manifest([session]), () => []);
  assert.equal(empty.total.calls, null); assert.equal(empty.total.outputTokens, null);
  assert.ok(empty.total.missing.includes('session telemetry'));
});
test('rejects conflicting responses, wrong transcripts, overlap and duplicate attribution', () => {
  assert.throws(() => assessmentUsage(manifest([session]), () => [usage('one'), usage('one', 120)]), /Conflicting/);
  assert.throws(() => assessmentUsage(manifest([session]), () => [{ type: 'session_meta', payload: { id: 'someone-else' } }]), /another session/);
  assert.throws(() => assessmentUsage(manifest([session, session]), () => []), /Overlapping/);
  const next = { ...session, turnId: 'next' };
  assert.throws(() => assessmentUsage(manifest([session, next]), e => [{ ...usage('same'), payload: { ...usage('same').payload, turn_id: e.turnId } }]), /multiple sessions/);
});
test('comparisons expose identity/settings differences without inventing retry savings', () => {
  const before = assessmentUsage(manifest([session]), () => [settings, usage('one')]);
  const after = assessmentUsage(manifest([session]), () => [settings, usage('two', 90)]);
  assert.equal(compareUsage(before, after).metrics.inputTokens.changePercent, -10);
  assert.equal(compareUsage(before, after).metrics.retries.changePercent, null);
  after.identity = { ...identity, sourceHead: 'different' };
  assert.equal(compareUsage(before, after).comparableInputsAndSettings, false);
  after.identity = identity; after.sessions[0].settings[0].reasoningEffort = 'low';
  assert.equal(compareUsage(before, after).comparableInputsAndSettings, false);
});
