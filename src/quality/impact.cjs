// Bounded lexical dependency evidence, not a compiler call graph or review verdict.
const path = require('node:path');
const prose = file => /\.(mdx?|txt|rst|adoc)$/i.test(file);
const testFile = file => /(^|\/)(tests?|__tests__|spec)(\/|\.)|\.(test|spec)\.[^/]+$|(^|\/)test_[^/]+$/i.test(file) ||
  /\.Tests?\/|Tests?\.(cs|vb)$/.test(file);
const blank = text => text.replace(/[^\n]/g, ' ');
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stem = file => path.posix.basename(file).split('.')[0];

function source(text, file) {
  // Preserve offsets/line numbers. Literal module paths are handled separately.
  const literals = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|<!--[^]*?-->|@\*(?:[^]*?)\*@|@"(?:""|[^"])*"|"""[^]*?"""|'''[^]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g;
  const comments = token => /^(\/\/|\/\*|<!--|@\*)/.test(token);
  let code = text.replace(literals, blank), imports = text.replace(literals, token => comments(token) ? blank(token) : token);
  if (/\.(py|rb|sh|ps1|ya?ml|tf)$/i.test(file)) {
    code = code.replace(/#[^\n]*/g, blank);
    imports = imports.replace(/#[^\n]*/g, blank);
  }
  const declarations = [];
  const pattern = /\b(class|interface|record|struct|enum|function|def|func)\s+([A-Za-z_$][\w$]*)|\bexport\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of code.matchAll(pattern)) {
    const name = match[2] || match[3], start = match.index;
    let end = code.indexOf('\n', start); if (end < 0) end = code.length;
    const open = code.indexOf('{', start), semi = code.indexOf(';', start);
    if (open >= 0 && (semi < 0 || open < semi)) {
      let depth = 1, cursor = open + 1;
      while (cursor < code.length && depth) { if (code[cursor] === '{') depth++; if (code[cursor] === '}') depth--; cursor++; }
      end = cursor;
    }
    const type = ['class', 'interface', 'record', 'struct', 'enum'].includes(match[1]);
    const header = code.slice(start + match[0].length, open >= 0 ? open : end);
    const contracts = type ? [...(header.match(/(?::|\bextends\b|\bimplements\b)\s*([^{};\n]+)/)?.[1] || '')
      .matchAll(/\bI[A-Z]\w*\b/g)].map(m => m[0]) : [];
    declarations.push({ name, start, end, nameStart: start + match[0].lastIndexOf(name), type, contracts });
  }
  const modules = [...imports.matchAll(/(?:\bfrom\s*|\brequire\s*\(\s*|\bimport\s*\(\s*|\bimport\s*|\bsrc\s*=\s*|\bhref\s*=\s*)['"]([^'"\n]+)['"]/g)]
    .map(match => ({ specifier: match[1], offset: match.index, resource: /^(src|href)\b/.test(match[0]) }));
  const namespace = /\bnamespace\s+([\w.]+)/.exec(code)?.[1];
  const usings = [...code.matchAll(/\busing\s+([\w.]+)\s*;/g)].map(match => match[1]);
  const members = new Set([...code.matchAll(/\b(?:public|private|protected|internal)\s+[^\n;{}()=]*?\s+([A-Za-z_]\w*)\s*(?=[={])/g)]
    .filter(match => !/\b(class|interface|record|struct|enum)\b/.test(match[0])).map(match => match[1]));
  return { code, declarations, modules, namespace, usings, members };
}

function discoverReferences(base, head, changed, readGit, isSource) {
  const files = new Set(changed), references = [], holds = [], cache = new Map(), searched = new Set();
  let incomplete = false;
  const stop = reason => { incomplete = true; if (!holds.includes(reason)) holds.push(reason); };
  const read = (revision, file) => {
    const key = `${revision}:${file}`;
    if (!cache.has(key)) {
      const entry = readGit('ls-tree', revision, '--', file);
      if (!entry) { cache.set(key, null); return null; } // Added/deleted in this revision.
      if (!entry.startsWith('100644 blob ') && !entry.startsWith('100755 blob ')) throw Error('Nonregular impact source');
      cache.set(key, source(readGit('show', key), file));
    }
    return cache.get(key);
  };
  const terminal = file => prose(file) || testFile(file) || /(^|\/)(Program|Startup|Main)\./i.test(file);
  const contracts = new Map();
  const localContract = (revision, name) => {
    const key = `${revision}:${name}`;
    if (contracts.has(key)) return contracts.get(key);
    let matches;
    try { matches = readGit('grep', '--no-textconv', '-I', '-l', '-z', '-E', '-e', `interface[[:space:]]+${name}([^[:alnum:]_]|$)`, revision, '--'); }
    catch (error) { if (error.status === 1) matches = ''; else throw error; }
    const paths = matches.split('\0').filter(Boolean).map(match => {
      if (!match.startsWith(revision + ':')) throw Error('Malformed contract result');
      return match.slice(revision.length + 1);
    }).filter(file => !prose(file) && isSource(file));
    if (paths.length > 20) { stop('Interface resolution budget reached; resolve missing scope before approval.'); return false; }
    const found = paths.some(file => read(revision, file)?.declarations.some(d => d.name === name && d.type));
    contracts.set(key, found); return found;
  };
  const initial = changed.filter(file => !prose(file) && !testFile(file));
  try {
    // Keep each revision's edges independent: a removed caller must not disappear,
    // and edges from different revisions must not fabricate a dependency chain.
    for (const revision of [base, head]) {
      let frontier = initial.map(file => ({ file, names: null }));
      for (let depth = 0; frontier.length && depth < 4; depth++) {
        const seeds = [];
        for (const item of frontier) {
          const parsed = read(revision, item.file); if (!parsed) continue;
          // Literal local resources are dependencies of the affected component,
          // not reasons to search for that resource's generic filename elsewhere.
          for (const module of parsed.modules.filter(m => m.resource && !/^(?:[a-z]+:|\/|#)/i.test(m.specifier))) {
            const file = path.posix.normalize(path.posix.join(path.posix.dirname(item.file), module.specifier));
            if (!isSource(file) || prose(file) || !read(revision, file)) continue;
            if (!files.has(file) && files.size >= 300) { stop('Affected-file budget reached; resolve missing scope before approval.'); break; }
            files.add(file);
            if (!changed.includes(file) && !references.some(r => r.file === file && r.revision === revision))
              references.push({ file, from: item.file, symbol: module.specifier, kind: 'resource', revision,
                line: parsed.code.slice(0, module.offset).split('\n').length });
          }
          const names = item.names || parsed.declarations.flatMap(d => [d.name, ...d.contracts]);
          for (const name of [...new Set(names)]) {
            const key = `${revision}:${item.file}:${name}`;
            if (!searched.has(key)) {
              const declaration = parsed.declarations.find(d => d.name === name);
              const contract = !declaration && parsed.declarations.some(d => d.contracts.includes(name));
              if (contract && !localContract(revision, name)) continue;
              searched.add(key); seeds.push({ file: item.file, name, namespace: declaration ? parsed.namespace : undefined,
                type: declaration?.type || contract, contract });
            }
          }
          // Filename searches only establish explicit module/resource references.
          const key = `${revision}:${item.file}:module`;
          if (!searched.has(key)) { searched.add(key); seeds.push({ file: item.file, name: stem(item.file), module: true }); }
        }
        const tokens = [...new Set(seeds.map(s => s.name).filter(n => /^[\w$-]+$/.test(n)))].sort();
        if (!tokens.length || incomplete) break;
        if (tokens.length > 128) { stop('Reference token budget reached; resolve missing scope before approval.'); break; }
        let matches;
        try { matches = readGit('grep', '--no-textconv', '-I', '-l', '-z', '-F',
          ...(tokens.some(t => t.startsWith('$') || t.endsWith('$')) ? [] : ['-w']),
          ...tokens.flatMap(t => ['-e', t]), revision, '--'); }
        catch (error) { if (error.status === 1) matches = ''; else throw error; }
        const next = new Map();
        const candidates = [], namespaces = new Map();
        for (const match of matches.split('\0').filter(Boolean)) {
          if (!match.startsWith(revision + ':')) throw Error('Malformed reference result');
          const file = match.slice(revision.length + 1);
          if (file.startsWith('.quality/') || prose(file) || !isSource(file)) continue;
          if (candidates.length >= 600) { stop('Reference candidate budget reached; resolve missing scope before approval.'); break; }
          const parsed = read(revision, file); if (!parsed) throw Error('Missing reference source');
          candidates.push({ file, parsed });
          if (parsed.namespace) for (const d of parsed.declarations) {
            if (!namespaces.has(d.name)) namespaces.set(d.name, new Set());
            namespaces.get(d.name).add(parsed.namespace);
          }
        }
        for (const { file, parsed } of candidates) {
          let edge;
          const owners = new Set();
          for (const seed of seeds.filter(s => s.file !== file)) {
            const positions = seed.module ? parsed.modules.filter(m => {
              if (!m.specifier.startsWith('.')) return false;
              const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), m.specifier));
              return target === seed.file || [target + '.js', target + '.ts', target + '.tsx', target + '.jsx',
                target + '.cjs', target + '.mjs', target + '/index.js', target + '/index.ts'].includes(seed.file);
            }).map(m => m.offset) : [...parsed.code.matchAll(new RegExp(`(?<![\\w$])${escape(seed.name)}(?![\\w$])`, 'g'))]
              .map(m => m.index).filter(offset => {
                if (parsed.declarations.some(d => d.nameStart === offset) && !seed.contract) return false;
                const before = parsed.code.slice(0, offset), after = parsed.code.slice(offset + seed.name.length);
                const qualified = seed.namespace && before.endsWith(seed.namespace + '.');
                // A property/field with the same spelling is not a use of a type.
                if (seed.type && !seed.contract && !qualified && (/\.\s*$/.test(before) ||
                    /^\s*(?:=|\{|=>)/.test(after) && !/[:,]\s*$/.test(before))) return false;
                if (seed.type && !qualified && parsed.members.has(seed.name) &&
                    !/(?:\bnew\s+|\btypeof\s*\(\s*|\bas\s+|\bis\s+|[<,:]\s*)$/.test(before) &&
                    !/^\s+[A-Za-z_]\w*\s*(?:[;=({]|$)/.test(after)) return false;
                if (!seed.namespace || !parsed.namespace || !namespaces.has(seed.name)) return true;
                // Exclude a proven different C# type, not merely a missing using:
                // global usings, aliases and Razor imports still need review.
                if (qualified) return true;
                if (parsed.namespace === seed.namespace || parsed.usings.includes(seed.namespace)) return true;
                return ![...namespaces.get(seed.name)].some(ns => ns !== seed.namespace &&
                  (parsed.namespace === ns || parsed.usings.includes(ns)));
              });
            for (const offset of positions) {
              edge ||= { file, from: seed.file, symbol: seed.module ? seed.file : seed.name,
                kind: seed.module ? 'module' : seed.contract ? 'contract' : 'identifier', revision, line: parsed.code.slice(0, offset).split('\n').length };
              // Only enclosing declarations propagate. Other classes in the same
              // file, tests and startup registration files are not new search roots.
              for (const d of parsed.declarations.filter(d => d.start <= offset && offset < d.end)) owners.add(d.name);
              if (seed.module) parsed.declarations.forEach(d => owners.add(d.name));
              if (/\.razor$/i.test(file)) owners.add(stem(file));
            }
          }
          if (!edge) continue;
          if (!files.has(file)) {
            if (files.size >= 300) { stop('Affected-file budget reached; resolve missing scope before approval.'); break; }
            files.add(file);
          }
          if (!changed.includes(file) && !references.some(r => r.file === file && r.revision === revision)) references.push(edge);
          if (!terminal(file) && owners.size) next.set(file, { file, names: [...owners] });
        }
        frontier = [...next.values()];
        if (incomplete) break;
        if (depth === 3 && frontier.some(item => item.names.some(name => !searched.has(`${revision}:${item.file}:${name}`))))
          stop('Reference depth budget reached; resolve missing scope before approval.');
      }
      if (incomplete) break;
    }
  } catch { stop('Source/reference inspection unavailable; recapture with readable Git objects.'); }
  return { files: [...files].sort(), references, holds, incomplete };
}

module.exports = { discoverReferences };
