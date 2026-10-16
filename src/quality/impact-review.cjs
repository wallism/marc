// Model-directed scope decisions. Decisions are auditable review inputs, never
// compiler proof or authority to waive independent review, CI or human gates.
const { createHash } = require('node:crypto');
const { source, affectedNames, discoverReferences } = require('./impact.cjs');
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const test = file => /(^|\/)(tests?|__tests__|specs?)(\/|\.)|\.(test|spec)\.[^/]+$|\.Tests?\/|Tests?\.(cs|vb|java)$/i.test(file);
const scope = (revision, file, names) => {
  const value = { revision, file, names: [...new Set(names)].sort() };
  return { id: hash(value), ...value };
};

function reviewImpact(base, head, changed, readGit, isSource, plan) {
  if (plan && (plan.schema !== 1 || plan.base !== base || plan.sourceHead !== head || !Array.isArray(plan.decisions)))
    throw Error('Invalid or stale discovery plan');
  const decisions = plan?.decisions || [];
  if (new Set(decisions.map(d => d.scope)).size !== decisions.length || decisions.some(d =>
    !/^[a-f0-9]{64}$/.test(d.scope) || !['stop', 'follow'].includes(d.action) ||
    typeof d.reason !== 'string' || !d.reason.trim() || !Array.isArray(d.evidence) ||
    !d.evidence.length || d.evidence.some(x => typeof x !== 'string' || !x.trim()))) throw Error('Invalid discovery decisions');
  const files = new Set(changed), scopes = new Map(), references = [], lexicalReferences = [], holds = [], diagnostics = [];
  const add = value => { if (!scopes.has(value.id)) scopes.set(value.id, value); };
  try {
    for (const file of changed.filter(file => isSource(file) && !test(file) && !/\.(mdx?|txt|rst|adoc)$/i.test(file))) {
      const diff = readGit('diff', '--no-ext-diff', '--no-textconv', '--unified=0', base, head, '--', file);
      const ranges = { [base]: [], [head]: [] };
      for (const m of diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)) {
        ranges[base].push([+m[1], m[2] === undefined ? 1 : +m[2]]);
        ranges[head].push([+m[3], m[4] === undefined ? 1 : +m[4]]);
      }
      for (const revision of [base, head]) {
        const entry = readGit('ls-tree', revision, '--', file);
        if (!entry || entry.startsWith('160000 commit ')) continue;
        if (!/^100(?:644|755) blob /.test(entry)) throw Error('Nonregular source');
        const parsed = source(readGit('show', `${revision}:${file}`), file);
        // A top-level import hunk needs its own file-level judgment; it must not
        // erase the precise member scopes from other hunks in the same file.
        for (const range of ranges[revision]) {
          const names = affectedNames({ ...parsed, declarations: [...parsed.declarations, ...parsed.methods] }, [range]);
          if (names === null) add(scope(revision, file, []));
          else for (const name of names) add(scope(revision, file, [name]));
        }
      }
    }
    // Map iteration visits newly added scopes. Each outward step needs its own
    // reasoned decision; a follow decision never implicitly follows its callers.
    for (const item of scopes.values()) {
      const decision = decisions.find(d => d.scope === item.id);
      if (!decision || decision.action === 'stop') continue;
      const found = discoverReferences(base, head, changed, readGit, isSource, { roots: [item] });
      found.files.forEach(file => files.add(file));
      for (const ref of found.references) if (!references.some(r => JSON.stringify(r) === JSON.stringify(ref))) references.push(ref);
      for (const ref of found.lexicalReferences) if (!lexicalReferences.some(r => JSON.stringify(r) === JSON.stringify(ref))) lexicalReferences.push(ref);
      holds.push(...found.holds); diagnostics.push(...found.diagnostics);
      for (const next of found.nextScopes) for (const name of next.names) add(scope(next.revision, next.file, [name]));
    }
  } catch (error) { holds.push('Source/reference inspection unavailable; recapture with readable Git objects.'); }
  const reviewScopes = [...scopes.values()].map(item => ({ ...item, decision: decisions.find(d => d.scope === item.id) || null }));
  if (reviewScopes.some(item => !item.decision)) holds.push('Discovery scope decisions pending; inspect changed behavior and record follow or stop with evidence.');
  if (decisions.some(d => !scopes.has(d.scope))) holds.push('Discovery plan contains unreachable scopes; recapture the plan.');
  return { files: [...files].sort(), references, lexicalReferences, reviewScopes, diagnostics,
    holds: [...new Set(holds)], incomplete: holds.length > 0 };
}

module.exports = { reviewImpact };
