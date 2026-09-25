// Declarative trusted crew catalogue. Candidate content is inspected as data, never loaded as code.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { consumerFile } = require('./config.cjs');
const { isHostInstruction } = require('./host-instructions.cjs');
const { collectProjectChanges } = require('./project-review.cjs');
const { discoverReferences } = require('./impact.cjs');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const text = x => typeof x === 'string' && x.trim().length > 0;
const texts = x => Array.isArray(x) && x.every(text);
const id = x => typeof x === 'string' && /^[a-z][a-z0-9-]{0,47}$/.test(x);
const version = x => typeof x === 'string' && /^\d+\.\d+\.\d+$/.test(x);
const unique = values => [...new Set(values)].sort();
function validateCrewConfig(config) {
  if (config?.schema !== 1 || !Array.isArray(config.members) || !Array.isArray(config.areas) ||
      config.members.some(x => !id(x.id) || !version(x.version)) ||
      new Set(config.members.map(x => x.id)).size !== config.members.length ||
      config.areas.some(x => !texts(x.paths) || !x.paths.length || !texts(x.technologies) || !x.technologies.length || !text(x.reason)))
    throw Error('Invalid crew configuration');
  for (const area of config.areas) for (const pattern of area.paths) new RegExp(pattern);
  return config;
}
function applicable(member, technologies, files) {
  const a = member.applicability;
  return (a.anyTechnologies.length > 0 && a.anyTechnologies.some(t => technologies.includes(t)) ||
    a.allTechnologies.length > 0 && a.allTechnologies.every(t => technologies.includes(t)) ||
    a.pathPatterns.some(p => files.some(f => new RegExp(p, 'i').test(f))));
}
function validateMember(m, expected) {
  if (m.schema !== 1 || m.compatibility !== 'marc-crew-v1' || !id(m.id) || !version(m.version) ||
      m.id !== expected.id || m.version !== expected.version || !text(m.specialty) || !text(m.scope) ||
      !texts(m.covers) || !texts(m.inputs) || !m.inputs.length || !texts(m.checks) || !m.checks.length ||
      !texts(m.evidenceRules) || !m.evidenceRules.length || m.outputSchema !== 'marc-gate-v1' ||
      JSON.stringify(m.permissions) !== JSON.stringify(['source:read', 'evidence:read', 'result:write']) ||
      !m.applicability || !['anyTechnologies', 'allTechnologies', 'pathPatterns'].every(k => texts(m.applicability[k])) ||
      !Object.values(m.applicability).some(x => Array.isArray(x) && x.length) || !Array.isArray(m.cases) || m.cases.length < 2 ||
      !m.cases.some(x => x.selected === true) || !m.cases.some(x => x.selected === false))
    throw Error('Invalid or incompatible crew manifest: ' + expected.id);
  m.applicability.pathPatterns.forEach(p => new RegExp(p));
  for (const example of m.cases) {
    if (!texts(example.technologies) || !texts(example.files) || typeof example.selected !== 'boolean' ||
        applicable(m, example.technologies, example.files) !== example.selected)
      throw Error('Crew applicability case failed: ' + m.id);
  }
  return m;
}
function loadCatalogue(root, config) {
  validateCrewConfig(config);
  return config.members.flatMap(expected => {
    const folder = `skills/marc-crew-${expected.id}`;
    if (!fs.existsSync(path.join(root, folder, 'crew.json'))) return [];
    const manifest = fs.readFileSync(consumerFile(root, folder + '/crew.json'));
    const skill = fs.readFileSync(consumerFile(root, folder + '/SKILL.md'));
    consumerFile(root, folder + '/IMPROVEMENTS.md');
    const m = validateMember(JSON.parse(manifest), expected);
    return [{ ...m, skill: folder + '/SKILL.md', contentHash: hash(Buffer.concat([manifest, skill])) }];
  });
}
function selectCrew(identity, config, catalogue, impact) {
  const selected = [], omitted = [], holds = [...impact.holds];
  for (const expected of [...config.members].sort((a, b) => a.id.localeCompare(b.id))) {
    const member = catalogue.find(m => m.id === expected.id && m.version === expected.version);
    if (!member) { holds.push(`Configured crew unavailable: ${expected.id}@${expected.version}`); continue; }
    const record = { id: member.id, version: member.version, contentHash: member.contentHash, skill: member.skill };
    if (impact.uncertain || applicable(member, impact.technologies, impact.files))
      selected.push({ ...record, reasons: impact.uncertain ? ['Uncertain impact requires broader configured expertise.'] :
        [`Applicability matches captured technologies/paths: ${impact.technologies.join(', ')}`] });
    else omitted.push({ ...record, reasons: ['No matching captured technology or affected path.'] });
  }
  for (const technology of impact.technologies) {
    if (!selected.some(item => catalogue.find(m => m.id === item.id).covers.includes(technology)))
      holds.push('Required expertise unavailable for ' + technology);
  }
  const record = { schema: 1, compatibility: 'marc-crew-v1', ...identity, impact, selected, omitted, holds: unique(holds),
    requiresFull: impact.uncertain || impact.requiresBrowser || impact.requiresFull === true, requiresBrowser: impact.requiresBrowser };
  return { ...record, selectionHash: hash(JSON.stringify(record)) };
}
const documentation = file => /\.(md|txt|rst|adoc)$/i.test(file);
const governance = file => isHostInstruction(file) || /(^|\/)(AGENTS\.md|CLAUDE\.md|SKILL\.md|package(-lock)?\.json|[^/]*\.(csproj|sln|props|targets)|global\.json|[^/]*config\.(json|ya?ml|toml)|[^/]*\.lock|pnpm-lock\.yaml)$|^(\.github|\.agents|\.marc|scripts)\//i.test(file);
function fileTechnologies(file) {
  if (/\.razor(\.cs|\.css)?$/i.test(file)) return ['csharp', 'blazor'];
  if (/\.cs$/i.test(file)) return ['csharp'];
  if (/\.(jsx|tsx)$/i.test(file)) return ['javascript', 'web'];
  if (/\.(cjs|mjs|js|jsx|ts|tsx)$/i.test(file)) return ['javascript'];
  if (/\.(css|scss|sass|html|htm)$/i.test(file)) return ['web'];
  const extensions = { py: 'python', go: 'go', rs: 'rust', rb: 'ruby', java: 'java', kt: 'kotlin', swift: 'swift', php: 'php', sql: 'sql' };
  return extensions[path.posix.extname(file).slice(1).toLowerCase()] ? [extensions[path.posix.extname(file).slice(1).toLowerCase()]] : [];
}
function collectImpact(base, head, files, config, catalogue, readGit) {
  const affected = new Set(files), reasons = [], holds = [], technologies = new Set();
  let uncertain = false, shared = false;
  // A known application's verified dependency-only diff needs full security review,
  // not every technology in the repository. Never infer frontend from npm alone.
  const scopedDependencies = new Set();
  for (const file of files.filter(f => /\/package(?:-lock)?\.json$/i.test(f) &&
    !isHostInstruction(f) && !/^(\.github|\.agents|\.marc|scripts)\//i.test(f))) {
    if (!config.areas.some(area => area.paths.some(p => new RegExp(p, 'i').test(file)))) continue;
    try {
      const change = collectProjectChanges(base, head, [file], readGit)[0];
      if (change?.classification !== 'dependency-only') continue;
      // Workspace manifests can own dependencies beyond this application boundary.
      if ([base, head].some(revision => {
        const manifest = JSON.parse(readGit('show', `${revision}:${file}`));
        return manifest.workspaces !== undefined || manifest.packages?.['']?.workspaces !== undefined;
      })) continue;
      scopedDependencies.add(file);
    } catch { /* Unavailable or unsupported evidence retains broad selection below. */ }
  }
  const discovery = discoverReferences(base, head, files.filter(file => !scopedDependencies.has(file)), readGit,
    file => fileTechnologies(file).length > 0 || config.areas.some(area => area.paths.some(p => new RegExp(p, 'i').test(file))));
  discovery.files.forEach(file => affected.add(file));
  holds.push(...discovery.holds);
  for (const reference of discovery.references)
    reasons.push(`${reference.file}:${reference.line}: ${reference.kind} reference to ${reference.symbol} from ${reference.from} (${reference.revision}).`);
  for (const file of [...affected].sort()) {
    const areas = config.areas.filter(area => area.paths.some(p => new RegExp(p, 'i').test(file)));
    for (const area of areas) {
      area.technologies.forEach(t => technologies.add(t));
      if (files.includes(file)) reasons.push(`${file}: ${area.reason}`);
    }
    if (scopedDependencies.has(file)) {
      technologies.add('javascript');
      reasons.push(`${file}: verified application dependency-only change; trusted area selects specialists, full review remains required.`);
    } else if (files.includes(file) && governance(file)) { shared = true; reasons.push(`${file}: changed shared configuration/instruction/dependency impact.`); }
    const detected = fileTechnologies(file);
    detected.forEach(t => technologies.add(t));
    if (!detected.length && !areas.length && !documentation(file) && !governance(file)) {
      uncertain = true; holds.push(`Unclassified impact: ${file}; configure its technology/consumers before approval.`);
    }
  }
  if (shared || uncertain) catalogue.flatMap(m => m.covers).forEach(t => technologies.add(t));
  const requiresBrowser = technologies.has('blazor') || technologies.has('web') || technologies.has('react') ||
    [...affected].some(f => /(^|\/)(wwwroot|ClientApp)\/|\.(jsx|tsx)$/i.test(f));
  reasons.push(`Captured ${files.length} changed and ${affected.size - files.length} referenced files; independent behavioral caller review remains required.`);
  return { files: [...affected].sort(), changedFiles: [...files].sort(), references: discovery.references,
    technologies: [...technologies].sort(), reasons: unique(reasons), holds: unique(holds),
    uncertain: uncertain || shared, incomplete: discovery.incomplete, requiresBrowser,
    ...(scopedDependencies.size || discovery.incomplete ? { requiresFull: true } : {}) };
}
module.exports = { validateCrewConfig, validateMember, loadCatalogue, selectCrew, collectImpact };
