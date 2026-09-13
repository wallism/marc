const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');
const marc = require('./marc.cjs');
const legacy = require('./coq.cjs');

test('legacy launcher shares the controller and resolves MARC usage without remote actions', () => {
  assert.equal(legacy, marc);
  for (const entry of ['marc.cjs', 'coq.cjs']) {
    const result = spawnSync(process.execPath, [path.join(__dirname, entry), '--help'], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage: node src\/quality\/marc.cjs/);
  }
});

test('MARC respects an existing configured legacy merge lock', t => {
  const parent = process.env.MARC_TEST_ARTIFACTS || os.tmpdir();
  fs.mkdirSync(parent, { recursive: true });
  const common = fs.mkdtempSync(path.join(parent, 'migration-'));
  t.after(() => fs.rmSync(common, { recursive: true, force: true }));
  const lock = path.join(common, 'coq-merge.lock');
  fs.writeFileSync(lock, 'existing owner', { flag: 'wx' });
  assert.throws(() => marc.acquireMergeLock(common, 'coq-merge.lock'), { code: 'EEXIST' });
  assert.equal(fs.readFileSync(lock, 'utf8'), 'existing owner');
  fs.unlinkSync(lock);
  const release = marc.acquireMergeLock(common, 'coq-merge.lock');
  assert.throws(() => legacy.acquireMergeLock(common, 'coq-merge.lock'), { code: 'EEXIST' });
  release();
  assert.equal(fs.existsSync(lock), false);
});

test('completed assessment identity and cumulative repair limits survive the compatibility launcher', () => {
  const policy = require('./fixtures/policy.json');
  const pr = { number: 1, created_at: '2026-09-13T00:00:00Z', state: 'open', draft: false,
    base: { ref: 'master' }, head: { sha: 'a'.repeat(40), ref: 'bugfix/example', repo: { full_name: policy.repository } },
    user: { login: 'maintainer' } };
  const context = { base: 'b'.repeat(40), policyHash: 'same-policy' };
  const [old] = legacy.selectQueue([pr], policy, context);
  assert.equal(marc.selectQueue([pr], policy, { ...context, completed: [old.key] })[0].status, 'awaiting-change');
  const e = { repairCycles: 3, files: [] };
  assert.ok(marc.evaluate(e, policy, 'same-policy').reasons.includes('Repair budget exceeded'));
});

test('trusted policy digest covers each renamed crew skill and the compatibility launcher', t => {
  const parent = process.env.MARC_TEST_ARTIFACTS || os.tmpdir();
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'policy-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const scripts = path.join(root, 'src/quality');
  fs.mkdirSync(scripts, { recursive: true });
  for (const file of ['marc.cjs', 'coq.cjs', 'project-review.cjs', 'config.cjs', 'crew.cjs'])
    fs.copyFileSync(path.join(__dirname, file), path.join(scripts, file));
  const skills = fs.readdirSync(path.resolve(__dirname, '../../skills')).filter(name => name === 'marc' || name.startsWith('marc-'));
  assert.ok(skills.includes('marc') && skills.includes('marc-security') && skills.includes('marc-csharp'));
  const files = skills.map(name => `skills/${name}/SKILL.md`);
  files.push('skills/marc/references/evidence.md', 'skills/marc/references/browser-runtime.md');
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), 'synthetic trusted instructions\n');
  }
  const run = (exe, args) => execFileSync(exe, args, { cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  fs.mkdirSync(path.join(root, '.marc'), { recursive: true });
  fs.writeFileSync(path.join(root, '.marc/policy.json'), JSON.stringify(require('./fixtures/policy.json')));
  fs.writeFileSync(path.join(root, '.marc/config.json'), JSON.stringify({ schema: 1, policy: '.marc/policy.json',
    ci: { workflow: 'checks.yml', requiredArtifacts: ['checks'] }, technologies: [],
    guidance: { project: '.marc/project.md' }, scans: { secretExceptions: '.marc/gitleaksignore' } }));
  fs.writeFileSync(path.join(root, '.marc/project.md'), 'Synthetic project guidance\n');
  fs.writeFileSync(path.join(root, '.marc/gitleaksignore'), '# No exceptions\n');
  files.push('.marc/config.json', '.marc/policy.json', '.marc/project.md', '.marc/gitleaksignore');
  run('git', ['init']); run('git', ['add', '.']);
  const hash = () => run(process.execPath, ['-e', "process.stdout.write(require('./src/quality/marc.cjs').trustedPolicy().policyHash)"]);
  const original = hash();
  for (const file of [...files, 'src/quality/coq.cjs']) {
    const target = path.join(root, file), contents = fs.readFileSync(target);
    fs.appendFileSync(target, file.endsWith('.json') ? '\n ' : '\n// changed trusted input\n');
    assert.notEqual(hash(), original, `${file} must invalidate prior evidence`);
    fs.writeFileSync(target, contents);
  }
  assert.equal(hash(), original);
  run('git', ['rm', '--cached', '.marc/gitleaksignore']);
  assert.throws(hash, /Consumer governance must be tracked/);
  run('git', ['add', '.marc/gitleaksignore']);
  run('git', ['rm', '--cached', 'skills/marc-security/SKILL.md']);
  assert.throws(hash, /Required trusted skill missing/);
});
