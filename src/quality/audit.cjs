// Publication encoding only: gates and the external stage journal keep full evidence.
const FORMAT = 'marc-audit-v1';
const pointer = key => String(key).replaceAll('~', '~0').replaceAll('/', '~1');

function compactAudit(evidence) {
  const seen = new Map(), arrays = [], references = {};
  function visit(value, location) {
    const serialized = JSON.stringify(value);
    // Small values are clearer inline. Equality includes order and every field.
    if (serialized.length >= 256) {
      if (seen.has(serialized)) {
        references[location] = seen.get(serialized);
        return null;
      }
      seen.set(serialized, location);
    }
    if (Array.isArray(value)) {
      // Nearly identical inventories keep their exact order via one splice.
      const items = value.map(item => JSON.stringify(item));
      let best;
      const inventory = serialized.length >= 256 && value.every(item => typeof item === 'string');
      for (const prior of inventory ? arrays : []) {
        let start = 0, end = 0;
        while (start < Math.min(items.length, prior.items.length) && items[start] === prior.items[start]) start++;
        while (end < Math.min(items.length, prior.items.length) - start &&
          items[items.length - end - 1] === prior.items[prior.items.length - end - 1]) end++;
        const delta = { base: prior.location, start, deleteCount: prior.items.length - start - end,
          items: value.slice(start, value.length - end) };
        const size = JSON.stringify(delta).length;
        if (size < serialized.length / 2 && (!best || size < best.size)) best = { delta, size };
      }
      if (best) { references[location] = best.delta; return null; }
      if (inventory) arrays.push({ location, items });
      return value.map((item, i) => visit(item, `${location}/${i}`));
    }
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
      .map(([key, item]) => [key, visit(item, `${location}/${pointer(key)}`)]));
    return value;
  }
  // Normalize just as JSON publication does (undefined fields, toJSON, etc.).
  const data = visit(JSON.parse(JSON.stringify(evidence)), '');
  return { auditSchema: FORMAT, evidence: data, references };
}

function expandAudit(document) {
  if (document.auditSchema === undefined) return structuredClone(document);
  if (document.auditSchema !== FORMAT || !document.evidence || !document.references ||
      Array.isArray(document.references) || typeof document.references !== 'object') throw Error('Invalid audit format');
  const references = document.references, completed = new Map(), active = new Set(), used = new Set();
  const lookup = location => {
    if (typeof location !== 'string' || (location !== '' && !location.startsWith('/'))) throw Error('Invalid audit pointer');
    let value = document.evidence;
    for (const part of location === '' ? [] : location.slice(1).split('/')) {
      if (/~(?![01])/u.test(part)) throw Error('Invalid audit pointer escape');
      const key = part.replaceAll('~1', '/').replaceAll('~0', '~');
      if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) throw Error('Missing audit reference');
      value = value[key];
    }
    return value;
  };
  function resolve(location) {
    if (active.has(location)) throw Error('Cyclic audit reference');
    if (completed.has(location)) return structuredClone(completed.get(location));
    active.add(location);
    let value = lookup(location);
    if (Object.hasOwn(references, location)) {
      if (value !== null) throw Error('Audit reference must replace a null placeholder');
      used.add(location);
      const reference = references[location];
      if (typeof reference === 'string') value = resolve(reference);
      else {
        if (!reference || typeof reference.base !== 'string' || !Number.isSafeInteger(reference.start) ||
            !Number.isSafeInteger(reference.deleteCount) || !Array.isArray(reference.items)) throw Error('Invalid audit delta');
        value = resolve(reference.base);
        if (!Array.isArray(value) || reference.start < 0 || reference.deleteCount < 0 ||
            reference.start + reference.deleteCount > value.length) throw Error('Invalid audit delta range');
        value.splice(reference.start, reference.deleteCount, ...structuredClone(reference.items));
      }
    } else if (Array.isArray(value)) value = value.map((_, i) => resolve(`${location}/${i}`));
    else if (value && typeof value === 'object') value = Object.fromEntries(Object.keys(value)
      .map(key => [key, resolve(`${location}/${pointer(key)}`)]));
    active.delete(location);
    completed.set(location, value);
    return structuredClone(value);
  }
  const evidence = resolve('');
  if (used.size !== Object.keys(references).length) throw Error('Unused audit reference');
  return evidence;
}

function auditJson(evidence) {
  if (evidence.auditFormat === undefined) return JSON.stringify(evidence, null, 2) + '\n';
  if (evidence.auditFormat !== FORMAT) throw Error('Unknown audit format');
  return readableJson(compactAudit(evidence)) + '\n';
}

function readableJson(value, depth = 0) {
  const inline = JSON.stringify(value), indent = '  '.repeat(depth), child = indent + '  ';
  if (!value || typeof value !== 'object' || inline.length + child.length <= 140) return inline;
  const entries = Array.isArray(value) ? value.map(item => child + readableJson(item, depth + 1)) :
    Object.entries(value).map(([key, item]) => child + JSON.stringify(key) + ': ' + readableJson(item, depth + 1));
  return (Array.isArray(value) ? '[' : '{') + '\n' + entries.join(',\n') + '\n' + indent + (Array.isArray(value) ? ']' : '}');
}

module.exports = { compactAudit, expandAudit, auditJson };
