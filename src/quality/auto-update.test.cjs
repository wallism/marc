const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkLatest, updatePullRequest } = require('./auto-update.cjs');
const old = 'a'.repeat(40), latest = 'b'.repeat(40);
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const successfulRun = () => ({ id: 42, run_attempt: 1, head_sha: latest, head_branch: 'master', event: 'push',
  path: '.github/workflows/node-checks.yml', head_repository: { full_name: 'wallism/marc' }, status: 'completed', conclusion: 'success' });
const successfulJobs = () => ['ubuntu-latest', 'windows-latest'].map(os => ({ name: `Node 24 (${os})`,
  head_sha: latest, run_attempt: 1, status: 'completed', conclusion: 'success',
  steps: ['Run npm run build', 'Run npm test'].map(name => ({ name, status: 'completed', conclusion: 'success' })) }));
function upstreamCommand(runs = [successfulRun()], jobs = successfulJobs()) {
  const calls = [];
  const command = (exe, args) => {
    calls.push([exe, args]);
    if (exe === 'git') return latest + '\trefs/heads/master';
    const endpoint = args.at(-1);
    if (endpoint.includes('/workflows/node-checks.yml/runs?')) return JSON.stringify([{ workflow_runs: runs }]);
    assert.equal(endpoint, 'repos/wallism/marc/actions/runs/42/attempts/1/jobs?per_page=100');
    return JSON.stringify([{ jobs }]);
  };
  return { command, calls };
}

test('upstream evidence test step is accepted once and still must succeed on both platforms', () => {
  const jobs = successfulJobs().map(job => ({ ...job, steps: job.steps.map(step =>
    ({ ...step, name: step.name === 'Run npm test' ? 'Tests with review evidence' : step.name })) }));
  assert.equal(checkLatest({ toolCommit: old, autoUpdate: true }, upstreamCommand([successfulRun()], jobs).command), latest);
  for (const change of [
    { status: 'in_progress', conclusion: null }, { conclusion: 'failure' }, { conclusion: 'skipped' }
  ]) {
    const bad = structuredClone(jobs);
    Object.assign(bad[1].steps[1], change);
    assert.throws(() => checkLatest({ toolCommit: old, autoUpdate: true }, upstreamCommand([successfulRun()], bad).command), /upstream CI/i);
  }
  const duplicated = structuredClone(jobs);
  duplicated[1].steps.push(successfulJobs()[1].steps[1]);
  assert.throws(() => checkLatest({ toolCommit: old, autoUpdate: true }, upstreamCommand([successfulRun()], duplicated).command), /upstream CI/i);
});
test('omitted or disabled auto update performs no upstream check, including when offline', () => {
  const command = () => { assert.fail('Default-off intake must not contact upstream'); };
  assert.equal(checkLatest({ toolCommit: old }, command), null);
  assert.equal(checkLatest({ toolCommit: old, autoUpdate: false }, command), null);
  assert.equal(checkLatest({ autoUpdate: true }, command), null, 'Source repository does not self-update');
});

test('explicit auto update uses only master and disabling it makes no network calls', () => {
  const { calls, command } = upstreamCommand();
  assert.equal(checkLatest({ toolCommit: old, autoUpdate: true }, command), latest);
  assert.deepEqual(calls[0][1], ['ls-remote', '--exit-code', 'https://github.com/wallism/marc.git', 'refs/heads/master']);
  assert.equal(calls.filter(([exe]) => exe === 'gh').length, 2);
  calls.length = 0;
  assert.equal(checkLatest({ toolCommit: old, autoUpdate: false }, command), null);
  assert.equal(calls.length, 0);
  assert.throws(() => checkLatest({ toolCommit: old, autoUpdate: true }, () => ''), /master/);
  assert.throws(() => checkLatest({ toolCommit: old, autoUpdate: true }, () => { throw Error('offline'); }), /offline/);
});

test('upstream CI must match the exact master commit, workflow and repository', () => {
  for (const change of [{ head_sha: old }, { head_branch: 'other' }, { event: 'pull_request' },
    { path: '.github/workflows/other.yml' }, { head_repository: { full_name: 'fork/marc' } }]) {
    assert.throws(() => checkLatest({ toolCommit: old, autoUpdate: true }, upstreamCommand([{ ...successfulRun(), ...change }]).command), /upstream CI/i);
  }
  assert.throws(() => checkLatest({ toolCommit: old, autoUpdate: true }, upstreamCommand([]).command), /upstream CI/i);
});

test('failed, pending, cancelled or malformed upstream runs never authorize an update', () => {
  for (const change of [{ conclusion: 'failure' }, { status: 'in_progress', conclusion: null },
    { conclusion: 'cancelled' }, { conclusion: 'skipped' }, { run_attempt: undefined }, { id: undefined }]) {
    const { command, calls } = upstreamCommand([{ ...successfulRun(), ...change }]);
    assert.throws(() => checkLatest({ toolCommit: old, autoUpdate: true }, command), /upstream CI/i);
    assert.equal(calls.filter(([exe]) => exe === 'git').length, 1, 'Only read-only upstream resolution is allowed');
  }
  assert.throws(() => checkLatest({ toolCommit: old, autoUpdate: true }, upstreamCommand([
    successfulRun(), { ...successfulRun(), id: 43, status: 'queued', conclusion: null }
  ]).command), /upstream CI/i, 'A previous green run cannot mask a newer pending run');
});

test('both upstream platform jobs must pass once for the selected commit and attempt', () => {
  const good = successfulJobs();
  for (const jobs of [[], [good[0]], [...good, good[0]],
    ...[{ conclusion: 'failure' }, { conclusion: 'skipped' }, { status: 'in_progress' },
      { head_sha: old }, { run_attempt: 2 }, { steps: [] },
      { steps: [{ name: 'Run npm test', status: 'completed', conclusion: 'skipped' }] },
      { steps: [...good[1].steps, good[1].steps[1]] },
      { steps: good[1].steps.map(step => ({ ...step, conclusion: 'failure' })) }
    ].map(change => [good[0], { ...good[1], ...change }])]) {
    assert.throws(() => checkLatest({ toolCommit: old, autoUpdate: true }, upstreamCommand([successfulRun()], jobs).command), /upstream CI/i);
  }
});

test('upstream API errors and malformed responses fail closed', () => {
  for (const response of ['', '{}', 'not-json', '[{}]']) {
    assert.throws(() => checkLatest({ toolCommit: old, autoUpdate: true }, (exe) => exe === 'git' ? latest + '\trefs/heads/master' : response));
  }
  assert.throws(() => checkLatest({ toolCommit: old, autoUpdate: true }, exe => {
    if (exe === 'git') return latest + '\trefs/heads/master';
    throw Error('GitHub authentication unavailable');
  }), /authentication unavailable/);
});
test('real Git update includes generated integrations, preserves checkout, is idempotent, and rejects a push race', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-update-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repo = path.join(root, 'consumer'), remote = path.join(root, 'remote'), tool = path.join(root, 'tool');
  for (const folder of [repo, remote, tool]) fs.mkdirSync(folder);
  const run = (cwd, args, input, env = {}) => execFileSync('git', ['-c', 'core.hooksPath=', ...args],
    { cwd, input, env: { ...process.env, ...env }, encoding: 'utf8', windowsHide: true, stdio: 'pipe' }).trimEnd();
  const init = folder => { run(folder, ['init', '-b', 'main']); run(folder, ['config', 'user.name', 'Synthetic']); run(folder, ['config', 'user.email', 'test@example.invalid']); };
  init(tool); init(repo); run(remote, ['init', '--bare']);
  for (const file of ['templates/consumer-loader.cjs', 'scripts/install-consumer.cjs']) {
    fs.mkdirSync(path.dirname(path.join(tool, file)), { recursive: true }); fs.writeFileSync(path.join(tool, file), '// stable');
  }
  fs.mkdirSync(path.join(tool, 'src/quality'), { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'forwarders.cjs'), path.join(tool, 'src/quality/forwarders.cjs'));
  const skill = (name, description) => {
    fs.mkdirSync(path.join(tool, 'skills', name), { recursive: true });
    fs.writeFileSync(path.join(tool, 'skills', name, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\n`);
  };
  skill('marc-crew-captain', 'original');
  skill('marc-crew-python', 'existing member');
  const member = JSON.parse(fs.readFileSync(path.join(__dirname, '../../skills/marc-crew-python/crew.json')));
  const oldVersion = member.version;
  const manifestPath = path.join(tool, 'skills/marc-crew-python/crew.json');
  fs.writeFileSync(manifestPath, JSON.stringify(member));
  run(tool, ['add', '.']); run(tool, ['commit', '-m', 'initial']);
  const pin = run(tool, ['rev-parse', 'HEAD']);
  const originalFiles = require('./forwarders.cjs').renderForwarders(file => fs.readFileSync(path.join(tool, file), 'utf8'),
    ['marc-crew-captain', 'marc-crew-python'], ['.agents/skills', '.claude/skills']);
  for (const [file, contents] of originalFiles) {
    fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true }); fs.writeFileSync(path.join(repo, file), contents);
  }
  skill('marc-crew-captain', 'updated');
  skill('marc-crew-csharp', 'new member discovery');
  member.version = '9.0.0';
  fs.writeFileSync(manifestPath, JSON.stringify(member));
  fs.writeFileSync(path.join(tool, 'templates/consumer-loader.cjs'), '// updated bootstrap');
  fs.writeFileSync(path.join(tool, 'change.txt'), 'latest'); run(tool, ['add', '.']); run(tool, ['commit', '-m', 'latest']);
  const tip = run(tool, ['rev-parse', 'HEAD']);
  fs.mkdirSync(path.join(repo, '.marc'));
  const crew = { schema: 1, members: [{ id: 'python', version: oldVersion }], areas: [] };
  fs.writeFileSync(path.join(repo, '.marc/config.json'), JSON.stringify({ toolCommit: pin, preserved: 'value', crew }));
  fs.writeFileSync(path.join(repo, '.gitmodules'), '[submodule "marc"]\n path = .marc/tool\n url = https://github.com/wallism/marc.git\n');
  run(repo, ['add', '.']); run(repo, ['update-index', '--add', '--cacheinfo', `160000,${pin},.marc/tool`]);
  run(repo, ['commit', '-m', 'consumer']);
  run(repo, ['remote', 'add', 'origin', remote]); run(repo, ['push', 'origin', 'HEAD:refs/heads/deps/x']);
  const head = run(repo, ['rev-parse', 'HEAD']);
  fs.writeFileSync(path.join(repo, 'local-work.txt'), 'preserve dirty work');
  const context = { repoRoot: repo, policy: { repository: 'example/repo', base: 'main' } };
  const live = { state: 'open', draft: false, base: { ref: 'main' }, head: { ref: 'deps/x', sha: head, repo: { full_name: 'example/repo' } } };
  const calls = [];
  const git = (args, input) => {
    calls.push(args);
    if (args[0] === 'fetch' && args[1] === 'https://github.com/wallism/marc.git') args = ['fetch', tool, args[2] === 'refs/heads/master' ? 'main' : args[2]];
    return run(repo, args, input, { GIT_INDEX_FILE: path.join(root, 'update-index') });
  };
  const result = updatePullRequest(context, live, tip, { registered: () => true, git });
  assert.equal(result.status, 'updated');
  assert.equal(run(repo, ['rev-parse', 'HEAD']), head);
  assert.equal(fs.readFileSync(path.join(repo, 'local-work.txt'), 'utf8'), 'preserve dirty work');
  const changed = run(repo, ['diff-tree', '--no-commit-id', '--name-only', '-r', result.head]).split('\n');
  assert.deepEqual(changed, [...result.files].sort());
  assert.equal(changed.length, 7);
  assert.ok(changed.includes('.agents/skills/marc-crew-csharp/SKILL.md'));
  assert.ok(changed.includes('.claude/skills/marc-crew-csharp/SKILL.md'));
  assert.equal(run(repo, ['show', result.head + ':scripts/quality/bundle.cjs']), '// updated bootstrap');
  assert.match(result.note, /opt out/);
  assert.deepEqual(JSON.parse(run(repo, ['show', result.head + ':.marc/config.json'])), {
    toolCommit: tip, preserved: 'value', crew: { ...crew, members: [{ id: 'python', version: '9.0.0' }] }
  });
  assert.equal(run(repo, ['ls-tree', result.head, '.marc/tool']), `160000 commit ${tip}\t.marc/tool`);
  assert.equal(updatePullRequest(context, { ...live, head: { ...live.head, sha: result.head } }, tip, { registered: () => true, git }).status, 'current');
  assert.equal(calls.filter(args => args[0] === 'push').length, 1);
  assert.throws(() => updatePullRequest(context, live, tip, { registered: () => true, git }), /PR changed/);
  // A concurrent sibling commit must survive the updater's ordinary push.
  run(repo, ['push', 'origin', `${head}:refs/heads/deps/race`]);
  const sibling = run(repo, ['commit-tree', head + '^{tree}', '-p', head], 'concurrent\n');
  const racingGit = (args, input) => {
    if (args[0] === 'push') run(repo, ['push', 'origin', `${sibling}:refs/heads/deps/race`]);
    return git(args, input);
  };
  assert.throws(() => updatePullRequest(context, { ...live, head: { ...live.head, ref: 'deps/race' } }, tip,
    { registered: () => true, git: racingGit }), /rejected|fetch first/);
  assert.equal(run(remote, ['rev-parse', 'refs/heads/deps/race']), sibling);
  // User customization is never overwritten by the generated refresh.
  run(repo, ['read-tree', head]);
  const customBlob = run(repo, ['hash-object', '-w', '--stdin'], 'custom skill instructions\n');
  run(repo, ['update-index', '--cacheinfo', `100644,${customBlob},.agents/skills/marc-crew-captain/SKILL.md`]);
  const customTree = run(repo, ['write-tree']);
  const customHead = run(repo, ['commit-tree', customTree, '-p', head], 'customization\n');
  run(repo, ['push', 'origin', `${customHead}:refs/heads/deps/custom`]);
  assert.throws(() => updatePullRequest(context, { ...live, head: { ...live.head, sha: customHead, ref: 'deps/custom' } }, tip,
    { registered: () => true, git }), /Customized MARC forwarding file/);
  assert.equal(run(remote, ['rev-parse', 'refs/heads/deps/custom']), customHead);
});
test('forks, drafts, target branches and unregistered producers cannot receive update commits', () => {
  const context = { policy: { repository: 'example/repo', base: 'main' } };
  const live = { state: 'open', draft: false, base: { ref: 'main' }, head: { ref: 'deps/x', sha: old, repo: { full_name: 'example/repo' } } };
  for (const change of [{ draft: true }, { head: { ...live.head, ref: 'main' } },
    { head: { ...live.head, repo: { full_name: 'foreign/repo' } } }, { base: { ref: 'other' } }]) {
    assert.throws(() => updatePullRequest(context, { ...live, ...change }, latest, { registered: () => true }), /eligible/);
  }
  assert.throws(() => updatePullRequest(context, live, latest, { registered: () => false }), /eligible/);
});
