const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadCatalogue, selectCrew, collectImpact, validateCrewConfig, validateMember } = require('./crew.cjs');
const { evaluate } = require('./marc.cjs');
const fs = require('node:fs');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const config = { schema: 1, members: ['csharp', 'javascript', 'blazor', 'frontend'].map(id => ({ id, version: id === 'csharp' ? '1.1.0' : '1.0.0' })),
  areas: [{ paths: ['^src/Shared/'], technologies: ['blazor'], reason: 'Shared services are consumed by the UI.' }] };
const catalogue = () => loadCatalogue(path.resolve(__dirname, '../..'), config);
const identity = { sourceHead: 'a'.repeat(40), base: 'b'.repeat(40), policyHash: 'policy', toolCommit: 'c'.repeat(40) };
const impact = (technologies, extras = {}) => ({ technologies, files: [], reasons: ['Observed source change'], holds: [], uncertain: false, requiresBrowser: false, ...extras });
const selection = (technologies, extras) => selectCrew(identity, config, catalogue(), impact(technologies, extras));

test('crew routes language and composite impact without selecting every available member', () => {
  assert.deepEqual(selection(['csharp']).selected.map(x => x.id), ['csharp']);
  assert.deepEqual(selection(['javascript']).selected.map(x => x.id), ['javascript']);
  assert.deepEqual(selection(['csharp', 'blazor', 'javascript']).selected.map(x => x.id), ['blazor', 'csharp', 'frontend', 'javascript']);
  assert.equal(selection([]).selected.length, 0);
  assert.ok(selection([]).omitted.every(x => x.reasons.length));
});
test('unknown and unavailable expertise hold; uncertainty broadens review', () => {
  assert.match(selection(['python']).holds.join(' '), /python/);
  const missing = selectCrew(identity, { ...config, members: [{ id: 'python', version: '1.0.0' }] }, [], impact(['python']));
  assert.match(missing.holds.join(' '), /unavailable/);
  assert.equal(selection(['csharp'], { uncertain: true }).selected.length, 4);
  assert.equal(selection(['csharp'], { uncertain: true }).requiresFull, true);
});
test('crew configuration rejects permission and path ambiguity', () => {
  assert.throws(() => validateCrewConfig({ ...config, members: [{ id: '../bad', version: '1.0.0' }] }));
  assert.throws(() => validateCrewConfig({ ...config, members: [config.members[0], config.members[0]] }));
  assert.throws(() => validateCrewConfig({ ...config, areas: [{ paths: ['['], technologies: ['csharp'], reason: 'bad' }] }));
  for (const change of [m => m.permissions.push('credentials:read'), m => m.compatibility = 'unknown',
    m => m.version = '2.0.0', m => m.outputSchema = 'trust-me', m => m.cases[0].selected = false]) {
    const member = catalogue()[0]; change(member);
    assert.throws(() => validateMember(member, config.members[0]));
  }
});
test('source, base, tool, policy and member content changes invalidate selection identity', () => {
  const original = selection(['csharp']);
  for (const key of Object.keys(identity)) assert.notEqual(selectCrew({ ...identity, [key]: 'd'.repeat(40) }, config, catalogue(), impact(['csharp'])).selectionHash, original.selectionHash);
  const changed = catalogue(); changed.find(x => x.id === 'csharp').contentHash = 'changed';
  assert.notEqual(selectCrew(identity, config, changed, impact(['csharp'])).selectionHash, original.selectionHash);
});

function evidence() {
  const policy = { ...require('./fixtures/policy.json'), crew: config };
  const gate = reviewer => ({ ...identity, verdict: 'pass', reviewer, summary: 'Checked owning code and callers', evidence: ['src/Thing.cs:1'], findings: [] });
  const e = { schema: 1, ...identity, coordinator: 'captain-session', repairReviewers: [], repository: policy.repository,
    headRepository: policy.repository, state: 'open', draft: false, target: policy.base, author: 'maintainer', branch: 'feature/example',
    baseIncluded: true, repairCycles: 0, files: ['src/Thing.cs'], changedLines: 2,
    ci: { verdict: 'pass', sourceHead: identity.sourceHead, runUrl: 'https://github.com/example/project/actions/runs/1' },
    gates: Object.fromEntries(policy.reviewGates.map(name => [name, gate(name + '-session')])), crew: selection(['csharp']) };
  const member = e.crew.selected[0];
  e.gates['crew:csharp'] = { ...gate('csharp-session'), memberVersion: member.version, memberHash: member.contentHash, selectionHash: e.crew.selectionHash };
  return { e, policy };
}
test('selected specialists supplement mandatory gates and cannot approve themselves or erase conflicts', () => {
  const good = evidence(); assert.equal(evaluate(good.e, good.policy, identity.policyHash, good.e.crew).merge, true);
  for (const mutate of [e => delete e.gates.security, e => delete e.gates['crew:csharp'],
    e => e.gates['crew:csharp'].memberVersion = '0.9.0', e => e.gates['crew:csharp'].selectionHash = 'stale',
    e => e.gates['crew:csharp'].reviewer = e.coordinator, e => e.gates['crew:csharp'].reviewer = e.gates.correctness.reviewer,
    e => e.repairReviewers = [e.gates['crew:csharp'].reviewer],
    e => e.gates['crew:csharp'].findings = [{ severity: 'blocking' }],
    e => e.gates.unselected = { verdict: 'blocked', findings: [] },
    e => e.crew.selected = [], e => delete e.crew]) {
    const { e, policy } = evidence(), expected = structuredClone(e.crew); mutate(e);
    assert.equal(evaluate(e, policy, identity.policyHash, expected).merge, false);
  }
});

test('actual Git changes trace indirect UI callers in both revisions, documentation and shared config', t => {
  const parent = process.env.MARC_TEST_ARTIFACTS || os.tmpdir(); fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'marc-impact-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, stdio: 'pipe' }).trimEnd();
  const write = (file, data) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), data); };
  const commit = () => { git('add', '.'); git('-c', 'core.hooksPath=', '-c', 'user.name=Fixture', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture'); return git('rev-parse', 'HEAD'); };
  git('init');
  write('src/Core/Clock.cs', 'class Clock { public int Value = 1; }');
  write('src/Core/Presenter.cs', 'class Presenter { Clock clock; }');
  write('src/UI/View.razor', '@inject Presenter State\n<script src="widget.js"></script>');
  write('src/UI/widget.js', 'export function renderView() { return "View"; }');
  write('docs/guide.md', 'Clock user guide');
  const base = commit();
  write('src/Core/Clock.cs', 'class Clock { public int Value = 2; }');
  const head = commit();
  const result = collectImpact(base, head, ['src/Core/Clock.cs'], config, catalogue(), git);
  assert.deepEqual(result.technologies, ['blazor', 'csharp', 'javascript']);
  assert.equal(result.requiresBrowser, true);
  assert.deepEqual(result.holds, []);
  assert.ok(result.files.includes('src/UI/View.razor'));
  assert.equal(selectCrew(identity, config, catalogue(), result).selected.length, 4);
  const policy = { ...require('./fixtures/policy.json'), crew: config };
  const controller = require('./marc.cjs').createController({ repoRoot: root, bundleRoot: path.resolve(__dirname, '../..'),
    policy, crew: config, ci: { workflow: 'ci.yml' }, toolCommit: identity.toolCommit }, {
    git: (...args) => args[0] === 'fetch' ? '' : args[0] === 'rev-parse' && args[1] === 'FETCH_HEAD' ? head : git(...args),
    api: endpoint => endpoint.endsWith('/pulls/7') ? { state: 'open', draft: false, user: { login: 'maintainer' },
      head: { sha: head, ref: 'feature/example', repo: { full_name: policy.repository } }, base: { ref: 'master' } } :
      endpoint.includes('/git/ref/') ? { object: { sha: base } } : { workflow_runs: [] }, readJobs: () => []
  });
  const captured = controller.capture(7, policy, identity.policyHash);
  assert.deepEqual(captured.crew.impact, result);
  assert.equal(captured.crew.toolCommit, identity.toolCommit);
  assert.equal(captured.crew.selected.length, 4);
  assert.equal(evaluate(captured, policy, identity.policyHash, captured.crew).merge, false);
  const docs = collectImpact(base, head, ['docs/guide.md'], config, catalogue(), git);
  assert.deepEqual(docs.technologies, []);
  const shared = collectImpact(base, head, ['package.json'], config, catalogue(), git);
  assert.equal(shared.uncertain, true);
  assert.equal(selectCrew(identity, config, catalogue(), shared).selected.length, 4);
  const configured = collectImpact(base, head, ['src/Shared/Bridge.cs'], config, catalogue(), git);
  assert.equal(configured.requiresBrowser, true);
  assert.ok(configured.reasons.some(r => r.includes('Shared services')));
  const unknown = collectImpact(base, head, ['app.py'], config, catalogue(), git);
  assert.match(selectCrew(identity, config, catalogue(), unknown).holds.join(' '), /python/);
  const unavailable = collectImpact(base, head, ['src/Core/Clock.cs'], config, catalogue(), () => { throw Error('read failure'); });
  assert.match(unavailable.holds.join(' '), /unavailable/);
  // Removing a call in the new tree must still recruit expertise required by its former callers.
  write('src/Core/Presenter.cs', 'class Presenter {}');
  const removed = commit();
  assert.equal(collectImpact(head, removed, ['src/Core/Clock.cs'], config, catalogue(), git).requiresBrowser, true);
});

test('a selected specialist cannot waive a simple route or the independent browser gate', () => {
  const { e, policy } = evidence();
  e.crew = selection(['csharp', 'blazor'], { requiresBrowser: true });
  e.routing = { ...e.gates.correctness, route: 'simple', changeKind: 'local-change', risks: [] };
  assert.ok(evaluate(e, policy, identity.policyHash, e.crew).reasons.includes('Captured specialist impact requires full review'));
  delete e.routing;
  assert.ok(evaluate(e, policy, identity.policyHash, e.crew).reasons.some(r => r.startsWith('browser:')));
});

test('reference search bounds collected paths and does not treat unrelated data as source callers', () => {
  const configWithoutAreas = { ...config, areas: [] };
  const read = (...args) => args[0] === 'diff' ? '+class Clock {}' :
    `${identity.base}:data/customer.json\0${identity.base}:docs/notes.md\0` +
    Array.from({ length: 500 }, (_, i) => `${identity.base}:src/Caller${i}.cs\0`).join('');
  const result = collectImpact(identity.base, identity.sourceHead, ['src/Clock.cs'], configWithoutAreas, catalogue(), read);
  assert.equal(result.files.length, 300);
  assert.equal(result.uncertain, true);
  assert.ok(result.reasons.includes('Affected-file budget reached.'));
  assert.ok(!result.files.includes('data/customer.json'));
  assert.equal(selectCrew(identity, configWithoutAreas, catalogue(), result).selected.length, 4);
});

test('configured React hooks require browser evidence even without JSX', () => {
  const reactConfig = { ...config, areas: [{ paths: ['^src/react/'], technologies: ['react'], reason: 'Confirmed React web component and hook consumers.' }] };
  const result = collectImpact(identity.base, identity.sourceHead, ['src/react/useSearch.ts'], reactConfig, catalogue(), () => '');
  assert.deepEqual(result.technologies, ['javascript', 'react']);
  assert.equal(result.requiresBrowser, true);
  const selected = selectCrew(identity, reactConfig, catalogue(), result);
  assert.equal(selected.requiresFull, true);
  assert.match(selected.holds.join(' '), /Required expertise unavailable for react/);
});

test('React selection supplements JavaScript and front-end only for confirmed React impact', () => {
  const reactConfig = { schema: 1, members: ['javascript', 'frontend', 'react'].map(id => ({ id, version: '1.0.0' })),
    areas: [{ paths: ['^src/react/'], technologies: ['react', 'web'], reason: 'Confirmed React web application.' }] };
  const members = loadCatalogue(path.resolve(__dirname, '../..'), reactConfig);
  const route = file => {
    const affected = collectImpact(identity.base, identity.sourceHead, [file], reactConfig, members, () => '');
    return selectCrew(identity, reactConfig, members, affected);
  };
  for (const file of ['src/react/Search.tsx', 'src/react/useSearch.ts', 'src/react/useSearch.js']) {
    const result = route(file);
    assert.deepEqual(result.selected.map(x => x.id), ['frontend', 'javascript', 'react']);
    assert.deepEqual(result.holds, []);
    assert.equal(result.requiresFull, true);
    assert.equal(result.requiresBrowser, true);
  }
  assert.deepEqual(route('src/other/Widget.tsx').selected.map(x => x.id), ['frontend', 'javascript']);
  assert.deepEqual(route('src/server/worker.js').selected.map(x => x.id), ['javascript']);
  assert.deepEqual(route('docs/react-guide.md').selected, []);
  assert.ok(!selection(['csharp', 'blazor']).selected.some(x => x.id === 'react'));
});

test('React consumers referenced only in the old tree still recruit React expertise', () => {
  const reactConfig = { schema: 1, members: ['javascript', 'frontend', 'react'].map(id => ({ id, version: '1.0.0' })),
    areas: [{ paths: ['^client/'], technologies: ['react', 'web'], reason: 'Confirmed React callers of shared utilities.' }] };
  const members = loadCatalogue(path.resolve(__dirname, '../..'), reactConfig);
  const inspected = new Set();
  const read = (...args) => {
    if (args[0] === 'diff') return '-export function sharedPolicy() {}';
    const revision = args.at(-2); inspected.add(revision);
    return revision === identity.base ? `${revision}:client/View.tsx\0` : '';
  };
  const affected = collectImpact(identity.base, identity.sourceHead, ['shared/policy.ts'], reactConfig, members, read);
  assert.deepEqual([...inspected].sort(), [identity.base, identity.sourceHead].sort());
  assert.ok(affected.files.includes('client/View.tsx'));
  const result = selectCrew(identity, reactConfig, members, affected);
  assert.deepEqual(result.selected.map(x => x.id), ['frontend', 'javascript', 'react']);
  assert.equal(result.requiresBrowser, true);
  assert.deepEqual(result.holds, []);
});
