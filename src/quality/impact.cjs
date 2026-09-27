// Bounded lexical dependency evidence, not a compiler call graph or review verdict.
const path = require('node:path');
const prose = file => /\.(mdx?|txt|rst|adoc)$/i.test(file);
const testFile = file => /(^|\/)(tests?|__tests__|specs?)(\/|\.)|\.(test|spec)\.[^/]+$|(^|\/)test_[^/]+$|_test\.(py|go)$/i.test(file) ||
  /\.Tests?\/|Tests?\.(cs|vb|java)$/.test(file);
const blank = text => text.replace(/[^\n]/g, ' ');
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stem = file => path.posix.basename(file).split('.')[0];
const family = file => /\.(?:[cm]?[jt]sx?|html?)$/i.test(file) ? 'web-script' :
  /\.(?:cs|vb|razor)$/i.test(file) ? 'dotnet' : path.posix.extname(file).toLowerCase();

function affectedNames(parsed, ranges) {
  if (!ranges.length) return null; // Explicitly supplied unchanged seed: conservative caller replay.
  const offsets = [0];
  for (let i = 0; i < parsed.code.length; i++) if (parsed.code[i] === '\n') offsets.push(i + 1);
  const owners = new Set();
  for (const [line, count] of ranges) {
    // A zero-length side is an insertion/deletion boundary, not an unrelated
    // adjacent declaration. The nonempty revision supplies the changed owner.
    if (!count) continue;
    const start = offsets[line - 1] ?? parsed.code.length, end = offsets[line - 1 + count] ?? parsed.code.length;
    const overlaps = parsed.declarations.filter(d => d.start < end && d.end > start);
    if (!overlaps.length) return null; // Top-level/unsupported syntax: retain conservative file scope.
    for (const d of overlaps) {
      // A nested function body edit need not seed every enclosing function.
      if (overlaps.some(inner => inner !== d && inner.start > d.start && inner.end <= d.end && inner.start <= start && inner.end >= end - 1)) continue;
      owners.add(d.name); d.contracts.forEach(name => owners.add(name));
    }
  }
  return [...owners];
}

function source(text, file) {
  // Scratch archives and binary blobs need source-bound readable evidence from
  // the reviewer. Printable bytes inside an archive are not code declarations.
  if (/\.sb[23]$/i.test(file) || text.includes('\0')) text = '';
  // Preserve offsets/line numbers. Literal module paths are handled separately.
  // Choose native syntax before masking: // is Python floor division, apostrophe
  // starts a VB comment, and double quotes can delimit SQL identifiers.
  let comment = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|<!--[^]*?-->|@\*(?:[^]*?)\*@/.source;
  let literal = /@"(?:""|[^"])*"|"""[^]*?"""|'''[^]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/.source;
  if (/\.(py|rb|sh|ps1|ya?ml|r)$/i.test(file)) comment = /#[^\n]*/.source;
  if (/\.php$/i.test(file)) comment += '|' + /#(?!\[)[^\n]*/.source;
  if (/\.tf$/i.test(file)) comment += '|' + /#[^\n]*/.source;
  if (/\.vb$/i.test(file)) {
    comment = /'[^\n]*|(?:^[ \t]*|:[ \t]*)REM\b[^\n]*/.source;
    literal = /"(?:""|[^"\n])*"/.source;
  }
  if (/\.sql$/i.test(file)) {
    comment = /--[^\n]*|\/\*[\s\S]*?\*\//.source;
    literal = /'(?:''|[^'])*'/.source;
  }
  if (/\.(f|for|ftn|f90|f95|f03|f08)$/i.test(file)) {
    comment = /![^\n]*/.source;
    if (/\.(f|for|ftn)$/i.test(file)) comment += '|^[cC*][^\\n]*';
    literal = /'(?:''|[^'\n])*'|"(?:""|[^"\n])*"/.source;
  }
  if (/\.(pas|dpr|dpk)$/i.test(file)) {
    comment = /\/\/[^\n]*|\{[^]*?\}|\(\*[^]*?\*\)/.source;
    literal = /'(?:''|[^'\n])*'/.source;
  }
  if (/\.rs$/i.test(file)) {
    // Lifetimes such as 'a are identifiers, not the start of a string.
    literal = /r(?<hashes>#+)?"[^]*?"\k<hashes>(?!#)|"(?:\\.|[^"\\])*"|'(?:\\(?:u\{[\da-f]+\}|x[\da-f]{2}|.)|[^'\\\n])'/.source;
  }
  const literals = new RegExp(`(?<comment>${comment})|${literal}`, 'gmi');
  const code = text.replace(literals, blank);
  const imports = text.replace(literals, (...args) => args.at(-1).comment !== undefined ? blank(args[0]) : args[0]);
  const declarations = [];
  const pattern = /\.[cm]?[jt]sx?$/i.test(file)
    ? /\b(class|interface|enum|function)\s+([A-Za-z_$][\w$]*)|\bexport\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g
    : /\b(class|interface|record|struct|enum|function|def|func)\s+([A-Za-z_$][\w$]*)|\bexport\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g;
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
    .map(match => {
      const prefix = imports.slice(0, match.index);
      const named = prefix.match(/(?:\b(?:const|let|var)\s*\{([^{}]+)\}\s*=\s*|\bimport\s*\{([^{}]+)\}\s*)$/);
      return { specifier: match[1], offset: match.index, resource: /^(src|href)\b/.test(match[0]),
        names: named && !named[0].includes('...') ? (named[1] || named[2]).split(',').map(x => x.trim().split(/\s+as\s+|:/)[0].trim()) : null,
        bindings: named && !named[0].includes('...') ? (named[1] || named[2]).split(',').map(x => x.trim().split(/\s+as\s+|:/).at(-1).trim()) : null };
    });
  const localNames = new Set([...code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)].map(m => m[1]));
  const namespace = /\bnamespace\s+([\w.]+)/.exec(code)?.[1];
  const usings = [...code.matchAll(/\busing\s+([\w.]+)\s*;/g)].map(match => match[1]);
  const members = new Set([...code.matchAll(/\b(?:public|private|protected|internal)\s+[^\n;{}()=]*?\s+([A-Za-z_]\w*)\s*(?=[={])/g)]
    .filter(match => !/\b(class|interface|record|struct|enum)\b/.test(match[0])).map(match => match[1]));
  return { code, declarations, modules, namespace, usings, members, imports, localNames };
}

function discoverReferences(base, head, changed, readGit, isSource) {
  const files = new Set(changed), references = [], lexicalReferences = [], holds = [], cache = new Map(), searched = new Set(), hunks = new Map();
  let incomplete = false;
  const stop = reason => { incomplete = true; if (!holds.includes(reason)) holds.push(reason); };
  const read = (revision, file) => {
    const key = `${revision}:${file}`;
    if (!cache.has(key)) {
      const entry = readGit('ls-tree', revision, '--', file);
      if (!entry) { cache.set(key, null); return null; } // Added/deleted in this revision.
      // Gitlinks name commits in another repository, not readable source blobs.
      // Keep the changed path in the inventory and its ordinary policy gates.
      if (/^160000 commit [a-f0-9]{40}\t/.test(entry)) { cache.set(key, null); return null; }
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
  const changedNames = (revision, file, parsed) => {
    if (!hunks.has(file)) {
      const diff = readGit('diff', '--no-ext-diff', '--no-textconv', '--unified=0', base, head, '--', file);
      const ranges = { [base]: [], [head]: [] };
      for (const m of diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)) {
        ranges[base].push([Number(m[1]), m[2] === undefined ? 1 : Number(m[2])]);
        ranges[head].push([Number(m[3]), m[4] === undefined ? 1 : Number(m[4])]);
      }
      hunks.set(file, ranges);
    }
    return affectedNames(parsed, hunks.get(file)[revision]);
  };
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
          const scoped = item.names ?? (depth === 0 ? changedNames(revision, item.file, parsed) : null);
          const names = scoped ?? parsed.declarations.flatMap(d => [d.name, ...d.contracts]);
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
          if (!searched.has(key)) { searched.add(key); seeds.push({ file: item.file, name: stem(item.file), module: true, names: scoped }); }
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
          // Razor expressions share members with their code-behind component.
          // A property spelling must not become an edge to an unrelated type.
          if (/\.razor$/i.test(file)) {
            const companion = read(revision, file + '.cs');
            for (const owner of companion?.declarations.filter(d => d.type && d.name === stem(file)) || [])
              source(companion.code.slice(owner.start, owner.end), file + '.cs').members
                .forEach(name => parsed.members.add(name));
          }
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
            const modulePositions = seed.module ? parsed.modules.filter(m => {
              if (!m.specifier.startsWith('.')) return false;
              const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), m.specifier));
              const resolves = target === seed.file || [target + '.js', target + '.ts', target + '.tsx', target + '.jsx',
                target + '.cjs', target + '.mjs', target + '/index.js', target + '/index.ts'].includes(seed.file);
              return resolves && (!m.names || !seed.names || m.names.some(name => seed.names.includes(name)));
            }).map(m => m.offset) : [];
            // Explicit repository-relative invocation/resource paths cross language
            // boundaries (workflow commands, process launchers, FFI wrappers).
            if (seed.module) {
              for (const m of parsed.imports.matchAll(new RegExp(`(?:^|[\\s"'\\x60])(?:\\./)?${escape(seed.file)}(?=$|[\\s"'\\x60])`, 'gm')))
                modulePositions.push(m.index);
            }
            const positions = seed.module ? modulePositions : [...parsed.code.matchAll(new RegExp(`(?<![\\w$])${escape(seed.name)}(?![\\w$])`, 'g'))]
              .map(m => m.index).filter(offset => {
                if (family(seed.file) === 'web-script' && family(file) === 'web-script' &&
                    (parsed.localNames.has(seed.name) || parsed.declarations.some(d => d.name === seed.name))) return false;
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
              if (!seed.module && !seed.contract && (family(seed.file) !== family(file) ||
                  family(seed.file) === 'web-script' && /\.\s*$/.test(parsed.code.slice(0, offset)))) {
                if (!lexicalReferences.some(r => r.file === file && r.from === seed.file && r.symbol === seed.name && r.revision === revision))
                  lexicalReferences.push({ file, from: seed.file, symbol: seed.name, kind: 'lexical', revision,
                    line: parsed.code.slice(0, offset).split('\n').length });
                continue; // Inspectable lead, not evidence recruiting a different technology.
              }
              edge ||= { file, from: seed.file, symbol: seed.module ? seed.file : seed.name,
                kind: seed.module ? 'module' : seed.contract ? 'contract' : 'identifier', revision, line: parsed.code.slice(0, offset).split('\n').length };
              // Only enclosing declarations propagate. Other classes in the same
              // file, tests and startup registration files are not new search roots.
              for (const d of parsed.declarations.filter(d => d.start <= offset && offset < d.end)) owners.add(d.name);
              if (seed.module) {
                const imported = parsed.modules.find(m => m.offset === offset);
                for (const d of parsed.declarations) {
                  if (!imported?.bindings || imported.bindings.some(name =>
                    new RegExp(`(?<![\\w$])${escape(name)}(?![\\w$])`).test(parsed.code.slice(d.start, d.end)))) owners.add(d.name);
                }
              }
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
  return { files: [...files].sort(), references, lexicalReferences, holds, incomplete };
}

module.exports = { discoverReferences };
