const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');

for (const shortPath of [false, true]) test(`installed consumer resolves the pinned bundle and rejects drift before importing it${shortPath ? ' through a Windows short path' : ''}`, { skip: shortPath && process.platform !== 'win32' }, t => {
  const parent = process.env.MARC_TEST_ARTIFACTS || os.tmpdir();
  fs.mkdirSync(parent, { recursive: true });
  const cleanupRoot = fs.mkdtempSync(path.join(parent, 'marc installation test-'));
  t.after(() => fs.rmSync(cleanupRoot, { recursive: true, force: true }));
  const root = shortPath ? execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    '$fso = New-Object -ComObject Scripting.FileSystemObject; $fso.GetFolder($env:MARC_SHORT_PATH).ShortPath'],
    { env: { ...process.env, MARC_SHORT_PATH: cleanupRoot }, encoding: 'utf8', windowsHide: true }).trim() : cleanupRoot;
  if (shortPath) assert.notEqual(root, fs.realpathSync.native(root), 'Regression requires an actual Windows short-path alias');
  const bundle = path.join(root, 'bundle'), consumer = path.join(root, 'consumer');
  const source = path.resolve(__dirname, '../..');
  for (const directory of ['src/quality', 'skills', 'scripts', 'templates'])
    fs.cpSync(path.join(source, directory), path.join(bundle, directory), { recursive: true });
  fs.mkdirSync(consumer);
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, stdio: 'pipe' }).trim();
  git(bundle, 'init'); git(bundle, 'add', '.');
  git(bundle, '-c', 'core.hooksPath=', '-c', 'user.name=Synthetic test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture');
  const pin = git(bundle, 'rev-parse', 'HEAD');
  git(consumer, 'init');
  git(consumer, '-c', 'protocol.file.allow=always', 'submodule', 'add', bundle, '.marc/tool');
  fs.cpSync(path.join(source, 'examples/python/.marc'), path.join(consumer, '.marc'), { recursive: true });
  const run = (...args) => execFileSync(process.execPath, args, { cwd: consumer, encoding: 'utf8', windowsHide: true, stdio: 'pipe' }).trim();
  const installer = path.join(bundle, 'scripts/install-consumer.cjs');
  assert.throws(() => run(installer, '--repo', path.join(consumer, '.marc')), /Consumer repository root required/);
  const plan = JSON.parse(run(installer, '--repo', consumer));
  assert.equal(plan.applied, false); assert.equal(fs.existsSync(path.join(consumer, 'scripts/quality/bundle.cjs')), false);
  assert.equal(JSON.parse(run(installer, '--repo', consumer, '--apply')).applied, true);
  const resolved = JSON.parse(run('scripts/quality/marc.cjs', '--repo', consumer, 'config'));
  assert.equal(resolved.policy.repository, 'example/python-project');
  assert.equal(resolved.toolCommit, pin);
  assert.equal(resolved.bundleRoot, path.join(consumer, '.marc/tool'));
  const info = JSON.parse(run('scripts/quality/bundle.cjs'));
  assert.deepEqual(fs.readdirSync(path.join(consumer, '.agents/skills')).sort(), fs.readdirSync(path.join(source, 'skills')).sort());
  for (const name of fs.readdirSync(path.join(source, 'skills'))) {
    const forwarded = fs.readFileSync(path.join(consumer, '.agents/skills', name, 'SKILL.md'), 'utf8');
    assert.ok(forwarded.includes('name: ' + name));
    assert.ok(forwarded.includes('.marc/tool/skills/' + name + '/SKILL.md'));
  }
  assert.equal(info.commit, pin); assert.equal(fs.existsSync(path.join(info.skills, 'marc-crew-captain/SKILL.md')), true);
  const file = path.join(consumer, '.marc/config.json'), contents = fs.readFileSync(file, 'utf8');
  // Reruns preserve configuration bytes, timestamps and customized entry points,
  // while restoring missing crew discovery files.
  const custom = path.join(consumer, '.agents/skills/marc-crew-captain/SKILL.md');
  const originalForwarder = fs.readFileSync(custom, 'utf8');
  fs.appendFileSync(custom, '\nConsumer-specific guidance.\n');
  const missing = '.agents/skills/marc-crew-creator/SKILL.md';
  fs.unlinkSync(path.join(consumer, missing));
  fs.writeFileSync(file, JSON.stringify(JSON.parse(contents)));
  const configBytes = fs.readFileSync(file, 'utf8');
  const timestamp = new Date('2020-01-01T00:00:00Z'); fs.utimesSync(file, timestamp, timestamp);
  const rerun = JSON.parse(run(installer, '--repo', consumer, '--apply'));
  assert.deepEqual(rerun.created, [missing]);
  assert.ok(rerun.preserved.includes('.agents/skills/marc-crew-captain/SKILL.md'));
  assert.equal(fs.readFileSync(file, 'utf8'), configBytes);
  assert.equal(fs.statSync(file).mtimeMs, timestamp.getTime());
  assert.match(fs.readFileSync(custom, 'utf8'), /Consumer-specific guidance/);
  assert.deepEqual(JSON.parse(run(installer, '--repo', consumer, '--apply')).created, []);
  fs.writeFileSync(custom, originalForwarder); fs.writeFileSync(file, contents);
  fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(contents), toolCommit: 'b'.repeat(40) }));
  assert.throws(() => run('scripts/quality/bundle.cjs'), /match toolCommit/);
  fs.writeFileSync(file, contents);
  const runtime = path.join(consumer, '.marc/tool/src/quality/marc.cjs');
  const installedBytes = fs.readFileSync(runtime);
  fs.appendFileSync(runtime, '\nthrow Error("candidate must never execute");\n');
  const rejected = spawnSync(process.execPath, ['scripts/quality/marc.cjs', 'config'], { cwd: consumer, encoding: 'utf8', windowsHide: true });
  assert.notEqual(rejected.status, 0); assert.match(rejected.stderr, /match toolCommit/);
  assert.doesNotMatch(rejected.stderr, /candidate must never execute/);
  fs.writeFileSync(runtime, installedBytes);
  git(consumer, 'update-index', '--cacheinfo', `160000,${'c'.repeat(40)},.marc/tool`);
  assert.throws(() => run('scripts/quality/bundle.cjs'), /Git pin differs/);
  git(consumer, 'update-index', '--cacheinfo', `160000,${pin},.marc/tool`);

  // Exercise the documented complete integration rollback, preserving actual external state bytes.
  const state = path.join(root, 'state'); fs.mkdirSync(path.join(state, 'ci-recovery'), { recursive: true });
  const preserved = new Map([
    [path.join(state, 'run.lock'), 'foreign-owner'],
    [path.join(state, 'ledger.json'), '{"repairCycles":2}'],
    [path.join(state, 'ci-recovery/7.request.json'), '{"reserved":true}'],
    [path.join(consumer, '.quality/reports/pr-7/history.json'), '{"immutable":true}']
  ]);
  for (const [target, bytes] of preserved) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes); }
  const settings = JSON.parse(contents); settings.state = { root: state }; fs.writeFileSync(file, JSON.stringify(settings));
  git(consumer, 'add', '.');
  const commit = cwd => git(cwd, '-c', 'core.hooksPath=', '-c', 'user.name=Synthetic test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture');
  commit(consumer); const originalConsumer = git(consumer, 'rev-parse', 'HEAD');
  const digest = () => JSON.parse(run('-e', "const c=require('./scripts/quality/config.cjs').loadConfig(process.cwd());console.log(JSON.stringify(require('./scripts/quality/marc.cjs').trustedPolicy(c).policyHash))"));
  const before = digest();
  fs.appendFileSync(path.join(bundle, 'src/quality/marc.cjs'), '\n// Synthetic version upgrade.\n');
  git(bundle, 'add', '.'); commit(bundle); const upgrade = git(bundle, 'rev-parse', 'HEAD');
  git(path.join(consumer, '.marc/tool'), 'fetch', 'origin');
  git(path.join(consumer, '.marc/tool'), 'checkout', upgrade); git(consumer, 'add', '.marc/tool');
  const upgradePreview = JSON.parse(run(installer, '--repo', consumer));
  assert.deepEqual(upgradePreview.upgrade, { installed: pin, available: upgrade, approvalRequired: true });
  assert.throws(() => run(installer, '--repo', consumer, '--apply'), /upgrade requires deliberate/);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).toolCommit, pin);
  run(installer, '--repo', consumer, '--apply', '--replace-existing'); git(consumer, 'add', '.'); commit(consumer);
  assert.notEqual(digest(), before);
  assert.equal(JSON.parse(run('scripts/quality/bundle.cjs')).commit, upgrade);
  git(consumer, 'restore', '--source', originalConsumer, '--staged', '--worktree', '--', '.marc/config.json', '.marc/tool', 'scripts', '.agents');
  git(consumer, '-c', 'protocol.file.allow=always', 'submodule', 'update', '--init', '--', '.marc/tool');
  assert.equal(JSON.parse(run('scripts/quality/bundle.cjs')).commit, pin);
  assert.equal(digest(), before);
  for (const [target, bytes] of preserved) assert.equal(fs.readFileSync(target, 'utf8'), bytes);
  // Even restored policy cannot approve an assessment with the intervening source/base identity.
  const { evaluate } = require('./marc.cjs');
  assert.equal(evaluate({ schema: 1, sourceHead: 'a'.repeat(40), base: 'b'.repeat(40), policyHash: 'old' },
    { ...require('./fixtures/policy.json'), repository: settings.repository }, before).merge, false);
});
