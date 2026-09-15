// Trusted external audit history. Historical stages are presentation, never current approval.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { agentTable } = require('./agent-settings.cjs');
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const text = value => typeof value === 'string' && value.trim().length > 0;
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const clean = value => String(value ?? '').replace(/[\r\n|]/g, ' ');
const result = decision => decision.merge ? 'Eligible for guarded merge' : decision.eligible ? 'Report-only: would merge' : 'Held';

function identity(e) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(e.repository || '') || !Number.isSafeInteger(e.pr) || e.pr < 1 ||
    !sha(e.sourceHead) || !sha(e.base) || !text(e.policyHash)) throw Error('Invalid stage identity');
  return { repository: e.repository, pr: e.pr, sourceHead: e.sourceHead, base: e.base, policyHash: e.policyHash };
}

function reviewStage(e, decision) {
  return { kind: 'review', repository: e.repository, pr: e.pr, sourceHead: e.sourceHead, base: e.base,
    policyHash: e.policyHash, repairCycles: e.repairCycles || 0, decision: structuredClone(decision),
    routing: structuredClone(e.routing || { route: 'full' }), crew: structuredClone(e.crew || { selected: [], omitted: [] }),
    gates: structuredClone(e.gates || {}), ci: structuredClone(e.ci || {}), projectChanges: structuredClone(e.projectChanges || []),
    repairExecutions: structuredClone(e.repairExecutions || []) };
}

function eventStage(e, event) {
  if (!text(event.summary) || !Array.isArray(event.evidence) || !event.evidence.length || !event.evidence.every(text))
    throw Error('Stage event needs a summary and observed evidence');
  const common = { ...identity(e), summary: event.summary, evidence: [...event.evidence] };
  if (event.kind === 'repair') {
    if (!sha(event.toHead) || !text(event.reviewer) || !['repaired', 'blocked'].includes(event.result))
      throw Error('Invalid repair stage');
    return { kind: 'repair', ...common, repairCycle: (e.repairCycles || 0) + 1, toHead: event.toHead,
      reviewer: event.reviewer, result: event.result, ...(event.execution ? { execution: structuredClone(event.execution) } : {}) };
  }
  if (event.kind === 'ci') {
    if (!['source', 'report', 'post-merge'].includes(event.phase) || !sha(event.head) ||
      !Number.isSafeInteger(event.runId) || event.runId < 1 || !Number.isSafeInteger(event.runAttempt) || event.runAttempt < 1 ||
      !['queued', 'in_progress', 'completed'].includes(event.status) ||
      !(event.conclusion == null || ['success', 'failure', 'cancelled', 'timed_out', 'neutral', 'skipped', 'action_required', 'stale', 'startup_failure'].includes(event.conclusion)) ||
      (event.status === 'completed' && !text(event.conclusion)) || (event.status !== 'completed' && event.conclusion != null) ||
      (event.phase === 'source' && event.head !== e.sourceHead)) throw Error('Invalid CI stage');
    return { kind: 'ci', ...common, phase: event.phase, head: event.head, runId: event.runId, runAttempt: event.runAttempt,
      status: event.status, conclusion: event.conclusion ?? null };
  }
  throw Error('Unknown stage event');
}

function readStages(directory, e) {
  identity(e);
  const file = path.join(directory, `pr-${e.pr}.jsonl`);
  if (!fs.existsSync(file)) return [];
  if (!fs.lstatSync(file).isFile()) throw Error('Stage journal must be a regular file');
  const bytes = fs.readFileSync(file, 'utf8');
  if (bytes && !bytes.endsWith('\n')) throw Error('Incomplete stage journal');
  let previousHash = null;
  return bytes.split('\n').filter(Boolean).map(line => {
    const entry = JSON.parse(line), { hash, ...payload } = entry;
    if (entry.repository !== e.repository || entry.pr !== e.pr) throw Error('Stage journal identity mismatch');
    if (entry.previousHash !== previousHash || digest(payload) !== hash) throw Error('Stage journal integrity mismatch');
    previousHash = hash;
    return entry;
  });
}

function recordStage(directory, e, decision, event, now = new Date()) {
  identity(e);
  const value = event ? eventStage(e, event) : reviewStage(e, decision);
  if (!path.isAbsolute(directory)) throw Error('Stage journal directory must be absolute');
  fs.mkdirSync(directory, { recursive: true });
  const lock = path.join(directory, `pr-${e.pr}.lock`), lockFd = fs.openSync(lock, 'wx');
  try {
    const entries = readStages(directory, e), contentHash = digest(value);
    if (entries.at(-1)?.contentHash === contentHash) return entries;
    const payload = { ...value, recordedAt: now.toISOString(), previousHash: entries.at(-1)?.hash || null, contentHash };
    const entry = { ...payload, hash: digest(payload) };
    const fd = fs.openSync(path.join(directory, `pr-${e.pr}.jsonl`), 'a');
    try { fs.writeFileSync(fd, JSON.stringify(entry) + '\n'); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    return [...entries, entry];
  } finally { fs.closeSync(lockFd); fs.unlinkSync(lock); }
}

function stagesMarkdown(stages) {
  let output = '\n## Assessment stages\n\nHistorical results describe their recorded source/base/policy; they do not approve the current source.\n';
  if (stages[0]?.kind === 'review' && stages[0].repairCycles > 0)
    output += '\nEarlier stages were not recorded by this installation; no earlier crew or outcome is inferred.\n';
  let reviews = 0;
  for (const [index, stage] of stages.entries()) {
    const title = stage.kind === 'review' ? stage.repairCycles ? `Review after repair ${stage.repairCycles}` : reviews ? 'Reassessment' : 'Initial review' :
      stage.kind === 'repair' ? `Repair ${stage.repairCycle}` : `${stage.phase} CI`;
    output += `\n### Stage ${index + 1} — ${title}\n\nRecorded: ${clean(stage.recordedAt || 'Not recorded')}\n\n` +
      `Source: \`${stage.sourceHead}\`; base: \`${stage.base}\`; policy: \`${clean(stage.policyHash)}\`.\n\n`;
    if (stage.kind === 'review') {
      reviews++;
      output += `Route: ${clean(stage.routing.route || 'full')}. Result: ${result(stage.decision)}. ${clean(stage.routing.summary)}\n\n` +
        (stage.routing.changeKind ? `Change kind: ${clean(stage.routing.changeKind)}. ${clean(stage.routing.sizeRationale)}\n\n` : '') +
        `Selected specialists: ${stage.crew.selected.map(m => `${clean(m.id)} ${clean(m.version)}`).join(', ') || 'None'}.\n\n` +
        `Omitted specialists: ${stage.crew.omitted.map(m => clean(m.id)).join(', ') || 'None'}.\n\n` +
        (stage.crew.selectionHash ? `MARC commit: \`${clean(stage.crew.toolCommit)}\`; selection: \`${clean(stage.crew.selectionHash)}\`.\n\n` : '') +
        '| Specialist | Selection | Reason |\n| --- | --- | --- |\n' +
        [...stage.crew.selected.map(m => ({ ...m, status: 'Selected' })), ...stage.crew.omitted.map(m => ({ ...m, status: 'Omitted' }))]
          .map(m => `| ${clean(m.id)} | ${m.status} | ${clean((m.reasons || []).join(' '))} |`).join('\n') + '\n\n' +
        `Source CI: ${clean(stage.ci.verdict || 'unavailable')}; run ${clean(stage.ci.runId)}, attempt ${clean(stage.ci.runAttempt)}. ${clean(stage.ci.runUrl)}\n\n` +
        (stage.projectChanges.length ? '| Project file | Classification | Reason |\n| --- | --- | --- |\n' +
          stage.projectChanges.map(p => `| ${clean(p.file)} | ${clean(p.classification)} | ${clean(p.reason)} |`).join('\n') + '\n\n' : '') +
        '| Gate | Result | Reviewer | Summary |\n| --- | --- | --- | --- |\n' +
        Object.entries(stage.gates).map(([name, g]) => `| ${clean(name)} | ${clean(g.verdict)} | ${clean(g.reviewer)} | ${clean(g.summary)} |`).join('\n') + '\n' +
        stage.decision.reasons.map(reason => `\n- ${clean(reason)}`).join('') +
        agentTable({ ...stage, repairExecutions: [] }).replace('## Crew used', '#### Crew used');
    } else if (stage.kind === 'repair') {
      output += `Result: ${stage.result}; repaired head: \`${stage.toHead}\`. ${clean(stage.summary)}\n` +
        agentTable({ gates: { repair: { reviewer: stage.reviewer, execution: stage.execution } } }).replace('## Crew used', '#### Crew used');
    } else output += `Run ${stage.runId}, attempt ${stage.runAttempt}, head \`${stage.head}\`: ${stage.status}/${stage.conclusion || 'pending'}. ${clean(stage.summary)}\n`;
  }
  return output;
}

module.exports = { recordStage, readStages, reviewStage, stagesMarkdown };
