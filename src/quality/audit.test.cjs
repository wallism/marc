const { test } = require('node:test');
const assert = require('node:assert/strict');
const { auditJson, compactAudit, expandAudit } = require('./audit.cjs');

test('compact audits recover every ordered stage, finding, identity and impact file without mutation', () => {
  const impact = { files: Array.from({ length: 300 }, (_, i) => `src/synthetic/component-${i}.cs`),
    reasons: ['Conservative reference search reached its limit'], uncertain: true };
  const gate = { verdict: 'blocked', findings: [{ severity: 'high', evidence: 'synthetic evidence '.repeat(30) }] };
  const evidence = { auditFormat: 'marc-audit-v1', sourceHead: 'a'.repeat(40), impact, gates: { security: gate },
    stages: [{ sourceHead: 'b'.repeat(40), impact: structuredClone(impact), gates: { security: gate } },
      { sourceHead: 'a'.repeat(40), impact: structuredClone(impact), hash: 'stage-hash' }] };
  evidence.stages[0].impact.files.splice(40, 1, 'src/synthetic/previous.cs');
  const original = structuredClone(evidence), published = auditJson(evidence);
  assert.deepEqual(expandAudit(JSON.parse(published)), evidence);
  assert.deepEqual(evidence, original);
  assert.equal(auditJson(evidence), published);
  assert.ok(published.length < JSON.stringify(evidence, null, 2).length * 0.6);
  assert.equal(published.split('component-299.cs').length - 1, 1);
  const expanded = expandAudit(JSON.parse(published));
  expanded.stages[1].impact.files.push('new');
  assert.equal(expanded.impact.files.length, 300);
});

test('literal reference-looking fields, nulls, escaped keys and prototype names survive', () => {
  const value = JSON.parse('{"__proto__":{"safe":true},"a/b~c":{"$ref":"literal","text":"' + 'x'.repeat(300) + '"},"empty":null}');
  value.copy = structuredClone(value['a/b~c']);
  const encoded = compactAudit(value);
  assert.equal(encoded.references['/copy'], '/a~1b~0c');
  assert.deepEqual(expandAudit(encoded), value);
  assert.equal({}.safe, undefined);
});

test('nested arrays never use their ancestor as a delta base', () => {
  const strings = Array.from({ length: 60 }, (_, i) => `synthetic-path-${i}`);
  const evidence = { nested: [...strings, strings] };
  assert.deepEqual(expandAudit(compactAudit(evidence)), evidence);
});

test('legacy bytes stay unchanged and unknown audit encodings fail closed', () => {
  const old = { reportFormat: 'marc-v3', gates: { security: { verdict: 'pass' } } };
  assert.equal(auditJson(old), JSON.stringify(old, null, 2) + '\n');
  assert.deepEqual(expandAudit(old), old);
  assert.throws(() => auditJson({ ...old, auditFormat: 'future' }), /Unknown audit/);
  assert.throws(() => expandAudit({ auditSchema: 'future' }), /Invalid audit/);
});

test('invalid, cyclic and unused references and out-of-range deltas are rejected', () => {
  const read = references => expandAudit({ auditSchema: 'marc-audit-v1', evidence: { a: null, b: [1] }, references });
  for (const references of [{ '/a': '/missing' }, { '/a': '/a' }, { '/a': '' }, { '/missing': '/b' },
    { '/b': '/a' }, { '/a': '/b/~9' }, { '/a': { base: '/b', start: 2, deleteCount: 0, items: [] } },
    { '/a': { base: '/b', start: 0, deleteCount: -1, items: [] } }]) assert.throws(() => read(references), /audit/i);
});
