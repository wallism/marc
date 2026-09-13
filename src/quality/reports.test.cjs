const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { prepareReport, reportPaths, writeReportFiles, verifyReportCommit, changedFiles, changedLines } = require('./marc.cjs');

test('new MARC reports preserve legacy rendering for previously prepared evidence', () => {
  const { reportMarkdown } = require('./marc.cjs');
  const original = { pr: 24, sourceHead: 'a'.repeat(40), base: 'b'.repeat(40), policyHash: 'policy' };
  const decision = { eligible: false, merge: false, reasons: ['Held'] };
  const prepared = prepareReport(original, new Date('2026-09-13T00:00:00Z'));
  assert.match(reportMarkdown(prepared, decision), /^# MARC report: PR 24/);
  assert.match(reportMarkdown(prepared, decision), /## Crew used/);
  assert.doesNotMatch(reportMarkdown({ ...prepared, reportFormat: 'marc-v1' }, decision), /## Crew used/);
  assert.match(reportMarkdown(original, decision), /^# Chief of Quality report: PR 24/);
  const datedLegacy = { ...original, reportCreatedAt: '2026-09-12T10:45:00.000Z' };
  assert.deepEqual(prepareReport(datedLegacy), datedLegacy);
  assert.match(reportMarkdown(datedLegacy, decision), /^# Chief of Quality report: PR 24/);
  assert.throws(() => reportMarkdown({ ...prepared, reportFormat: 'unknown' }, decision), /report format/);
});

test('size counts edits within moved files, while file inventory retains both paths', t => {
  const { root, git } = fixture(t);
  fs.writeFileSync(path.join(root, 'guide.md'), Array.from({ length: 100 }, (_, i) => `Distinct documentation line ${i}.`).join('\n') + '\n');
  git('add', '.'); git('commit', '-m', 'guide'); const base = git('rev-parse', 'HEAD');
  fs.mkdirSync(path.join(root, 'completed'));
  git('mv', 'guide.md', 'completed/guide.md'); git('commit', '-m', 'move guide');
  let head = git('rev-parse', 'HEAD');
  assert.deepEqual(changedFiles(base, head, 24, git), ['completed/guide.md', 'guide.md']);
  assert.equal(changedLines(base, head, changedFiles(base, head, 24, git), 2000, git), 0);
  fs.appendFileSync(path.join(root, 'completed/guide.md'), 'One new observation.\n');
  git('add', '.'); git('commit', '-m', 'edit moved guide'); head = git('rev-parse', 'HEAD');
  assert.equal(changedLines(base, head, changedFiles(base, head, 24, git), 2000, git), 1);
});

function fixture(t) {
  const parent = process.env.MARC_TEST_ARTIFACTS || os.tmpdir();
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'marc-report-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-c', 'core.hooksPath=', ...args], {
    cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }).trimEnd();
  git('init'); git('config', 'user.email', 'marc-test@example.invalid'); git('config', 'user.name', 'Synthetic MARC test');
  fs.writeFileSync(path.join(root, 'app.txt'), 'synthetic source\n');
  git('add', '.'); git('commit', '-m', 'source');
  const source = git('rev-parse', 'HEAD');
  return { root, git, e: { schema: 1, pr: 24, sourceHead: source, base: source,
    policyHash: 'synthetic-policy', gates: {}, ci: { verdict: 'blocked' } },
    decision: { eligible: false, merge: false, reasons: ['Synthetic held report'] } };
}

for (const format of ['legacy-sha', 'legacy-dated', 'marc']) test(`${format} report verification binds the exact pair, source and bytes`, t => {
  const { root, git, e: original, decision } = fixture(t);
  const dated = format !== 'legacy-sha';
  const e = format === 'marc' ? prepareReport(original, new Date('2026-09-13T10:45:00Z')) :
    dated ? { ...original, reportCreatedAt: '2026-09-12T10:45:00.000Z' } : original;
  const paths = writeReportFiles(e, decision, root);
  git('add', '.'); git('commit', '-m', 'report');
  const live = { head: { sha: git('rev-parse', 'HEAD') } };
  assert.doesNotThrow(() => verifyReportCommit(e, live, decision, git));
  assert.deepEqual(changedFiles(e.sourceHead, live.head.sha, e.pr, git), []);
  if (dated) assert.throws(() => verifyReportCommit({ ...e, reportCreatedAt: '2026-09-12T10:46:00.000Z' }, live, decision, git), /exact report files/);
  assert.throws(() => verifyReportCommit({ ...e, policyHash: 'tampered' }, live, decision, git), /differs/);
  fs.appendFileSync(path.join(root, paths[1]), 'altered report\n');
  git('add', '.'); git('commit', '-m', 'alter report');
  const altered = git('rev-parse', 'HEAD');
  assert.throws(() => verifyReportCommit(e, { head: { sha: altered } }, decision, git), /differs/);
  assert.deepEqual(changedFiles(live.head.sha, altered, e.pr, git), [paths[1]]);
  git('rm', paths[0]); git('commit', '-m', 'delete report');
  assert.deepEqual(changedFiles(altered, git('rev-parse', 'HEAD'), e.pr, git), [paths[0]]);
});

test('same-minute collisions leave an existing report and its partner untouched', t => {
  const { root, e: original, decision } = fixture(t);
  const e = prepareReport(original, new Date('2026-09-12T10:45:00Z'));
  const paths = reportPaths(e.pr, e.sourceHead, e.reportCreatedAt);
  fs.mkdirSync(path.dirname(path.join(root, paths[1])), { recursive: true });
  fs.writeFileSync(path.join(root, paths[1]), 'existing markdown\n');
  assert.throws(() => writeReportFiles(e, decision, root), /already exists/);
  assert.equal(fs.existsSync(path.join(root, paths[0])), false);
  assert.equal(fs.readFileSync(path.join(root, paths[1]), 'utf8'), 'existing markdown\n');
});

test('foreign PR paths and symlink report entries never become metadata', t => {
  const { root, git, e, decision } = fixture(t);
  const foreign = prepareReport({ ...e, pr: 25 }, new Date('2026-09-12T10:45:00Z'));
  const paths = writeReportFiles(foreign, decision, root);
  git('add', '.'); git('commit', '-m', 'foreign report');
  assert.deepEqual(changedFiles(e.sourceHead, git('rev-parse', 'HEAD'), e.pr, git).sort(), paths.sort());
  // Git index entry tests symlink handling on Windows without symlink privileges.
  const name = '.quality/reports/pr-24/20260912-1045-24.md';
  const blob = git('rev-parse', 'HEAD:app.txt');
  git('update-index', '--add', '--cacheinfo', `120000,${blob},${name}`);
  git('commit', '-m', 'symlink report');
  assert.ok(changedFiles(e.sourceHead, git('rev-parse', 'HEAD'), e.pr, git).includes(name));
});
test('binary changes remain over budget and unrelated added files are counted', t => {
  const { root, git, e } = fixture(t);
  fs.writeFileSync(path.join(root, 'new.txt'), 'one\ntwo\n');
  git('add', '.'); git('commit', '-m', 'new file');
  let head = git('rev-parse', 'HEAD');
  assert.equal(changedLines(e.base, head, changedFiles(e.base, head, 24, git), 2000, git), 2);
  fs.writeFileSync(path.join(root, 'binary.bin'), Buffer.from([0, 1, 2, 3]));
  git('add', '.'); git('commit', '-m', 'binary file'); head = git('rev-parse', 'HEAD');
  assert.ok(changedLines(e.base, head, changedFiles(e.base, head, 24, git), 2000, git) > 2000);
});
test('NUL-delimited sizes cannot misread filenames as extra changes', () => {
  const read = () => '2\t1\t\0old\tname\n20\t30\tfile\0new\tname\nfile\0' + '3\t0\tother\nfile\0';
  assert.equal(changedLines('base', 'head', ['file'], 2000, read), 6);
  assert.throws(() => changedLines('base', 'head', ['file'], 2000, () => '1\t0\t\0old\0'), /Incomplete rename/);
  assert.throws(() => changedLines('base', 'head', ['file'], 2000, () => 'invalid\0'), /Malformed/);
  assert.equal(changedLines('base', 'head', [], 2000, () => { throw Error('No diff needed'); }), 0);
});
