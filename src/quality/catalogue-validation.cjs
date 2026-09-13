// Repository contribution check; no model calls or consumer configuration required.
const fs = require('node:fs');
const path = require('node:path');
const { validateMember } = require('./crew.cjs');
const mandatory = ['marc', 'marc-simplicity', 'marc-simple-tests', 'marc-security',
  'marc-correctness', 'marc-code-quality', 'marc-test-integrity', 'marc-repair'];

function validateCatalogue(directory) {
  const root = fs.realpathSync(directory), skillsRoot = path.join(root, 'skills');
  function regular(file) {
    if (!file.startsWith(root + path.sep)) throw Error('Catalogue reference escapes repository: ' + file);
    const resolved = fs.realpathSync(file);
    if (!resolved.startsWith(root + path.sep)) throw Error('Catalogue reference escapes repository: ' + file);
    if (fs.lstatSync(file).isSymbolicLink() || !fs.statSync(file).isFile()) throw Error('Expected regular catalogue file: ' + file);
    return fs.readFileSync(file, 'utf8');
  }
  function inspectMarkdown(file, contents) {
    // Check inline local file links; external URLs and heading anchors are not fetched.
    for (const [, target] of contents.matchAll(/\]\(<?([^\s)>]+)>?\)/g)) {
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target)) continue;
      const local = decodeURIComponent(target.split(/[?#]/)[0]);
      if (local) regular(path.resolve(path.dirname(file), local));
    }
  }
  function inspectTree(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isSymbolicLink()) throw Error('Catalogue cannot use symlinks: ' + file);
      if (entry.isDirectory()) inspectTree(file);
      else if (entry.name.endsWith('.md')) inspectMarkdown(file, regular(file));
    }
  }
  const skills = fs.readdirSync(skillsRoot).sort(), members = [];
  for (const name of mandatory) if (!skills.includes(name)) throw Error('Required skill missing: ' + name);
  for (const name of skills) {
    const folder = path.join(skillsRoot, name);
    if (!/^marc(?:-[a-z0-9-]+)?$/.test(name) || fs.lstatSync(folder).isSymbolicLink() || !fs.statSync(folder).isDirectory())
      throw Error('Invalid skill directory: ' + name);
    const skill = regular(path.join(folder, 'SKILL.md'));
    const metadata = skill.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    if (!metadata || !new RegExp('^name: ' + name + '\\r?$', 'm').test(metadata) || !/^description: \S.+$/m.test(metadata))
      throw Error('Invalid skill metadata: ' + name);
    if (!regular(path.join(folder, 'IMPROVEMENTS.md')).trim()) throw Error('Empty improvement register: ' + name);
    const manifestFile = path.join(folder, 'crew.json');
    if (!mandatory.includes(name) || fs.existsSync(manifestFile)) {
      const member = JSON.parse(regular(manifestFile));
      validateMember(member, { id: name.slice('marc-'.length), version: member.version });
      members.push(member.id);
    }
    inspectTree(folder);
  }
  return { skills, members };
}

if (require.main === module) {
  try {
    const result = validateCatalogue(path.resolve(__dirname, '../..'));
    console.log(`Validated ${result.skills.length} skills and ${result.members.length} specialist manifests, applicability cases and local file links.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { validateCatalogue };
