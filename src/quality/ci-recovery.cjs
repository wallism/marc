// Hosted CI recovery never changes source or grants merge approval.
const fs = require('node:fs');
const path = require('node:path');
const { registeredProducer } = require('./marc.cjs');
const validSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

function recoveryPlan(ci, review, artifacts, requiredArtifacts) {
  if (ci.status === 'pending') return { status: 'waiting', reason: 'Wait for existing exact-commit CI' };
  const reviewed = review?.sourceHead === ci.sourceHead && review.runId === ci.runId &&
    review.runAttempt === ci.runAttempt && Number.isSafeInteger(ci.runId) && ci.runId > 0 &&
    Number.isSafeInteger(ci.runAttempt) && ci.runAttempt > 0 && review.testOrScanFailure === false &&
    nonempty(review.summary) && Array.isArray(review.evidence) && review.evidence.length > 0 && review.evidence.every(nonempty);
  if (ci.verdict === 'pass') {
    if (review?.reason === 'artifacts-unavailable') {
      if (!reviewed) return { status: 'held', reason: 'Artifact recovery requires matching investigation' };
      const available = artifacts();
      if (!Array.isArray(requiredArtifacts) || !requiredArtifacts.length) throw Error('Required CI artifacts missing');
      if (!requiredArtifacts.every(name => available.some(a => a.name === name && a.expired === false)))
        return { action: 'rerun', runId: ci.runId };
    }
    return { status: 'reuse', reason: 'Reuse successful exact-commit CI and retained evidence' };
  }
  if (ci.status === 'missing') return { action: 'dispatch' };
  if (ci.status === 'failed' && reviewed && review.reason === 'infrastructure' &&
    ['cancelled', 'timed_out', 'failure', 'startup_failure'].includes(ci.conclusion))
    return { action: 'rerun', runId: ci.runId };
  return { status: 'held', reason: 'Investigate missing jobs, failed tests/scans or unavailable evidence; no automatic retry' };
}

function recoverCi(e, policy, policyHash, review, io) {
  if (!Number.isSafeInteger(e.pr) || e.pr < 1 || !validSha(e.sourceHead) || !validSha(e.base) ||
    e.policyHash !== policyHash) throw Error('Invalid or stale recovery identity');
  const verify = () => {
    // The adapter also checks current target branch against the captured base.
    const live = io.verify();
    if (live.state !== 'open' || live.draft !== false || live.head?.sha !== e.sourceHead ||
      live.head.repo?.full_name !== policy.repository || live.base?.ref !== policy.base ||
      !registeredProducer(live.user?.login, live.head.ref, policy)) throw Error('PR changed or is not an eligible recovery source');
    return live;
  };
  const plan = () => {
    const ci = io.collect(); // API/auth errors propagate: they are not proof of missing runs.
    if (ci.sourceHead !== e.sourceHead) throw Error('CI identity does not match recovery');
    return { ci, request: recoveryPlan(ci, review, () => io.artifacts(ci.runId), io.requiredArtifacts) };
  };
  verify();
  let current = plan();
  if (!current.request.action) return { ...current.request, ci: current.ci };
  if (policy.mode !== 'automatic') return { status: 'held', reason: 'Recovery requires automatic mode' };
  if (!io.workflowMatches(e.sourceHead)) return { status: 'held', reason: 'CI workflow must match trusted target branch before recovery' };
  const live = verify();
  current = plan(); // Recheck for normal push CI arriving between capture and recovery.
  if (!current.request.action) return { ...current.request, ci: current.ci };
  verify();
  const request = current.request.action === 'dispatch' ? { action: 'dispatch', branch: live.head.ref } : current.request;
  fs.mkdirSync(io.directory, { recursive: true });
  // A fixed shared directory and create-exclusive record enforce one POST per PR/head,
  // including across policy changes, concurrent callers, crashes and uncertain responses.
  const recordPath = path.join(io.directory, `pr-${e.pr}-${e.sourceHead}.request.json`);
  let fd;
  try { fd = fs.openSync(recordPath, 'wx'); }
  catch (error) {
    if (error.code === 'EEXIST') return { status: 'held', reason: 'Recovery already reserved; inspect its record and existing runs', recordPath };
    throw error;
  }
  try {
    fs.writeFileSync(fd, JSON.stringify({ schema: 1, pr: e.pr, sourceHead: e.sourceHead, base: e.base,
      policyHash, requestedAt: io.now(), request, ci: current.ci, investigation: review || null }, null, 2) + '\n');
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  io.send(request); // Do not remove the reservation or retry on an uncertain network response.
  fs.writeFileSync(recordPath.replace('.request.json', '.accepted.json'), JSON.stringify({ acceptedAt: io.now() }) + '\n', { flag: 'wx' });
  return { status: 'requested', request, recordPath, reason: 'Wait and recapture exact-commit CI; this request is not validation' };
}
module.exports = { recoverCi };
