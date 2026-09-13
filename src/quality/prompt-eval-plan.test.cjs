const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { promptPaths, createPlan } = require('./prompt-eval-plan.cjs');

test('prompt detection includes references, manifests and setup instructions but excludes improvement history', () => {
  assert.deepEqual(promptPaths(['README.md', 'skills/marc-crew-captain/IMPROVEMENTS.md', 'src/quality/marc.cjs',
    'skills/marc-crew-react/references/react-review.md', 'skills/marc-crew-react/crew.json', 'skills/marc-crew-captain/SKILL.md',
    'docs/setup-prompt.md', 'AGENTS.md']), ['AGENTS.md', 'docs/setup-prompt.md', 'skills/marc-crew-captain/SKILL.md',
    'skills/marc-crew-react/crew.json', 'skills/marc-crew-react/references/react-review.md']);
});

test('plan binds commits and detects deleted prompts across the actual PR merge base', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-eval-plan-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-c', 'core.hooksPath=', ...args], {
    cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  const commit = () => { git('add', '.'); git('-c', 'user.name=Fixture', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture'); return git('rev-parse', 'HEAD'); };
  git('init');
  fs.mkdirSync(path.join(root, 'skills/marc-crew-captain'), { recursive: true });
  fs.writeFileSync(path.join(root, 'skills/marc-crew-captain/SKILL.md'), 'original instructions\n');
  const common = commit();
  fs.writeFileSync(path.join(root, 'AGENTS.md'), 'base-only instructions\n');
  const base = commit();
  git('checkout', '--detach', common);
  fs.unlinkSync(path.join(root, 'skills/marc-crew-captain/SKILL.md'));
  fs.writeFileSync(path.join(root, 'README.md'), 'candidate documentation\n');
  const head = commit();
  const plan = createPlan(root, base, head);
  assert.equal(plan.base, base);
  assert.equal(plan.head, head);
  assert.equal(plan.mergeBase, common);
  assert.deepEqual(plan.paths, ['skills/marc-crew-captain/SKILL.md']);
  assert.equal(plan.status, 'manual-eval-needed');
  assert.equal(createPlan(root, head, head).status, 'no-prompt-change-detected');
  assert.throws(() => createPlan(root, 'missing-ref', head));
});
