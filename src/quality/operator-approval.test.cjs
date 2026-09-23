const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-approval-'));
  const file = path.join(root, 'approval.json');
  const record = { schema: 1, kind: 'sensitive-paths', approved: true, id: 'decision-1',
    approvedBy: 'operator', approvedUtc: '2026-01-01T00:00:00.000Z', expiresUtc: '2099-01-01T00:00:00.000Z',
    scope: 'Only the listed exact changes.', repository: 'example/project', pr: 7,
    sourceHead: 'b'.repeat(40), base: 'a'.repeat(40), policyHash: 'c'.repeat(64),
    paths: ['.marc/config.json', '.marc/tool'] };
  fs.writeFileSync(file, JSON.stringify(record));
  return { root, file, record };
}

test('operator records reject malformed, expired, future, wildcard and duplicate scopes', () => {
  const { loadOperatorApproval } = require('./operator-approval.cjs');
  const { file, record } = fixture();
  for (const change of [r => r.approved = false, r => r.schema = 2, r => delete r.kind,
    r => delete r.approvedBy, r => r.pr = '7', r => r.policyHash = 'policy',
    r => r.sourceHead = 'HEAD', r => r.scope = '', r => r.paths = [],
    r => r.paths.push('.marc/*'), r => r.paths.push('../outside'),
    r => r.paths.push('.marc\\project.md'), r => r.paths.push('.marc/tool'),
    r => r.approvedUtc = '2099-01-01T00:00:00.000Z',
    r => r.expiresUtc = '2026-01-01T00:00:00.000Z', r => r.extra = 'unrecognized']) {
    const invalid = structuredClone(record); change(invalid);
    fs.writeFileSync(file, JSON.stringify(invalid));
    assert.throws(() => loadOperatorApproval(file), /approval/i);
  }
  fs.writeFileSync(file, '{bad'); assert.throws(() => loadOperatorApproval(file));
  assert.throws(() => loadOperatorApproval(file + '-missing'));
  assert.throws(() => loadOperatorApproval('approval.json'), /absolute/i);
});

test('candidate checkout files, directory aliases and hardlinks cannot be an approval channel', t => {
  const { loadOperatorApproval } = require('./operator-approval.cjs');
  const { root, file } = fixture();
  const repo = path.join(root, 'candidate'); fs.mkdirSync(repo);
  execFileSync('git', ['init', repo], { stdio: 'pipe', windowsHide: true });
  const candidate = path.join(repo, 'approval.json'); fs.copyFileSync(file, candidate);
  assert.throws(() => loadOperatorApproval(candidate), /Git|checkout/i);
  const linked = path.join(root, 'linked.json'); fs.linkSync(candidate, linked);
  assert.throws(() => loadOperatorApproval(linked), /link/i);
  const alias = path.join(root, 'alias'); fs.symlinkSync(repo, alias, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => loadOperatorApproval(path.join(alias, 'approval.json')), /link|alias/i);
});

test('approval capability is immutable and rechecked for expiry and complete sensitive scope', () => {
  const { loadOperatorApproval, checkOperatorApproval } = require('./operator-approval.cjs');
  const { file, record } = fixture();
  const token = loadOperatorApproval(file);
  assert.equal(checkOperatorApproval(token, record, record.paths).accepted, true);
  assert.equal(checkOperatorApproval(structuredClone(token), record, record.paths).accepted, false);
  assert.equal(checkOperatorApproval(token, record, [...record.paths, 'AGENTS.md']).accepted, false);
  assert.equal(checkOperatorApproval(token, record, record.paths, new Date('2100-01-01')).accepted, false);
  assert.equal(checkOperatorApproval(token, record, ['.marc/tool']).accepted, false, 'scope removed also requires rebinding');
});

test('CLI approval input is explicit, singular and limited to decision consumers', () => {
  const { parseOperatorApproval } = require('./operator-approval.cjs');
  assert.deepEqual(parseOperatorApproval(['decide', 'e.json']), { args: ['decide', 'e.json'] });
  assert.deepEqual(parseOperatorApproval(['report', 'e.json', 'tree', '--operator-approval', '/operator/a.json']),
    { args: ['report', 'e.json', 'tree'], approvalFile: '/operator/a.json' });
  for (const args of [['decide', 'e.json', '--operator-approval'],
    ['capture', '7', 'e.json', '--operator-approval', '/a.json'],
    ['merge', 'e.json', '--operator-approval', '/a.json', '--operator-approval', '/b.json']])
    assert.throws(() => parseOperatorApproval(args), /approval/i);
});

test('trusted CLI records approval in reports, rejects diff forgery and reloads at the final merge boundary', t => {
  const { createController, trustedPolicy, reportPaths } = require('./marc.cjs');
  const { resolveAgentSettings } = require('./agent-settings.cjs');
  const { root, file, record } = fixture();
  const candidate = path.join(root, 'candidate'); fs.mkdirSync(candidate);
  const git = (...args) => execFileSync('git', ['-c', 'core.hooksPath=', ...args],
    { cwd: candidate, encoding: 'utf8', stdio: 'pipe', windowsHide: true }).trimEnd();
  const commit = () => { git('add', '.'); git('-c', 'user.name=Fixture', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture'); return git('rev-parse', 'HEAD'); };
  git('init'); fs.writeFileSync(path.join(candidate, 'AGENTS.md'), 'old');
  const base = commit(); fs.writeFileSync(path.join(candidate, 'AGENTS.md'), 'new');
  const sourceHead = commit();
  const bundleRoot = path.resolve(__dirname, '../..');
  const policy = { ...require('./fixtures/policy.json'), humanPathPatterns: ['^AGENTS\\.md$'] };
  const context = { repoRoot: bundleRoot, bundleRoot, policy, ci: { workflow: 'ci.yml' },
    stateDirectory: path.join(root, 'state'), consumerFiles: ['AGENTS.md'] };
  const { policyHash } = trustedPolicy(context);
  Object.assign(record, { base, sourceHead, policyHash, paths: ['AGENTS.md'] });
  fs.writeFileSync(file, JSON.stringify(record));
  const e = { schema: 1, agentExecutionSchema: 1, repairExecutions: [], ...record,
    state: 'open', draft: false, target: 'master', headRepository: record.repository,
    author: 'maintainer', branch: 'bugfix/fixture', baseIncluded: true, files: ['AGENTS.md'],
    changedLines: 2, repairCycles: 0, projectChanges: [],
    ci: { verdict: 'pass', sourceHead, runId: 12, runAttempt: 1, runUrl: 'https://github.com/example/project/actions/runs/12' },
    gates: Object.fromEntries(policy.reviewGates.map(name => [name, { verdict: 'pass', sourceHead, base, policyHash,
      reviewer: name, summary: 'Checked', evidence: ['AGENTS.md:1'], findings: [],
      execution: { settings: resolveAgentSettings(undefined, name), applied: true, evidence: 'fixture receipt' } }])) };
  const evidence = path.join(root, 'evidence.json'); fs.writeFileSync(evidence, JSON.stringify(e));
  let head = sourceHead, liveBase = base, drift = false, revokeAtLock = false;
  const controller = createController(context, {
    git: (...args) => {
      if (args[0] === 'branch') return 'master';
      if (args[0] === 'status' || args[0] === 'fetch') return '';
      if (args[0] === 'remote') return 'https://github.com/example/project';
      if (args[0] === 'rev-parse') {
        if (args[1] === '--show-toplevel') return bundleRoot;
        if (args[1] === '--git-common-dir') {
          if (revokeAtLock) fs.writeFileSync(file, JSON.stringify({ ...record, approved: false }));
          return root;
        }
        return head;
      }
      if (drift && args[0] === 'diff') return 'AGENTS.md\0unapproved.md\0';
      return git(...args);
    },
    api: endpoint => endpoint.includes('/git/ref/') ? { object: { sha: liveBase } } :
      endpoint.includes('/actions/') ? { workflow_runs: head !== sourceHead && endpoint.includes(`head_sha=${head}`) ? [] : [{ id: 12, run_attempt: 1,
        head_sha: new URL('https://example.invalid/' + endpoint).searchParams.get('head_sha'), event: 'push',
        status: 'completed', conclusion: 'success', html_url: 'https://github.com/example/project/actions/runs/12' }] } :
      { state: 'open', draft: false, user: { login: e.author }, base: { ref: 'master' },
        head: { sha: head, ref: e.branch, repo: { full_name: e.repository } } },
    readJobs: () => policy.requiredJobs.map(name => ({ name, conclusion: 'success' }))
  });
  const output = t.mock.method(console, 'log', () => {});
  controller.run(['decide', evidence]);
  assert.equal(JSON.parse(output.mock.calls.at(-1).arguments[0]).eligible, false);
  controller.run(['decide', evidence, '--operator-approval', file]);
  assert.equal(JSON.parse(output.mock.calls.at(-1).arguments[0]).eligible, true);
  liveBase = 'e'.repeat(40);
  assert.throws(() => controller.run(['decide', evidence, '--operator-approval', file]), /Target branch changed/);
  liveBase = base; head = base;
  assert.throws(() => controller.run(['decide', evidence, '--operator-approval', file]), /source is no longer current/);
  head = sourceHead;
  drift = true;
  assert.throws(() => controller.run(['decide', evidence, '--operator-approval', file]), /committed diff/);
  drift = false;
  controller.run(['report', evidence, candidate, '--operator-approval', file]);
  const reported = JSON.parse(fs.readFileSync(evidence));
  assert.deepEqual(reported.reportCiReuse, { sourceHead, runId: 12, runAttempt: 1 });
  const publication = JSON.parse(output.mock.calls.at(-2).arguments[0]);
  assert.match(publication.commitMessage, /\[skip ci\]$/);
  assert.equal(reported.humanApprovalAudit.record.id, record.id);
  assert.equal(reported.stages.at(-1).decision.humanApproval.sha256, reported.humanApprovalAudit.sha256);
  const paths = reportPaths(e.pr, sourceHead, reported.reportCreatedAt, reported.reportFormat);
  assert.match(fs.readFileSync(path.join(candidate, paths[1]), 'utf8'), /Human sensitive-path approval/);
  head = commit();
  assert.throws(() => controller.run(['merge', evidence]), /Merge denied/);
  const changedAudit = { ...reported, humanApprovalAudit: { forged: true } };
  fs.writeFileSync(evidence, JSON.stringify(changedAudit));
  assert.throws(() => controller.run(['merge', evidence, '--operator-approval', file]), /audit differs/);
  fs.writeFileSync(evidence, JSON.stringify(reported));
  revokeAtLock = true;
  // With no report-head CI, the guard must reach the final approval check using
  // successful source CI plus the exact generated reports, without dispatch.
  assert.throws(() => controller.run(['merge', evidence, '--operator-approval', file]), /approval.*malformed/i);
  assert.equal(fs.existsSync(path.join(root, 'marc-merge.lock')), false);
  assert.equal(git('rev-parse', 'HEAD'), head, 'no merge or push ran');
});
