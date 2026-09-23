const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { runUpgrade, parseArgs } = require('./upgrade.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-upgrade-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repo = path.join(root, 'consumer'), remote = path.join(root, 'remote'), tool = path.join(root, 'tool');
  for (const dir of [repo, remote, tool]) fs.mkdirSync(dir);
  const raw = (cwd, args, input, env = {}) => execFileSync('git', ['-c', 'core.hooksPath=', ...args], {
    cwd, input, env: { ...process.env, ...env }, encoding: 'utf8', windowsHide: true, stdio: 'pipe'
  }).trimEnd();
  for (const cwd of [repo, tool]) {
    raw(cwd, ['init', '-b', 'main']); raw(cwd, ['config', 'user.name', 'Synthetic']);
    raw(cwd, ['config', 'user.email', 'test@example.invalid']);
  }
  raw(remote, ['init', '--bare']);
  const write = (cwd, file, content) => {
    fs.mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    fs.writeFileSync(path.join(cwd, file), content);
  };
  write(tool, 'src/quality/forwarders.cjs', fs.readFileSync(path.join(__dirname, 'forwarders.cjs')));
  write(tool, 'templates/consumer-loader.cjs', '// initial\n');
  write(tool, 'skills/marc-crew-captain/SKILL.md', '---\nname: marc-crew-captain\ndescription: Synthetic\n---\n');
  const release = text => {
    write(tool, 'release.txt', text); raw(tool, ['add', '.']); raw(tool, ['commit', '-m', text]);
    return raw(tool, ['rev-parse', 'HEAD']);
  };
  const pin = release('initial');
  const files = require('./forwarders.cjs').renderForwarders(file => fs.readFileSync(path.join(tool, file), 'utf8'),
    ['marc-crew-captain'], ['.agents/skills']);
  for (const [file, content] of files) write(repo, file, content);
  write(repo, '.marc/config.json', JSON.stringify({ toolCommit: pin, autoUpdate: false, preserved: 'setting' }));
  write(repo, '.gitmodules', '[submodule "marc"]\n path = .marc/tool\n url = https://github.com/wallism/marc.git\n');
  raw(repo, ['add', '.']); raw(repo, ['update-index', '--add', '--cacheinfo', `160000,${pin},.marc/tool`]);
  raw(repo, ['commit', '-m', 'consumer']); raw(repo, ['remote', 'add', 'origin', remote]);
  raw(repo, ['push', 'origin', 'main']);
  fs.mkdirSync(path.join(repo, '.marc/tool'));
  const stateDirectory = path.join(root, 'state');
  const context = { repoRoot: repo, toolCommit: pin, autoUpdate: false, stateDirectory,
    runLock: path.join(stateDirectory, 'run.lock'), policy: { repository: 'example/repo', base: 'main' } };
  const prs = [], calls = [];
  let goodCi = true, failCreate = false;
  const branch = 'codex/marc-upgrade';
  const git = (args, input) => {
    calls.push(['git', args]);
    if (args[0] === 'fetch' && args[1] === 'https://github.com/wallism/marc.git')
      args = ['fetch', tool, args[2] === 'refs/heads/master' ? 'main' : args[2]];
    return raw(repo, args, input, { GIT_INDEX_FILE: path.join(root, 'index') });
  };
  const command = (exe, args, input) => {
    if (exe === 'git') {
      if (args.includes('https://github.com/wallism/marc.git') && args[0] === 'ls-remote')
        return raw(tool, ['rev-parse', 'HEAD']) + '\trefs/heads/master';
      return git(args, input);
    }
    calls.push([exe, args]);
    const endpoint = args.find(a => a.startsWith('repos/'));
    const latest = raw(tool, ['rev-parse', 'HEAD']);
    if (endpoint.includes('/workflows/')) return JSON.stringify([{ workflow_runs: [{ id: 1, run_attempt: 1,
      head_sha: latest, head_branch: 'master', event: 'push', path: '.github/workflows/node-checks.yml',
      head_repository: { full_name: 'wallism/marc' }, status: 'completed', conclusion: goodCi ? 'success' : 'failure' }] }]);
    if (endpoint.includes('/jobs?')) return JSON.stringify([{ jobs: ['ubuntu-latest', 'windows-latest'].map(os => ({
      name: `Node 24 (${os})`, head_sha: latest, run_attempt: 1, status: 'completed', conclusion: 'success',
      steps: ['Run npm run build', 'Run npm test'].map(name => ({ name, status: 'completed', conclusion: 'success' }))
    })) }]);
    if (args.includes('POST')) {
      if (failCreate) throw Error('Synthetic create failure');
      const pr = { number: prs.length + 1, state: 'open', html_url: `https://github.com/example/repo/pull/${prs.length + 1}`,
        base: { ref: 'main', repo: { full_name: 'example/repo' } },
        head: { ref: branch, repo: { full_name: 'example/repo' } } };
      prs.unshift(pr); return JSON.stringify(pr);
    }
    return JSON.stringify([prs.map(pr => ({ ...pr, head: { ...pr.head,
      sha: pr.head.sha || raw(remote, ['rev-parse', 'refs/heads/' + branch]) } }))]);
  };
  const adapters = { command, checkTrusted: () => {} };
  return { root, repo, remote, tool, context, prs, calls, raw, write, release, branch,
    run: () => runUpgrade(context, {}, adapters), adapters,
    failCi: () => { goodCi = false; }, failCreate: value => { failCreate = value; } };
}

test('explicit upgrade reuses one branch and PR, appends newer pins, and leaves checkout and approvals intact', t => {
  const f = fixture(t), base = f.raw(f.repo, ['rev-parse', 'HEAD']);
  fs.mkdirSync(f.context.stateDirectory); f.write(f.context.stateDirectory, 'approval.json', 'original approval');
  f.write(f.context.stateDirectory, 'completed.json', 'original completed keys and budgets');
  const firstPin = f.release('second'), first = f.run();
  assert.equal(first.status, 'updated'); assert.equal(f.prs.length, 1);
  const pushes = () => f.calls.filter(([exe, args]) => exe === 'git' && args[0] === 'push').length;
  assert.equal(f.run().status, 'current'); assert.equal(pushes(), 1);
  const latest = f.release('third'), next = f.run();
  assert.equal(next.pr, first.pr); assert.equal(f.prs.length, 1); assert.equal(pushes(), 2);
  assert.equal(f.raw(f.repo, ['rev-parse', next.head + '^']), first.head);
  assert.equal(JSON.parse(f.raw(f.repo, ['show', next.head + ':.marc/config.json'])).toolCommit, latest);
  assert.equal(JSON.parse(f.raw(f.repo, ['show', first.head + ':.marc/config.json'])).toolCommit, firstPin);
  assert.equal(f.raw(f.repo, ['rev-parse', 'HEAD']), base);
  assert.equal(f.raw(f.repo, ['status', '--porcelain']), '');
  assert.equal(fs.readFileSync(path.join(f.context.stateDirectory, 'approval.json'), 'utf8'), 'original approval');
  assert.equal(fs.readFileSync(path.join(f.context.stateDirectory, 'completed.json'), 'utf8'), 'original completed keys and budgets');
  assert.ok(f.calls.every(([, args]) => !args.some(a => a.startsWith('--force'))));
});

test('no available upgrade creates no branch or PR; failed upstream CI cannot push', t => {
  const f = fixture(t); assert.equal(f.run().status, 'current'); assert.equal(f.prs.length, 0);
  f.release('second'); f.failCi(); assert.throws(f.run, /upstream CI/i);
  assert.equal(f.calls.filter(([exe, args]) => exe === 'git' && args[0] === 'push').length, 0);
});

test('retry after branch push but failed PR creation reuses the pending commit', t => {
  const f = fixture(t); f.release('second'); f.failCreate(true);
  assert.throws(f.run, /create failure/); const head = f.raw(f.remote, ['rev-parse', 'refs/heads/' + f.branch]);
  f.failCreate(false); const result = f.run();
  assert.equal(result.head, head); assert.equal(f.prs.length, 1);
  assert.equal(f.calls.filter(([exe, args]) => exe === 'git' && args[0] === 'push').length, 1);
});

test('unowned branches, foreign locks, untrusted checkout and closed unmerged PRs fail closed', t => {
  const f = fixture(t); f.release('second');
  f.raw(f.repo, ['push', 'origin', 'main:refs/heads/' + f.branch]);
  assert.throws(f.run, /ownership|unowned/i);
  f.raw(f.repo, ['push', 'origin', '--delete', f.branch]);
  fs.writeFileSync(f.context.runLock, 'foreign'); assert.throws(f.run, /EEXIST|lock/i);
  assert.equal(fs.readFileSync(f.context.runLock, 'utf8'), 'foreign'); fs.unlinkSync(f.context.runLock);
  assert.throws(() => runUpgrade(f.context, {}, { ...f.adapters, checkTrusted: () => { throw Error('untrusted checkout'); } }), /untrusted/);
  f.run(); f.prs[0].state = 'closed'; f.release('third');
  assert.throws(f.run, /closed.*reopen/i); assert.equal(f.prs.length, 1);
});

test('after merge the branch name is reused without force even when the prior PR was squash merged', t => {
  const f = fixture(t); f.release('second'); const first = f.run();
  const squash = f.raw(f.repo, ['commit-tree', first.head + '^{tree}', '-p', 'HEAD'], 'squash merge\n');
  f.raw(f.repo, ['update-ref', 'refs/heads/main', squash]);
  f.raw(f.repo, ['read-tree', squash]); f.raw(f.repo, ['push', 'origin', 'main']);
  f.prs[0].state = 'closed'; f.prs[0].merged_at = '2026-09-24T00:00:00Z';
  f.prs[0].head.sha = first.head;
  f.release('third'); f.failCreate(true); assert.throws(f.run, /create failure/);
  delete f.prs[0].head.sha; // Recovery does not depend on a closed PR retaining its historical head SHA.
  f.failCreate(false); const next = f.run();
  assert.equal(f.prs.length, 2); assert.notEqual(next.pr, first.pr);
  assert.equal(f.raw(f.repo, ['merge-base', next.head, squash]), squash);
  assert.equal(f.raw(f.repo, ['merge-base', next.head, first.head]), first.head);
});

test('an appended report and a newer target commit survive an update without carrying approval forward', t => {
  const f = fixture(t); f.release('second'); const first = f.run();
  const report = '.quality/reports/pr-1/historical.md';
  f.raw(f.repo, ['read-tree', first.head], undefined, { GIT_INDEX_FILE: path.join(f.root, 'report-index') });
  const blob = f.raw(f.repo, ['hash-object', '-w', '--stdin'], 'historical report\n');
  f.raw(f.repo, ['update-index', '--add', '--cacheinfo', `100644,${blob},${report}`], undefined,
    { GIT_INDEX_FILE: path.join(f.root, 'report-index') });
  const tree = f.raw(f.repo, ['write-tree'], undefined, { GIT_INDEX_FILE: path.join(f.root, 'report-index') });
  const reported = f.raw(f.repo, ['commit-tree', tree, '-p', first.head], 'report\n');
  f.raw(f.repo, ['push', 'origin', `${reported}:refs/heads/${f.branch}`]);
  f.write(f.repo, 'application.txt', 'new target work'); f.raw(f.repo, ['add', 'application.txt']);
  f.raw(f.repo, ['commit', '-m', 'target moved']); f.raw(f.repo, ['push', 'origin', 'main']);
  const base = f.raw(f.repo, ['rev-parse', 'HEAD']);
  f.release('third'); const next = f.run();
  assert.equal(f.raw(f.repo, ['show', next.head + ':' + report]), 'historical report');
  assert.equal(f.raw(f.repo, ['rev-parse', next.head + '^']), reported);
  assert.equal(f.raw(f.repo, ['rev-parse', 'HEAD']), base);
  assert.match(next.note, /fresh applicable human approval/);
  assert.equal(f.prs.length, 1);
});

test('malformed ownership, wrong PR identity, remote races and upstream drift cannot publish', t => {
  const f = fixture(t); f.release('second'); const first = f.run(); f.release('third');
  const file = path.join(f.context.stateDirectory, 'upgrade-pr', fs.readdirSync(path.join(f.context.stateDirectory, 'upgrade-pr'))[0]);
  const original = fs.readFileSync(file, 'utf8'); fs.writeFileSync(file, original.replace('example/repo', 'foreign/repo'));
  assert.throws(f.run, /ownership/); fs.writeFileSync(file, original);
  f.prs[0].base.ref = 'other'; assert.throws(f.run, /identity mismatch/); f.prs[0].base.ref = 'main';
  let drift = false;
  const drifting = (exe, args, input) => {
    if (exe === 'git' && args[0] === 'fetch' && args[1] === 'https://github.com/wallism/marc.git' && !drift) {
      drift = true; f.release('fourth');
    }
    return f.adapters.command(exe, args, input);
  };
  assert.throws(() => runUpgrade(f.context, {}, { ...f.adapters, command: drifting }), /master moved/);
  const sibling = f.raw(f.repo, ['commit-tree', first.head + '^{tree}', '-p', first.head], 'concurrent\n');
  const racing = (exe, args, input) => {
    if (exe === 'git' && args[0] === 'push') f.raw(f.repo, ['push', 'origin', `${sibling}:refs/heads/${f.branch}`]);
    return f.adapters.command(exe, args, input);
  };
  assert.throws(() => runUpgrade(f.context, {}, { ...f.adapters, command: racing }), /rejected|fetch first/);
  assert.equal(f.raw(f.remote, ['rev-parse', 'refs/heads/' + f.branch]), sibling);
});

test('CLI rejects unknown, duplicate and missing options', () => {
  assert.deepEqual(parseArgs(['--repo', '/repo', '--branch', 'deps/marc']), { repo: '/repo', branch: 'deps/marc' });
  for (const args of [['--approve'], ['--repo'], ['--branch', '--repo'], ['--repo', 'x', '--repo', 'y']])
    assert.throws(() => parseArgs(args), /Usage/);
});

test('a deleted merged branch is recreated; a deleted open branch is held', t => {
  const f = fixture(t); f.release('second'); const first = f.run(); f.prs[0].head.sha = first.head;
  f.raw(f.repo, ['push', 'origin', '--delete', f.branch]);
  assert.throws(f.run, /branch is missing/);
  f.prs[0].state = 'closed'; f.prs[0].merged_at = '2026-09-24T00:00:00Z';
  const squash = f.raw(f.repo, ['commit-tree', first.head + '^{tree}', '-p', 'HEAD'], 'squash merge\n');
  f.raw(f.repo, ['update-ref', 'refs/heads/main', squash]); f.raw(f.repo, ['push', 'origin', 'main']);
  f.release('third'); const next = f.run();
  assert.equal(f.prs.length, 2); assert.equal(f.raw(f.repo, ['rev-parse', next.head + '^']), squash);
});

test('target drift before push and a replacement lock are preserved', t => {
  const f = fixture(t); f.release('second');
  const moved = f.raw(f.repo, ['commit-tree', 'HEAD^{tree}', '-p', 'HEAD'], 'target drift\n');
  let changed = false;
  const command = (exe, args, input) => {
    if (!changed && exe === 'git' && args.includes('commit-tree')) {
      changed = true; f.raw(f.repo, ['push', 'origin', `${moved}:refs/heads/main`]);
      fs.renameSync(f.context.runLock, f.context.runLock + '.old'); fs.writeFileSync(f.context.runLock, 'replacement owner');
    }
    return f.adapters.command(exe, args, input);
  };
  assert.throws(() => runUpgrade(f.context, {}, { ...f.adapters, command }), /target moved/);
  assert.equal(fs.readFileSync(f.context.runLock, 'utf8'), 'replacement owner');
  assert.equal(f.prs.length, 0);
});
