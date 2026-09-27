// Risk rating evidence. Ratings currently only harden decisions; no level relaxes a gate.
const text = x => typeof x === 'string' && x.trim().length > 0;
const strings = x => Array.isArray(x) && x.every(text);
const LEVELS = ['low', 'medium', 'high'];
const POSITION = { leaf: 'low', branch: 'medium', trunk: 'high' };
const REVERSIBILITY = { gated: 'low', revertible: 'low', 'one-way': 'high' };
const rank = level => LEVELS.indexOf(level);

function validateRiskPolicy(policy) {
  if (policy.riskAssessment !== undefined && policy.riskAssessment !== 1) throw Error('riskAssessment must be 1 when set');
  if (policy.riskTrunkPatterns !== undefined) {
    if (!strings(policy.riskTrunkPatterns)) throw Error('riskTrunkPatterns must be non-empty strings');
    for (const pattern of policy.riskTrunkPatterns) new RegExp(pattern);
  }
}

const declaredTrunk = (files, p) => files.filter(f => (p.riskTrunkPatterns || []).some(r => new RegExp(r, 'i').test(f)));

function validRisk(r, e) {
  return r && typeof r === 'object' && LEVELS.includes(r.level) && Object.hasOwn(POSITION, r.position) &&
    Object.hasOwn(REVERSIBILITY, r.reversibility) && ['sourceHead', 'base', 'policyHash'].every(k => r[k] === e[k]) &&
    text(r.reviewer) && text(r.summary) && Array.isArray(r.evidence) && r.evidence.length > 0 && strings(r.evidence) &&
    strings(r.triggers) && strings(r.unknowns);
}

// Hold reasons for an enabled policy. `policyHash` is the trusted digest, not the candidate's claim.
function riskReasons(e, p, policyHash) {
  if (p.riskAssessment !== 1) return [];
  const r = e.risk;
  if (!validRisk(r, { ...e, policyHash })) return ['Risk assessment missing, stale or invalid'];
  const reasons = [];
  const floor = Math.max(rank(POSITION[r.position]), rank(REVERSIBILITY[r.reversibility]), r.unknowns.length ? 1 : 0);
  if (rank(r.level) < floor) reasons.push('Risk level below its recorded position, reversibility or unknowns');
  const trunk = declaredTrunk(Array.isArray(e.files) ? e.files : [], p);
  if (trunk.length && r.level !== 'high') reasons.push(`Declared trunk changed (${trunk.join(', ')}); risk must be high`);
  if (r.level === 'high' && e.routing?.route === 'simple') reasons.push('High risk requires full review');
  if (r.level === 'low' && Array.isArray(e.routing?.risks) && e.routing.risks.length)
    reasons.push('Low risk contradicts routing risks; reassess');
  const others = [e.coordinator, e.routing?.reviewer, ...(e.repairReviewers || []),
    ...Object.values(e.gates || {}).map(g => g?.reviewer)].filter(Boolean);
  if (others.includes(r.reviewer)) reasons.push('Risk assessment requires its own independent session');
  return reasons;
}

function riskLine(r) {
  if (!r?.level) return '';
  const clean = x => String(x ?? '').replace(/[\r\n|]/g, ' ');
  return `Risk: ${clean(r.level)} (${clean(r.position)}, ${clean(r.reversibility)}) — ${clean(r.summary)}` +
    (r.triggers?.length ? ` Triggers: ${r.triggers.map(clean).join('; ')}.` : '') +
    (r.unknowns?.length ? ` Unknowns: ${r.unknowns.map(clean).join('; ')}.` : '') + '\n\n';
}

module.exports = { LEVELS, validateRiskPolicy, validRisk, riskReasons, riskLine, declaredTrunk };
