// Deterministic assessment plumbing. No publication, repair, recovery or merge authority.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const text = x => typeof x === 'string' && x.trim().length > 0;
const encode = x => JSON.stringify(x, null, 2) + '\n';
const identity = e => [e.repository, e.pr, e.sourceHead, e.base, e.policyHash, e.crew?.selectionHash, e.intent?.hash];

function assemble(evidence, results) {
  const e = structuredClone(evidence), sessions = new Set([e.coordinator, e.routing?.reviewer, ...(e.repairReviewers || [])].filter(Boolean));
  for (const [name, gate] of Object.entries(results)) {
    if (!/^(security|correctness|code-quality|test-integrity|simple-tests|intent|browser|crew:[a-z][a-z0-9-]*)$/.test(name) ||
        !gate || !['pass', 'repair', 'human-required', 'blocked'].includes(gate.verdict) || !text(gate.reviewer) ||
        !text(gate.summary) || !Array.isArray(gate.findings) || !Array.isArray(gate.evidence) || !gate.evidence.length ||
        !gate.evidence.every(text) || ['sourceHead', 'base', 'policyHash'].some(k => gate[k] !== e[k]))
      throw Error(`Invalid or stale gate: ${name}`);
    const old = e.gates?.[name];
    if (old?.reviewer && encode(old) !== encode(gate)) throw Error(`Preserve existing result: ${name}; resolve through a new assessment`);
    const member = e.crew?.selected.find(m => name === 'crew:' + m.id);
    if (name.startsWith('crew:') && (!member || gate.memberVersion !== member.version ||
        gate.memberHash !== member.contentHash || gate.selectionHash !== e.crew.selectionHash)) throw Error('Stale specialist selection');
    if (name === 'intent' && gate.intentHash !== e.intent?.hash) throw Error('Stale intent result');
    e.gates ||= {}; e.gates[name] = structuredClone(gate);
  }
  for (const [name, gate] of Object.entries(e.gates || {})) {
    if (!gate.reviewer) continue;
    if (sessions.has(gate.reviewer)) throw Error(`Independent session required: ${name}`);
    sessions.add(gate.reviewer);
  }
  return e;
}

// Strict small XML reader for JUnit. Reject unsupported declarations rather than
// resolving entities, running a parser hook, or treating malformed input as green.
function junit(xml) {
  if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);)/.test(xml.replace(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g, '')))
    throw Error('Invalid XML entity');
  const stack = []; let root, tests = 0, skipped = 0, failures = 0;
  const tokens = xml.match(/<\?xml[^?]*\?>|<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]*>|[^<]+/g) || [];
  if (tokens.join('') !== xml) throw Error('Malformed JUnit XML');
  for (const token of tokens) {
    if (token.startsWith('<?xml') || token.startsWith('<!--')) continue;
    if (token.startsWith('<![CDATA[')) { if (!stack.length) throw Error('Malformed JUnit text'); continue; }
    if (!token.startsWith('<')) { if (!stack.length && token.trim()) throw Error('Malformed JUnit text'); continue; }
    const close = token.match(/^<\/([\w.-]+)\s*>$/);
    if (close) { if (stack.pop() !== close[1]) throw Error('Malformed JUnit nesting'); continue; }
    const open = token.match(/^<([\w.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>$/);
    if (!open) throw Error('Unsupported or malformed JUnit XML');
    const [, name, attrs, self] = open;
    if (!stack.length) { if (root || !['testsuite', 'testsuites'].includes(name)) throw Error('Invalid JUnit root'); root = name; }
    if (name === 'testcase') { if (!stack.includes('testsuite') && !stack.includes('testsuites')) throw Error('Invalid testcase'); tests++; }
    if (name === 'failure' || name === 'error') failures++;
    if (name === 'skipped') skipped++;
    for (const m of attrs.matchAll(/\b(failures|errors)\s*=\s*["']([^"']*)["']/g)) {
      if (!/^\d+$/.test(m[2])) throw Error('Invalid JUnit failure count');
      failures += Number(m[2]);
    }
    if (!self) stack.push(name);
  }
  if (!root || stack.length || !tests || failures) throw Error('Empty, failing or malformed JUnit evidence');
  return { tests, skipped };
}

function inspectArtifacts(directory, required) {
  const records = [];
  function walk(folder) {
    if (!fs.lstatSync(folder).isDirectory() || fs.lstatSync(folder).isSymbolicLink()) throw Error('Artifact directory must be regular');
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isSymbolicLink()) throw Error('Artifact symlink rejected');
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) {
        const bytes = fs.readFileSync(file), relative = path.relative(directory, file).replaceAll('\\', '/');
        let facts;
        if (/\.xml$/i.test(file)) facts = junit(bytes.toString('utf8'));
        else if (/\.json$/i.test(file)) {
          const scan = JSON.parse(bytes);
          if (!text(scan.scanner) || scan.verdict !== 'pass' || !Array.isArray(scan.findings) || scan.findings.length)
            throw Error('Missing or failing sanitized scan evidence');
          facts = { scanner: scan.scanner, findings: 0 };
        } else throw Error('Unsupported artifact format; retain manual specialist inspection: ' + relative);
        records.push({ file: relative, sha256: hash(bytes), ...facts });
      } else throw Error('Nonregular artifact');
    }
  }
  for (const name of required) {
    if (!/^[\w.-]+$/.test(name) || name === '.' || name === '..') throw Error('Invalid artifact name');
    const count = records.length; walk(path.join(directory, name));
    if (records.length === count) throw Error('Empty required artifact: ' + name);
  }
  return records;
}

function atomicJson(file, value) {
  const temp = file + '.pending';
  // Recovery may overwrite only this operation's temporary output, never its ledger.
  fs.writeFileSync(temp, encode(value)); fs.renameSync(temp, file);
}

function advance(e, request, io) {
  if (!text(request.runId) || !text(request.coordinator) || request.coordinator !== e.coordinator)
    throw Error('Run and Captain identity required');
  io.verifyOwner(request); // Shared run lock plus per-operation lock are owned by the caller.
  io.verifyLive(e); // Always live, including unchanged status and resumed runs.
  const prior = io.readState();
  if (prior && encode(prior.identity) !== encode(identity(e))) throw Error('Source/base/policy/selection/intent drift; recapture');
  const updated = assemble(e, io.readResults(request.gateFiles || {}));
  const collectedCi = io.collectCi(e);
  updated.ci = collectedCi;
  let artifacts = [], artifactError;
  if (updated.ci.verdict === 'pass') {
    try { artifacts = io.artifacts(updated.ci); }
    catch (error) { artifactError = error.message; updated.ci = { ...updated.ci, verdict: 'blocked', status: 'incomplete', reason: artifactError }; }
  }
  io.verifyLive(updated); // Drift during download/collection cannot commit a current checkpoint.
  const latestCi = io.collectCi(e);
  if (encode(latestCi) !== encode(collectedCi)) throw Error('CI changed during collection; retry with current evidence');
  io.verifyOwner(request);
  const decision = io.decide(updated);
  const facts = { ci: updated.ci, artifacts, ...(artifactError ? { artifactError } : {}),
    gates: Object.fromEntries(Object.entries(updated.gates || {}).map(([k, g]) => [k, { verdict: g.verdict, reviewer: g.reviewer }])), decision };
  const fingerprint = hash(encode(facts)), changed = prior?.fingerprint !== fingerprint;
  io.saveEvidence(updated);
  if (changed) io.checkpoint(updated, decision);
  io.saveState({ schema: 1, runId: request.runId, identity: identity(updated), fingerprint, facts,
    repairCycles: updated.repairCycles, repairReviewers: updated.repairReviewers, repairExecutions: updated.repairExecutions });
  return { changed, status: updated.ci.status === 'pending' ? 'pending-ci' : decision.eligible ? 'assessment-ready' : 'held',
    ...(changed ? { reasons: decision.reasons, artifactError } : {}), paths: io.paths,
    next: updated.ci.status === 'pending' ? 'Wait for this existing CI run; do not dispatch another.' :
      'Inspect held reasons or continue normal guarded publication; this status never authorizes a merge.' };
}

async function waitForChange(observe, { waitMs = 0, intervalMs = 5000, now = Date.now,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  if (!Number.isInteger(waitMs) || waitMs < 0 || waitMs > 60000 || !Number.isInteger(intervalMs) || intervalMs < 1)
    throw Error('Bounded wait must be between 0 and 60000ms');
  const deadline = now() + waitMs;
  for (;;) {
    const status = await observe();
    if (status.changed || status.status !== 'pending-ci' || now() >= deadline) return status;
    await sleep(Math.min(intervalMs, deadline - now()));
  }
}
module.exports = { assemble, junit, inspectArtifacts, atomicJson, advance, waitForChange, identity };
