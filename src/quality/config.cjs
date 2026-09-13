const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const bundleRoot = path.resolve(__dirname, '../..');
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const strings = value => Array.isArray(value) && value.every(nonempty);
function consumerFile(root, relative) {
  if (!nonempty(relative) || relative.includes('\\') || path.isAbsolute(relative) ||
      relative.split('/').some(part => !part || part === '.' || part === '..')) throw Error('Invalid consumer file path');
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(root + path.sep)) throw Error('Consumer file escapes repository');
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) throw Error('Consumer configuration cannot use symlinks');
  }
  if (!fs.statSync(resolved).isFile()) throw Error('Consumer configuration requires a regular file');
  return resolved;
}
function loadConfig(repositoryRoot) {
  const repoRoot = fs.realpathSync(repositoryRoot);
  const configPath = consumerFile(repoRoot, '.marc/config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (config.schema !== 1 || !config.ci || !/^[\w.-]+\.ya?ml$/.test(config.ci.workflow) ||
      !strings(config.ci.requiredArtifacts) || config.ci.requiredArtifacts.length === 0 ||
      !strings(config.technologies) || !config.guidance || !config.scans) throw Error('Invalid MARC config schema');
  const policyPath = consumerFile(repoRoot, config.policy);
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(policy.repository) ||
      !nonempty(policy.base) || policy.base.startsWith('-') || !/^[\w./-]+$/.test(policy.base) ||
      policy.base.includes('..') || !['automatic', 'report-only'].includes(policy.mode) ||
      !strings(policy.requiredJobs) || !policy.requiredJobs.length ||
      !strings(policy.reviewGates) || !policy.reviewGates.length ||
      !strings(policy.humanPathPatterns) || !strings(policy.uiPathPatterns) ||
      !Array.isArray(policy.producers) || !policy.producers.length ||
      policy.producers.some(p => !nonempty(p.author) || !strings(p.branchPrefixes) || !p.branchPrefixes.length) ||
      !['maxFiles', 'maxChangedLines', 'maxRepairCycles'].every(k => Number.isInteger(policy[k]) && policy[k] > 0))
    throw Error('Invalid consumer policy');
  for (const pattern of [...policy.humanPathPatterns, ...policy.uiPathPatterns]) new RegExp(pattern);
  const consumerFiles = ['.marc/config.json', config.policy];
  const guidance = {};
  for (const [name, relative] of Object.entries(config.guidance)) {
    guidance[name] = consumerFile(repoRoot, relative); consumerFiles.push(relative);
  }
  const scans = { ...config.scans };
  for (const key of ['nugetSolution', 'npmExceptions', 'secretExceptions']) if (scans[key]) {
    scans[key] = consumerFile(repoRoot, scans[key]);
    if (key !== 'nugetSolution') consumerFiles.push(config.scans[key]);
  }
  const namespace = policy.repository.toLowerCase().replace('/', '-') + '-' + crypto.createHash('sha256').update(policy.repository.toLowerCase()).digest('hex').slice(0, 12);
  const state = { ...config.state, ...config.state?.platforms?.[process.platform] };
  const stateRoot = state.root || path.join(os.homedir(), '.marc/state');
  if (!path.isAbsolute(stateRoot)) throw Error('State root must be absolute');
  let stateDirectory = path.join(stateRoot, namespace);
  if (state.legacyDirectory) {
    if (state.legacyRepository !== policy.repository || !path.isAbsolute(state.legacyDirectory))
      throw Error('Legacy state belongs to another repository or is not absolute');
    stateDirectory = state.legacyDirectory;
  }
  const platformPath = value => typeof value === 'string' ? value : value?.[process.platform];
  const artifactRoot = platformPath(config.artifactRoot) || path.join(os.tmpdir(), 'marc', namespace);
  if (!path.isAbsolute(artifactRoot)) throw Error('Artifact root must be absolute');
  const mergeLockName = state.mergeLockName || 'marc-merge.lock';
  if (!/^[\w.-]+\.lock$/.test(mergeLockName)) throw Error('Invalid merge lock name');
  if (config.toolCommit !== undefined && !/^[a-f0-9]{40}$/.test(config.toolCommit)) throw Error('Invalid pinned tool commit');
  if (config.crew !== undefined) require('./crew.cjs').validateCrewConfig(config.crew);
  const controllerDirectory = platformPath(config.controllerDirectory) || null;
  if (controllerDirectory && !path.isAbsolute(controllerDirectory)) throw Error('Controller directory must be absolute');
  return { repoRoot, bundleRoot, configPath, policyPath, policy, ci: config.ci, technologies: config.technologies,
    guidance, scans, consumerFiles: [...new Set(consumerFiles)].sort(), stateDirectory, artifactRoot, mergeLockName,
    runLock: path.join(stateDirectory, 'run.lock'), ciRecoveryDirectory: path.join(stateDirectory, 'ci-recovery'),
    controllerDirectory, toolCommit: config.toolCommit || null, crew: config.crew || null };
}
function discoverRoot(cwd = process.cwd()) {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', windowsHide: true }).trim();
}
module.exports = { loadConfig, discoverRoot, consumerFile, bundleRoot };
