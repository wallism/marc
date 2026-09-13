// Generated MARC bootstrap. Review logic lives in the pinned submodule.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
function resolveBundle() {
  const settings = JSON.parse(fs.readFileSync(path.join(root, '.marc/config.json'), 'utf8'));
  if (!/^[a-f0-9]{40}$/.test(settings.toolCommit || '')) throw Error('MARC toolCommit is missing or invalid');
  const bundle = path.join(root, '.marc/tool');
  const git = (...args) => execFileSync('git', args, { cwd: bundle, encoding: 'utf8', windowsHide: true, stdio: 'pipe' }).trim();
  if (!fs.existsSync(bundle) || fs.realpathSync(bundle) !== fs.realpathSync(git('rev-parse', '--show-toplevel')))
    throw Error('Initialize the pinned MARC submodule: git submodule update --init -- .marc/tool');
  if (git('rev-parse', 'HEAD') !== settings.toolCommit || git('status', '--porcelain'))
    throw Error('MARC submodule must be clean and match toolCommit');
  const entry = execFileSync('git', ['ls-files', '--stage', '--', '.marc/tool'],
    { cwd: root, encoding: 'utf8', windowsHide: true, stdio: 'pipe' }).trim();
  if (entry !== `160000 ${settings.toolCommit} 0\t.marc/tool`) throw Error('MARC submodule Git pin differs from configuration');
  return { root: bundle, commit: settings.toolCommit, skills: path.join(bundle, 'skills') };
}
module.exports = name => {
  if (!['marc.cjs', 'coq.cjs', 'config.cjs', 'scans.cjs', 'project-review.cjs', 'ci-recovery.cjs'].includes(name))
    throw Error('Unknown MARC module');
  return require(path.join(resolveBundle().root, 'src/quality', name));
};
if (require.main === module) {
  try { console.log(JSON.stringify(resolveBundle(), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
