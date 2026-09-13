const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { recoverCi } = require('./ci-recovery.cjs');
const policy = require('./fixtures/policy.json');
const A = 'a'.repeat(40), B = 'b'.repeat(40);
const evidence = { pr: 24, sourceHead: B, base: A, policyHash: 'policy' };
const missing = { sourceHead: B, verdict: 'blocked', status: 'missing' };
const failed = { sourceHead: B, verdict: 'blocked', status: 'failed', runId: 12, runAttempt: 1, conclusion: 'cancelled' };
const complete = { ...failed, verdict: 'pass', status: 'complete', conclusion: 'success' };
const review = { sourceHead: B, runId: 12, runAttempt: 1, reason: 'infrastructure',
  testOrScanFailure: false, summary: 'Runner lost connectivity before tests started.', evidence: ['sanitized-run-12.md'] };
function fixture(t) {
  const root = process.env.MARC_TEST_ARTIFACTS || os.tmpdir();
  fs.mkdirSync(root, { recursive: true });
  const directory = fs.mkdtempSync(path.join(root, 'recovery-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const sent = [];
  const live = { state: 'open', draft: false, user: { login: 'maintainer' },
    head: { sha: B, ref: 'bugfix/test', repo: { full_name: 'example/project' } }, base: { ref: 'master' } };
  const io = { directory, requiredArtifacts: ['test-results', 'quality-scans'], now: () => '2026-09-12T00:00:00Z', verify: () => live,
    collect: () => missing, workflowMatches: () => true, artifacts: () => [],
    send: request => { assert.equal(fs.readdirSync(directory).filter(f => f.endsWith('.request.json')).length, 1); sent.push(request); } };
  return { io, sent, live, run: investigation => recoverCi(evidence, policy, 'policy', investigation, io) };
}
test('missing CI dispatches once, records before sending and survives another wakeup', t => {
  const f = fixture(t);
  assert.equal(f.run().status, 'requested');
  assert.deepEqual(f.sent, [{ action: 'dispatch', branch: 'bugfix/test' }]);
  assert.equal(f.run().status, 'held');
  assert.equal(f.sent.length, 1);
});
test('success and pending runs reuse evidence without consuming recovery budget', t => {
  for (const ci of [complete, { ...failed, status: 'pending' }]) {
    const f = fixture(t); f.io.collect = () => ci;
    assert.equal(f.run().status, ci.status === 'complete' ? 'reuse' : 'waiting');
    assert.equal(f.sent.length, 0);
    assert.deepEqual(fs.readdirSync(f.io.directory), []);
  }
});
test('second CI read catches push propagation before dispatch', t => {
  const f = fixture(t); let reads = 0;
  f.io.collect = () => ++reads === 1 ? missing : complete;
  assert.equal(f.run().status, 'reuse');
  assert.equal(f.sent.length, 0);
});
test('failed CI requires matching investigation and never retries known test or scan failures', t => {
  for (const investigation of [undefined, { ...review, sourceHead: A }, { ...review, runAttempt: 2 },
    { ...review, testOrScanFailure: true }, { ...review, evidence: [] }, { ...review, reason: 'make-green' }]) {
    const f = fixture(t); f.io.collect = () => failed;
    assert.equal(f.run(investigation).status, 'held');
    assert.equal(f.sent.length, 0);
  }
  const f = fixture(t); f.io.collect = () => failed;
  assert.equal(f.run(review).status, 'requested');
  assert.deepEqual(f.sent, [{ action: 'rerun', runId: 12 }]);
  assert.equal(f.run(review).status, 'held');
});
test('expired artifacts require evidence and a live availability check', t => {
  const f = fixture(t); f.io.collect = () => complete;
  const investigation = { ...review, reason: 'artifacts-unavailable', summary: 'Hosted artifacts expired; no retained usable evidence.' };
  f.io.artifacts = () => [{ name: 'test-results', expired: false }, { name: 'quality-scans', expired: false }];
  assert.equal(f.run(investigation).status, 'reuse');
  f.io.artifacts = () => [{ name: 'test-results', expired: true }];
  assert.equal(f.run(investigation).status, 'requested');
});
test('uncertain request result consumes budget and prevents a duplicate POST', t => {
  const f = fixture(t); let sent = 0;
  f.io.send = () => { sent++; throw Error('connection lost'); };
  assert.throws(() => f.run(), /connection lost/);
  assert.equal(f.run().status, 'held');
  assert.equal(sent, 1);
});
test('API failures are not missing CI and do not create a recovery request', t => {
  const f = fixture(t); f.io.collect = () => { throw Error('403'); };
  assert.throws(() => f.run(), /403/);
  assert.deepEqual(fs.readdirSync(f.io.directory), []);
});
test('recovery refuses changed identities, forks, drafts and unregistered producers', t => {
  for (const change of [f => f.live.head.sha = A, f => f.live.draft = true,
    f => f.live.head.repo.full_name = 'fork/repo', f => f.live.user.login = 'stranger',
    f => f.live.base.ref = 'release', f => f.live.head.ref = 'release']) {
    const f = fixture(t); change(f);
    assert.throws(() => f.run(), /PR/);
    assert.equal(f.sent.length, 0);
  }
  const f = fixture(t);
  assert.throws(() => recoverCi(evidence, policy, 'different', undefined, f.io), /identity/);
});
test('head movement or workflow changes before POST prevent recovery', t => {
  const f = fixture(t); let checks = 0;
  f.io.verify = () => ({ ...f.live, head: { ...f.live.head, sha: ++checks === 1 ? B : A } });
  assert.throws(() => f.run(), /PR/);
  assert.equal(f.sent.length, 0);
  const g = fixture(t); g.io.workflowMatches = () => false;
  assert.equal(g.run().status, 'held');
  assert.equal(g.sent.length, 0);
});
test('a concurrent caller loses the exclusive reservation without sending', t => {
  const f = fixture(t); let outer = true;
  f.io.now = () => {
    if (outer) { outer = false; assert.equal(f.run().status, 'held'); }
    return '2026-09-12T00:00:00Z';
  };
  assert.equal(f.run().status, 'requested');
  assert.equal(f.sent.length, 1);
});
test('policy changes do not reset the per-head budget and new source commits do', t => {
  const f = fixture(t); f.run();
  assert.equal(recoverCi({ ...evidence, policyHash: 'new' }, policy, 'new', undefined, f.io).status, 'held');
  const head = 'c'.repeat(40); f.live.head.sha = head;
  f.io.collect = () => ({ ...missing, sourceHead: head });
  f.io.send = request => f.sent.push(request);
  assert.equal(recoverCi({ ...evidence, sourceHead: head }, policy, 'policy', undefined, f.io).status, 'requested');
  assert.equal(f.sent.length, 2);
});
test('changed master and wrong CI identities fail closed', t => {
  const f = fixture(t); f.io.verify = () => { throw Error('Master changed'); };
  assert.throws(() => f.run(), /Master changed/);
  const g = fixture(t); g.io.collect = () => ({ ...missing, sourceHead: A });
  assert.throws(() => g.run(), /CI identity/);
  assert.equal(g.sent.length, 0);
});
test('incomplete jobs and report-only mode never initiate recovery', t => {
  const f = fixture(t); f.io.collect = () => ({ ...failed, status: 'incomplete' });
  assert.equal(f.run(review).status, 'held');
  assert.equal(f.sent.length, 0);
  const g = fixture(t);
  assert.equal(recoverCi(evidence, { ...policy, mode: 'report-only' }, 'policy', undefined, g.io).status, 'held');
  assert.equal(g.sent.length, 0);
});
