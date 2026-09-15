const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateAgentSettings, resolveAgentSettings, executionReasons, agentTable } = require('./agent-settings.cjs');

test('optional settings inherit Captain, with per-field member and default precedence', () => {
  assert.deepEqual(resolveAgentSettings(undefined, 'security'), {
    model: { source: 'captain', value: null }, reasoningEffort: { source: 'captain', value: null }
  });
  const config = { defaults: { model: 'available-model', reasoningEffort: 'high' },
    members: { security: { reasoningEffort: 'max' }, csharp: { model: 'other-model' } } };
  validateAgentSettings(config, ['security', 'csharp']);
  assert.deepEqual(resolveAgentSettings(config, 'crew:csharp'), {
    model: { source: 'member', value: 'other-model' }, reasoningEffort: { source: 'default', value: 'high' }
  });
  assert.equal(resolveAgentSettings(config, 'security').reasoningEffort.value, 'max');
  assert.equal(resolveAgentSettings({ defaults: { model: 'other' } }, 'security').reasoningEffort.source, 'model-default');
});

test('reject malformed overrides and unknown members without hardcoding harness model names', () => {
  for (const config of [null, [], { typo: {} }, { defaults: { model: '' } },
    { defaults: { reasoningEffort: 2 } }, { defaults: { models: 'x' } },
    { members: { securty: { model: 'x' } } }])
    assert.throws(() => validateAgentSettings(config, ['security']), /agent/i);
  assert.doesNotThrow(() => validateAgentSettings({ defaults: { model: 'vendor/model', reasoningEffort: 'harness-level' } }, []));
});

test('execution evidence rejects missing application, stale selection and observed fallback', () => {
  const config = { defaults: { model: 'chosen' } };
  const execution = { settings: resolveAgentSettings(config, 'security'), applied: true, evidence: 'host spawn record 12', actual: { model: 'chosen' } };
  assert.deepEqual(executionReasons(config, 'security', execution), []);
  assert.ok(executionReasons(config, 'security', undefined).length);
  assert.ok(executionReasons(config, 'security', { ...execution, applied: false }).length);
  assert.ok(executionReasons(config, 'security', { ...execution, settings: resolveAgentSettings(undefined, 'security') }).length);
  assert.ok(executionReasons(config, 'security', { ...execution, actual: { model: 'fallback' } }).length);
  const inherited = { ...execution, settings: resolveAgentSettings(undefined, 'security'), captain: { model: 'captain-model' }, actual: { model: 'other' } };
  assert.ok(executionReasons(undefined, 'security', inherited).length);
  assert.doesNotMatch(agentTable({ gates: { security: { reviewer: 's', execution: inherited } } }), /Same model/);
});

test('crew table includes inherited, overridden, unknown, routing and repair sessions', () => {
  const execution = { settings: resolveAgentSettings(undefined, 'security'), applied: true, evidence: 'host record' };
  const override = { settings: resolveAgentSettings({ defaults: { model: 'chosen' } }, 'csharp'), applied: true, evidence: 'host record', actual: { model: 'chosen', reasoningEffort: 'high' } };
  const table = agentTable({ gates: { security: { reviewer: 's', execution }, 'crew:csharp': { reviewer: 'c', execution: override }, browser: { reviewer: 'b' } },
    routing: { reviewer: 'route', execution }, repairExecutions: [{ reviewer: 'fix', execution }] });
  assert.match(table, /Same model \(Captain\)/);
  assert.match(table, /Same reasoning effort \(Captain\)/);
  assert.match(table, /chosen \(configured default\)/);
  assert.match(table, /high \(model default\)/);
  assert.match(table, /Not recorded/);
  assert.match(table, /simplicity/); assert.match(table, /repair/);
  override.captain = { model: 'chosen' };
  assert.match(agentTable({ gates: { security: { reviewer: 's', execution: override } } }), /Same model \(Captain\): chosen \(configured default\)/);
  delete override.actual;
  assert.match(agentTable({ gates: { security: { reviewer: 's', execution: override } } }), /requested, actual not exposed/);
});

test('recorded host token usage is reported without becoming a gate', () => {
  const execution = { settings: resolveAgentSettings(undefined, 'security'), applied: true, evidence: 'host record' };
  const usage = { inputTokens: 108883, cachedInputTokens: 1806553, outputTokens: 8377 };
  const withUsage = { ...execution, usage };
  assert.deepEqual(executionReasons(undefined, 'security', withUsage), []);
  for (const broken of [null, { inputTokens: 1 }, { inputTokens: -1, outputTokens: 1 }, { inputTokens: 1.5, outputTokens: 1 },
    { inputTokens: 1, outputTokens: 1, costUsd: 2 }])
    assert.deepEqual(executionReasons(undefined, 'security', { ...execution, usage: broken }), ['security: invalid token usage']);
  const table = agentTable({ gates: { security: { reviewer: 's', execution: withUsage }, correctness: { reviewer: 'c', execution } },
    repairExecutions: [{ reviewer: 'fix', execution: { ...execution, usage: { inputTokens: 4200, outputTokens: 900 } } }] });
  assert.ok(table.includes('| Member | Session | Model | Reasoning effort | Tokens |'));
  assert.ok(table.includes('| 109k in (+1.8M cached) / 8377 out |'));
  assert.ok(table.includes('| Not exposed |'));
  assert.match(table, /Recorded token consumption for 2 of 3 sessions: 113k input, 1.8M cached input and 9277 output/);
  // Reports prepared before usage telemetry keep their exact historical rendering.
  assert.doesNotMatch(agentTable({ gates: { security: { reviewer: 's', execution } } }), /Tokens|token consumption/);
});
