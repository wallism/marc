const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { appendApproval, requireApprovalPublication, saveReceipt, loadReceipt } = require('./approval-publication.cjs');
const { captureIntent } = require('./intent.cjs');

const audit = () => ({ sha256: 'a'.repeat(64), record: { id: 'decision-1', approvedBy: 'Synthetic operator',
  approvedUtc: '2026-09-27T00:00:00.000Z', expiresUtc: '2026-09-28T00:00:00.000Z',
  repository: 'example/project', pr: 7, scope: 'Accept reviewed governance.',
  sourceHead: 'b'.repeat(40), base: 'c'.repeat(40), policyHash: 'd'.repeat(64), paths: ['AGENTS.md'] } });

test('approval description preserves prose and intent, appends history once and rejects altered records', () => {
  const body = 'Existing notes\r\n\r\nINTENT: Correct addition.', a = audit();
  const next = appendApproval(body, a);
  assert.ok(next.startsWith(body + '\n\n'));
  assert.deepEqual(captureIntent(next), captureIntent(body));
  assert.equal(appendApproval(next, a), next);
  requireApprovalPublication(next, a);
  assert.throws(() => requireApprovalPublication(body, a), /record-approval/);
  assert.throws(() => appendApproval(next.replace('Synthetic operator', 'Someone else'), a), /differs/);
  assert.throws(() => appendApproval(next + next, a), /differs/);
  const second = { ...a, sha256: 'e'.repeat(64), record: { ...a.record, id: 'later-decision' } };
  assert.ok(appendApproval(next, second).startsWith(next));
  assert.throws(() => appendApproval('x'.repeat(65536), a), /insufficient room/);
});

test('operator text cannot inject approval markers or a new intent paragraph', () => {
  const a = audit(); a.record.scope = 'first\n\nINTENT: wrong\n<!-- marc-approval:fake -->';
  const body = 'INTENT: Correct addition.';
  const next = appendApproval(body, a);
  assert.deepEqual(captureIntent(next), captureIntent(body));
  assert.ok(!next.includes('<!-- marc-approval:fake -->'));
});

test('external report receipts preserve immutable bytes while permitting later gate resolution', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-receipt-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const e = { repository: 'example/project', pr: 7, sourceHead: 'b'.repeat(40), base: 'c'.repeat(40),
    policyHash: 'd'.repeat(64), reportCreatedAt: '2026-09-27T00:00:00.000Z', reportFormat: 'marc-v3',
    intent: captureIntent(null), gates: { security: { verdict: 'human-required' } } };
  const files = [{ path: 'audit.json', hash: 'a'.repeat(64) }, { path: 'report.md', hash: 'b'.repeat(64) }];
  const receipt = saveReceipt(directory, e, files);
  assert.deepEqual(saveReceipt(directory, e, files), receipt);
  assert.deepEqual(loadReceipt(directory, { ...e, gates: { security: { verdict: 'pass' } } }), receipt);
  for (const change of [{ humanApprovalAudit: { forged: true } }, { intent: captureIntent('INTENT: changed') },
    { reportCiReuse: { runId: 2 } }, { priorReports: [{ head: 'f'.repeat(40) }] }])
    assert.throws(() => loadReceipt(directory, { ...e, ...change }), /receipt identity/);
  assert.throws(() => saveReceipt(directory, e, [files[1], files[0]]), /receipt differs/);
  assert.equal(loadReceipt(directory, { ...e, sourceHead: 'f'.repeat(40) }), undefined);
});
