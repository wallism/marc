const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { identity } = require('./orchestration.cjs');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const encode = value => JSON.stringify(value, null, 2) + '\n';

function requiredGates(e, policy) {
  const gates = e.routing?.route === 'simple' ? ['simple-tests'] : [...policy.reviewGates];
  if (e.intent?.status === 'present') gates.push('intent');
  for (const member of e.crew?.selected || []) gates.push('crew:' + member.id);
  if (e.crew?.requiresBrowser || e.files.some(f => policy.uiPathPatterns.some(p => new RegExp(p, 'i').test(f))) ||
      Object.values(e.gates || {}).some(g => g.requiresBrowser)) gates.push('browser');
  return [...new Set(gates)];
}

// Called only with controller-owned capture and frozen Git data. The builder is
// also exported for explicit offline experiments; packets never authorize actions.
function buildPackets(e, context, { directory, git, artifactFacts = [], experimental = false, resume = {} }) {
  if (!path.isAbsolute(directory) || fs.existsSync(directory)) throw Error('Packets require a new external directory');
  const parent = fs.realpathSync(path.dirname(directory));
  for (const root of [context.repoRoot, context.bundleRoot]) {
    const resolved = fs.realpathSync(root);
    if (parent === resolved || parent.startsWith(resolved + path.sep)) throw Error('Packets must remain outside source checkouts');
  }
  if (!/^[a-f0-9]{40}$/.test(e.sourceHead) || !/^[a-f0-9]{40}$/.test(e.base) || !e.policyHash) throw Error('Frozen packet identity required');
  fs.mkdirSync(directory);
  const diffPath = path.join(directory, 'complete.diff');
  fs.writeFileSync(diffPath, git('diff', '--no-ext-diff', '--no-textconv', '--binary', e.base, e.sourceHead, '--'));
  const scopePath = path.join(directory, 'scope.json');
  fs.writeFileSync(scopePath, encode({ files: e.files, impact: e.crew?.impact, holds: e.crew?.holds || [], projectChanges: e.projectChanges }));
  const pointer = file => ({ path: file, sha256: digest(fs.readFileSync(file)), bytes: fs.statSync(file).size });
  const refs = path.join(context.bundleRoot, 'skills/marc-crew-captain/references');
  const common = pointer(path.join(refs, 'reviewer.md'));
  const project = context.guidance?.project ? pointer(context.guidance.project) : null;
  const packets = [];
  for (const gate of requiredGates(e, context.policy)) {
    const member = e.crew?.selected.find(m => gate === 'crew:' + m.id);
    const skill = gate === 'intent' ? path.join(refs, 'intent.md') : gate === 'browser' ? path.join(refs, 'browser-runtime.md') :
      path.join(context.bundleRoot, member?.skill || `skills/marc-crew-${gate}/SKILL.md`);
    const schema = { verdict: ['pass', 'repair', 'human-required', 'blocked'],
      required: ['sourceHead', 'base', 'policyHash', 'reviewer', 'summary', 'evidence', 'findings'],
      ...(member ? { memberVersion: member.version, memberHash: member.contentHash, selectionHash: e.crew.selectionHash } : {}),
      ...(gate === 'intent' ? { intentHash: e.intent.hash, method: 'static-code', additional: ['assessment', 'confidence', 'confidenceReason', 'unresolvedOutcomes'] } : {}),
      ...(gate === 'simple-tests' ? { additional: ['testDecision', 'testRationale'] } : {}) };
    const instructions = [common, pointer(skill), ...(project ? [project] : [])];
    if (e.projectChanges?.some(p => p.classification === 'dependency-only' || p.classification === 'review-required'))
      instructions.push(pointer(path.join(refs, 'dependency-evidence.md')));
    const packet = { schema: 1, experimental, authority: 'Read-only independent assessment; no repair, publication or merge authority.', gate,
      identity: identity(e), repository: e.repository, pr: e.pr, sourceHead: e.sourceHead, base: e.base, policyHash: e.policyHash,
      sourceRepository: context.repoRoot, instructions, diff: pointer(diffPath), scope: pointer(scopePath),
      intent: e.intent, ci: e.ci, artifactFacts, outputSchema: schema,
      output: path.join(directory, `${gate.replace(':', '-')}-result.json`),
      expansion: 'Read complete diff and owning callers. Inspect scope, lexical leads and unresolved holds. Full source remains available through read-only git show <revision>:<path>. No other reviewer conclusions are included.' };
    const file = path.join(directory, `${gate.replace(':', '-')}.json`);
    fs.writeFileSync(file, encode(packet), { flag: 'wx' });
    packets.push({ gate, path: file, output: packet.output, instructionBytes: instructions.reduce((sum, p) => sum + p.bytes, 0),
      packetBytes: fs.statSync(file).size, diffBytes: packet.diff.bytes, scopeBytes: packet.scope.bytes });
  }
  const handoff = { schema: 1, experimental, authority: 'Assessment only; use existing guarded commands for all actions.',
    resume,
    identity: identity(e), repository: context.repoRoot, bundle: context.bundleRoot,
    stateDirectory: context.stateDirectory, runLock: context.runLock, ciRecoveryDirectory: context.ciRecoveryDirectory,
    repairCycles: e.repairCycles, repairReviewers: e.repairReviewers, repairExecutions: e.repairExecutions,
    packets, next: 'Verify live source/base/policy and exclusive run ownership before resuming. Load current trusted Captain; inspect resumable external state. Never inherit implementation conversation or use packet CI as live merge authority.' };
  const handoffPath = path.join(directory, 'captain-handoff.json');
  fs.writeFileSync(handoffPath, encode(handoff), { flag: 'wx' });
  return { handoff: handoffPath, packets };
}

function verifyPacket(packet, current) {
  if (encode(packet.identity) !== encode(identity(current))) throw Error('Stale packet identity');
  if (encode(packet.ci) !== encode(current.ci)) throw Error('Stale packet CI facts');
  for (const ref of [...packet.instructions, packet.diff, packet.scope]) {
    if (!fs.lstatSync(ref.path).isFile() || fs.lstatSync(ref.path).isSymbolicLink() || digest(fs.readFileSync(ref.path)) !== ref.sha256)
      throw Error('Missing or changed packet evidence: ' + ref.path);
  }
  return true;
}
module.exports = { requiredGates, buildPackets, verifyPacket };
