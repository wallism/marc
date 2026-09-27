const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluate, reportMarkdown } = require('./marc.cjs');
const { validateRiskPolicy } = require('./risk.cjs');
const { assemble } = require('./orchestration.cjs');
const { requiredGates } = require('./review-packets.cjs');
const { reviewStage, stagesMarkdown } = require('./stages.cjs');
const base = require('./fixtures/policy.json');
const A = 'a'.repeat(40), B = 'b'.repeat(40);
const policy = { ...base, riskAssessment: 1 };

function fixture(risk = {}) {
  return { schema: 1, repository: 'example/project', pr: 7, sourceHead: B, base: A,
    policyHash: 'policy', state: 'open', draft: false, author: 'maintainer',
    headRepository: 'example/project', branch: 'codex/daily-bug-scan/example', target: 'master',
    baseIncluded: true, files: ['src/App.Core/Example.cs'], changedLines: 12, repairCycles: 0,
    gates: Object.fromEntries(['security', 'correctness', 'code-quality', 'test-integrity'].map(name => [name,
      { verdict: 'pass', sourceHead: B, base: A, policyHash: 'policy', reviewer: 'independent-session',
        summary: 'Inspected owning service and callers.', evidence: ['src/App.Core/Example.cs:1'], findings: [] }])),
    ci: { verdict: 'pass', sourceHead: B, runUrl: 'https://github.com/example/project/actions/runs/12' },
    risk: { sourceHead: B, base: A, policyHash: 'policy', reviewer: 'risk-session', level: 'medium', position: 'branch',
      reversibility: 'revertible', triggers: [], unknowns: [], summary: 'Changes Example behavior for its two traced callers.',
      evidence: ['src/App.Core/Example.cs:1 called from src/App/Startup.cs:9'], ...risk } };
}
const reasons = (e, p = policy) => evaluate(e, p, 'policy').reasons;

test('disabled risk assessment leaves existing decisions unchanged', () => {
  const e = fixture(); delete e.risk;
  assert.equal(evaluate(e, base, 'policy').merge, true);
  assert.deepEqual(reasons(fixture({ level: 'nonsense' }), base), []);
});

test('an enabled consumer needs a current, well-formed rating', () => {
  assert.deepEqual(reasons(fixture()), []);
  for (const change of [e => delete e.risk, e => e.risk.sourceHead = A, e => e.risk.policyHash = 'other',
    e => e.risk.level = 'critical', e => e.risk.position = 'root', e => e.risk.reversibility = 'maybe',
    e => e.risk.evidence = [], e => e.risk.summary = ' ', e => delete e.risk.unknowns, e => e.risk.triggers = [''],
    e => e.risk.reviewer = '']) {
    const e = fixture(); change(e);
    assert.deepEqual(reasons(e), ['Risk assessment missing, stale or invalid']);
  }
});

test('a level cannot sit below its recorded position, reversibility or unknowns', () => {
  for (const risk of [{ level: 'low' }, { level: 'medium', position: 'trunk' },
    { level: 'medium', position: 'leaf', reversibility: 'one-way' }, { level: 'low', position: 'leaf', unknowns: ['dynamic dispatch'] }])
    assert.match(reasons(fixture(risk)).join(), /below its recorded/, JSON.stringify(risk));
  for (const risk of [{ level: 'low', position: 'leaf' }, { level: 'low', position: 'leaf', reversibility: 'gated' },
    { level: 'high', position: 'leaf', triggers: ['money: refund amounts'] }, { level: 'medium', position: 'leaf', unknowns: ['caller unreadable'] }])
    assert.deepEqual(reasons(fixture(risk)), [], JSON.stringify(risk));
});

test('declared trunk paths can only raise the rating to high', () => {
  const p = { ...policy, riskTrunkPatterns: ['^src/App\\.Core/'] };
  assert.match(reasons(fixture(), p).join(), /Declared trunk changed \(src\/App\.Core\/Example\.cs\)/);
  assert.deepEqual(reasons(fixture({ level: 'high', position: 'trunk' }), p), []);
  const elsewhere = fixture({ level: 'low', position: 'leaf' }); elsewhere.files = ['src/Feature/New.cs'];
  assert.deepEqual(reasons(elsewhere, p), []);
});

test('high risk holds a simple route and low risk cannot ignore routing risks', () => {
  const simple = fixture({ level: 'high', position: 'trunk' });
  simple.routing = { ...simple.gates.correctness, reviewer: 'captain-routing', route: 'simple', changeKind: 'local-change', risks: [] };
  simple.gates = { 'simple-tests': { ...simple.gates['test-integrity'], testDecision: 'existing-sufficient', testRationale: 'Covered.' } };
  assert.ok(reasons(simple).includes('High risk requires full review'));
  simple.risk = { ...simple.risk, level: 'low', position: 'leaf' };
  assert.deepEqual(reasons(simple), []);
  const full = fixture({ level: 'low', position: 'leaf' });
  full.routing = { route: 'full', reviewer: 'captain-routing', risks: ['persistence'] };
  assert.ok(reasons(full).includes('Low risk contradicts routing risks; reassess'));
});

test('the rating needs its own session', () => {
  for (const change of [e => e.risk.reviewer = 'independent-session', e => e.coordinator = 'risk-session',
    e => e.repairReviewers = ['risk-session']]) {
    const e = fixture(); change(e);
    assert.ok(reasons(e).includes('Risk assessment requires its own independent session'));
  }
});

test('policy fields are validated strictly', () => {
  validateRiskPolicy({}); validateRiskPolicy({ riskAssessment: 1, riskTrunkPatterns: ['^src/core/'] });
  for (const p of [{ riskAssessment: true }, { riskAssessment: 2 }, { riskTrunkPatterns: '^src/' },
    { riskTrunkPatterns: [''] }, { riskTrunkPatterns: ['('] }])
    assert.throws(() => validateRiskPolicy(p), undefined, JSON.stringify(p));
});

test('assembly stores one immutable rating and keeps sessions independent', () => {
  const e = fixture(); const risk = e.risk; delete e.risk;
  e.gates = {};
  const assembled = assemble(e, { risk });
  assert.deepEqual(assembled.risk, risk);
  assert.equal(assemble(assembled, { risk }).risk.level, 'medium', 'identical result is idempotent');
  assert.throws(() => assemble(assembled, { risk: { ...risk, level: 'low' } }), /Preserve existing result: risk/);
  assert.throws(() => assemble(e, { risk: { ...risk, sourceHead: A } }), /Invalid or stale risk/);
  const gate = { verdict: 'pass', sourceHead: B, base: A, policyHash: 'policy', reviewer: 'risk-session',
    summary: 'Reused session.', evidence: ['x'], findings: [] };
  assert.throws(() => assemble(assembled, { security: gate }), /Independent session required: security/);
});

test('an unassessed enabled PR dispatches risk first and never repeats a current rating', () => {
  const e = fixture(); delete e.risk;
  assert.deepEqual(requiredGates(e, policy), ['risk', 'security', 'correctness', 'code-quality', 'test-integrity']);
  assert.deepEqual(requiredGates(fixture(), policy), ['security', 'correctness', 'code-quality', 'test-integrity']);
  assert.equal(requiredGates(e, base).includes('risk'), false);
});

test('reports and stages show the level, dimensions, triggers and unknowns', () => {
  const e = fixture({ level: 'high', position: 'trunk', reversibility: 'one-way', triggers: ['persistence schema: adds column'],
    unknowns: ['reflection caller'] });
  const line = /Risk: high \(trunk, one-way\) — Changes Example behavior.*Triggers: persistence schema: adds column\. Unknowns: reflection caller\./;
  assert.match(reportMarkdown(e, evaluate(e, policy, 'policy')), line);
  const stage = { ...reviewStage(e, evaluate(e, policy, 'policy')), recordedAt: '2026-09-28T00:00:00Z' };
  assert.match(stagesMarkdown([stage]), line);
  const unrated = fixture(); delete unrated.risk;
  assert.doesNotMatch(reportMarkdown(unrated, evaluate(unrated, base, 'policy')), /Risk:/);
});
