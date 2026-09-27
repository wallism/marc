// PR prose is assessment input, never instructions or authorization.
const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const text = value => typeof value === 'string' && value.trim().length > 0;

function captureIntent(body) {
  const entries = [];
  let fence = null, paragraph = null, comment = false;
  const finish = () => { if (paragraph !== null) entries.push(paragraph.join(' ').trim()); paragraph = null; };
  for (const raw of String(body ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const marker = raw.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && /^ {0,3}(?:`+|~+)\s*$/.test(raw)) fence = null;
      continue;
    }
    if (!comment && marker) { finish(); fence = marker[1]; continue; }
    // Ignore fenced examples, HTML comments and quoted replies. Only a top-level
    // literal INTENT: paragraph is the contract; formatting inside it is data.
    let line = '';
    for (let i = 0; i < raw.length;) {
      if (comment) { const end = raw.indexOf('-->', i); if (end < 0) break; comment = false; i = end + 3; }
      else { const start = raw.indexOf('<!--', i); if (start < 0) { line += raw.slice(i); break; }
        line += raw.slice(i, start); comment = true; i = start + 4; }
    }
    const start = line.match(/^ {0,3}INTENT:[ \t]*(.*)$/);
    if (start) { finish(); paragraph = [start[1].trim()]; }
    else if (!line.trim() || /^\s*(?:>|#|[-*+]\s|\d+[.)]\s)/.test(line) || /^(?: {4}|\t)/.test(line)) finish();
    else if (paragraph !== null) paragraph.push(line.trim());
  }
  finish();
  const status = entries.length === 0 ? 'absent' : entries.length !== 1 || !entries[0] ? 'invalid' : 'present';
  return { schema: 1, status, text: status === 'present' ? entries[0] : null, entries,
    hash: hash({ status, entries }) };
}

function validIntent(intent) {
  if (!intent || intent.schema !== 1 || !Array.isArray(intent.entries) || !intent.entries.every(x => typeof x === 'string')) return false;
  const status = intent.entries.length === 0 ? 'absent' : intent.entries.length !== 1 || !intent.entries[0] ? 'invalid' : 'present';
  return intent.status === status && intent.text === (status === 'present' ? intent.entries[0] : null) &&
    intent.hash === hash({ status, entries: intent.entries });
}

function combinedIntent(e) {
  return e.intentReview === 'correctness-v1' && e.routing?.route !== 'simple';
}
function intentGate(e) {
  if (!combinedIntent(e)) return e.gates?.intent;
  const parent = e.gates?.correctness, detail = parent?.intent;
  return detail && { ...detail, sourceHead: parent.sourceHead, base: parent.base, policyHash: parent.policyHash,
    reviewer: parent.reviewer };
}
function intentReasons(e, required = false) {
  const intent = e.intent, gate = intentGate(e);
  if (combinedIntent(e) && e.gates?.intent) return ['intent: combined review cannot also claim a separate intent session'];
  if (!combinedIntent(e) && e.gates?.correctness?.intent) return ['intent: nested assessment requires combined policy'];
  if (!intent && !required && !gate) return []; // Legacy evidence has no intent contract.
  if (!validIntent(intent)) return ['intent: missing or invalid capture; capture or refresh intent'];
  if (intent.status === 'absent') return gate ? ['intent: unexpected assessment without captured intent'] : [];
  if (intent.status === 'invalid') return ['intent: human clarification required for empty or duplicate INTENT paragraphs'];
  const reasons = [];
  if (!gate || gate.intentHash !== intent.hash || gate.sourceHead !== e.sourceHead || gate.base !== e.base ||
      gate.policyHash !== e.policyHash || gate.assessment !== 'aligned' || gate.verdict !== 'pass')
    reasons.push('intent: human action required or assessment missing/stale; refresh the assigned intent review when code identity is unchanged');
  if (combinedIntent(e) && (!text(gate?.summary) || !Array.isArray(gate?.evidence) || !gate.evidence.length || !gate.evidence.every(text) ||
      !Array.isArray(gate?.findings) || gate.findings.some(f => f.severity !== 'advisory') ||
      ['reviewer', 'execution', 'sourceHead', 'base', 'policyHash'].some(k => Object.hasOwn(e.gates?.correctness?.intent || {}, k))))
    reasons.push('intent: invalid combined result or duplicate session attribution');
  if (!['high', 'medium', 'low'].includes(gate?.confidence) || !text(gate?.confidenceReason) || gate?.method !== 'static-code' ||
      !Array.isArray(gate?.unresolvedOutcomes) || gate.unresolvedOutcomes.length || gate.suggestedRepair !== undefined || gate.requiresBrowser === true)
    reasons.push('intent: sufficient static evidence and resolved outcomes required; confidence alone cannot approve');
  const sessions = [e.coordinator, e.routing?.reviewer, ...(e.repairReviewers || []),
    ...Object.entries(e.gates || {}).filter(([name]) => name !== (combinedIntent(e) ? 'correctness' : 'intent')).map(([, result]) => result.reviewer)].filter(Boolean);
  if (!text(gate?.reviewer) || sessions.includes(gate.reviewer)) reasons.push('intent: independent fresh reviewer required');
  return reasons;
}

function refreshIntent(e, live, policyHash) {
  if (e.policyHash !== policyHash) throw Error('Policy changed; recapture and review');
  if (live.user.login !== e.author || live.head.ref !== e.branch || live.base.ref !== e.target ||
      live.head.repo?.full_name !== e.headRepository) throw Error('PR origin changed; recapture and review');
  const intent = captureIntent(live.body);
  if (validIntent(e.intent) && e.intent.hash === intent.hash) return structuredClone(e);
  const result = structuredClone(e);
  result.intent = intent;
  result.gates ||= {};
  delete result.gates.intent;
  // Intent is part of the single correctness decision: refresh that whole session.
  if (combinedIntent(e)) delete result.gates.correctness;
  // Old reports and journals stay immutable. A fresh report describes the new intent.
  for (const key of ['reportCreatedAt', 'reportFormat', 'auditFormat', 'reportCiReuse', 'humanApprovalAudit', 'stages']) delete result[key];
  return result;
}

const clean = (value, maximum = 360) => {
  const result = String(value ?? '').replace(/[\r\n|<>]/g, ' ').replace(/[`*_[\]\\]/g, '');
  return result.length > maximum ? result.slice(0, maximum) + '…' : result;
};
function intentMarkdown(e) {
  if (!e.intent || e.intent.status === 'absent') return '';
  const gate = intentGate(e), held = intentReasons(e).length > 0 || gate?.verdict !== 'pass';
  return '\n## Intent assessment\n\n' +
    (held ? '**Human action required:** clarify the intent or review the suggested repair below. No intent-related repair is authorized automatically.\n\n' : '') +
    (combinedIntent(e) ? 'Correctness and intent were assessed in one independent reviewer session.\n\n' : '') +
    `INTENT: ${clean(e.intent.text || '(empty or duplicate; clarification required)', 600)}\n\n` +
    `Static code assessment: **${clean(gate?.assessment || 'unclear', 40)}**. Confidence: ${clean(gate?.confidence || 'not assessed', 20)}. ${clean(gate?.confidenceReason)}\n\n` +
    (gate?.summary ? `${clean(gate.summary)}\n\n` : '') +
    (gate?.suggestedRepair ? `**Suggested repair (approval required):** ${clean(gate.suggestedRepair.change)} **Reason:** ${clean(gate.suggestedRepair.reason)}\n\n` : '') +
    (gate?.unresolvedOutcomes?.length ? `Unresolved: ${gate.unresolvedOutcomes.slice(0, 3).map(x => clean(x, 160)).join('; ')}.\n\n` : '') +
    (gate?.evidence?.length ? `Evidence: ${gate.evidence.slice(0, 3).map(x => clean(x, 160)).join('; ')}. Full evidence is in the adjacent audit JSON.\n\n` : '') +
    'This assesses alignment from code; it is not runtime proof.\n\n';
}

module.exports = { combinedIntent, intentGate, captureIntent, validIntent, intentReasons, refreshIntent, intentMarkdown };
