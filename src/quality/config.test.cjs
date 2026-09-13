const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('separate consumers resolve their own repository, base, CI and state', t => {
  const { loadConfig } = require('./config.cjs');
  const parent = process.env.MARC_TEST_ARTIFACTS || os.tmpdir();
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'marc-config-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const make = (name, repository, base) => {
    const repo = path.join(root, name); fs.mkdirSync(path.join(repo, '.marc'), { recursive: true });
    fs.writeFileSync(path.join(repo, '.marc/config.json'), JSON.stringify({ schema: 1, policy: '.marc/policy.json',
      ci: { workflow: 'checks.yml', requiredArtifacts: ['checks'] }, state: { root: path.join(root, 'state') },
      technologies: ['python'], guidance: {}, scans: {} }));
    fs.writeFileSync(path.join(repo, '.marc/policy.json'), JSON.stringify({ ...require('./fixtures/policy.json'), repository, base }));
    return loadConfig(repo);
  };
  const a = make('one', 'example/one', 'main'), b = make('two', 'example/two', 'develop');
  assert.equal(a.policy.repository, 'example/one'); assert.equal(a.policy.base, 'main');
  assert.equal(a.ci.workflow, 'checks.yml'); assert.notEqual(a.stateDirectory, b.stateDirectory);
  assert.equal(a.scans.nugetSolution, undefined);
  assert.equal(a.autoUpdate, true);
  assert.equal(a.agents, null);
  assert.equal(a.agentSelections.security.model.source, 'captain');
  const settingsPath = path.join(a.repoRoot, '.marc/config.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath));
  fs.writeFileSync(settingsPath, JSON.stringify({ ...settings, agents: { members: { security: { model: 'host-model' } } } }));
  assert.equal(loadConfig(a.repoRoot).agentSelections.security.model.value, 'host-model');
  assert.equal(loadConfig(a.repoRoot).agentSelections.correctness.model.source, 'captain');
  fs.writeFileSync(settingsPath, JSON.stringify({ ...settings, agents: { members: { securty: { model: 'host-model' } } } }));
  assert.throws(() => loadConfig(a.repoRoot), /Unknown agent member/);
  fs.writeFileSync(settingsPath, JSON.stringify({ ...settings, autoUpdate: false }));
  assert.equal(loadConfig(a.repoRoot).autoUpdate, false);
  fs.writeFileSync(settingsPath, JSON.stringify({ ...settings, autoUpdate: 'false' }));
  assert.throws(() => loadConfig(a.repoRoot), /autoUpdate must be a boolean/);
  const same = make('same', 'Example/One', 'main');
  assert.equal(same.stateDirectory, a.stateDirectory);
  assert.throws(() => loadConfig(root), /config/);
});

test('configured files and legacy state cannot escape or belong to another consumer', t => {
  const { loadConfig } = require('./config.cjs');
  const parent = process.env.MARC_TEST_ARTIFACTS || os.tmpdir();
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'marc-invalid-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.cpSync(path.join(__dirname, '../../examples/python/.marc'), path.join(root, '.marc'), { recursive: true });
  const file = path.join(root, '.marc/config.json');
  const config = JSON.parse(fs.readFileSync(file));
  const reject = (change, message) => {
    fs.writeFileSync(file, JSON.stringify({ ...config, ...change }));
    assert.throws(() => loadConfig(root), message);
  };
  reject({ policy: '../policy.json' }, /Invalid consumer file path/);
  reject({ scans: { secretExceptions: '.marc/missing' } }, /ENOENT/);
  reject({ state: { legacyDirectory: root, legacyRepository: 'another/project' } }, /Legacy state belongs/);
  reject({ ci: { workflow: '../checks.yml', requiredArtifacts: ['checks'] } }, /Invalid MARC config/);
});

test('external installation resolves the Python example independently of its working directory', () => {
  const { execFileSync } = require('node:child_process');
  const root = path.join(__dirname, '../../examples/python');
  const output = execFileSync(process.execPath, [path.join(__dirname, 'marc.cjs'), '--repo', root, 'config'],
    { cwd: os.homedir(), encoding: 'utf8', windowsHide: true });
  const config = JSON.parse(output);
  assert.equal(config.repoRoot, fs.realpathSync(root));
  assert.notEqual(config.repoRoot, config.bundleRoot);
  assert.equal(config.trusted, false);
  assert.equal(config.policy.mode, 'report-only');
  assert.equal(config.policy.repository, 'example/python-project');
  assert.equal(config.scans.nugetSolution, undefined);
  assert.equal(config.scans.npmExceptions, undefined);
});

test('capture, live checks and CI requests use each consumer repository, branch and workflow', () => {
  const { createController } = require('./marc.cjs');
  const A = 'a'.repeat(40), B = 'b'.repeat(40);
  for (const [repository, base, workflow] of [['example/python', 'main', 'python.yml'], ['another/server', 'release/stable', 'build.yaml']]) {
    const policy = { ...require('./fixtures/policy.json'), repository, base, requiredJobs: ['Tests'] };
    const calls = [];
    const controller = createController({ repoRoot: __dirname, policy, ci: { workflow } }, {
      api: endpoint => {
        calls.push(endpoint);
        if (endpoint === `repos/${repository}/pulls/7`) return { state: 'open', draft: false, user: { login: 'maintainer' },
          head: { sha: B, ref: 'feature/example', repo: { full_name: repository } }, base: { ref: base } };
        if (endpoint === `repos/${repository}/git/ref/heads/${encodeURIComponent(base)}`) return { object: { sha: A } };
        if (endpoint === `repos/${repository}/actions/workflows/${workflow}/runs?head_sha=${B}&per_page=100`)
          return { workflow_runs: [{ id: 12, head_sha: B, event: 'push', status: 'completed', conclusion: 'success',
            html_url: `https://github.com/${repository}/actions/runs/12`, run_attempt: 1 }] };
        throw Error('Unexpected endpoint: ' + endpoint);
      },
      git: (...args) => {
        if (args[0] === 'fetch' || args[0] === 'merge-base') return '';
        if (args[0] === 'rev-parse') return B;
        if (args[0] === 'diff') return args.includes('--numstat') ? '1\t0\tapp.py\0' : 'app.py\0';
        throw Error('Unexpected Git read: ' + args.join(' '));
      },
      readJobs: id => { assert.equal(id, 12); return [{ name: 'Tests', conclusion: 'success' }]; }
    });
    const e = controller.capture(7, policy, 'policy');
    assert.equal(e.repository, repository); assert.equal(e.target, base); assert.equal(e.base, A);
    assert.equal(e.ci.verdict, 'pass'); assert.equal(e.changedLines, 1);
    assert.doesNotThrow(() => controller.assertLive(e));
    assert.throws(() => controller.assertLive({ ...e, base: B }), /Target branch changed/);
    assert.ok(calls.every(endpoint => endpoint.startsWith(`repos/${repository}/`)));
  }
});

test('a generic secret scan uses an empty explicit ignore and the consumer root', t => {
  const { loadConfig } = require('./config.cjs');
  const { run, reviewedSecretIgnores } = require('./scans.cjs');
  const parent = process.env.MARC_TEST_ARTIFACTS || os.tmpdir();
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'marc-scan-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const context = loadConfig(path.join(__dirname, '../../examples/python'));
  const output = path.join(root, 'secrets.json');
  assert.equal(reviewedSecretIgnores(fs.readFileSync(path.join(__dirname, '../../templates/gitleaksignore'), 'utf8')).trim(), '');
  const result = run(['secrets', output], context, (exe, args, options) => {
    assert.equal(exe, 'gitleaks'); assert.equal(options.cwd, context.repoRoot);
    const ignore = args[args.indexOf('--gitleaks-ignore-path') + 1];
    assert.equal(fs.readFileSync(ignore, 'utf8').trim(), '');
    assert.ok(args.includes('--ignore-gitleaks-allow'));
    fs.writeFileSync(output + '.raw', '[]');
    return { status: 0 };
  });
  assert.equal(result.verdict, 'pass');
  assert.equal(fs.existsSync(output + '.raw'), false);
});

test('external controller requires the pinned clean bundle before any remote fetch', t => {
  const { createController } = require('./marc.cjs');
  const { execFileSync } = require('node:child_process');
  const parent = process.env.MARC_TEST_ARTIFACTS || os.tmpdir();
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'marc-pin-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repoRoot = path.join(root, 'consumer'), bundleRoot = path.join(root, 'bundle');
  fs.mkdirSync(repoRoot); fs.mkdirSync(bundleRoot);
  const localGit = (...args) => execFileSync('git', args, { cwd: bundleRoot, encoding: 'utf8', windowsHide: true, stdio: 'pipe' }).trim();
  localGit('init'); fs.writeFileSync(path.join(bundleRoot, 'tool.txt'), 'trusted tool\n'); localGit('add', '.');
  localGit('-c', 'core.hooksPath=', '-c', 'user.name=Synthetic test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture');
  const pin = localGit('rev-parse', 'HEAD');
  let fetches = 0, dirtyConsumer = false;
  let remote = 'https://example-maintainer@github.com/example/project.git';
  const context = { repoRoot: fs.realpathSync(repoRoot), bundleRoot, policy: { repository: 'example/project', base: 'main' }, ci: {} };
  const controller = createController(context, { git: (...args) => {
    if (args.join(' ') === 'rev-parse --show-toplevel') return repoRoot;
    if (args[0] === 'branch') return 'main';
    if (args[0] === 'status') return dirtyConsumer ? ' M app.py' : '';
    if (args[0] === 'remote') return remote;
    if (args[0] === 'fetch') { fetches++; return ''; }
    if (args[0] === 'rev-parse') return 'a'.repeat(40);
    throw Error('Unexpected Git request');
  } });
  assert.throws(() => controller.checkTrustedCheckout(), /clean and pinned/);
  context.toolCommit = 'b'.repeat(40);
  assert.throws(() => controller.checkTrustedCheckout(), /clean and pinned/);
  assert.equal(fetches, 0);
  context.toolCommit = pin;
  assert.doesNotThrow(() => controller.checkTrustedCheckout()); assert.equal(fetches, 1);
  for (const invalid of ['https://github.com@another.invalid/example/project.git',
    'https://example-maintainer@github.com/another/project.git', 'https://github.com/example/project.git?other=1']) {
    remote = invalid;
    assert.throws(() => controller.checkTrustedCheckout(), /Unexpected origin/);
    assert.equal(fetches, 1);
  }
  remote = 'https://github.com/example/project.git';
  fs.appendFileSync(path.join(bundleRoot, 'tool.txt'), 'changed\n');
  assert.throws(() => controller.checkTrustedCheckout(), /clean and pinned/); assert.equal(fetches, 1);
  dirtyConsumer = true;
  assert.throws(() => controller.checkTrustedCheckout(), /clean trusted target/); assert.equal(fetches, 1);
});

test('CI result validation follows the configured consumer rather than a fixed repository', () => {
  const { evaluate } = require('./marc.cjs');
  const p = { ...require('./fixtures/policy.json'), repository: 'example/python-project', base: 'main' };
  const A = 'a'.repeat(40), B = 'b'.repeat(40);
  const e = { schema: 1, repository: p.repository, headRepository: p.repository, pr: 7, state: 'open', draft: false,
    sourceHead: B, base: A, policyHash: 'policy', target: p.base, author: 'maintainer', branch: 'feature/example',
    baseIncluded: true, repairCycles: 0, files: ['app.py'], changedLines: 1,
    gates: Object.fromEntries(p.reviewGates.map(name => [name, { verdict: 'pass', sourceHead: B, base: A,
      policyHash: 'policy', reviewer: 'independent', summary: 'Reviewed', evidence: ['app.py:1'], findings: [] }])),
    ci: { verdict: 'pass', sourceHead: B, runUrl: 'https://github.com/example/python-project/actions/runs/12' } };
  assert.equal(evaluate(e, p, 'policy').merge, true);
  e.ci.runUrl = 'https://github.com/another/project/actions/runs/12';
  assert.equal(evaluate(e, p, 'policy').merge, false);
});
