const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pushMerge } = require('./marc.cjs');

for (const target of ['master', 'main', 'release/stable']) test(`merge preserves reviewed tree and rejects a concurrent ${target}`, () => {
  const parent = process.env.MARC_TEST_ARTIFACTS || os.tmpdir();
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'marc-merge-'));
  const remote = path.join(root, 'remote.git'), local = path.join(root, 'local');
  function git(args, input, cwd = local) {
    return execFileSync('git', args, { cwd, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }).trim();
  }
  git(['init', '--bare', remote], undefined, root);
  git(['clone', remote, local], undefined, root);
  git(['config', 'user.email', 'marc-test@example.invalid']); git(['config', 'user.name', 'Synthetic MARC test']);
  git(['checkout', '-b', target]);
  fs.writeFileSync(path.join(local, 'app.txt'), 'base\n'); git(['add', '.']); git(['commit', '-m', 'base']);
  const base = git(['rev-parse', 'HEAD']); git(['push', 'origin', target]);
  git(['checkout', '-b', 'candidate']);
  fs.writeFileSync(path.join(local, 'app.txt'), 'reviewed\n'); git(['add', '.']); git(['commit', '-m', 'candidate']);
  const head = git(['rev-parse', 'HEAD']);
  const merged = pushMerge(git, base, head, 7, target);
  assert.equal(git(['rev-parse', `${merged}^{tree}`]), git(['rev-parse', `${head}^{tree}`]));
  assert.equal(git(['rev-parse', `refs/heads/${target}`], undefined, remote), merged);
  // Restore only the synthetic bare fixture ref to exercise the independent race scenario.
  git(['update-ref', `refs/heads/${target}`, base], undefined, remote);
  git(['checkout', target]);
  fs.writeFileSync(path.join(local, 'other.txt'), 'concurrent\n'); git(['add', '.']); git(['commit', '-m', 'concurrent writer']);
  const concurrent = git(['rev-parse', 'HEAD']); git(['push', 'origin', target]);
  assert.throws(() => pushMerge(git, base, head, 7, target));
  assert.equal(git(['rev-parse', `refs/heads/${target}`], undefined, remote), concurrent);
  // Keep small isolated fixtures under the build root for diagnosis; no workspace cleanup.
});
