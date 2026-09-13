const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadCatalogue, collectImpact, selectCrew } = require('./crew.cjs');
const root = path.resolve(__dirname, '../..');
// Fixed September 2026 coverage, including the two pre-existing members.
const languages = [
  ['python', 'py'], ['c', 'c', true], ['cpp', 'cpp', true], ['java', 'java'],
  ['csharp', 'cs'], ['javascript', 'js'], ['visual-basic', 'vb', true], ['sql', 'sql'],
  ['r', 'R', true], ['rust', 'rs'], ['fortran', 'f90', true], ['go', 'go'],
  ['delphi', 'pas', true], ['php', 'php'], ['scratch', 'sb3', true]
];
const config = { schema: 1, members: languages.map(([id]) => ({ id, version: id === 'csharp' ? '1.1.0' : '1.0.0' })),
  areas: languages.filter(([, , mapped]) => mapped).map(([id]) => ({ paths: [`^source/${id}/`], technologies: [id], reason: 'Synthetic confirmed language area.' })) };
const identity = { sourceHead: 'a'.repeat(40), base: 'b'.repeat(40), policyHash: 'fixture', toolCommit: 'c'.repeat(40) };

test('all fifteen languages load and select independently through actual Git capture', t => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-languages-'));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true, stdio: 'pipe' }).trimEnd();
  const write = (f, data) => { fs.mkdirSync(path.dirname(path.join(repo, f)), { recursive: true }); fs.writeFileSync(path.join(repo, f), data); };
  const commit = () => { git('add', '.'); git('-c', 'core.hooksPath=', '-c', 'user.name=Fixture', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture'); return git('rev-parse', 'HEAD'); };
  git('init');
  write('docs/readme.md', 'Fixture\n');
  for (const [id, ext] of languages) write(`source/${id}/Unit.${ext}`, 'before\n');
  const base = commit();
  for (const [id, ext] of languages) write(`source/${id}/Unit.${ext}`, 'after\n');
  write('docs/readme.md', 'Updated fixture\n');
  const head = commit(), catalogue = loadCatalogue(root, config);
  assert.equal(catalogue.length, 15);
  for (const [id, ext, mapped] of languages) {
    const file = `source/${id}/Unit.${ext}`;
    const impact = collectImpact(base, head, [file], config, catalogue, git);
    const captured = selectCrew({ ...identity, base, sourceHead: head }, config, catalogue, impact);
    assert.deepEqual(captured.selected.map(m => m.id), [id], id);
    assert.deepEqual(captured.holds, [], id);
    assert.equal(captured.requiresBrowser, false, id);
    const missingConfig = { ...config, members: config.members.filter(m => m.id !== id) };
    const missing = selectCrew(identity, missingConfig, loadCatalogue(root, missingConfig), impact);
    assert.ok(missing.holds.includes('Required expertise unavailable for ' + id), id);
    if (mapped) {
      const unmapped = collectImpact(base, head, [file], { ...config, areas: [] }, catalogue, git);
      assert.ok(unmapped.holds.some(h => h.startsWith('Unclassified impact:')), id);
    }
  }
  const docs = collectImpact(base, head, ['docs/readme.md'], config, catalogue, git);
  assert.deepEqual(selectCrew(identity, config, catalogue, docs).selected, []);
});

test('mapped Scratch web interaction keeps its frontend companion and browser gate', () => {
  const webConfig = { ...config, members: [...config.members, { id: 'frontend', version: '1.0.0' }],
    areas: [{ paths: ['^projects/'], technologies: ['scratch', 'web'], reason: 'Confirmed browser-hosted Scratch project.' }] };
  const catalogue = loadCatalogue(root, webConfig);
  // No source callers in this synthetic capture; binary decoding remains external evidence.
  const impact = collectImpact('base', 'head', ['projects/game.sb3'], webConfig, catalogue, () => '');
  const result = selectCrew(identity, webConfig, catalogue, impact);
  assert.deepEqual(result.selected.map(m => m.id), ['frontend', 'scratch']);
  assert.equal(result.requiresBrowser, true);
  assert.equal(result.requiresFull, true);
  assert.deepEqual(result.holds, []);
  const withoutFrontend = catalogue.filter(m => m.id !== 'frontend');
  assert.ok(selectCrew(identity, webConfig, withoutFrontend, impact).holds.includes('Required expertise unavailable for web'));
});

test('new language member versions remain exact and installed members are not implicitly enabled', () => {
  assert.throws(() => loadCatalogue(root, { schema: 1, members: [{ id: 'python', version: '9.9.9' }], areas: [] }), /manifest/);
  assert.deepEqual(loadCatalogue(root, { schema: 1, members: [], areas: [] }), []);
});
