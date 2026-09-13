const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadCatalogue, collectImpact, selectCrew } = require('./crew.cjs');
const root = path.resolve(__dirname, '../..');
const ids = ['bicep', 'terraform', 'arm-templates'];
const config = { schema: 1, members: ids.map(id => ({ id, version: '1.0.0' })),
  areas: ids.map(id => ({ paths: ['^infra/' + id + '/'], technologies: [id], reason: 'Confirmed synthetic deployment ownership.' })) };
const identity = { sourceHead: 'source', base: 'base', policyHash: 'policy', toolCommit: 'tool' };
const catalogue = loadCatalogue(root, config);

test('IaC parameter and source changes select mapped expertise and hold if it is unavailable', () => {
  for (const [id, file] of [['bicep', 'env.bicepparam'], ['bicep', 'main.bicep'],
    ['terraform', 'env.tfvars.json'], ['terraform', 'main.tf'], ['arm-templates', 'parameters.json']]) {
    // Empty Git search result isolates trusted-area routing; it is not semantic caller proof.
    const files = ['infra/' + id + '/' + file];
    const impact = collectImpact('base', 'source', files, config, catalogue, () => '');
    const result = selectCrew(identity, config, catalogue, impact);
    assert.deepEqual(result.selected.map(m => m.id), [id]);
    assert.deepEqual(result.holds, []);
    const missing = selectCrew(identity, config, catalogue.filter(m => m.id !== id), impact);
    assert.ok(missing.holds.includes('Required expertise unavailable for ' + id));
    const unmapped = collectImpact('base', 'source', files, { ...config, areas: [] }, catalogue, () => '');
    assert.ok(unmapped.holds.some(h => h.startsWith('Unclassified impact:')));
  }
});

test('generic JSON cannot acquire ARM expertise and mixed generated source needs both members', () => {
  const result = selectCrew(identity, config, catalogue, { files: ['app/settings.json'], technologies: [],
    holds: [], uncertain: false, requiresBrowser: false });
  assert.deepEqual(result.selected, []);
  const mixed = { ...config, areas: [{ paths: ['^infra/generated/'], technologies: ['bicep', 'arm-templates'],
    reason: 'Confirmed Bicep source and generated ARM artifact.' }] };
  const impact = collectImpact('base', 'source', ['infra/generated/template.json'], mixed, catalogue, () => '');
  assert.deepEqual(selectCrew(identity, mixed, catalogue, impact).selected.map(m => m.id), ['arm-templates', 'bicep']);
  assert.throws(() => loadCatalogue(root, { ...config, members: [{ id: 'bicep', version: '9.0.0' }] }), /manifest/);
});
