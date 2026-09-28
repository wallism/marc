const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { identity } = require('./orchestration.cjs');
const { fileTechnologies } = require('./crew.cjs');
const { LEVELS, declaredTrunk } = require('./risk.cjs');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const encode = value => JSON.stringify(value, null, 2) + '\n';
// Inline budget for the text diff in each brief; larger diffs name every file left out.
const INLINE_DIFF_BYTES = 96 * 1024;
// Part size for hosts that cap one read (Claude Code's Read stops near 25k tokens,
// about 50 KiB of brief text at two bytes per token).
const BRIEF_PART_BYTES = 48 * 1024;
const docFile = file => /\.(md|txt|rst|adoc)$/i.test(file);
const testFile = file => /(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.[^/]+$|Tests?\.cs$/i.test(file);
const posix = file => file.replaceAll('\\', '/');
// Inlined references keep working links when the brief lives in external state.
const absoluteLinks = (text, file) => text.replace(/\]\((?![a-z][a-z0-9+.-]*:|#|\/)([^)\s]+)\)/gi, (_, target) => {
  const [relative, anchor] = target.split('#');
  return `](${posix(path.resolve(path.dirname(file), relative))}${anchor ? '#' + anchor : ''})`;
});

// Split the text diff into per-file sections paired with -z numstat, both without
// rename detection so the two listings stay one-to-one.
function diffSections(git, e) {
  const text = git('diff', '--no-ext-diff', '--no-textconv', '--no-renames', e.base, e.sourceHead, '--');
  const stats = git('diff', '--numstat', '-z', '--no-renames', e.base, e.sourceHead, '--').split('\0').filter(Boolean).map(entry => {
    const [added, deleted, ...name] = entry.split('\t');
    return { file: name.join('\t'), lines: added === '-' ? 'binary' : `+${added} -${deleted}` };
  });
  const sections = text ? text.split(/^(?=diff --git )/m).filter(Boolean) : [];
  return { text, stats, sections: sections.length === stats.length ? sections.map((body, i) => ({ ...stats[i], body })) : null };
}

function inlineDiff({ text, sections }, budget) {
  if (Buffer.byteLength(text) <= budget) return { body: text, omitted: [] };
  if (!sections) return { body: '', omitted: ['(entire diff; per-file sections unavailable)'] };
  const rank = file => docFile(file) ? 2 : testFile(file) ? 1 : 0;
  const ordered = sections.map((s, i) => ({ ...s, i })).sort((a, b) => rank(a.file) - rank(b.file) || a.i - b.i);
  let used = 0; const kept = [], omitted = [];
  for (const section of ordered) {
    const bytes = Buffer.byteLength(section.body);
    if (used + bytes <= budget) { kept.push(section); used += bytes; } else omitted.push(section.file);
  }
  return { body: kept.map(s => s.body).join(''), omitted };
}

// Nest inlined document headings under the brief's own sections, leaving code fences intact.
function demote(text) {
  let fenced = false;
  return text.split('\n').map(line => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    return !fenced && /^#{1,4} /.test(line) ? '##' + line : line;
  }).join('\n');
}
// Cut the shared prefix into the fewest parts that each fit `limit`, leaving room for
// the largest gate tail in the last one. Cuts prefer line ends and never split a
// UTF-8 sequence, so concatenating the parts reproduces the brief exactly.
function splitPrefix(prefix, maxTail, limit) {
  if (prefix.length + maxTail <= limit) return { shared: [], last: prefix };
  const cut = (start, end) => {
    if (end >= prefix.length) return prefix.length;
    const line = prefix.lastIndexOf(10, end - 1);
    if (line >= start) return line + 1;
    while (end > start + 1 && (prefix[end] & 0xc0) === 0x80) end--;
    return end;
  };
  for (let n = 2; n <= 64; n++) {
    const target = Math.ceil((prefix.length + maxTail) / n), shared = [];
    let start = 0;
    for (let i = 1; i < n && start < prefix.length; i++) {
      const end = cut(start, Math.min(start + target, prefix.length));
      shared.push(prefix.subarray(start, end)); start = end;
    }
    const last = prefix.subarray(start);
    if (shared.every(part => part.length <= limit) && last.length + maxTail <= limit) return { shared, last };
  }
  throw Error('Brief cannot be split within the part limit');
}
const revisionName =(e, revision) => revision === e.base ? 'base' : revision === e.sourceHead ? 'source' : revision;
const referenceLine = (e, r) => `- ${r.file}:${r.line} ${r.kind} \`${r.symbol}\` <- ${r.from} (${revisionName(e, r.revision)})`;
const fence = body => { const ticks = '`'.repeat(Math.max(3, ...[...body.matchAll(/`+/g)].map(m => m[0].length + 1))); return `${ticks}diff\n${body}${body.endsWith('\n') ? '' : '\n'}${ticks}`; };

// Byte-identical for every gate in one packet set, so hosts that start sessions from
// the brief can reuse a cached prefix. Gate-specific text follows it.
function sharedPrefix(e, { common, project, dependency, ci, artifactFacts, scope, stats, inline, diffPointer, scopePointer, briefKiB, parts, partKiB }) {
  const impact = e.crew?.impact || {};
  const changed = new Set(impact.changedFiles || e.files);
  const include = (title, file) => file ? [`## ${title}`, '', `Source: ${posix(file.path)} (sha256 ${file.sha256})`, '', demote(absoluteLinks(fs.readFileSync(file.path, 'utf8').trim(), file.path)), ''] : [];
  const list = (title, lines) => lines.length ? [`### ${title} (${lines.length})`, '', ...lines, ''] : [`### ${title}: none`, ''];
  return [
    '# MARC independent review brief', '',
    'Generated by the trusted controller from frozen evidence. It inlines the common reviewer contract, project guidance, CI facts, compact scope and frozen diff, so you do not need to open them separately. The controller verified these checksums before dispatch. Your gate assignment, skill and output path follow the shared evidence at the end.', '',
    `Size: at most ${briefKiB} KiB` + (parts > 1 ? `, also written as ${parts} ordered parts of at most ${partKiB} KiB each. Parts end at line boundaries, not section boundaries: a part that stops mid-section or mid-diff is complete, so continue with the next part rather than re-reading` : '') +
      `. Read the brief, or each part you were given, completely in one call, raising your tool's output limit to cover it (plan on about two bytes per token); each extra page resends your whole context. If a read was truncated, read the entire remainder in one further call.`, '',
    '## Frozen identity', '',
    `- Repository: ${e.repository}; PR ${e.pr}`, `- Source: ${e.sourceHead}`, `- Base: ${e.base}`, `- Policy: ${e.policyHash}`,
    ...(e.crew?.selectionHash ? [`- Selection: ${e.crew.selectionHash}`] : []), ...(e.intent?.hash ? [`- Intent: ${e.intent.hash} (${e.intent.status})`] : []),
    `- Read-only source checkout: ${posix(scope.sourceRepository)}; use \`git show <revision>:<path>\` for full files.`, '',
    ...include('Common reviewer contract', common), ...include('Project guidance', project), ...include('Dependency evidence contract', dependency),
    ...(e.intent?.status === 'present' ? ['## Captured intent', '', '```json', JSON.stringify(e.intent), '```', ''] : []),
    '## CI facts', '', '```json', JSON.stringify(ci), '```', '',
    ...list('Validated artifacts', artifactFacts.map(a => `- ${a.file} sha256 ${a.sha256}` + (a.tests !== undefined ? `: ${a.tests} tests, ${a.skipped} skipped` : '') + (a.scanner ? `: ${a.scanner}, ${a.findings} findings` : ''))),
    '## Scope', '', `Complete scope JSON: ${posix(scopePointer.path)} (sha256 ${scopePointer.sha256}). Every item below is a starting pointer, not a scope ceiling.`, '',
    ...(impact.technologies ? [`Technologies: ${impact.technologies.join(', ') || 'none'}; uncertain ${!!impact.uncertain}; incomplete ${!!impact.incomplete}; browser ${!!impact.requiresBrowser}.`, ''] : []),
    ...list('Changed files', stats.length ? stats.map(s => `- ${s.lines} ${s.file}`) : e.files.map(f => `- ${f}`)),
    ...list('Referenced unchanged files', (impact.files || []).filter(f => !changed.has(f)).map(f => `- ${f}`)),
    ...list('References', (impact.references || []).map(r => referenceLine(e, r))),
    ...list('Lexical leads (confirm before treating as dependencies)', (impact.lexicalReferences || []).map(r => referenceLine(e, r))),
    ...list('Selection reasons', (impact.reasons || []).filter(r => !/: \w+ reference to /.test(r)).map(r => `- ${r}`)),
    ...list('Holds', (e.crew?.holds || []).map(h => `- ${h}`)),
    ...list('Project changes', (e.projectChanges || []).map(p => `- ${JSON.stringify(p)}`)),
    '## Frozen diff', '',
    `Complete binary-capable diff: ${posix(diffPointer.path)} (sha256 ${diffPointer.sha256}). Inlined below as text${inline.omitted.length ? '; the files listed after it were not inlined and must be read from the complete diff or with `git diff <base> <source> -- <path>`' : ' in full'}.`, '',
    inline.body ? fence(inline.body) : '(No text diff inlined.)', '',
    ...(inline.omitted.length ? [`### Not inlined (${inline.omitted.length})`, '', ...inline.omitted.map(f => `- ${f}`), ''] : [])
  ].join('\n');
}

function specialistFocus(e, member, bundleRoot) {
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(path.join(bundleRoot, path.dirname(member.skill), 'crew.json'), 'utf8')); }
  catch { return ['No technology focus could be derived; use the complete scope above.', '']; }
  const patterns = manifest.applicability?.pathPatterns || [];
  const relevant = file => fileTechnologies(file).some(t => manifest.covers.includes(t)) || patterns.some(p => new RegExp(p, 'i').test(file));
  const impact = e.crew?.impact || {};
  const touching = list => (list || []).filter(r => relevant(r.file) || relevant(r.from)).length;
  const files = (impact.files || e.files).filter(relevant);
  // Files and counts only: the entries themselves are already in the shared scope.
  return [`Covers: ${manifest.covers.join(', ')}. Affected files touching your technology, as starting pointers; the complete scope above still applies:`, '',
    ...(files.length ? files.map(f => `- ${f}`) : ['- No affected files match directly; check shared contracts and callers in the complete scope.']), '',
    `Above, ${touching(impact.references)} references and ${touching(impact.lexicalReferences)} lexical leads involve these technologies.`, ''];
}

function riskFocus(e, policy) {
  const patterns = policy.riskTrunkPatterns || [], matched = declaredTrunk(e.files, policy);
  return ['## Declared trunk', '', patterns.length ? `Trusted trunk patterns: ${patterns.map(p => '`' + p + '`').join(', ')}.` : 'No trunk patterns are declared; infer position from the code.', '',
    ...(matched.length ? ['Changed files matching them (risk must be high):', '', ...matched.map(f => `- ${f}`)] : ['No changed file matches a declared trunk pattern.']), ''];
}

// An enabled risk assessment leads so it can be the warm-start session; an existing
// identity-bound rating stays valid across a route change and is not repeated.
function requiredGates(e, policy) {
  const gates = policy.riskAssessment === 1 && !e.risk?.reviewer ? ['risk'] : [];
  gates.push(...(e.routing?.route === 'simple' ? ['simple-tests'] : policy.reviewGates));
  if (e.intent?.status === 'present') gates.push('intent');
  for (const member of e.crew?.selected || []) gates.push('crew:' + member.id);
  if (e.crew?.requiresBrowser || e.files.some(f => policy.uiPathPatterns.some(p => new RegExp(p, 'i').test(f))) ||
      Object.values(e.gates || {}).some(g => g.requiresBrowser)) gates.push('browser');
  return [...new Set(gates)];
}

// Called only with controller-owned capture and frozen Git data. The builder is
// also exported for explicit offline experiments; packets never authorize actions.
function buildPackets(e, context, { directory, git, artifactFacts = [], experimental = false, resume = {}, inlineDiffBytes = INLINE_DIFF_BYTES,
  briefPartBytes = BRIEF_PART_BYTES }) {
  if (!path.isAbsolute(directory) || fs.existsSync(directory)) throw Error('Packets require a new external directory');
  const parent = fs.realpathSync(path.dirname(directory));
  for (const root of [context.repoRoot, context.bundleRoot]) {
    const resolved = fs.realpathSync(root);
    if (parent === resolved || parent.startsWith(resolved + path.sep)) throw Error('Packets must remain outside source checkouts');
  }
  if (!/^[a-f0-9]{40}$/.test(e.sourceHead) || !/^[a-f0-9]{40}$/.test(e.base) || !e.policyHash) throw Error('Frozen packet identity required');
  fs.mkdirSync(directory);
  const diffPath = path.join(directory, 'complete.diff');
  fs.writeFileSync(diffPath, git('diff', '--no-ext-diff', '--no-textconv', '--binary', e.base, e.sourceHead, '--'));
  const scopePath = path.join(directory, 'scope.json');
  fs.writeFileSync(scopePath, encode({ files: e.files, impact: e.crew?.impact, holds: e.crew?.holds || [], projectChanges: e.projectChanges }));
  const pointer = file => ({ path: file, sha256: digest(fs.readFileSync(file)), bytes: fs.statSync(file).size });
  // Hosts number lines and show an empty line after a final newline; a stated count
  // tells readers where a part ends so they do not page past it.
  const partPointer = file => { const text = fs.readFileSync(file, 'utf8');
    return { ...pointer(file), lines: text ? text.split('\n').length - (text.endsWith('\n') ? 1 : 0) : 0 }; };
  const refs = path.join(context.bundleRoot, 'skills/marc-crew-captain/references');
  const common = pointer(path.join(refs, 'reviewer.md'));
  const project = context.guidance?.project ? pointer(context.guidance.project) : null;
  const dependency = e.projectChanges?.some(p => p.classification === 'dependency-only' || p.classification === 'review-required')
    ? pointer(path.join(refs, 'dependency-evidence.md')) : null;
  const sections = diffSections(git, e);
  const prefixInput = { common, project, dependency, ci: e.ci, artifactFacts, scope: { sourceRepository: context.repoRoot },
    stats: sections.stats, inline: inlineDiff(sections, inlineDiffBytes), diffPointer: pointer(diffPath), scopePointer: pointer(scopePath) };
  const drafts = requiredGates(e, context.policy).map(gate => {
    const member = e.crew?.selected.find(m => gate === 'crew:' + m.id);
    const skill = gate === 'intent' ? path.join(refs, 'intent.md') : gate === 'browser' ? path.join(refs, 'browser-runtime.md') :
      path.join(context.bundleRoot, member?.skill || `skills/marc-crew-${gate}/SKILL.md`);
    const schema = { verdict: ['pass', 'repair', 'human-required', 'blocked'],
      required: ['sourceHead', 'base', 'policyHash', 'reviewer', 'summary', 'evidence', 'findings'],
      ...(member ? { memberVersion: member.version, memberHash: member.contentHash, selectionHash: e.crew.selectionHash } : {}),
      ...(gate === 'intent' ? { intentHash: e.intent.hash, method: 'static-code', additional: ['assessment', 'confidence', 'confidenceReason', 'unresolvedOutcomes'] } : {}),
      ...(gate === 'simple-tests' ? { additional: ['testDecision', 'testRationale'] } : {}) };
    if (gate === 'risk') {
      delete schema.verdict; schema.required = ['sourceHead', 'base', 'policyHash', 'reviewer', 'summary', 'evidence',
        'level', 'position', 'reversibility', 'triggers', 'unknowns'];
      Object.assign(schema, { level: LEVELS, position: ['leaf', 'branch', 'trunk'], reversibility: ['gated', 'revertible', 'one-way'] });
    }
    const gateSkill = pointer(skill);
    const instructions = [common, gateSkill, ...(project ? [project] : []), ...(dependency ? [dependency] : [])];
    const name = gate.replace(':', '-');
    const output = path.join(directory, `${name}-result.json`);
    const expansion = 'Read complete diff and owning callers. Inspect scope, lexical leads and unresolved holds. Full source remains available through read-only git show <revision>:<path>. No other reviewer conclusions are included.';
    const tail = [`## Your assignment: ${gate}`, '', `Source: ${posix(gateSkill.path)} (sha256 ${gateSkill.sha256})`, '',
      demote(absoluteLinks(fs.readFileSync(skill, 'utf8').trim(), skill)), '',
      ...(member ? ['## Specialist focus', '', ...specialistFocus(e, member, context.bundleRoot)] : []),
      ...(gate === 'risk' ? riskFocus(e, context.policy) : []),
      '## Output', '', expansion, '', `Write only this standalone gate JSON: ${posix(output)}`, '', '```json', JSON.stringify(schema, null, 2), '```', '',
      gate === 'risk' ? 'Return the level, a one-line reason and the output path. The controller validates the result during assembly.' :
        'Return a terse verdict, blocking findings and the output path. The controller validates the result during assembly.', ''].join('\n');
    return { gate, name, output, schema, instructions, expansion, tail };
  });
  // Paging a truncated brief costs a full context resend per page. State the largest
  // brief size so every prefix stays byte-identical; the placeholder keeps digits stable.
  const maxTail = Math.max(0, ...drafts.map(d => Buffer.byteLength(d.tail)));
  const partKiB = Math.floor(briefPartBytes / 1024);
  // The header names the size and part count, which depend on the header; settle it
  // with a wide placeholder, then confirm the part count is stable.
  let parts = 9, prefix, split;
  for (let attempt = 0; attempt < 3; attempt++) {
    const draft = Buffer.byteLength(sharedPrefix(e, { ...prefixInput, briefKiB: 9999, parts, partKiB }));
    const briefKiB = Math.ceil((draft + maxTail) / 1024);
    prefix = sharedPrefix(e, { ...prefixInput, briefKiB, parts, partKiB });
    split = splitPrefix(Buffer.from(prefix), maxTail, briefPartBytes);
    if (split.shared.length + 1 === parts) break;
    parts = split.shared.length + 1;
  }
  if (split.shared.length + 1 !== parts) throw Error('Brief part count did not settle');
  // Leading parts are identical for every gate, so they are written once and shared.
  const sharedParts = split.shared.map((bytes, i) => {
    const file = path.join(directory, `brief-part-${i + 1}.md`);
    fs.writeFileSync(file, bytes, { flag: 'wx' });
    return partPointer(file);
  });
  const packets = [];
  for (const { gate, name, output, schema, instructions, expansion, tail } of drafts) {
    const briefPath = path.join(directory, `${name}-brief.md`);
    fs.writeFileSync(briefPath, prefix + tail, { flag: 'wx' });
    let briefParts = [partPointer(briefPath)];
    if (sharedParts.length) {
      const last = path.join(directory, `${name}-brief-part-${parts}.md`);
      fs.writeFileSync(last, Buffer.concat([split.last, Buffer.from(tail)]), { flag: 'wx' });
      briefParts = [...sharedParts, partPointer(last)];
    }
    const packet = { schema: 1, experimental, authority: 'Read-only independent assessment; no repair, publication or merge authority.', gate,
      identity: identity(e), repository: e.repository, pr: e.pr, sourceHead: e.sourceHead, base: e.base, policyHash: e.policyHash,
      sourceRepository: context.repoRoot, instructions, brief: pointer(briefPath), briefParts, diff: pointer(diffPath), scope: pointer(scopePath),
      intent: e.intent, ci: e.ci, artifactFacts, outputSchema: schema, output, expansion };
    const file = path.join(directory, `${name}.json`);
    fs.writeFileSync(file, encode(packet), { flag: 'wx' });
    packets.push({ gate, role: gate.replace(/^crew:/, ''), path: file, brief: briefPath, briefParts: briefParts.map(p => p.path), briefPartLines: briefParts.map(p => p.lines), output,
      briefBytes: packet.brief.bytes, instructionBytes: instructions.reduce((sum, p) => sum + p.bytes, 0),
      packetBytes: fs.statSync(file).size, diffBytes: packet.diff.bytes, scopeBytes: packet.scope.bytes });
  }
  const handoff = { schema: 1, experimental, authority: 'Assessment only; use existing guarded commands for all actions.',
    resume,
    identity: identity(e), repository: context.repoRoot, bundle: context.bundleRoot,
    stateDirectory: context.stateDirectory, runLock: context.runLock, ciRecoveryDirectory: context.ciRecoveryDirectory,
    repairCycles: e.repairCycles, repairReviewers: e.repairReviewers, repairExecutions: e.repairExecutions,
    sharedPrefix: { bytes: Buffer.byteLength(prefix), sha256: digest(prefix) },
    briefParts: { count: parts, maxBytes: briefPartBytes },
    dispatch: 'Warm start: dispatch the first gate alone, then every remaining gate together once its first model call has completed, all launched the same way (sessions launched differently share no cache), so later sessions can read the shared system/tool prefix from the host cache. Give each reviewer its brief path, or its briefParts in order with the matching line counts from briefPartLines when the host limits one read below the brief size.',
    packets, next: 'Verify live source/base/policy and exclusive run ownership before resuming. Load current trusted Captain; inspect resumable external state. Dispatch each packet brief to a fresh reviewer without opening it here. Never inherit implementation conversation or use packet CI as live merge authority.' };
  const handoffPath = path.join(directory, 'captain-handoff.json');
  fs.writeFileSync(handoffPath, encode(handoff), { flag: 'wx' });
  return { handoff: handoffPath, packets };
}

function verifyPacket(packet, current) {
  if (encode(packet.identity) !== encode(identity(current))) throw Error('Stale packet identity');
  if (encode(packet.ci) !== encode(current.ci)) throw Error('Stale packet CI facts');
  // Packets written before E6 have no brief, and earlier briefs have no parts; both remain verifiable.
  for (const ref of [...packet.instructions, ...(packet.brief ? [packet.brief] : []), ...(packet.briefParts || []), packet.diff, packet.scope]) {
    if (!fs.lstatSync(ref.path).isFile() || fs.lstatSync(ref.path).isSymbolicLink() || digest(fs.readFileSync(ref.path)) !== ref.sha256)
      throw Error('Missing or changed packet evidence: ' + ref.path);
  }
  return true;
}
module.exports = { requiredGates, buildPackets, verifyPacket };
