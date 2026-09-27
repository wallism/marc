// Codex JSONL accounting: response records only, never cumulative token_count events.
function codexUsage(records, { threadId, turnId, since, until } = {}) {
  if (!threadId) throw Error('Exact host thread identity required');
  const seen = new Map(), missing = new Set(), totals = { calls: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };
  let duplicates = 0;
  for (const record of records) {
    const p = record.payload;
    if (record.type !== 'token_usage_record' || p?.thread_id !== threadId || turnId && p.turn_id !== turnId ||
        since && record.timestamp < since || until && record.timestamp >= until) continue;
    if (typeof p.response_id !== 'string' || !p.response_id) { missing.add('response identity'); continue; }
    const bytes = JSON.stringify(p.usage);
    if (seen.has(p.response_id)) {
      if (seen.get(p.response_id) !== bytes) throw Error('Conflicting usage for one response');
      duplicates++; continue;
    }
    seen.set(p.response_id, bytes); totals.calls++;
    for (const [host, field] of [['input_tokens', 'inputTokens'], ['cached_input_tokens', 'cachedInputTokens'], ['output_tokens', 'outputTokens']]) {
      if (!Number.isSafeInteger(p.usage?.[host]) || p.usage[host] < 0) missing.add(field);
      else totals[field] += p.usage[host];
    }
    if (Number.isSafeInteger(p.usage?.cached_input_tokens) && p.usage.cached_input_tokens > p.usage.input_tokens)
      throw Error('Cached input exceeds inclusive input');
  }
  if (!totals.calls) missing.add('session telemetry');
  for (const field of missing) if (field in totals) delete totals[field];
  return { threadId, ...(turnId ? { turnId } : {}), ...totals,
    ...(totals.inputTokens !== undefined && totals.cachedInputTokens !== undefined ? { uncachedInputTokens: totals.inputTokens - totals.cachedInputTokens } : {}),
    duplicates, missing: [...missing], semantics: 'inputTokens includes cachedInputTokens; output includes reasoning. No allowance or money conversion.' };
}
module.exports = { codexUsage };

// A manifest enumerates every observed turn, including approval continuations.
// Missing telemetry is represented by null totals, never by a guessed zero.
const counts = ['calls', 'inputTokens', 'cachedInputTokens', 'uncachedInputTokens', 'outputTokens', 'retries'];
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
function assessmentUsage(manifest, readRecords) {
  if (manifest?.schema !== 1 || !manifest.identity || !['repository', 'sourceHead', 'base', 'policyHash', 'toolCommit'].every(k =>
    typeof manifest.identity[k] === 'string' && manifest.identity[k]) || !Array.isArray(manifest.sessions) || !manifest.sessions.length)
    throw Error('Assessment identity and explicit session manifest required');
  const weights = manifest.weights;
  if (weights !== undefined && (!['uncachedInput', 'cachedInput', 'output'].every(k => Number.isFinite(weights[k]) && weights[k] >= 0) ||
      typeof weights.source !== 'string' || !weights.source.trim())) throw Error('Weights need nonnegative uncachedInput, cachedInput, output and a source');
  const claimed = new Set(), windows = new Map(), sessions = [];
  for (const entry of manifest.sessions) {
    if (!['captain', 'reviewer', 'repair'].includes(entry.role) || !entry.phase || !entry.threadId || !entry.turnId ||
        entry.since !== undefined && !date(entry.since) || entry.until !== undefined && !date(entry.until) ||
        entry.since && entry.until && Date.parse(entry.since) >= Date.parse(entry.until)) throw Error('Invalid session attribution');
    const key = entry.threadId + ':' + entry.turnId;
    const interval = [entry.since ? Date.parse(entry.since) : -Infinity, entry.until ? Date.parse(entry.until) : Infinity];
    if ((windows.get(key) || []).some(([a, b]) => interval[0] < b && interval[1] > a)) throw Error('Overlapping session attribution');
    windows.set(key, [...(windows.get(key) || []), interval]);
    const records = readRecords(entry);
    if (!Array.isArray(records)) throw Error('Records must be an array');
    const metas = records.filter(r => r.type === 'session_meta');
    if (metas.some(r => r.payload?.id !== entry.threadId)) throw Error('Transcript belongs to another session');
    const selected = records.filter(r => r.type === 'token_usage_record' && r.payload?.thread_id === entry.threadId &&
      r.payload.turn_id === entry.turnId && (!entry.since || Date.parse(r.timestamp) >= interval[0]) && (!entry.until || Date.parse(r.timestamp) < interval[1]));
    for (const response of new Set(selected.map(r => r.payload.response_id).filter(Boolean))) {
      if (claimed.has(response)) throw Error('Response counted in multiple sessions');
      claimed.add(response);
    }
    const usage = codexUsage(selected, { threadId: entry.threadId, turnId: entry.turnId });
    if (!usage.calls) for (const k of counts) usage[k] = null;
    if (usage.missing.includes('response identity')) for (const k of counts) usage[k] = null;
    const settings = [...new Map(records.filter(r => r.type === 'turn_context' && r.payload?.turn_id === entry.turnId)
      .map(r => ({ model: r.payload.model ?? null, reasoningEffort: r.payload.effort ?? null }))
      .map(s => [JSON.stringify(s), s])).values()];
    const missing = [...usage.missing];
    if (!settings.length || settings.some(s => !s.model || !s.reasoningEffort)) missing.push('model/settings');
    let retries = null;
    if (entry.retries !== undefined) {
      if (!Number.isSafeInteger(entry.retries.count) || entry.retries.count < 0 || typeof entry.retries.evidence !== 'string' || !entry.retries.evidence.trim())
        throw Error('Retry counts require observed evidence');
      retries = entry.retries.count;
    } else missing.push('retries');
    const latencyMs = date(entry.startedAt) && date(entry.completedAt) ? Date.parse(entry.completedAt) - Date.parse(entry.startedAt) : null;
    if (latencyMs !== null && latencyMs < 0) throw Error('Negative session latency');
    if (latencyMs === null) missing.push('latency');
    sessions.push({ ...entry, ...usage, retries, settings, latencyMs, missing: [...new Set(missing)] });
  }
  const aggregate = entries => ({ sessions: entries.length, ...Object.fromEntries(counts.map(k => [k,
    entries.every(e => Number.isSafeInteger(e[k]) && e[k] >= 0) ? entries.reduce((n, e) => n + e[k], 0) : null])),
    missingSessions: entries.filter(e => e.missing.length).length,
    missingUsageSessions: entries.filter(e => counts.slice(0, -1).some(k => !Number.isSafeInteger(e[k]))).length,
    missingRetrySessions: entries.filter(e => e.retries === null).length,
    missingSettingsSessions: entries.filter(e => e.missing.includes('model/settings')).length,
    missing: [...new Set(entries.flatMap(e => e.missing))],
    sessionTimeMs: entries.every(e => e.latencyMs !== null) ? entries.reduce((n, e) => n + e.latencyMs, 0) : null });
  // Calls x mean context explains most assessment cost; weights come only from the manifest.
  const known = x => Number.isSafeInteger(x) && x >= 0;
  const derived = totals => ({ ...totals,
    meanContextTokens: totals.calls > 0 && known(totals.inputTokens) ? Math.round(totals.inputTokens / totals.calls) : null,
    weightedTokens: weights && ['uncachedInputTokens', 'cachedInputTokens', 'outputTokens'].every(k => known(totals[k]))
      ? Math.round(totals.uncachedInputTokens * weights.uncachedInput + totals.cachedInputTokens * weights.cachedInput + totals.outputTokens * weights.output) : null });
  for (const s of sessions) Object.assign(s, derived(s));
  const group = field => Object.fromEntries([...new Set(sessions.map(s => s[field]))].map(value => [value, derived(aggregate(sessions.filter(s => s[field] === value)))]));
  return { schema: 1, identity: manifest.identity, coverage: manifest.coverage || 'Not declared; completeness unverified',
    weights: weights || null, sessions, phases: group('phase'), roles: group('role'), total: derived(aggregate(sessions)),
    wallTimeMs: date(manifest.startedAt) && date(manifest.completedAt) && Date.parse(manifest.completedAt) >= Date.parse(manifest.startedAt)
      ? Date.parse(manifest.completedAt) - Date.parse(manifest.startedAt) : null,
    semantics: 'Input includes cache; output includes reasoning. Session time is summed and may overlap; wall time is elapsed. Retry counts require receipts. Weighted tokens use only manifest-declared relative weights; neither they nor any count is money or allowance.' };
}
function compareUsage(before, after) {
  const mismatches = ['repository', 'sourceHead', 'base', 'intentHash'].filter(k => before.identity[k] !== after.identity[k]);
  const settings = r => [...new Set(r.sessions.flatMap(s => s.settings.map(x => JSON.stringify(x))))].sort();
  if (JSON.stringify(settings(before)) !== JSON.stringify(settings(after))) mismatches.push('model/settings');
  if ([before, after].some(r => r.sessions.some(s => s.missing.includes('model/settings')))) mismatches.push('missing model/settings');
  if (JSON.stringify(before.weights) !== JSON.stringify(after.weights)) mismatches.push('weights');
  const metric = (a, b) => ({ before: a ?? null, after: b ?? null,
    changePercent: typeof a === 'number' && a > 0 && typeof b === 'number' ? (b - a) * 100 / a : null });
  return { comparableInputsAndSettings: mismatches.length === 0, mismatches,
    metrics: Object.fromEntries([...counts, 'meanContextTokens', 'weightedTokens', 'wallTimeMs'].map(k => [k, metric(k === 'wallTimeMs' ? before[k] : before.total[k], k === 'wallTimeMs' ? after[k] : after.total[k])])),
    limitation: 'One paired run is descriptive, not causal proof. Review quality and holds must be assessed separately; absent phases are not zero-cost proof.' };
}
module.exports.assessmentUsage = assessmentUsage;
module.exports.compareUsage = compareUsage;

if (require.main === module) {
  const fs = require('node:fs'), path = require('node:path');
  const [manifestPath, output] = process.argv.slice(2);
  if (!manifestPath || !output) throw Error('Usage: node src/quality/usage.cjs <external-manifest.json> <new-external-usage.json>');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const result = assessmentUsage(manifest, entry => {
    if (!path.isAbsolute(entry.transcript)) throw Error('Absolute external transcript path required');
    if (!fs.existsSync(entry.transcript)) return [];
    return fs.readFileSync(entry.transcript, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  });
  const target = path.resolve(output), root = path.resolve(__dirname, '../..');
  if (target === root || target.startsWith(root + path.sep)) throw Error('Usage belongs outside the source repository');
  fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ output: target, total: result.total, wallTimeMs: result.wallTimeMs }));
}
