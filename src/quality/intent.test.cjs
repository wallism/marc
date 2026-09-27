const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { captureIntent, refreshIntent, intentMarkdown } = require('./intent.cjs');
const { evaluate, selectQueue, createController, prepareReport, writeReportFiles, verifyReportCommit,
  verifyMergeCi, reportCiReuse, reportMarkdown, verifyPriorReports } = require('./marc.cjs');
const { reviewStage } = require('./stages.cjs');
const policy = { ...require('./fixtures/policy.json'), intentSchema: 1 };
const A = 'a'.repeat(40), B = 'b'.repeat(40);

function fixture(simple = false) {
  const e = { schema: 1, repository: policy.repository, pr: 7, sourceHead: B, base: A, policyHash: 'policy',
    state: 'open', draft: false, author: 'maintainer', headRepository: policy.repository,
    branch: 'codex/daily-bug-scan/intent', target: 'master', baseIncluded: true, files: ['app.js'], changedLines: 3,
    repairCycles: 0, repairReviewers: [], coordinator: 'captain', intent: captureIntent('INTENT: Correct addition.'),
    gates: {}, ci: { verdict: 'pass', sourceHead: B, status: 'complete', conclusion: 'success',
      runId: 12, runAttempt: 1, runUrl: 'https://github.com/example/project/actions/runs/12' } };
  const gate = name => ({ verdict: 'pass', sourceHead: e.sourceHead, base: e.base, policyHash: e.policyHash,
    reviewer: name + '-session', summary: 'Reviewed owning code and callers.', evidence: ['app.js:1'], findings: [] });
  e.gates = Object.fromEntries((simple ? ['simple-tests'] : policy.reviewGates).map(name => [name, gate(name)]));
  if (simple) {
    e.routing = { ...gate('routing'), route: 'simple', changeKind: 'local-change', risks: [] };
    Object.assign(e.gates['simple-tests'], { testDecision: 'existing-sufficient', testRationale: 'Existing regression covers addition.' });
  }
  e.gates.intent = { ...gate('intent'), intentHash: e.intent.hash, method: 'static-code', assessment: 'aligned',
    confidence: 'high', confidenceReason: 'All affected branches preserve the required sum.', unresolvedOutcomes: [] };
  return e;
}
const liveFor = (e, body = 'INTENT: Correct addition.') => ({ number: e.pr, state: 'open', draft: false,
  body, user: { login: e.author }, head: { sha: e.sourceHead, ref: e.branch, repo: { full_name: e.repository } },
  base: { ref: e.target }, created_at: '2026-09-27T00:00:00Z' });

test('captures a literal paragraph and excludes examples, comments, quotes and unrelated prose', () => {
  const body = '# Description\n\n```text\nINTENT: example\n```\n\n> INTENT: quoted\n\n<!--\nINTENT: hidden\n-->\n\nINTENT: Correct addition\nfor all valid operands.\n\nOther text';
  const intent = captureIntent(body);
  assert.equal(intent.status, 'present');
  assert.equal(intent.text, 'Correct addition for all valid operands.');
  assert.deepEqual(captureIntent(body.replaceAll('\n', '\r\n')), intent);
  assert.equal(captureIntent(body + '\nUnrelated edit').hash, intent.hash);
  assert.equal(captureIntent('The INTENT: example is inline.').status, 'absent');
  assert.equal(captureIntent('    INTENT: indented code').status, 'absent');
  assert.equal(captureIntent('~~~\nINTENT: fenced\n~~~').status, 'absent');
  assert.equal(captureIntent('```html\n<!-- example\n```\n\nINTENT: Real purpose.').text, 'Real purpose.');
  assert.equal(captureIntent('<!--\n```\n-->\n\nINTENT: Real purpose.').text, 'Real purpose.');
  assert.equal(captureIntent('INTENT:\n\nOther text').status, 'invalid');
  assert.equal(captureIntent('INTENT: First\n\nINTENT: Second').status, 'invalid');
  assert.equal(captureIntent('INTENT: First\nINTENT: Second').status, 'invalid');
});

for (const simple of [false, true]) test(`intent holds cannot be waived on ${simple ? 'simple' : 'full'} route`, () => {
  const original = fixture(simple), decide = e => evaluate(e, policy, 'policy');
  assert.equal(decide(original).merge, true);
  for (const changes of [ { assessment: 'partially-aligned' }, { assessment: 'misaligned' }, { assessment: 'unclear' },
    { intentHash: 'old' }, { verdict: 'human-required' }, { method: 'runtime' }, { confidence: 99 },
    { unresolvedOutcomes: ['One branch remains unverified.'] }, { confidenceReason: '' },
    { suggestedRepair: { change: 'Fix branch', reason: 'Wrong sum' } }, { reviewer: 'captain' },
    { reviewer: Object.values(original.gates)[0].reviewer }, { sourceHead: A }, { evidence: [] }, { requiresBrowser: true } ]) {
    const e = structuredClone(original); Object.assign(e.gates.intent, changes);
    assert.equal(decide(e).merge, false, JSON.stringify(changes));
  }
  const missing = structuredClone(original); delete missing.gates.intent;
  assert.equal(decide(missing).merge, false);
  missing.intent = captureIntent(null);
  assert.equal(decide(missing).merge, true, 'absence retains ordinary rules');
  delete missing.intent;
  assert.equal(decide(missing).merge, false, 'new captures cannot omit the intent contract');
  for (const body of ['INTENT:', 'INTENT: one\n\nINTENT: two']) {
    missing.intent = captureIntent(body);
    assert.match(decide(missing).reasons.join(' '), /human clarification/);
  }
  original.gates.intent.confidence = 'low';
  assert.equal(decide(original).merge, true, 'confidence is not an approval threshold');
  original.ci.verdict = 'blocked';
  assert.equal(decide(original).merge, false, 'alignment cannot waive CI');
  original.ci.verdict = 'pass'; original.gates.intent.requiresBrowser = true;
  assert.ok(!decide(original).reasons.some(reason => /browser:|UI impact/.test(reason)), 'intent cannot request runtime or reroute the PR');
});

test('intent changes wake completed queue entries; unrelated prose edits do not', () => {
  const e = fixture(), pr = liveFor(e), context = { base: A, policyHash: 'policy' };
  const first = selectQueue([pr], policy, context)[0];
  assert.equal(selectQueue([{ ...pr, body: pr.body + '\n\nMore explanation' }], policy,
    { ...context, completed: [first.key] })[0].status, 'awaiting-change');
  for (const body of ['INTENT: Support negative operands.', '', 'INTENT:']) {
    assert.equal(selectQueue([{ ...pr, body }], policy, { ...context, completed: [first.key] })[0].status, 'review');
  }
});

test('refresh clears only intent approval and report preparation, retaining reviews, CI and budgets', () => {
  const e = fixture(true);
  e.repairCycles = 1; e.repairReviewers = ['repair-session']; e.repairExecutions = [{ reviewer: 'repair-session' }];
  Object.assign(e, { reportCreatedAt: '2026-09-27T00:00:00.000Z', reportFormat: 'marc-v3', reportCiReuse: {}, stages: [] });
  const original = structuredClone(e);
  const next = refreshIntent(e, liveFor(e, 'INTENT: Support negative operands.'), 'policy');
  assert.deepEqual(e, original);
  for (const field of ['sourceHead', 'base', 'policyHash', 'ci', 'routing', 'repairCycles', 'repairReviewers', 'repairExecutions'])
    assert.deepEqual(next[field], e[field], field);
  assert.deepEqual(next.gates['simple-tests'], e.gates['simple-tests']);
  assert.equal(next.gates.intent, undefined);
  assert.equal(next.reportCreatedAt, undefined);
  assert.equal(evaluate(next, policy, 'policy').merge, false);
  assert.deepEqual(refreshIntent(e, liveFor(e), 'policy'), e, 'unchanged intent is a no-op');
  assert.throws(() => refreshIntent(e, liveFor(e), 'new-policy'), /Policy changed/);
  const moved = liveFor(e); moved.head.ref = 'different';
  assert.throws(() => refreshIntent(e, moved, 'policy'), /origin changed/);
});

test('report highlights a succinct proposal and reason before detailed stages, with complete audit history', () => {
  const e = fixture();
  Object.assign(e.gates.intent, { verdict: 'human-required', assessment: 'misaligned',
    suggestedRepair: { change: 'Correct the negative-operand branch.', reason: 'It still returns an incorrect sum.' },
    unresolvedOutcomes: ['Negative operands remain incorrect.'] });
  const decision = evaluate(e, policy, 'policy');
  const report = reportMarkdown(prepareReport(e), decision);
  assert.ok(report.indexOf('Human action required') < report.indexOf('## Assessment stages'));
  assert.match(report, /Suggested repair \(approval required\).*negative-operand/);
  assert.match(report, /Reason:.*incorrect sum/);
  assert.ok(intentMarkdown(e).length < 1400);
  assert.deepEqual(reviewStage(e, decision).intent, e.intent);
  assert.deepEqual(reviewStage(e, decision).gates.intent, e.gates.intent);
});

function gitFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-intent-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe', windowsHide: true }).trimEnd();
  git('init', '-b', 'master'); git('config', 'user.name', 'Synthetic test'); git('config', 'user.email', 'test@example.invalid');
  git('config', 'core.hooksPath', '');
  fs.writeFileSync(path.join(root, 'app.js'), 'const sum = (a, b) => a - b;\n');
  git('add', '.'); git('commit', '-m', 'base'); const base = git('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(root, 'app.js'), 'const sum = (a, b) => a + b;\n');
  git('add', '.'); git('commit', '-m', 'source'); const head = git('rev-parse', 'HEAD');
  const e = fixture(); e.base = base; e.sourceHead = head; e.ci.sourceHead = head;
  for (const gate of Object.values(e.gates)) Object.assign(gate, { sourceHead: head, base });
  let live = liveFor(e), currentBase = base;
  const api = endpoint => {
    if (endpoint.endsWith('/pulls/7')) return structuredClone(live);
    if (endpoint.includes('/git/ref/heads/')) return { object: { sha: currentBase } };
    throw Error('Unexpected API (intent refresh must not run CI): ' + endpoint);
  };
  const controller = createController({ repoRoot: root, policy, ci: { workflow: 'ci.yml' } }, { api,
    git: (...args) => args[0] === 'fetch' ? '' : args[0] === 'rev-parse' && args[1] === 'FETCH_HEAD' ? live.head.sha : git(...args) });
  return { root, git, e, controller, get live() { return live; }, set live(value) { live = value; }, setBase(value) { currentBase = value; } };
}

test('live guards reject changed intent and refresh rejects changed source/base/policy', t => {
  const f = gitFixture(t), { controller, e, git, root } = f;
  f.live.body = 'INTENT: Support negative operands.';
  assert.throws(() => controller.assertLive(e), /intent changed/);
  assert.equal(controller.refreshIntentEvidence(e, policy, 'policy').intent.text, 'Support negative operands.');
  assert.throws(() => controller.refreshIntentEvidence(e, policy, 'new-policy'), /identity changed/);
  f.setBase(A);
  assert.throws(() => controller.refreshIntentEvidence(e, policy, 'policy'), /Target branch changed/);
  f.setBase(e.base);
  fs.appendFileSync(path.join(root, 'app.js'), '// unreviewed code\n'); git('add', '.'); git('commit', '-m', 'source changed');
  f.live.head.sha = git('rev-parse', 'HEAD');
  assert.throws(() => controller.refreshIntentEvidence(e, policy, 'policy'), /exact report files/);
});

test('intent-only reassessments preserve exact source CI across multiple immutable reports', t => {
  const f = gitFixture(t), { controller, git, root } = f;
  let e = f.e;
  for (let index = 0; index < 3; index++) {
    const decision = evaluate(e, policy, 'policy');
    assert.equal(decision.merge, true);
    e = prepareReport(e, new Date(`2026-09-27T00:0${index}:00Z`));
    e.stages = [reviewStage(e, decision)];
    e.reportCiReuse = reportCiReuse(e, e.ci);
    writeReportFiles(e, decision, root); git('add', '.'); git('commit', '-m', 'report');
    f.live.head.sha = git('rev-parse', 'HEAD');
    verifyReportCommit(e, f.live, decision, git);
    assert.equal(verifyMergeCi(e, f.live, decision, git, head => head === e.sourceHead ? e.ci : { status: 'missing' }).reusedSource, true);
    f.live.body = `INTENT: Correct addition for case ${index + 1}.`;
    const next = controller.refreshIntentEvidence(e, policy, 'policy');
    assert.equal(next.priorReports.length, index + 1);
    assert.deepEqual(next.ci, f.e.ci);
    assert.deepEqual(next.gates.correctness, f.e.gates.correctness);
    assert.equal(verifyPriorReports(next, git), f.live.head.sha);
    next.gates.intent = { ...f.e.gates.intent, reviewer: `new-intent-${index}`, intentHash: next.intent.hash };
    e = next;
  }
  const corrupted = structuredClone(e); corrupted.priorReports[0].files[0].hash = '0'.repeat(64);
  assert.throws(() => verifyPriorReports(corrupted, git), /bytes changed/);
  const oldFile = e.priorReports[0].files[0].path;
  fs.appendFileSync(path.join(root, oldFile), '\nmodified'); git('add', '.'); git('commit', '-m', 'tampered report');
  f.live.head.sha = git('rev-parse', 'HEAD'); f.live.body = 'INTENT: Another intent.';
  assert.throws(() => controller.refreshIntentEvidence(e, policy, 'policy'), /exact report files/);
});

test('refresh preserves sensitive-path identity but historical reports never grant operator approval', t => {
  const f = gitFixture(t), hash = 'c'.repeat(64);
  const p = { ...policy, humanPathPatterns: ['^app\\.js$'] };
  let e = f.e; e.policyHash = hash;
  for (const gate of Object.values(e.gates)) gate.policyHash = hash;
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-intent-approval-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const approvalFile = path.join(directory, 'approval.json');
  fs.writeFileSync(approvalFile, JSON.stringify({ schema: 1, kind: 'sensitive-paths', approved: true,
    id: 'human-approval', approvedBy: 'Synthetic operator', approvedUtc: '2026-01-01T00:00:00.000Z',
    expiresUtc: '2099-01-01T00:00:00.000Z', scope: 'Approve this source change only.',
    repository: e.repository, pr: e.pr, sourceHead: e.sourceHead, base: e.base, policyHash: hash, paths: e.files }));
  const approval = require('./operator-approval.cjs').loadOperatorApproval(approvalFile);
  const decision = evaluate(e, p, hash, undefined, approval);
  assert.equal(decision.merge, true);
  e = prepareReport(e); e.humanApprovalAudit = decision.humanApproval; e.stages = [reviewStage(e, decision)];
  writeReportFiles(e, decision, f.root); f.git('add', '.'); f.git('commit', '-m', 'approved report');
  f.live.head.sha = f.git('rev-parse', 'HEAD'); f.live.body = 'INTENT: Correct addition for negative operands.';
  const next = f.controller.refreshIntentEvidence(e, p, hash);
  assert.equal(next.humanApprovalAudit, undefined);
  next.gates.intent = { ...e.gates.intent, reviewer: 'fresh-intent', intentHash: next.intent.hash };
  assert.equal(evaluate(next, p, hash).merge, false, 'historical approval is not current authority');
  assert.equal(evaluate(next, p, hash, undefined, approval).merge, true, 'unchanged source retains its explicitly supplied approval');
  assert.equal(verifyPriorReports(next, f.git), f.live.head.sha);
});

test('combined correctness and intent is one session, explicitly policy-bound', () => {
  const p = { ...policy, intentReview: 'correctness-v1' };
  const combined = () => {
    const e = fixture(); e.intentReview = p.intentReview;
    const { sourceHead, base, policyHash, reviewer, ...detail } = e.gates.intent;
    e.gates.correctness.intent = detail; delete e.gates.intent;
    return e;
  };
  assert.equal(evaluate(combined(), p, 'policy').merge, true);
  assert.match(intentMarkdown(combined()), /one independent reviewer session/);
  assert.equal(evaluate(combined(), policy, 'policy').merge, false, 'candidate cannot opt itself in');
  for (const delta of [{ intentHash: 'stale' }, { assessment: 'misaligned' }, { unresolvedOutcomes: ['missing outcome'] },
    { suggestedRepair: { change: 'implement missing outcome', reason: 'intent mismatch' } }, { evidence: [] },
    { findings: [{ severity: 'blocking' }] }, { reviewer: 'invented-second-session' }, { verdict: 'repair' }]) {
    const e = combined(); Object.assign(e.gates.correctness.intent, delta);
    assert.equal(evaluate(e, p, 'policy').merge, false, JSON.stringify(delta));
  }
  for (const reviewer of ['captain', 'security-session', 'repair-session']) {
    const e = combined(); e.repairReviewers = ['repair-session']; e.gates.correctness.reviewer = reviewer;
    assert.equal(evaluate(e, p, 'policy').merge, false, reviewer);
  }
  const duplicate = combined(); duplicate.gates.intent = fixture().gates.intent;
  assert.equal(evaluate(duplicate, p, 'policy').merge, false);
  const e = combined(), refreshed = refreshIntent(e, liveFor(e, 'INTENT: Different outcome.'), 'policy');
  assert.equal(refreshed.gates.correctness, undefined);
  assert.deepEqual(refreshed.gates.security, e.gates.security);
  assert.equal(evaluate(refreshed, p, 'policy').merge, false);
  const simple = fixture(true); simple.intentReview = p.intentReview;
  assert.equal(evaluate(simple, p, 'policy').merge, true, 'simple keeps independent intent');
});

test('comprehensive simple review distinguishes presentation from persisted contracts', () => {
  const p = { ...policy, simpleRoute: { ...policy.simpleRoute, reviewSchema: 1 } };
  const e = fixture(true); e.routing.changeKind = 'report-presentation';
  e.routing.presentation = { persistedEvidenceChanged: false, approvalBehaviorChanged: false, runtimeContractChanged: false,
    evidence: ['Only display text changes; stored marker and exact-byte verification remain unchanged.'] };
  e.gates['simple-tests'].coverage = Object.fromEntries(['correctness', 'security', 'codeQuality', 'testIntegrity'].map(k => [k, ['Concrete source and caller evidence.']]));
  assert.equal(evaluate(e, p, 'policy').merge, true);
  for (const field of ['persistedEvidenceChanged', 'approvalBehaviorChanged', 'runtimeContractChanged']) {
    const changed = structuredClone(e); changed.routing.presentation[field] = true;
    assert.equal(evaluate(changed, p, 'policy').merge, false, field);
  }
  for (const area of Object.keys(e.gates['simple-tests'].coverage)) {
    const missing = structuredClone(e); delete missing.gates['simple-tests'].coverage[area];
    assert.equal(evaluate(missing, p, 'policy').merge, false, area);
  }
  assert.equal(evaluate(e, policy, 'policy').merge, false, 'new route requires policy opt-in');
});
