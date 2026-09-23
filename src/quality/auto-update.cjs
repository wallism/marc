// Update MARC pins and generated integration files. Never import candidate PR code.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const upstream = 'https://github.com/wallism/marc.git';
const sha = value => /^[a-f0-9]{40}$/.test(value || '');
function requireUpstreamCi(commit, command) {
  const pages = endpoint => {
    const result = JSON.parse(command('gh', ['api', '--paginate', '--slurp', endpoint]));
    if (!Array.isArray(result) || !result.length) throw Error('MARC upstream CI response is unavailable');
    return result;
  };
  const runs = pages(`repos/wallism/marc/actions/workflows/node-checks.yml/runs?branch=master&event=push&head_sha=${commit}&per_page=100`)
    .flatMap(page => {
      if (!Array.isArray(page.workflow_runs)) throw Error('MARC upstream CI run evidence is malformed');
      return page.workflow_runs;
    }).filter(run => run?.head_sha === commit && run.head_branch === 'master' && run.event === 'push' &&
      run.path === '.github/workflows/node-checks.yml' && run.head_repository?.full_name === 'wallism/marc');
  if (!runs.length || runs.some(run => !Number.isSafeInteger(run.id) || run.id <= 0))
    throw Error(`MARC upstream CI is missing or malformed for ${commit}; pin unchanged`);
  const run = runs.sort((a, b) => b.id - a.id)[0];
  if (run.status !== 'completed' || run.conclusion !== 'success' || !Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1)
    throw Error(`MARC upstream CI run ${run.id} is ${run.status}/${run.conclusion}; pin unchanged`);
  const jobs = pages(`repos/wallism/marc/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`)
    .flatMap(page => {
      if (!Array.isArray(page.jobs)) throw Error('MARC upstream CI job evidence is malformed');
      return page.jobs;
    });
  for (const name of ['Node 24 (ubuntu-latest)', 'Node 24 (windows-latest)']) {
    const matches = jobs.filter(job => job?.name === name);
    if (matches.length !== 1 || matches[0].head_sha !== commit || matches[0].run_attempt !== run.run_attempt ||
        matches[0].status !== 'completed' || matches[0].conclusion !== 'success')
      throw Error(`MARC upstream CI requires one successful ${name} job for ${commit}, attempt ${run.run_attempt}; pin unchanged`);
    for (const stepName of ['Run npm run build', 'Run npm test']) {
      const steps = Array.isArray(matches[0].steps) ? matches[0].steps.filter(step => step?.name === stepName) : [];
      if (steps.length !== 1 || steps[0].status !== 'completed' || steps[0].conclusion !== 'success')
        throw Error(`MARC upstream CI requires successful ${stepName} in ${name}; pin unchanged`);
    }
  }
}
function checkLatest(context, command) {
  if (context.autoUpdate !== true || !context.toolCommit) return null;
  return resolveLatest(command);
}
function resolveLatest(command) {
  const result = command('git', ['ls-remote', '--exit-code', upstream, 'refs/heads/master']).trim();
  const match = result.match(/^([a-f0-9]{40})\s+refs\/heads\/master$/);
  if (!match) throw Error('Cannot resolve the latest MARC master commit');
  requireUpstreamCi(match[1], command);
  return match[1];
}
function updatePullRequest(context, live, latest, { registered, git: suppliedGit } = {}) {
  const p = context.policy;
  if (live.state !== 'open' || live.draft || live.base.ref !== p.base ||
      live.head.repo?.full_name !== p.repository || live.head.ref === p.base ||
      !registered(live.user?.login, live.head.ref, p)) throw Error('PR is not eligible for automatic MARC updates');
  if (!sha(latest) || !sha(live.head.sha)) throw Error('Invalid update identity');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-update-'));
  const git = suppliedGit || ((args, input) => execFileSync('git', ['-c', 'core.hooksPath=', ...args], {
    cwd: context.repoRoot, input, encoding: 'utf8', windowsHide: true, timeout: 120000,
    env: { ...process.env, GIT_INDEX_FILE: path.join(directory, 'index') }, stdio: ['pipe', 'pipe', 'pipe']
  }).trimEnd());
  try {
    git(['check-ref-format', 'refs/heads/' + live.head.ref]);
    git(['fetch', 'origin', 'refs/heads/' + live.head.ref]);
    if (git(['rev-parse', 'FETCH_HEAD']) !== live.head.sha) throw Error('PR changed before MARC update');
    const head = live.head.sha;
    const prepared = prepareUpgrade(head, latest, git);
    if (!prepared.files.length) return { status: 'current', commit: latest, head };
    const commit = git(['-c', 'commit.gpgSign=false', 'commit-tree', prepared.tree, '-p', head], `chore: update MARC to master ${latest}\n`);
    // The sole parent is the observed head. A concurrent divergent push is rejected.
    git(['push', 'origin', `${commit}:refs/heads/${live.head.ref}`]);
    const remote = git(['ls-remote', '--exit-code', 'origin', 'refs/heads/' + live.head.ref]);
    if (remote.split(/\s+/)[0] !== commit) throw Error('MARC update push state uncertain; inspect remote before retrying');
    return { status: 'updated', commit: latest, head: commit, previousHead: head, files: prepared.files,
      note: 'MARC auto-update integration files are included in this PR. Set autoUpdate: false on the trusted target branch to opt out.' };
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}
// Shared object-only preparation. Callers own branch eligibility, locks and publication.
// Git must use an isolated index; no fetched controller or installer is executed.
function prepareUpgrade(head, latest, git) {
  if (!sha(head) || !sha(latest)) throw Error('Invalid update identity');
  const configEntry = git(['ls-tree', head, '--', '.marc/config.json']);
  if (!/^100644 blob [a-f0-9]{40}\t\.marc\/config\.json$/.test(configEntry)) throw Error('Regular tracked MARC configuration required');
  const config = JSON.parse(git(['show', head + ':.marc/config.json']));
  if (!sha(config.toolCommit) || git(['ls-tree', head, '--', '.marc/tool']) !==
      `160000 commit ${config.toolCommit}\t.marc/tool`) throw Error('PR MARC pins disagree');
  // Candidate edits cannot redirect the installed bundle after merge.
  if (git(['show', head + ':.gitmodules']) !== git(['show', 'HEAD:.gitmodules']))
    throw Error('Submodule configuration changed; resolve before automatic update');
  const modules = git(['config', '--blob', 'HEAD:.gitmodules', '--get-regexp', '^submodule\\..*\\.(path|url)$']);
  const lines = modules.split('\n');
  const name = lines.find(line => line.endsWith('.path .marc/tool'))?.slice(0, -'.path .marc/tool'.length);
  if (!name || !lines.some(line => [name + '.url ' + upstream, name + '.url git@github.com:wallism/marc.git'].includes(line)))
    throw Error('MARC submodule must use the canonical upstream');
  if (config.toolCommit === latest) return { tree: git(['rev-parse', head + '^{tree}']), files: [] };
  git(['fetch', upstream, 'refs/heads/master']);
  if (git(['rev-parse', 'FETCH_HEAD']) !== latest) throw Error('MARC master moved during update; retry preflight');
  // Render upstream data using trusted code; never execute the fetched installer.
  git(['fetch', upstream, config.toolCommit]);
  const normalize = value => value.replaceAll('\r\n', '\n').trimEnd();
  if (normalize(git(['show', `${latest}:src/quality/forwarders.cjs`])) !==
      normalize(fs.readFileSync(path.join(__dirname, 'forwarders.cjs'), 'utf8')))
    throw Error('MARC forwarding generator changed; explicit installation migration required');
  const entries = new Map(git(['ls-tree', '-r', head]).split('\n').filter(Boolean).map(line => {
    const match = line.match(/^(\d+) \w+ [a-f0-9]{40}\t(.+)$/);
    if (!match) throw Error('Unsupported Git tree entry');
    return [match[2], match[1]];
  }));
  const directories = ['.agents/skills', '.claude/skills'].filter(directory =>
    [...entries.keys()].some(file => file.startsWith(directory + '/marc-crew-')));
  if (!directories.length) directories.push('.agents/skills');
  const { renderForwarders } = require('./forwarders.cjs');
  const render = commit => renderForwarders(file => git(['show', `${commit}:${file}`]) + '\n',
    git(['ls-tree', '--name-only', commit + ':skills']).split('\n').filter(name => name.startsWith('marc-crew-')), directories);
  const previousFiles = render(config.toolCommit), nextFiles = render(latest);
  const changedFiles = new Map();
  for (const [file, content] of nextFiles) {
    const segments = file.split('/');
    for (let i = 1; i < segments.length; i++) {
      if (entries.has(segments.slice(0, i).join('/'))) throw Error('Non-directory integration path: ' + file);
    }
    if (entries.has(file)) {
      if (entries.get(file) !== '100644') throw Error('Non-regular integration file: ' + file);
      const current = git(['show', `${head}:${file}`]);
      if (normalize(current) === normalize(content)) continue;
      if (!previousFiles.has(file) || normalize(current) !== normalize(previousFiles.get(file)))
        throw Error('Customized MARC forwarding file requires migration: ' + file);
    }
    changedFiles.set(file, content);
  }
  if (config.crew) {
    require('./crew.cjs').validateCrewConfig(config.crew);
    for (const member of config.crew.members) {
      const manifest = JSON.parse(git(['show', `${latest}:skills/marc-crew-${member.id}/crew.json`]));
      if (manifest.id !== member.id || manifest.compatibility !== 'marc-crew-v1' ||
          !/^\d+\.\d+\.\d+$/.test(manifest.version)) throw Error('Incompatible MARC member: ' + member.id);
      require('./crew.cjs').validateMember(manifest, { id: member.id, version: manifest.version });
      member.version = manifest.version;
    }
  }
  git(['read-tree', head]);
  const blob = git(['hash-object', '-w', '--stdin'], JSON.stringify({ ...config, toolCommit: latest }, null, 2) + '\n');
  git(['update-index', '--cacheinfo', `100644,${blob},.marc/config.json`]);
  git(['update-index', '--cacheinfo', `160000,${latest},.marc/tool`]);
  for (const [file, content] of changedFiles) {
    const fileBlob = git(['hash-object', '-w', '--stdin'], content);
    git(['update-index', '--add', '--cacheinfo', `100644,${fileBlob},${file}`]);
  }
  const tree = git(['write-tree']);
  return { tree, files: ['.marc/config.json', '.marc/tool', ...changedFiles.keys()] };
}
module.exports = { checkLatest, resolveLatest, prepareUpgrade, updatePullRequest };
