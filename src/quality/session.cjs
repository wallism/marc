// One resumable assessment step; existing marc.cjs remains the guarded action owner.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadConfig } = require('./config.cjs');
const { createController, trustedPolicy, evaluate, verifyPriorReports } = require('./marc.cjs');
const { recordStage } = require('./stages.cjs');
const { advance, inspectArtifacts, atomicJson, waitForChange } = require('./orchestration.cjs');
const { buildPackets, verifyPacket } = require('./review-packets.cjs');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));

function session(context, evidenceFile, requestFile) {
  const controller = createController(context);
  controller.checkTrustedCheckout();
  const { policy, policyHash } = trustedPolicy(context);
  const stateRoot = fs.realpathSync(context.stateDirectory);
  function external(file) {
    if (!path.isAbsolute(file) || fs.lstatSync(file).isSymbolicLink() || !fs.statSync(file).isFile() ||
        !fs.realpathSync(file).startsWith(stateRoot + path.sep)) throw Error('Use regular evidence/request/result files in the trusted state directory');
    return file;
  }
  const request = read(external(requestFile)), e = read(external(evidenceFile));
  if (!/^[a-zA-Z0-9][\w.-]{0,100}$/.test(request.runId)) throw Error('Invalid run ID');
  const directory = path.dirname(fs.realpathSync(evidenceFile));
  const stateFile = path.join(directory, 'assessment-state.json'), operationLock = path.join(directory, 'advance.lock');
  const command = (exe, args) => execFileSync(exe, args, { cwd: context.repoRoot, encoding: 'utf8', windowsHide: true, maxBuffer: 32e6 }).trimEnd();
  const git = (...args) => command('git', args);
  const api = endpoint => JSON.parse(command('gh', ['api', endpoint]));
  const verifyOwner = () => {
    const lock = read(external(context.runLock));
    if (lock.runId !== request.runId || lock.coordinator !== request.coordinator) throw Error('Foreign run lock; stop without breaking it');
  };
  verifyOwner();
  const fd = fs.openSync(operationLock, 'wx');
  try {
    const status = advance(e, request, {
      paths: { evidence: evidenceFile, state: stateFile }, verifyOwner,
      verifyLive: current => {
        if (current.policyHash !== policyHash || trustedPolicy(context).policyHash !== policyHash)
          throw Error('Policy/tool changed; recapture and review');
        const live = controller.assertLive(current);
        if (live.head.sha !== verifyPriorReports(current, git)) throw Error('Source changed; recapture and review');
      },
      readState: () => fs.existsSync(stateFile) ? read(external(stateFile)) : null,
      readResults: files => Object.fromEntries(Object.entries(files).map(([name, file]) => [name, read(external(file))])),
      collectCi: current => controller.collectCi(current.sourceHead, current.pr, policy),
      artifacts: ci => {
        const run = api(`repos/${policy.repository}/actions/runs/${ci.runId}`);
        if (run.head_sha !== e.sourceHead || run.run_attempt !== ci.runAttempt || run.status !== 'completed' || run.conclusion !== 'success')
          throw Error('CI run identity/status changed during artifact collection');
        const entries = JSON.parse(command('gh', ['api', '--paginate', '--slurp',
          `repos/${policy.repository}/actions/runs/${ci.runId}/artifacts?per_page=100`])).flatMap(page => page.artifacts);
        for (const name of context.ci.requiredArtifacts) {
          const matching = entries.filter(a => a.name === name);
          if (matching.length !== 1 || matching[0].expired || matching[0].size_in_bytes <= 0)
            throw Error('Required artifact missing, duplicated, expired or empty: ' + name);
        }
        const target = path.join(directory, `ci-${ci.runId}-${ci.runAttempt}`);
        if (!fs.existsSync(target)) {
          const temp = fs.mkdtempSync(path.join(directory, 'ci-download-'));
          command('gh', ['run', 'download', String(ci.runId), '--repo', policy.repository, '--dir', temp,
            ...context.ci.requiredArtifacts.flatMap(name => ['--name', name])]);
          inspectArtifacts(temp, context.ci.requiredArtifacts);
          fs.renameSync(temp, target);
        }
        return inspectArtifacts(target, context.ci.requiredArtifacts);
      },
      decide: current => evaluate(current, policy, policyHash, controller.recruit(current)),
      saveEvidence: current => atomicJson(evidenceFile, current),
      checkpoint: (current, decision) => recordStage(path.join(context.stateDirectory, 'assessment-stages'), current, decision),
      saveState: state => atomicJson(stateFile, state)
    });
    if (request.packetDirectory) {
      const current = read(evidenceFile);
      if (fs.existsSync(request.packetDirectory)) {
        const handoff = path.join(request.packetDirectory, 'captain-handoff.json');
        const saved = read(external(handoff));
        for (const packet of saved.packets) verifyPacket(read(external(packet.path)), current);
        status.packets = { handoff, packets: saved.packets };
      } else {
        if (!path.isAbsolute(request.packetDirectory) || !fs.realpathSync(path.dirname(request.packetDirectory)).startsWith(stateRoot + path.sep))
          throw Error('Packet directory must be in trusted external state');
        status.packets = buildPackets(current, context, { directory: request.packetDirectory, git,
          artifactFacts: read(stateFile).facts.artifacts,
          resume: { evidenceFile, requestFile, runId: request.runId, coordinator: request.coordinator } });
      }
    }
    return status;
  } finally { fs.closeSync(fd); fs.unlinkSync(operationLock); }
}

async function main(args = process.argv.slice(2)) {
  const [repo, evidence, request, wait = '0'] = args;
  if (!repo || !evidence || !request || args.length > 4) throw Error('Usage: node src/quality/session.cjs <trusted-repo> <external-evidence.json> <external-request.json> [wait-ms, max 60000]');
  const result = await waitForChange(() => session(loadConfig(repo), evidence, request), { waitMs: Number(wait) });
  console.log(JSON.stringify(result));
}
module.exports = { session, main };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
