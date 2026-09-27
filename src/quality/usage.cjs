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
