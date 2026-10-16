// Bounded lexical dependency evidence, not a compiler call graph or review verdict.
const path = require('node:path');
const { createHash } = require('node:crypto');
const algorithm = createHash('sha256').update(require('node:fs').readFileSync(__filename)).digest('hex');
const checksum = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
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
    let start = offsets[line - 1] ?? parsed.code.length, end = offsets[line - 1 + count] ?? parsed.code.length;
    while (start < end && /\s/.test(parsed.code[start])) start++;
    while (end > start && /\s/.test(parsed.code[end - 1])) end--;
    if (start === end) continue;
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
  const namespaceRanges = [...code.matchAll(/\b(?:using|namespace)\s+[\w.]+\s*[;{]/g)]
    .map(m => [m.index, m.index + m[0].length]);
  // Parameter identifiers (including positional record properties) are not type uses.
  const parameterNames = [...code.matchAll(/[(,]\s*(?:(?:ref|out|in|params|this)\s+)?[\w.]+(?:<[^;(){}]+>)?(?:\[\])?\??\s+([A-Za-z_]\w*)\s*(?=[,)=])/g)]
    .map(m => m.index + m[0].lastIndexOf(m[1]));
  const methods = [];
  if (/\.cs$/i.test(file)) for (const m of code.matchAll(/(?:^|[;{}\n])\s*(?:(?:public|private|protected|internal|static|virtual|override|abstract|async|sealed|new|partial)\s+)*[\w.]+(?:<[^;{}()\n]+>)?(?:\[\])?\??\s+([A-Za-z_]\w*)\s*\([^;{}]*?\)\s*(\{|=>|;)/g)) {
    const nameStart = m.index + m[0].indexOf(m[1] + '(');
    const actualNameStart = nameStart >= m.index ? nameStart : m.index + m[0].search(new RegExp(`\\b${escape(m[1])}\\s*\\(`));
    const start = actualNameStart, marker = m.index + m[0].length;
    const owner = declarations.filter(d => d.type && d.start < start && d.end >= marker).sort((a, b) => b.start - a.start)[0];
    if (!owner || ['return', 'throw', 'new'].includes(m[0].trim().split(/\s+/)[0])) continue;
    let end = marker;
    if (m[2] === '{') {
      let depth = 1;
      while (end < code.length && depth) { if (code[end] === '{') depth++; if (code[end] === '}') depth--; end++; }
    } else if (m[2] === '=>') { end = code.indexOf(';', marker); end = end < 0 ? code.length : end + 1; }
    methods.push({ name: m[1], nameStart: actualNameStart, start: m.index + m[0].search(/[A-Za-z_]/), end, type: false, contracts: [], owner: owner.name });
  }
  return { code, declarations, methods, modules, namespace, usings, members, imports, localNames, namespaceRanges, parameterNames };
}

// A continuation is operational state, never approval evidence. The controller
// recomputes completed discovery from Git for decisions; callers store cursors
// outside candidate checkouts. Every page is bound to immutable inputs.
function discoverReferences(base, head, changed, readGit, isSource, options = {}) {
  const identity = createHash('sha256').update(JSON.stringify({ algorithm, base, head, changed,
    roots: options.roots ?? null, depth: options.depth ?? 4 })).digest('hex');
  const batchSize = options.batchSize ?? 600;
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 10000) throw Error('Invalid discovery batch size');
  const prior = options.continuation;
  if (prior && (prior.schema !== 1 || prior.identity !== identity)) throw Error('Stale discovery continuation');
  if (prior) {
    const { checksum: expected, ...contents } = prior;
    if (expected !== checksum(contents)) throw Error('Corrupt discovery continuation');
  }
  const state = prior ? structuredClone(prior) : { schema: 1, identity, files: changed, references: [], lexicalReferences: [],
    searched: [], tasks: [base, head].map(revision => ({ revision, depth: 0,
      frontier: options.roots ? options.roots.filter(r => r.revision === revision).map(r => ({ file: r.file, names: r.names })) :
        changed.filter(file => !prose(file) && !testFile(file)).map(file => ({ file, names: null })) })),
    current: null, nextScopes: [], diagnostics: [], inspected: 0 };
  delete state.checksum;
  const files = new Set(state.files), references = state.references, lexicalReferences = state.lexicalReferences;
  const searched = new Set(state.searched), holds = [], cache = new Map(), hunks = new Map();
  let incomplete = false, spent = 0;
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
    // Contract lookup uses the same immutable objects; no arbitrary hit-count truncation.
    const found = paths.some(file => read(revision, file)?.declarations.some(d => d.name === name && d.type));
    contracts.set(key, found); return found;
  };
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

  const result = (paused = false) => {
    state.files = [...files].sort(); state.searched = [...searched];
    return { files: state.files, references, lexicalReferences, holds: paused ? ['Reference scan paused; resume the captured continuation.'] : holds,
      incomplete: incomplete || paused, nextScopes: state.nextScopes, diagnostics: state.diagnostics,
      ...(paused ? { continuation: { ...state, checksum: checksum(state) } } : {}) };
  };
  try {
    while (state.current || state.tasks.length) {
      if (!state.current) {
        const task = state.tasks.shift(), { revision, depth, frontier } = task;
        if (!frontier.length) continue;
        const seeds = [];
        for (const item of frontier) {
          const parsed = read(revision, item.file); if (!parsed) continue;
          // Literal local resources are dependencies of the affected component,
          // not reasons to search for that resource's generic filename elsewhere.
          for (const module of parsed.modules.filter(m => m.resource && !/^(?:[a-z]+:|\/|#)/i.test(m.specifier))) {
            const file = path.posix.normalize(path.posix.join(path.posix.dirname(item.file), module.specifier));
            if (!isSource(file) || prose(file) || !read(revision, file)) continue;
            files.add(file);
            if (!changed.includes(file) && !references.some(r => r.file === file && r.revision === revision))
              references.push({ file, from: item.file, symbol: module.specifier, kind: 'resource', revision,
                line: parsed.code.slice(0, module.offset).split('\n').length });
          }
          const scoped = options.roots && item.names?.length === 0 ? null :
            item.names ?? (depth === 0 ? changedNames(revision, item.file, parsed) : null);
          const names = scoped ?? parsed.declarations.flatMap(d => [d.name, ...d.contracts]);
          for (const name of [...new Set(names)]) {
            const key = `${revision}:${item.file}:${name}`;
            if (!searched.has(key)) {
              const declaration = parsed.declarations.find(d => d.name === name) ||
                (options.roots ? parsed.methods.find(d => d.name === name) : undefined);
              const contract = !declaration && parsed.declarations.some(d => d.contracts.includes(name));
              if (contract && !localContract(revision, name)) continue;
              searched.add(key); seeds.push({ file: item.file, name, namespace: declaration ? parsed.namespace : undefined,
                type: declaration?.type || contract || /\.razor$/i.test(item.file) && name === stem(item.file),
                member: !!declaration?.owner, contract });
            }
          }
          // Filename searches only establish explicit module/resource references.
          const key = `${revision}:${item.file}:module`;
          if (!searched.has(key)) { searched.add(key); seeds.push({ file: item.file, name: stem(item.file), module: true, names: scoped }); }
        }

        const tokens = [...new Set(seeds.map(s => s.name).filter(n => /^[\w$-]+$/.test(n)))].sort();
        if (!tokens.length) continue;
        const paths = new Set();
        // Token groups and candidate pages bound each operation, not coverage.
        for (let i = 0; i < tokens.length; i += 128) {
          const group = tokens.slice(i, i + 128);
          let matches;
          try { matches = readGit('grep', '--no-textconv', '-I', '-l', '-z', '-F',
            ...(group.some(t => t.startsWith('$') || t.endsWith('$')) ? [] : ['-w']),
            ...group.flatMap(t => ['-e', t]), revision, '--'); }
          catch (error) { if (error.status === 1) matches = ''; else throw error; }
          for (const match of matches.split('\0').filter(Boolean)) {
            if (!match.startsWith(revision + ':')) throw Error('Malformed reference result');
            const file = match.slice(revision.length + 1);
            if (!file.startsWith('.quality/') && !prose(file) && isSource(file)) paths.add(file);
          }
        }
        state.current = { revision, depth, seeds, paths: [...paths].sort(), indexed: 0, matched: 0, namespaces: {}, next: [] };
        state.diagnostics.push({ revision, depth, symbols: tokens, candidates: paths.size });
      }
      const job = state.current, { revision, depth, seeds } = job;
      // Finish the namespace index before matching, so page order cannot change
      // collision resolution. Persist only metadata, never candidate source text.
      while (job.indexed < job.paths.length) {
        if (spent >= batchSize) return result(true);
        const file = job.paths[job.indexed], parsed = read(revision, file);
        if (!parsed) throw Error('Missing reference source');
        if (parsed.namespace) for (const d of parsed.declarations) {
          const values = Object.hasOwn(job.namespaces, d.name) ? job.namespaces[d.name] : [];
          if (!values.includes(parsed.namespace)) values.push(parsed.namespace);
          Object.defineProperty(job.namespaces, d.name, { value: values, enumerable: true, configurable: true, writable: true });
        }
        job.indexed++; spent++; state.inspected++;
      }
      const namespaces = new Map(Object.entries(job.namespaces).map(([name, values]) => [name, new Set(values)]));
      const next = new Map(job.next.map(item => [item.file, item]));
      while (job.matched < job.paths.length) {
        if (spent >= batchSize) { job.next = [...next.values()]; return result(true); }
        const file = job.paths[job.matched], parsed = read(revision, file);
        if (!parsed) throw Error('Missing reference source');
        if (/\.razor$/i.test(file)) {
          const companion = read(revision, file + '.cs');
          for (const owner of companion?.declarations.filter(d => d.type && d.name === stem(file)) || [])
            source(companion.code.slice(owner.start, owner.end), file + '.cs').members.forEach(name => parsed.members.add(name));
        }
          let edge;
          const owners = new Set();
          for (const seed of seeds.filter(s => s.file !== file || s.member)) {
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
                if (seed.file === file && parsed.methods.some(d => d.nameStart === offset)) return false;
                const before = parsed.code.slice(0, offset), after = parsed.code.slice(offset + seed.name.length);
                if (seed.type && (parsed.namespaceRanges.some(([a, b]) => a <= offset && offset < b) || parsed.parameterNames.includes(offset))) return false;
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
              const enclosing = [...parsed.declarations, ...(options.roots ? parsed.methods : [])].filter(d => d.start <= offset && offset < d.end);
              for (const d of enclosing.filter(d => !enclosing.some(inner => inner.start > d.start && inner.end <= d.end))) owners.add(d.name);
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
          if (!edge) { job.matched++; spent++; state.inspected++; continue; }
          if (!files.has(file)) {
            files.add(file);
          }
          if (!changed.includes(file) && !references.some(r => r.file === file && r.revision === revision)) references.push(edge);
          if (!terminal(file) && owners.size) next.set(file, { file, names: [...owners] });

        job.matched++; spent++; state.inspected++;
      }
      const frontier = [...next.values()];
      if (options.roots) {
        for (const item of frontier) state.nextScopes.push({ revision, ...item });
      } else if (depth + 1 < (options.depth ?? 4)) state.tasks.unshift({ revision, depth: depth + 1, frontier });
      else if (frontier.some(item => item.names.some(name => !searched.has(`${revision}:${item.file}:${name}`))))
        stop('Reference depth budget reached; resolve missing scope before approval.');
      state.current = null;
      if (incomplete) break;
    }
  } catch (error) { stop('Source/reference inspection unavailable; recapture with readable Git objects.'); }
  return result();
}

function completeReferences(base, head, changed, readGit, isSource, options = {}) {
  let continuation = options.continuation, result;
  const maxPages = options.maxPages ?? 100;
  for (let page = 0; page < maxPages; page++) {
    result = discoverReferences(base, head, changed, readGit, isSource, { ...options, continuation });
    if (!result.continuation) return result;
    continuation = result.continuation;
  }
  return result;
}

module.exports = { discoverReferences: completeReferences, scanReferencePage: discoverReferences, source, affectedNames };
