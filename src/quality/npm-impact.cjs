// Routing evidence only: this does not waive dependency/security review.
const sections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const canonical = value => JSON.stringify(object(value) ? Object.fromEntries(Object.keys(value).sort()
  .map(key => [key, JSON.parse(canonical(value[key]))])) : value);
function packageTechnologies(name) {
  if (name === 'react-native') return ['react-native'];
  if (/^(react|react-dom|next|@docusaurus\/[^/]+|@mui\/[^/]+|@radix-ui\/react-[^/]+)$/.test(name))
    return ['react', 'web'];
  if (/^(vue|@vue\/[^/]+|@angular\/[^/]+|svelte|@sveltejs\/[^/]+|tailwindcss|bootstrap|jquery)$/.test(name)) return ['web'];
  if (/^(cdktf|cdktf-cli|@cdktf\/[^/]+)$/.test(name)) return ['terraform'];
  return [];
}
function npmImpact(base, head, file, readGit, hasOwner) {
  const technologies = new Set(['javascript']), reasons = [], holds = [], changedPackages = new Set();
  try {
    const read = revision => {
      const entry = readGit('ls-tree', revision, '--', file);
      if (!entry) return null;
      if (!/^100(?:644|755) blob [a-f0-9]{40}\t[^\r\n]+$/.test(entry) || entry.split('\t')[1] !== file)
        throw Error('Non-regular npm manifest');
      const value = JSON.parse(readGit('show', `${revision}:${file}`));
      if (!object(value)) throw Error('Invalid npm manifest');
      return value;
    };
    const before = read(base), after = read(head);
    if (!before && !after) throw Error('Missing npm manifest');
    const extract = document => {
      const entries = new Map();
      if (!document) return entries;
      const add = (key, name, value) => {
        if (!/^(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/.test(name)) throw Error('Unsupported package name');
        entries.set(key, { name, value });
      };
      const manifest = (value, prefix) => {
        if (value.workspaces !== undefined) holds.push(`${file}: workspace consumers need explicit scope review.`);
        for (const section of sections) {
          if (value[section] === undefined) continue;
          if (!object(value[section])) throw Error('Invalid dependency map');
          for (const [name, spec] of Object.entries(value[section])) {
            if (typeof spec !== 'string') throw Error('Invalid dependency spec');
            add(`${prefix}/${section}/${name}`, name, spec);
            const alias = spec.match(/^npm:((?:@[^/]+\/)?[^@]+)@/);
            if (alias) add(`${prefix}/${section}/${name}/alias`, alias[1], spec);
          }
        }
        // Overrides can alter nested consumers; keep both outer and inner names.
        const overrides = (value, prefix) => {
          if (!object(value)) return;
          for (const [selector, spec] of Object.entries(value)) {
            if (selector === '.') continue;
            const name = selector.replace(/@[^@/]*$/, '');
            add(`${prefix}/${selector}`, name, spec);
            overrides(spec, `${prefix}/${selector}`);
          }
        };
        overrides(value.overrides, `${prefix}/overrides`);
      };
      if (/(^|\/)package-lock\.json$/i.test(file)) {
        if (![2, 3].includes(document.lockfileVersion) || !object(document.packages)) throw Error('Unsupported lockfile');
        if (document.workspaces !== undefined) holds.push(`${file}: workspace consumers need explicit scope review.`);
        manifest(document.packages[''] || {}, 'root');
        for (const [location, value] of Object.entries(document.packages)) {
          if (!location) continue;
          if (!object(value)) throw Error('Invalid locked package');
          const name = value.name || location.split('node_modules/').at(-1);
          add(location, name, value);
        }
      } else manifest(document, 'root');
      return entries;
    };
    const a = extract(before), b = extract(after);
    for (const key of new Set([...a.keys(), ...b.keys()])) {
      if (canonical(a.get(key) || null) === canonical(b.get(key) || null)) continue;
      for (const entry of [a.get(key), b.get(key)].filter(Boolean)) changedPackages.add(entry.name);
    }
    for (const name of [...changedPackages].sort()) {
      const mapped = packageTechnologies(name);
      mapped.forEach(value => technologies.add(value));
      reasons.push(`${file}: changed package ${name}; ${mapped.length ? mapped.join(', ') : 'JavaScript and configured consumers'} review.`);
      if (!mapped.length && !hasOwner) holds.push(`${file}: package ${name} has no trusted consumer mapping; confirm affected technologies.`);
    }
    if (!changedPackages.size) reasons.push(`${file}: no package changes; JavaScript and configured consumers review manifest configuration.`);
  } catch (error) {
    holds.push(`${file}: npm impact unavailable (${error.message}); resolve package/consumer scope before approval.`);
  }
  return { technologies: [...technologies], reasons, holds };
}
module.exports = { npmImpact };
