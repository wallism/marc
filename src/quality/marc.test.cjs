const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluate, reportMarkdown, reportPaths, registeredProducer, selectQueue } = require('./marc.cjs');
const policy = require('./fixtures/policy.json');
const A = 'a'.repeat(40), B = 'b'.repeat(40);

test('operator approval clears only the exact sensitive-path gate; evidence cannot approve itself', t => {
  const policy = { ...require('./fixtures/policy.json'), humanPathPatterns: ['^\\.marc/'] };
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-operator-'));
  const file = path.join(directory, 'approval.json');
  const e = fixture();
  e.policyHash = 'c'.repeat(64);
  for (const gate of Object.values(e.gates)) gate.policyHash = e.policyHash;
  e.files = ['.marc/config.json', '.marc/tool'];
  const record = { schema: 1, kind: 'sensitive-paths', approved: true, id: 'operator-decision-1',
    approvedBy: 'test operator', approvedUtc: '2026-01-01T00:00:00.000Z',
    expiresUtc: '2099-01-01T00:00:00.000Z', scope: 'Approve this exact integration change only.',
    repository: e.repository, pr: e.pr, sourceHead: e.sourceHead, base: e.base,
    policyHash: e.policyHash, paths: [...e.files] };
  fs.writeFileSync(file, JSON.stringify(record));
  const without = () => evaluate(e, policy, e.policyHash);
  assert.equal(without().eligible, false);
  e.humanApproval = record; e.operatorApproval = record;
  assert.equal(without().eligible, false, 'candidate/evidence fields are not authority');
  assert.equal(evaluate(e, policy, e.policyHash, undefined, record).eligible, false, 'plain objects are not trusted input');
  const { loadOperatorApproval } = require('./operator-approval.cjs');
  const approval = loadOperatorApproval(file);
  const decide = () => evaluate(e, policy, e.policyHash, undefined, approval);
  assert.equal(decide().eligible, true);
  assert.equal(decide().humanApproval.record.id, record.id);
  assert.match(decide().humanApproval.sha256, /^[a-f0-9]{64}$/);
  for (const [key, value] of Object.entries({ repository: 'another/repo', pr: 8,
    sourceHead: A, base: B, policyHash: 'd'.repeat(64) })) {
    const changed = { ...e, [key]: value };
    assert.equal(evaluate(changed, policy, changed.policyHash, undefined, approval).eligible, false, key);
  }
  e.files.push('.marc/project.md');
  assert.equal(decide().eligible, false, 'additional sensitive change'); e.files.pop();
  for (const change of [x => x.ci.verdict = 'blocked', x => delete x.gates.security,
    x => x.gates.correctness.sourceHead = A, x => x.repairCycles = policy.maxRepairCycles + 1,
    x => x.baseIncluded = false, x => x.files.push('.quality/reports/pr-7/other.json'),
    x => x.gates.security.requiresBrowser = true]) {
    const changed = structuredClone(e); change(changed);
    assert.equal(evaluate(changed, policy, e.policyHash, undefined, approval).eligible, false);
  }
  assert.equal(evaluate(e, { ...policy, mode: 'report-only' }, e.policyHash, undefined, approval).merge, false);
});

test('current dispatch contract requires execution evidence even when capture fields are removed', () => {
  const { resolveAgentSettings } = require('./agent-settings.cjs');
  const p = { ...policy, agentExecutionSchema: 1, agents: { members: { security: { model: 'chosen' } } } };
  const e = fixture();
  e.agentExecutionSchema = 1; e.repairExecutions = [];
  for (const [name, gate] of Object.entries(e.gates)) gate.execution = {
    settings: resolveAgentSettings(p.agents, name), applied: true, evidence: 'host spawn record',
    ...(name === 'security' ? { actual: { model: 'chosen' } } : {})
  };
  assert.equal(evaluate(e, p, e.policyHash).eligible, true);
  e.gates.security.execution.actual.model = 'fallback';
  assert.match(evaluate(e, p, e.policyHash).reasons.join('\n'), /substituted model/);
  delete e.agentExecutionSchema;
  assert.match(evaluate(e, { ...policy, agentExecutionSchema: 1 }, e.policyHash).reasons.join('\n'), /schema/);
});
test('CI collection reuses exact-SHA hosted results and describes missing/pending/failing evidence', () => {
  const { collectCi } = require('./marc.cjs');
  const jobs = policy.requiredJobs.map(name => ({ name, conclusion: 'success' }));
  const run = { id: 12, run_attempt: 2, head_sha: B, event: 'workflow_dispatch', status: 'completed',
    conclusion: 'success', html_url: 'https://github.com/example/project/actions/runs/12' };
  const collect = (runs, items = jobs) => collectCi(B, 7, policy, () => ({ workflow_runs: runs }), () => items);
  assert.equal(collect([run]).verdict, 'pass');
  assert.equal(collect([run]).runAttempt, 2);
  assert.equal(collect([{ ...run, conclusion: 'cancelled' }]).conclusion, 'cancelled');
  assert.equal(collect([{ ...run, head_sha: A }]).status, 'missing');
  assert.equal(collect([{ ...run, status: 'in_progress' }]).status, 'pending');
  assert.equal(collect([{ ...run, conclusion: 'failure' }]).status, 'failed');
  assert.equal(collect([run], jobs.slice(1)).status, 'incomplete');
  assert.equal(collect([run, { ...run, id: 13, status: 'queued' }]).status, 'pending');
  assert.equal(collect([run, { ...run, id: 11, run_attempt: 3, status: 'in_progress' }]).status, 'pending');
  assert.equal(collect([{ ...run, event: 'push' }]).verdict, 'pass');
});
function simpleFixture() {
  const e = fixture();
  e.routing = { ...e.gates.correctness, route: 'simple', changeKind: 'local-change', risks: [] };
  e.gates = { 'simple-tests': { ...e.gates['test-integrity'], testDecision: 'existing-sufficient',
    testRationale: 'Existing Example tests cover the affected boundary.' } };
  return e;
}
test('simple route needs one focused review, with honest omitted-gate reporting', () => {
  const e = simpleFixture();
  assert.equal(evaluate(e, policy, 'policy').merge, true);
  assert.match(reportMarkdown(e, evaluate(e, policy, 'policy')), /Not required by simple route/);
});
test('simple route cannot bypass CI, risk limits, stale routing or test evidence', () => {
  for (const change of [e => e.ci.verdict = 'blocked', e => e.routing.sourceHead = A,
    e => e.routing.risks = ['persistence'], e => delete e.routing.changeKind,
    e => e.routing.changeKind = 'dependency-change',
    e => e.files = ['src/X/Thing.razor'], e => e.files = ['src/X/RefundService.cs'],
    e => delete e.gates['simple-tests'], e => e.gates['simple-tests'].testRationale = '',
    e => e.gates['simple-tests'].testDecision = 'needs-test',
    e => e.gates['simple-tests'].requiresBrowser = true,
    e => e.gates.security = { ...e.routing, verdict: 'repair' }]) {
    const e = simpleFixture(); change(e);
    assert.equal(evaluate(e, policy, 'policy').merge, false);
  }
});

test('additive calendar-sized snapshots can use simple review above the old 80-line ceiling', () => {
  for (const lines of [103, 109]) {
    const e = simpleFixture();
    e.files = ['src/App.Tests/Verify/CalendarTests.cs',
      'src/App.Tests/Verify/CalendarTests.Case.verified.txt', 'docs/work/calendar-coverage.md'];
    e.changedLines = lines;
    e.routing.changeKind = 'additive-tests';
    assert.equal(evaluate(e, policy, 'policy').merge, true);
  }
});

test('simple size guides allow justified larger tests and local changes without removing overall limits', () => {
  for (const kind of ['additive-tests', 'documentation', 'local-change']) {
    const e = simpleFixture();
    e.routing.changeKind = kind;
    e.changedLines = 300;
    e.files = Array.from({ length: 7 }, (_, i) => `src/App.Tests/Verify/Example${i}.cs`);
    e.routing.sizeRationale = 'Most lines are additive synthetic cases and complete baselines; full diff and unchanged callers inspected.';
    assert.equal(evaluate(e, policy, 'policy').merge, true);
    assert.match(reportMarkdown(e, evaluate(e, policy, 'policy')), /Most lines are additive/);
    delete e.routing.sizeRationale;
    assert.equal(evaluate(e, policy, 'policy').merge, false);
    e.routing.sizeRationale = ' ';
    assert.equal(evaluate(e, policy, 'policy').merge, false);
    e.routing.sizeRationale = 'Reviewed larger but local scope.';
    e.changedLines = policy.maxChangedLines + 1;
    assert.equal(evaluate(e, policy, 'policy').merge, false);
    e.changedLines = 300;
    e.files = Array.from({ length: policy.maxFiles + 1 }, (_, i) => `src/App.Core/Example${i}.cs`);
    assert.equal(evaluate(e, policy, 'policy').merge, false);
  }
});

test('ordinary documentation is simple beyond the size guide but instruction and security holds remain', () => {
  const e = simpleFixture();
  e.files = ['docs/product/calendar-guide.md'];
  e.changedLines = 450;
  e.routing.changeKind = 'documentation';
  e.routing.sizeRationale = 'Editorial product explanation only; no runtime content, policy or operational behavior changes.';
  e.gates['simple-tests'].testDecision = 'not-needed';
  e.gates['simple-tests'].testRationale = 'Reviewed links, claims and documentation validation; no behavior or test execution changed.';
  assert.equal(evaluate(e, policy, 'policy').merge, true);
  for (const file of ['AGENTS.md', '.agents/skills/example/SKILL.md', '.claude/agents/reviewer.md',
    'nested/.cursor/rules/review.mdc', '.cursorrules', 'docs/security/RefundPolicy.md']) {
    e.files = [file];
    assert.equal(evaluate(e, policy, 'policy').merge, false);
  }
});

test('each size guide independently requires justification and never waives risk or existing findings', () => {
  for (const change of [e => e.changedLines = 201,
    e => e.files = Array.from({ length: 6 }, (_, i) => `src/App.Core/Example${i}.cs`)]) {
    const e = simpleFixture(); change(e);
    assert.equal(evaluate(e, policy, 'policy').merge, false);
    e.routing.sizeRationale = 'Inspected the complete low-risk change and its callers.';
    assert.equal(evaluate(e, policy, 'policy').merge, true);
    e.routing.risks = ['concurrency'];
    assert.equal(evaluate(e, policy, 'policy').merge, false);
    e.routing.risks = [];
    e.gates.security = { ...e.routing, verdict: 'repair' };
    assert.equal(evaluate(e, policy, 'policy').merge, false);
  }
});
test('documented no-test-needed decision is allowed; absent routing retains full review', () => {
  const e = simpleFixture(); e.gates['simple-tests'].testDecision = 'not-needed';
  assert.equal(evaluate(e, policy, 'policy').merge, true);
  delete e.routing;
  assert.equal(evaluate(e, policy, 'policy').merge, false);
});
function fixture() {
  return { schema: 1, repository: 'example/project', pr: 7, sourceHead: B, base: A,
    policyHash: 'policy', state: 'open', draft: false, author: 'maintainer',
    headRepository: 'example/project', branch: 'codex/daily-bug-scan/example', target: 'master',
    baseIncluded: true, files: ['src/App.Core/Example.cs'], changedLines: 12, repairCycles: 0,
    gates: Object.fromEntries(['security', 'correctness', 'code-quality', 'test-integrity'].map(name => [name,
      { verdict: 'pass', sourceHead: B, base: A, policyHash: 'policy', reviewer: 'independent-session',
        summary: 'Inspected owning service and callers.', evidence: ['src/App.Core/Example.cs:1'], findings: [] }])),
    ci: { verdict: 'pass', sourceHead: B, runUrl: 'https://github.com/example/project/actions/runs/12' } };
}
test('report-only fallback evaluates a clean candidate but never permits merging', () => {
  assert.deepEqual(evaluate(fixture(), { ...policy, mode: 'report-only' }, 'policy'), { eligible: true, merge: false, reasons: [] });
});
test('active policy permits automatic merging only for a fully eligible candidate', () => {
  assert.equal(policy.mode, 'automatic');
  assert.equal(evaluate(fixture(), policy, 'policy').merge, true);
});

test('registered SOP producer branches and legacy PRs remain eligible', () => {
  for (const branch of ['bugfix/daily-bug-scan-retry-budget-20260909-a1b2',
    'feature/daily-verify-tests-candidate-export-20260909-a1b2',
    'codex/daily-bug-scan/20260908-a1b2', 'codex/daily-verify-tests/20260908-a1b2']) {
    const e = fixture(); e.branch = branch;
    assert.equal(evaluate(e, policy, 'policy').merge, true, branch);
  }
});

test('normal owner bugfix and feature PRs enter the quality process', () => {
  for (const branch of ['bugfix/application-status-refresh', 'feature/candidate-preferred-cities']) {
    const e = fixture(); e.branch = branch;
    assert.equal(evaluate(e, policy, 'policy').merge, true, branch);
  }
});
test('hotfixes and unrelated legacy prefixes remain outside automatic merging', () => {
  for (const branch of ['hotfix/release-login-timeout', 'codex/daily-bug-scan-other/example']) {
    const e = fixture(); e.branch = branch;
    const result = evaluate(e, policy, 'policy');
    assert.equal(result.merge, false, branch);
    assert.ok(result.reasons.includes('Unregistered PR origin'), branch);
  }
});
test('producer identity and branch family are paired, including Dependabot API spelling', () => {
  assert.equal(registeredProducer('dependabot[bot]', 'dependabot/npm_and_yarn/sites/help/package-1.2.3', policy), true);
  assert.equal(registeredProducer('app/dependabot', 'dependabot/npm_and_yarn/sites/help/package-1.2.3', policy), true);
  assert.equal(registeredProducer('maintainer', 'dependabot/fake', policy), false);
  assert.equal(registeredProducer('dependabot[bot]', 'bugfix/fake', policy), false);
  assert.equal(registeredProducer('stranger', 'feature/task', policy), false);
});
function openPr(number, author, branch) {
  return { number, title: `PR ${number}`, html_url: `https://github.com/example/project/pull/${number}`,
    state: 'open', draft: false, created_at: `2026-09-09T07:00:${number}Z`, user: { login: author },
    head: { sha: B, ref: branch, repo: { full_name: 'example/project' } }, base: { ref: 'master' } };
}
test('all seven current PR shapes are visible; five are selected and two deferred', () => {
  const prs = [...[19,20,21,22].map(n => openPr(n, 'dependabot[bot]', `dependabot/package-${n}`)),
    ...[23,24,25].map(n => openPr(n, 'maintainer', `bugfix/task-${n}`))];
  const queue = selectQueue(prs, policy, { base: A, policyHash: 'p' });
  assert.equal(queue.length, 7);
  assert.deepEqual(queue.filter(x => x.status === 'review').map(x => x.pr), [19,20,21,22,23]);
  assert.deepEqual(queue.filter(x => x.status === 'deferred').map(x => x.pr), [24,25]);
  const completed = queue.slice(0,5).map(x => x.key);
  const next = selectQueue(prs, policy, { base: A, policyHash: 'p', completed });
  assert.deepEqual(next.filter(x => x.status === 'review').map(x => x.pr), [24,25]);
  assert.equal(selectQueue(prs, policy, { base: A, policyHash: 'new', completed }).filter(x => x.status === 'review').length, 5);
});
test('held drafts, forks and unregistered PRs are reported rather than discarded', () => {
  const draft = openPr(19, 'maintainer', 'bugfix/a'); draft.draft = true;
  const fork = openPr(20, 'maintainer', 'bugfix/b'); fork.head.repo.full_name = 'stranger/project';
  const unknown = openPr(21, 'stranger', 'feature/c');
  const queue = selectQueue([draft, fork, unknown], policy, { base: A, policyHash: 'p' });
  assert.equal(queue.length, 3);
  assert.ok(queue.every(x => x.status === 'held' && x.reasons.length));
});

test('new producer prefixes preserve author, repository, target and review requirements', () => {
  for (const branch of ['bugfix/daily-bug-scan-retry-budget-20260909-a1b2',
    'feature/daily-verify-tests-candidate-export-20260909-a1b2']) {
    for (const change of [e => e.author = 'stranger', e => e.headRepository = 'stranger/project',
      e => e.target = 'release', e => delete e.gates.security]) {
      const e = fixture(); e.branch = branch; change(e);
      assert.equal(evaluate(e, policy, 'policy').merge, false, branch);
    }
  }
});
test('automatic mode requires every gate and matching evidence', () => {
  const p = { ...policy, mode: 'automatic' };
  assert.equal(evaluate(fixture(), p, 'policy').merge, true);
  for (const name of Object.keys(fixture().gates)) {
    for (const field of ['verdict', 'sourceHead', 'base', 'policyHash']) {
      const e = fixture(); e.gates[name][field] = 'stale';
      assert.equal(evaluate(e, p, 'policy').merge, false, `${name}/${field}`);
    }
  }
});
test('unknown, skipped and missing results fail closed', () => {
  for (const change of [e => delete e.gates.security, e => e.ci.verdict = 'skipped',
    e => e.ci.sourceHead = A, e => e.gates.correctness.evidence = [],
    e => e.gates.security.findings.push({ severity: 'blocking', detail: 'tenant leak' })]) {
    const e = fixture(); change(e); assert.equal(evaluate(e, policy, 'policy').eligible, false);
  }
});
test('eligibility rejects impersonating branches, foreign repos, stale base and oversized diffs', () => {
  for (const change of [e => e.author = 'stranger', e => e.headRepository = 'stranger/project',
    e => e.branch = 'codex/unregistered/task', e => e.target = 'release', e => e.draft = true,
    e => e.state = 'closed', e => e.baseIncluded = false, e => e.changedLines = 10000,
    e => e.repairCycles = 3, e => e.policyHash = 'different']) {
    const e = fixture(); change(e); assert.equal(evaluate(e, policy, 'policy').eligible, false);
  }
});
test('sensitive policy, workflows, identity, money and prompt changes require human review', () => {
  for (const file of ['.github/workflows/ci.yml', '.agents/skills/anything/SKILL.md', 'AGENTS.md',
    'scripts/quality/marc.cjs', 'devops/infra/a.tf', 'src/X/AuthorizationService.cs',
    'src/X/RefundService.cs', 'src/X/SystemPrompts/prompt.md', 'src/X/Models/Account.cs']) {
    const e = fixture(); e.files = [file]; assert.equal(evaluate(e, policy, 'policy').eligible, false, file);
  }
});
test('UI paths require browser evidence even when all other gates pass', () => {
  const e = fixture(); e.files = ['src/X/Thing.razor.cs'];
  assert.equal(evaluate(e, policy, 'policy').eligible, false);
  e.gates.browser = { ...e.gates.correctness };
  assert.equal(evaluate(e, policy, 'policy').eligible, true);
});
test('report names cannot escape the PR evidence directory', () => {
  assert.throws(() => reportPaths('../7', B));
  assert.throws(() => reportPaths(7, '../bad'));
  assert.deepEqual(reportPaths(7, B), [`.quality/reports/pr-7/${B}.json`, `.quality/reports/pr-7/${B}.md`]);
  assert.match(reportMarkdown(fixture(), evaluate(fixture(), policy, 'policy')), /Eligible for guarded merge/);
});

test('new report names sort by UTC minute and keep the PR number visible', () => {
  assert.deepEqual(reportPaths(24, B, '2026-09-12T10:45:00.000Z'), [
    '.quality/reports/pr-24/20260912-1045-24.json', '.quality/reports/pr-24/20260912-1045-24.md']);
  assert.deepEqual(reportPaths(24, B, '2026-09-12T10:45:00.000Z', 'marc-v3'), [
    '.quality/reports/pr-24/20260912-1045-24-audit.json', '.quality/reports/pr-24/20260912-1045-24.md']);
  assert.ok(reportPaths(24, B, '2026-09-12T10:45:00.000Z')[0] < reportPaths(24, A, '2026-09-12T10:46:00.000Z')[0]);
  for (const timestamp of [null, '', '../escape', '2026-02-30T10:45:00.000Z',
    '2026-09-12T10:45:01.000Z', '2026-09-12T10:45:00+10:00']) {
    assert.throws(() => reportPaths(24, B, timestamp), /timestamp/);
  }
});

test('report timestamp is fixed once and displayed without losing source identity', () => {
  const { prepareReport } = require('./marc.cjs');
  const original = fixture();
  const e = prepareReport(original, new Date('2026-09-12T10:45:59.999Z'));
  assert.equal(e.reportCreatedAt, '2026-09-12T10:45:00.000Z');
  assert.equal(original.reportCreatedAt, undefined);
  assert.equal(prepareReport(e, new Date('2026-09-12T11:00:00Z')).reportCreatedAt, e.reportCreatedAt);
  const markdown = reportMarkdown(e, evaluate(e, policy, 'policy'));
  assert.match(markdown, /Report created: 2026-09-12 10:45 UTC/);
  assert.ok(markdown.includes(B));
  assert.ok(markdown.includes(A));
  assert.doesNotMatch(reportMarkdown(original, evaluate(original, policy, 'policy')), /Report created:/);
});

test('report metadata namespace accepts legacy and timestamp names only for the owning PR', () => {
  const { isOwnReportPath } = require('./marc.cjs');
  for (const extension of ['json', 'md']) {
    assert.equal(isOwnReportPath(24, `.quality/reports/pr-24/${B}.${extension}`), true);
    assert.equal(isOwnReportPath(24, `.quality/reports/pr-24/20260912-1045-24.${extension}`), true);
  }
  assert.equal(isOwnReportPath(24, '.quality/reports/pr-24/20260912-1045-24-audit.json'), true);
  for (const file of ['.quality/reports/pr-24/20260912-1045-25.md',
    '.quality/reports/pr-25/20260912-1045-24.md', '.quality/reports/pr-24/20260230-1045-24.md',
    '.quality/reports/pr-24/20260912-2460-24.md', '.quality/reports/pr-24/latest.md',
    '.quality/reports/pr-24/20260912-1045-24.md/extra', '.quality/reports/pr-24/20260912-1045-24-audit.md',
    `.quality/reports/pr-24/${B}-audit.json`]) assert.equal(isOwnReportPath(24, file), false, file);
});
test('indirect UI impact from a reviewer also requires browser evidence', () => {
  const e = fixture(); e.gates.correctness.requiresBrowser = true;
  assert.equal(evaluate(e, policy, 'policy').eligible, false);
});
test('default automatic scope allows 3000 changed lines and rejects 3001', () => {
  const e = fixture(); e.changedLines = 3000;
  assert.equal(policy.maxChangedLines, 3000);
  assert.equal(require('../../examples/python/.marc/policy.json').maxChangedLines, 3000);
  assert.equal(evaluate(e, policy, 'policy').merge, true);
  e.changedLines = 3001;
  assert.equal(evaluate(e, policy, 'policy').merge, false);
  assert.equal(policy.simpleRoute.recommendedMaxChangedLines, 200);
  assert.equal(policy.simpleRoute.recommendedMaxFiles, 5);
});

test('consumer line limits override the default in either direction', () => {
  for (const maxChangedLines of [2000, 4000]) {
    const configured = { ...policy, maxChangedLines }, e = fixture();
    e.changedLines = maxChangedLines;
    assert.equal(evaluate(e, configured, 'policy').merge, true);
    e.changedLines++;
    assert.equal(evaluate(e, configured, 'policy').merge, false);
  }
});

test('file limits count source paths while keeping excluded paths subject to review', () => {
  assert.equal(policy.maxFiles, 50);
  assert.equal(require('../../examples/python/.marc/policy.json').maxFiles, 50);
  const excluded = Array.from({ length: 60 }, (_, i) => [`docs/guide${i}.md`, `src/App.Tests/Case${i}.cs`]).flat();
  for (const maxFiles of [40, 50, 60]) {
    const configured = { ...policy, maxFiles }, e = fixture();
    e.files = [...Array.from({ length: maxFiles }, (_, i) => `src/App.Core/Example${i}.cs`), ...excluded];
    const inventory = [...e.files];
    assert.equal(evaluate(e, configured, 'policy').merge, true);
    assert.deepEqual(e.files, inventory);
    e.files.push('src/App.Core/Extra.cs');
    assert.equal(evaluate(e, configured, 'policy').merge, false);
  }
  const e = fixture(); e.files = [...excluded]; e.changedLines = 0;
  assert.equal(evaluate(e, policy, 'policy').merge, true);
  e.files.push('AGENTS.md');
  assert.equal(evaluate(e, policy, 'policy').merge, false);
  e.files = excluded; delete e.gates['test-integrity'];
  assert.equal(evaluate(e, policy, 'policy').merge, false);
  e.files = [];
  assert.ok(evaluate(e, policy, 'policy').reasons.includes('Diff outside size limits'));
});

test('simple file guidance excludes docs and tests without waiving CI or sensitive paths', () => {
  const e = simpleFixture();
  e.files.push(...Array.from({ length: 60 }, (_, i) => [`docs/guide${i}.md`, `src/App.Tests/Case${i}.cs`]).flat());
  assert.equal(evaluate(e, policy, 'policy').merge, true);
  e.files.push('docs/security/RefundPolicy.md');
  assert.equal(evaluate(e, policy, 'policy').merge, false);
  e.files.pop(); e.ci.verdict = 'blocked';
  assert.equal(evaluate(e, policy, 'policy').merge, false);
});
