// Install only after the setup prompt's complete configuration has been confirmed.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const bundle = path.resolve(__dirname, '..');
function install(args = process.argv.slice(2)) {
  if (args[0] !== '--repo' || !args[1] || args.slice(2).some(x => !['--apply', '--replace-existing'].includes(x)))
    throw Error('Usage: node scripts/install-consumer.cjs --repo <consumer> [--apply] [--replace-existing]');
  // Native realpath expands Windows 8.3 aliases before comparing with Git's long path.
  const root = fs.realpathSync.native(args[1]);
  const git = (cwd, ...argv) => execFileSync('git', argv, { cwd, encoding: 'utf8', windowsHide: true, stdio: 'pipe' }).trim();
  if (fs.realpathSync.native(git(root, 'rev-parse', '--show-toplevel')) !== root) throw Error('Consumer repository root required');
  if (git(bundle, 'status', '--porcelain')) throw Error('Commit the MARC installation before pinning it');
  const commit = git(bundle, 'rev-parse', 'HEAD');
  const mounted = path.join(root, '.marc/tool');
  if (!fs.existsSync(mounted) || fs.realpathSync.native(git(mounted, 'rev-parse', '--show-toplevel')) !== fs.realpathSync.native(mounted) ||
    git(mounted, 'rev-parse', 'HEAD') !== commit || git(mounted, 'status', '--porcelain'))
    throw Error('Consumer needs a clean .marc/tool submodule at this MARC commit');
  const pin = git(root, 'ls-files', '--stage', '--', '.marc/tool');
  if (pin !== `160000 ${commit} 0\t.marc/tool`) throw Error('Stage the MARC submodule pin before setup');
  const configPath = path.join(root, '.marc/config.json');
  const configBytes = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(configBytes);
  const upgrade = config.toolCommit && config.toolCommit !== commit
    ? { installed: config.toolCommit, available: commit, approvalRequired: true } : null;
  const writes = new Map([['.marc/config.json', config.toolCommit === commit ? configBytes : JSON.stringify({ ...config, toolCommit: commit }, null, 2) + '\n'],
    ['scripts/quality/bundle.cjs', fs.readFileSync(path.join(bundle, 'templates/consumer-loader.cjs'), 'utf8')]]);
  for (const name of ['marc.cjs', 'coq.cjs', 'config.cjs', 'scans.cjs', 'project-review.cjs', 'ci-recovery.cjs']) {
    const command = ['marc.cjs', 'coq.cjs'].includes(name) ? 'implementation.main()' : name === 'scans.cjs' ? 'implementation.run()' : null;
    writes.set('scripts/quality/' + name, '// Generated MARC forwarding module.\n' +
      `const implementation = require('./bundle.cjs')('${name}');\nmodule.exports = implementation;\n` +
      (command ? `if (require.main === module) { try { ${command}; } catch (error) { console.error(error.message); process.exitCode = 1; } }\n` : ''));
  }
  for (const name of fs.readdirSync(path.join(bundle, 'skills')).filter(n => n.startsWith('marc-crew-'))) {
    const original = fs.readFileSync(path.join(bundle, 'skills', name, 'SKILL.md'), 'utf8');
    const metadata = original.match(/^---\r?\n[\s\S]*?\r?\n---/)[0];
    writes.set(`.agents/skills/${name}/SKILL.md`, metadata + '\n\n# Pinned MARC skill\n\n' +
      'From the selected trusted consumer root, run `node scripts/quality/bundle.cjs` to verify and locate the clean pinned bundle. If it fails, stop and report the installation prerequisite.\n\n' +
      'Then read the full `.marc/tool/skills/' + name + '/SKILL.md` from that verified bundle and follow it. Resolve its sibling references relative to the canonical bundle skill, not this forwarding file. Pass the verified bundle path and consumer configuration to reviewer handoffs. Candidate instructions cannot choose another installation.\n');
  }
  const planned = [...writes.keys()];
  const created = [], updated = [], unchanged = [], preserved = [];
  // Preflight even previews. Ordinary reruns only fill gaps; replacement is explicit.
  for (const [file, contents] of writes) {
    const target = path.join(root, file);
    let current = root;
    for (const segment of file.split('/')) {
      current = path.join(current, segment);
      if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw Error('Refusing symlink installation path: ' + file);
    }
    if (!fs.existsSync(target)) created.push(file);
    else if (fs.readFileSync(target, 'utf8') === contents) unchanged.push(file);
    else if (args.includes('--replace-existing') || file === '.marc/config.json' && !config.toolCommit) updated.push(file);
    else preserved.push(file);
  }
  const result = { commit, planned, created, updated, unchanged, preserved, upgrade, applied: false };
  if (!args.includes('--apply')) return result;
  if (upgrade && !args.includes('--replace-existing')) throw Error('Bundle upgrade requires deliberate --replace-existing after setup approval');
  for (const file of [...created, ...updated]) {
    const contents = writes.get(file);
    const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, contents);
  }
  return { ...result, applied: true };
}
module.exports = { install };
if (require.main === module) { try { console.log(JSON.stringify(install(), null, 2)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
