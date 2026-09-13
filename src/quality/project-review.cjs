const path = require('node:path').posix;

// A conservative XML reader, not an MSBuild evaluator. Unsupported XML stays held.
// Preserve all non-content syntax so an exemption cannot hide build/property changes.
function parse(contents) {
  const root = { children: [] }, stack = [root];
  const tokens = /<!--[\s\S]*?-->|<\?xml\s[^?]*\?>|<\/?[A-Za-z_][\w.-]*(?:\s+(?:"[^"]*"|'[^']*'|[^'"<>])*)?\s*\/?>|[^<]+/gy;
  let offset = 0, match;
  while ((match = tokens.exec(contents))) {
    if (match.index !== offset) throw Error('Unsupported project XML');
    offset = tokens.lastIndex;
    const raw = match[0];
    if (!raw.trim()) continue;
    const parent = stack.at(-1);
    if (raw.startsWith('</')) {
      if (stack.length < 2 || raw !== `</${parent.name}>`) throw Error('Unbalanced project XML');
      parent.close = raw; stack.pop();
    } else if (raw.startsWith('<') && !raw.startsWith('<!--') && !raw.startsWith('<?')) {
      const name = raw.match(/^<([\w.-]+)/)[1];
      const attrs = {}, body = raw.slice(name.length + 1).replace(/\/?\s*>$/, '');
      let rest = body;
      while (rest.trim()) {
        const attr = rest.match(/^\s+([\w.-]+)\s*=\s*("[^"]*"|'[^']*')/);
        if (!attr || Object.hasOwn(attrs, attr[1])) throw Error('Unsupported project attributes');
        attrs[attr[1]] = attr[2].slice(1, -1); rest = rest.slice(attr[0].length);
      }
      const node = { name, raw, attrs, children: [] };
      parent.children.push(node);
      if (!raw.endsWith('/>')) stack.push(node);
    } else parent.children.push(raw);
  }
  if (offset !== contents.length || stack.length !== 1 ||
      root.children.filter(n => typeof n !== 'string').length !== 1 ||
      root.children.find(n => typeof n !== 'string')?.name !== 'Project') throw Error('Unsupported project XML');
  return root;
}

function markdownPath(project, value) {
  if (typeof value !== 'string') return null;
  const normalized = value.replaceAll('\\', '/');
  // No globs, expressions, entities, parent traversal, absolute paths or device names.
  if (!/^(?:[A-Za-z0-9_-][A-Za-z0-9_. -]*\/)*[A-Za-z0-9_-][A-Za-z0-9_. -]*\.md$/.test(normalized) ||
      normalized.split('/').some(part => /[. ]$/.test(part) || /^(CON|PRN|AUX|NUL|COM\d|LPT\d)(\.|$)/i.test(part))) return null;
  return path.join(path.dirname(project), normalized);
}

function stripContent(tree, project, regularFile, references) {
  const projectNode = tree.children.find(n => n.name === 'Project');
  for (const group of projectNode.children) {
    if (group.name !== 'ItemGroup' || Object.keys(group.attrs).length) continue;
    group.children = group.children.filter(item => {
      if (!['None', 'Content'].includes(item.name)) return true;
      const keys = Object.keys(item.attrs);
      if (keys.length !== 1 || !['Include', 'Update'].includes(keys[0])) return true;
      const target = markdownPath(project, item.attrs[keys[0]]);
      if (!target || !regularFile(target)) return true;
      const names = new Set();
      for (const metadata of item.children) {
        if (!['CopyToOutputDirectory', 'CopyToPublishDirectory'].includes(metadata.name) ||
            names.has(metadata.name) || Object.keys(metadata.attrs).length || metadata.children.length !== 1 ||
            !['Never', 'PreserveNewest', 'Always'].includes(metadata.children[0]?.trim?.())) return true;
        names.add(metadata.name);
      }
      references.add(target); return false;
    });
  }
  // A newly introduced unconditional group containing only approved content is harmless.
  projectNode.children = projectNode.children.filter(n => !(n.name === 'ItemGroup' &&
    !Object.keys(n.attrs).length && !n.children.length));
  return tree;
}

function classifyProjectChange(file, before, after, regularBefore, regularAfter) {
  const held = reason => ({ file, classification: 'review-required', reason, markdownFiles: [] });
  try {
    if (!before || !after) return held('New, deleted or non-regular project requires review.');
    const references = new Set();
    const a = stripContent(parse(before), file, regularBefore, references);
    const b = stripContent(parse(after), file, regularAfter, references);
    if (references.size && JSON.stringify(a) === JSON.stringify(b))
      return { file, classification: 'content-only', reason: 'Only regular Markdown content entries changed.',
        markdownFiles: [...references].sort() };
    const previous = stripPackages(a), current = stripPackages(b);
    if (JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(previous) !== JSON.stringify(current))
      return { file, classification: 'dependency-only', reason: 'Package changes require automated identity, version and vulnerability verification.',
        markdownFiles: [...references].sort(), dependencies: current.filter(entry =>
          !previous.some(old => JSON.stringify(old) === JSON.stringify(entry))) };
    return held('Build configuration, unusual references or unresolved project syntax require investigation.');
  } catch { return held('Unsupported or malformed project syntax requires review.'); }
}

const exactVersion = value => typeof value === 'string' && /^\d+\.\d+(?:\.\d+){0,2}(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(value);
function stripPackages(tree) {
  const project = tree.children.find(n => n.name === 'Project'), packages = [];
  for (const group of project.children) {
    if (group.name !== 'ItemGroup' || Object.keys(group.attrs).length) continue;
    group.children = group.children.filter(item => {
      if (item.name !== 'PackageReference') return true;
      const allowed = ['Include', 'Update', 'Version', 'PrivateAssets', 'IncludeAssets', 'ExcludeAssets'];
      if (Object.keys(item.attrs).some(key => !allowed.includes(key)) ||
          Boolean(item.attrs.Include) === Boolean(item.attrs.Update)) return true;
      const name = item.attrs.Include || item.attrs.Update;
      if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(name)) return true;
      const metadata = { ...item.attrs };
      for (const child of item.children) {
        if (!['Version', 'PrivateAssets', 'IncludeAssets', 'ExcludeAssets'].includes(child.name) ||
            Object.hasOwn(metadata, child.name) || Object.keys(child.attrs).length ||
            child.children.length !== 1 || typeof child.children[0] !== 'string') return true;
        metadata[child.name] = child.children[0].trim();
      }
      if (!exactVersion(metadata.Version) || Object.values(metadata).some(value => /[$@%&<>]/.test(value))) return true;
      packages.push({ name, requestedVersion: metadata.Version, configuration: metadata });
      return false;
    });
  }
  project.children = project.children.filter(n => !(n.name === 'ItemGroup' && !Object.keys(n.attrs).length && !n.children.length));
  if (new Set(packages.map(p => p.name.toLowerCase())).size !== packages.length) throw Error('Ambiguous package references');
  return packages.sort((a, b) => a.name.localeCompare(b.name));
}

function dependencyReviewPasses(e, changes) {
  const security = e.gates?.security, review = security?.dependencyReview;
  const evidence = list => Array.isArray(list) && list.length > 0 && list.every(x => typeof x === 'string' && x.trim());
  if (e.routing?.route === 'simple' || security?.verdict !== 'pass' || security.sourceHead !== e.sourceHead ||
      security.base !== e.base || security.policyHash !== e.policyHash || review?.verdict !== 'pass' ||
      !Number.isSafeInteger(e.ci?.runId) || e.ci.runId <= 0 || !Number.isSafeInteger(e.ci.runAttempt) || e.ci.runAttempt <= 0 ||
      review.ciRunId !== e.ci.runId || review.ciRunAttempt !== e.ci.runAttempt ||
      !Array.isArray(review.issues) || review.issues.length || !Array.isArray(review.vulnerabilities) || review.vulnerabilities.length ||
      review.transitiveChecked !== true || !evidence(review.auditEvidence) || !Array.isArray(review.packages)) return false;
  return changes.every(change => Array.isArray(change.dependencies) && change.dependencies.every(dependency => {
    const matches = review.packages.filter(p => p.file === change.file && p.name === dependency.name &&
      p.requestedVersion === dependency.requestedVersion);
    return matches.length === 1 && matches[0].knownPackage === true && evidence(matches[0].officialSources) &&
      matches[0].officialSources.every(url => /^https:\/\//.test(url)) && evidence(matches[0].resolvedVersions) &&
      matches[0].resolvedVersions.every(exactVersion);
  }));
}

function classifyNpmChange(file, before, after) {
  const held = reason => ({ file, classification: 'review-required', reason, markdownFiles: [] });
  const sections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
  const namePattern = /^(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/;
  try {
    if (!before || !after) return held('New, deleted or non-regular manifest requires investigation.');
    const a = JSON.parse(before), b = JSON.parse(after);
    const extract = document => {
      const dependencies = [];
      const stripSections = obj => {
        for (const section of sections) {
          if (obj[section] === undefined) continue;
          if (!obj[section] || typeof obj[section] !== 'object' || Array.isArray(obj[section])) throw Error('Invalid dependency map');
          for (const [name, version] of Object.entries(obj[section])) {
            if (!namePattern.test(name) || typeof version !== 'string' || !/^[~^<>=|*0-9A-Za-z.+ -]+$/.test(version))
              throw Error('Unusual dependency source');
            dependencies.push({ name, requestedVersion: version });
          }
          delete obj[section];
        }
      };
      if (file.endsWith('/package-lock.json') || file === 'package-lock.json') {
        if (document.lockfileVersion !== 3 || !document.packages || typeof document.packages !== 'object')
          throw Error('Unsupported lockfile format');
        const root = document.packages[''];
        if (!root) throw Error('Missing lockfile root');
        stripSections(root);
        for (const [location, item] of Object.entries(document.packages)) {
          if (location === '') continue;
          const name = location.split('node_modules/').at(-1);
          if (!location.startsWith('node_modules/') || !namePattern.test(name) || item.link || !exactVersion(item.version) ||
              !/^https:\/\/registry\.npmjs\.org\//.test(item.resolved || '') ||
              !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(item.integrity || '')) throw Error('Unusual or unverifiable locked dependency');
          dependencies.push({ name, requestedVersion: item.version, configuration: item });
        }
        document.packages = { '': root };
      } else stripSections(document);
      return dependencies;
    };
    const previous = extract(a), current = extract(b);
    if (JSON.stringify(a) !== JSON.stringify(b) || JSON.stringify(previous) === JSON.stringify(current))
      return held('Manifest changes extend beyond dependencies (for example scripts, registry or project configuration).');
    const dependencies = current.filter(item => !previous.some(old => JSON.stringify(old) === JSON.stringify(item)))
      .map(({ name, requestedVersion }) => ({ name, requestedVersion }));
    return { file, classification: 'dependency-only', reason: 'Package changes require automated identity, version and vulnerability verification.',
      markdownFiles: [], dependencies: dependencies.filter((item, i) =>
        dependencies.findIndex(other => other.name === item.name && other.requestedVersion === item.requestedVersion) === i) };
  } catch { return held('Unresolved manifest syntax, package source or integrity requires investigation.'); }
}

const dependencyFile = file => /(?:\.csproj|(?:^|\/)package(?:-lock)?\.json)$/i.test(file);

function collectProjectChanges(base, head, files, readGit) {
  const regular = (commit, file) => {
    const entry = readGit('ls-tree', commit, '--', file);
    // Match the exact tree path as well as regular-file mode; no symlinks/submodules.
    return /^100644 blob [a-f0-9]{40}\t[^\r\n]+$/.test(entry) && entry.split('\t')[1] === file;
  };
  return files.filter(dependencyFile).map(file => (/\.csproj$/i.test(file) ? classifyProjectChange : classifyNpmChange)(file,
    regular(base, file) ? readGit('show', `${base}:${file}`) : null,
    regular(head, file) ? readGit('show', `${head}:${file}`) : null,
    target => regular(base, target), target => regular(head, target)));
}

function verifyProjectChanges(e, readGit) {
  if (JSON.stringify(collectProjectChanges(e.base, e.sourceHead, e.files, readGit)) !== JSON.stringify(e.projectChanges))
    throw Error('Project classification does not match committed source');
}

module.exports = { classifyProjectChange, classifyNpmChange, collectProjectChanges, verifyProjectChanges, dependencyReviewPasses, dependencyFile };
