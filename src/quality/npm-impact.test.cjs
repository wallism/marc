const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { collectImpact, selectCrew, loadCatalogue } = require('./crew.cjs');
const config = { schema: 1, members: ['javascript', 'react', 'frontend', 'terraform', 'csharp'].map(id =>
  ({ id, version: id === 'csharp' ? '1.1.0' : '1.0.0' })), areas: [] };
const catalogue = loadCatalogue(path.resolve(__dirname, '../..'), config);
function route(before, after, file = 'package.json', areas = []) {
  const read = (command, revision, ...args) => {
    const document = revision.startsWith('base') ? before : after;
    if (command === 'ls-tree') return document === null ? '' : `100644 blob ${'a'.repeat(40)}\t${args.at(-1)}`;
    if (command === 'show') return typeof document === 'string' ? document : JSON.stringify(document);
    return '';
  };
  const trusted = { ...config, areas };
  return selectCrew({}, trusted, catalogue, collectImpact('base', 'head', [file], trusted, catalogue, read));
}
const ids = result => result.selected.map(member => member.id);
test('script-only changes never recruit unchanged React or unrelated infrastructure', () => {
  const before = { scripts: { test: 'node --test a.cjs' }, dependencies: { react: '19.0.0' } };
  const result = route(before, { ...before, scripts: { test: 'node --test *.cjs' } });
  assert.deepEqual(ids(result), ['javascript']);
  assert.deepEqual(result.holds, []);
  assert.equal(result.requiresFull, true);
  assert.equal(result.requiresBrowser, false);
  assert.ok(result.impact.reasons.some(reason => reason.includes('no package changes')));
});
test('added, updated and removed React packages select only related specialists', () => {
  for (const [before, after] of [[{}, { dependencies: { react: '19.0.0' } }],
    [{ dependencies: { react: '18.0.0' } }, { dependencies: { react: '19.0.0' } }],
    [{ dependencies: { react: '19.0.0' } }, {}], [null, { dependencies: { next: '15.0.0' } }],
    [{ dependencies: { next: '15.0.0' } }, null]]) {
    const result = route(before, after);
    assert.deepEqual(ids(result), ['frontend', 'javascript', 'react']);
    assert.deepEqual(result.holds, []);
    assert.equal(result.requiresBrowser, true);
  }
});
test('package categories, aliases and nested overrides add relevant expertise', () => {
  assert.deepEqual(ids(route({}, { devDependencies: { cdktf: '1.0.0' } })), ['javascript', 'terraform']);
  assert.deepEqual(ids(route({}, { dependencies: { vue: '3.0.0' } })), ['frontend', 'javascript']);
  assert.deepEqual(ids(route({}, { dependencies: { ui: 'npm:react@19.0.0' } })), ['frontend', 'javascript', 'react']);
  const result = route({ overrides: { example: { 'react@^18': '18.0.0' } } },
    { overrides: { example: { 'react@^18': '18.1.0' } } });
  assert.deepEqual(ids(result), ['frontend', 'javascript', 'react']);
  assert.ok(result.holds.some(hold => hold.includes('example')));
  assert.ok(route({}, { dependencies: { 'react-native': '1.0.0' } }).holds.some(hold => hold.includes('expertise unavailable for react-native')));
});
test('lockfile routing includes nested package changes, removals and resolution changes', () => {
  const lock = (version, integrity = 'abc') => ({ lockfileVersion: 3, packages: {
    '': {}, 'node_modules/parent/node_modules/react': { version, integrity },
    'node_modules/cdktf': { version: '1.0.0' }
  } });
  for (const after of [lock('19.0.0'), lock('18.0.0', 'new'), { lockfileVersion: 3, packages: {
    '': {}, 'node_modules/cdktf': { version: '1.0.0' }
  } }]) {
    const result = route(lock('18.0.0'), after, 'package-lock.json');
    assert.deepEqual(ids(result), ['frontend', 'javascript', 'react']);
    assert.deepEqual(result.holds, []);
  }
});
test('trusted consumers supplement package hints and resolve unknown package ownership', () => {
  const areas = [{ paths: ['^src/web/'], technologies: ['csharp'], reason: 'Confirmed server consumer.' }];
  const result = route({}, { dependencies: { example: 'file:vendor/example' } }, 'src/web/package.json', areas);
  assert.deepEqual(ids(result), ['csharp', 'javascript']);
  assert.deepEqual(result.holds, []);
  const unmapped = route({}, { dependencies: { example: '1.0.0' } });
  assert.deepEqual(ids(unmapped), ['javascript']);
  assert.match(unmapped.holds.join(' '), /no trusted consumer mapping/);
});
test('unreadable or workspace scope holds without selecting all crew', () => {
  for (const after of ['invalid', [], { dependencies: [] }, { workspaces: ['apps/*'] }]) {
    const result = route({}, after);
    assert.deepEqual(ids(result), ['javascript']);
    assert.ok(result.holds.length);
    assert.equal(result.requiresFull, true);
    assert.equal(result.impact.uncertain, false);
  }
});
