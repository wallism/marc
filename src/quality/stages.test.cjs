const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { recordStage, readStages } = require('./stages.cjs');
const { prepareReport, reportMarkdown, evaluate } = require('./marc.cjs');

const gate = reviewer => ({ verdict: 'pass', reviewer, summary: 'Synthetic check passed', evidence: ['synthetic test'], findings: [] });
const original = () => ({ repository: 'example/project', pr: 7, sourceHead: 'a'.repeat(40), base: 'b'.repeat(40),
  policyHash: 'synthetic-policy', repairCycles: 0, routing: { route: 'simple', reviewer: 'captain' },
  gates: { 'simple-tests': gate('initial-tests'), 'crew:csharp': gate('initial-csharp') },
  crew: { selected: [{ id: 'csharp', version: '1.1.0', reasons: ['C# change'] }], omitted: [] },
  ci: { verdict: 'pass', runId: 1, runAttempt: 1 } });
const decision = { eligible: true, merge: true, reasons: [] };
function directory(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-stages-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('stage journal retains initial crew, CI failure, repair and fresh full review across restarts', t => {
  const root = directory(t), first = original();
  const initial = recordStage(root, first, decision);
  assert.equal(recordStage(root, first, decision).length, 1, 'same checkpoint is idempotent');
  recordStage(root, first, decision, { kind: 'ci', phase: 'report', head: 'c'.repeat(40), runId: 2,
    runAttempt: 1, status: 'completed', conclusion: 'failure', summary: 'Dependency audit failed', evidence: ['retained scan'] });
  recordStage(root, first, decision, { kind: 'repair', toHead: 'd'.repeat(40), reviewer: 'repair-session',
    summary: 'Patched application dependency', result: 'repaired', evidence: ['red/green parser checks'] });
  const next = { ...first, sourceHead: 'd'.repeat(40), repairCycles: 1, routing: { route: 'full', reviewer: 'captain' },
    gates: { security: gate('fresh-security'), 'crew:javascript': gate('fresh-javascript') },
    crew: { selected: [{ id: 'javascript', version: '1.0.0', reasons: ['Application dependency'] }], omitted: [] } };
  next.stages = recordStage(root, next, decision);
  assert.equal(next.stages.length, 4);
  assert.deepEqual(readStages(root, next)[0], initial[0], 'previous stage bytes and identities preserved');
  const markdown = reportMarkdown(prepareReport(next), decision);
  for (const text of ['Assessment stages', 'Initial review', 'Dependency audit failed', 'Patched application dependency',
    'Review after repair 1', 'initial-csharp', 'fresh-javascript', 'repair-session']) assert.ok(markdown.includes(text), text);
  assert.ok(markdown.indexOf('initial-csharp') < markdown.indexOf('fresh-javascript'));
  assert.equal(prepareReport(next).reportFormat, 'marc-v3');
  assert.doesNotMatch(reportMarkdown({ ...prepareReport(next), reportFormat: 'marc-v2' }, decision), /Assessment stages/);
});

test('stage history cannot supply current approval and corrupted or foreign journals fail closed', t => {
  const root = directory(t), e = original();
  e.stages = recordStage(root, e, decision);
  const policy = require('./fixtures/policy.json');
  assert.equal(evaluate({ ...e, gates: {} }, policy, e.policyHash).merge, false);
  assert.throws(() => readStages(root, { ...e, repository: 'other/project' }), /identity/);
  const file = path.join(root, 'pr-7.jsonl');
  const bytes = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, bytes.replace('initial-csharp', 'forged-reviewer'));
  assert.throws(() => recordStage(root, e, decision), /integrity/);
  assert.equal(fs.readFileSync(file, 'utf8'), bytes.replace('initial-csharp', 'forged-reviewer'));
});

test('invalid events and foreign locks cannot append a misleading stage', t => {
  const root = directory(t), e = original();
  for (const event of [{ kind: 'approved' }, { kind: 'repair', toHead: 'bad' },
    { kind: 'ci', phase: 'report', status: 'success' }]) assert.throws(() => recordStage(root, e, decision, event));
  fs.writeFileSync(path.join(root, 'pr-7.lock'), 'foreign owner');
  assert.throws(() => recordStage(root, e, decision), /EEXIST/);
  assert.equal(fs.readFileSync(path.join(root, 'pr-7.lock'), 'utf8'), 'foreign owner');
});

test('controller checkpoints and reports retain stages across replacement evidence', t => {
  const { execFileSync } = require('node:child_process');
  const { createController } = require('./marc.cjs');
  const root = directory(t), worktree = path.join(root, 'candidate');
  fs.mkdirSync(worktree);
  const git = (...args) => execFileSync('git', ['-c', 'core.hooksPath=', ...args],
    { cwd: worktree, encoding: 'utf8', windowsHide: true, stdio: 'pipe' }).trimEnd();
  git('init');
  fs.writeFileSync(path.join(worktree, 'source.txt'), 'synthetic');
  git('add', '.'); git('-c', 'user.name=Fixture', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'source');
  const sourceHead = git('rev-parse', 'HEAD'), bundleRoot = path.resolve(__dirname, '../..');
  let e = { ...original(), crew: undefined, sourceHead };
  const evidence = path.join(root, 'evidence.json');
  fs.writeFileSync(evidence, JSON.stringify(e));
  const context = { repoRoot: bundleRoot, bundleRoot, stateDirectory: root, consumerFiles: ['AGENTS.md'],
    policy: require('./fixtures/policy.json'), ci: { workflow: 'ci.yml' } };
  const controller = createController(context, {
    git: (...args) => {
      if (args[0] === 'branch') return 'master';
      if (args[0] === 'status' || args[0] === 'fetch') return '';
      if (args[0] === 'remote') return 'https://github.com/example/project';
      if (args[0] === 'rev-parse') return args[1] === '--show-toplevel' ? bundleRoot : sourceHead;
      throw Error('Unexpected Git inspection: ' + args.join(' '));
    },
    api: endpoint => endpoint.includes('/git/ref/') ? { object: { sha: e.base } } :
      endpoint.includes('/actions/') ? { workflow_runs: [] } :
      { state: 'open', draft: false, user: { login: 'maintainer' }, base: { ref: 'master' },
        head: { sha: sourceHead, ref: 'bugfix/example', repo: { full_name: 'example/project' } } }
  });
  const output = t.mock.method(console, 'log', () => {});
  controller.run(['checkpoint', evidence]);
  e = { ...e, repairCycles: 1, gates: { security: gate('new-security') } };
  fs.writeFileSync(evidence, JSON.stringify(e));
  controller.run(['report', evidence, worktree]);
  const published = JSON.parse(fs.readFileSync(evidence));
  assert.equal(published.reportFormat, 'marc-v3');
  assert.equal(published.reportCiReuse, undefined);
  assert.doesNotMatch(JSON.parse(output.mock.calls.at(-2).arguments[0]).commitMessage, /skip ci/);
  assert.equal(published.stages.length, 2);
  assert.equal(published.stages[0].gates['crew:csharp'].reviewer, 'initial-csharp');
  assert.equal(published.stages[1].gates.security.reviewer, 'new-security');
  assert.equal(readStages(path.join(root, 'assessment-stages'), e).length, 2);
  assert.ok(output.mock.calls.length >= 2);
});
