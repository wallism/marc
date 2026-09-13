const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { validateCatalogue } = require('./catalogue-validation.cjs');
const { loadCatalogue, selectCrew } = require('./crew.cjs');

test('crew creator is discoverable authoring guidance, not selectable review expertise', () => {
  const root = path.resolve(__dirname, '../..');
  const validated = validateCatalogue(root);
  assert.ok(validated.skills.includes('marc-crew-creator'));
  assert.ok(!validated.members.includes('crew-creator'));
  const config = { schema: 1, members: [{ id: 'crew-creator', version: '1.0.0' }], areas: [] };
  const members = loadCatalogue(root, config);
  assert.deepEqual(members, []);
  const result = selectCrew({ sourceHead: 'a'.repeat(40), base: 'b'.repeat(40), policyHash: 'fixture', toolCommit: 'c'.repeat(40) },
    config, members, { files: [], technologies: [], holds: [], reasons: [], uncertain: false, requiresBrowser: false });
  assert.deepEqual(result.selected, []);
  assert.match(result.holds.join(' '), /Configured crew unavailable: crew-creator@1.0.0/);
});
