const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const text = x => typeof x === 'string' && x.trim() === x && x.length > 0 && !/[\r\n\t]/.test(x);
const fields = ['model', 'reasoningEffort'];
function validateAgentSettings(config, members) {
  if (config === undefined) return;
  if (!object(config) || Object.keys(config).some(k => !['defaults', 'members'].includes(k))) throw Error('Invalid agents configuration');
  const validate = settings => {
    if (!object(settings) || Object.keys(settings).some(k => !fields.includes(k) || !text(settings[k])))
      throw Error('Invalid agent model/reasoning settings');
  };
  if (config.defaults !== undefined) validate(config.defaults);
  if (config.members !== undefined) {
    if (!object(config.members)) throw Error('Invalid agent members');
    for (const [id, settings] of Object.entries(config.members)) {
      if (!members.includes(id)) throw Error(`Unknown agent member: ${id}`);
      validate(settings);
    }
  }
}
function resolveAgentSettings(config, member) {
  const id = member.replace(/^crew:/, '');
  const result = Object.fromEntries(fields.map(field => {
    const own = config?.members?.[id]?.[field], fallback = config?.defaults?.[field];
    return [field, own !== undefined ? { source: 'member', value: own } :
      fallback !== undefined ? { source: 'default', value: fallback } : { source: 'captain', value: null }];
  }));
  // An explicitly selected model may not support the Captain's reasoning level.
  if (result.model.value !== null && result.reasoningEffort.value === null)
    result.reasoningEffort.source = 'model-default';
  return result;
}
function executionReasons(config, member, execution) {
  const expected = resolveAgentSettings(config, member), reasons = [];
  if (execution?.applied !== true || !text(execution?.evidence)) reasons.push(`${member}: agent settings application evidence missing`);
  for (const field of fields) {
    const selected = execution?.settings?.[field], actual = execution?.actual?.[field];
    if (selected?.source !== expected[field].source || selected?.value !== expected[field].value)
      reasons.push(`${member}: stale ${field} selection`);
    if (actual !== undefined && !text(actual)) reasons.push(`${member}: invalid actual ${field}`);
    if (expected[field].value !== null && actual !== undefined && actual !== expected[field].value)
      reasons.push(`${member}: harness substituted ${field}`);
    const captain = execution?.captain?.[field];
    if (captain !== undefined && !text(captain)) reasons.push(`${member}: invalid Captain ${field}`);
    if (expected[field].source === 'captain' && captain !== undefined && actual !== undefined && actual !== captain)
      reasons.push(`${member}: harness did not inherit Captain ${field}`);
  }
  return reasons;
}
function agentTable(e) {
  const rows = [ ...(e.routing?.reviewer ? [['simplicity', e.routing]] : []),
    ...Object.entries(e.gates || {}).filter(([, g]) => g.reviewer),
    ...(Array.isArray(e.repairExecutions) ? e.repairExecutions : []).filter(Boolean).map(r => ['repair', r]) ];
  const clean = x => String(x ?? '').replace(/[\r\n|<>]/g, ' ').replace(/[`*_[\]]/g, '');
  const label = (execution, field) => {
    if (execution?.applied !== true || !text(execution?.evidence)) return 'Not recorded / not confirmed';
    const setting = execution.settings?.[field], actual = execution.actual?.[field];
    if (!setting) return 'Not recorded';
    if (setting.source === 'captain') {
      const captain = execution.captain?.[field];
      if (actual && captain && actual !== captain) return `${actual} (Captain: ${captain}; MISMATCH)`;
      return `${field === 'model' ? 'Same model' : 'Same reasoning effort'} (Captain)${actual ? `: ${actual}` : ''}`;
    }
    const source = { member: 'member override', default: 'configured default', 'model-default': 'model default' }[setting.source];
    if (!source) return 'Not recorded';
    if (actual && setting.value && actual !== setting.value) return `${actual} (requested ${setting.value}; ${source}; MISMATCH)`;
    if (actual && actual === execution.captain?.[field])
      return `${field === 'model' ? 'Same model' : 'Same reasoning effort'} (Captain): ${actual} (${source})`;
    return actual ? `${actual} (${source})` : setting.value ? `${setting.value} (${source}; requested, actual not exposed)` : 'Model default (actual not exposed)';
  };
  return '\n\n## Crew used\n\n| Member | Session | Model | Reasoning effort |\n| --- | --- | --- | --- |\n' +
    rows.map(([name, run]) => `| ${clean(name)} | ${clean(run.reviewer)} | ${clean(label(run.execution, 'model'))} | ${clean(label(run.execution, 'reasoningEffort'))} |`).join('\n') +
    (rows.length ? '\n' : '\nNo crew sessions recorded.\n');
}
module.exports = { validateAgentSettings, resolveAgentSettings, executionReasons, agentTable };
