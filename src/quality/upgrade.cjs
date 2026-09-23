// Explicit, scheduler-neutral maintenance PR preparation from a trusted installation.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { resolveLatest, prepareUpgrade } = require('./auto-update.cjs');
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const usage = 'Usage: node .marc/tool/src/quality/upgrade.cjs --repo <trusted-checkout> [--branch <branch>]';

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.slice(2), value = args[i + 1];
    if (!['--repo', '--branch'].includes(args[i]) || !value || value.startsWith('-') || key in result) throw Error(usage);
    result[key] = value;
  }
  if (!result.repo) throw Error(usage);
  return result;
}

function runUpgrade(context, { branch = 'codex/marc-upgrade' } = {}, adapters = {}) {
  const { repository, base } = context.policy;
  if (!sha(context.toolCommit)) throw Error('A pinned trusted consumer installation is required');
  if (typeof branch !== 'string' || branch.startsWith('-') || branch === base) throw Error('Upgrade branch must differ from target branch');
  // The ordinary controller verifies origin, clean current target branch and clean pinned tool.
  (adapters.checkTrusted || (() => require('./marc.cjs').createController(context).checkTrustedCheckout()))();
  fs.mkdirSync(context.stateDirectory, { recursive: true });
  const lock = fs.openSync(context.runLock, 'wx');
  const lockIdentity = fs.fstatSync(lock);
  let temp;
  try {
    fs.writeFileSync(lock, JSON.stringify({ operation: 'upgrade-pr', repository, branch, pid: process.pid }) + '\n');
    temp = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-upgrade-'));
    const command = adapters.command || ((exe, args, input) => execFileSync(exe,
      exe === 'git' ? ['-c', 'core.hooksPath=', ...args] : args, {
        cwd: context.repoRoot, input, encoding: 'utf8', windowsHide: true, timeout: 120000,
        maxBuffer: 32 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, GIT_INDEX_FILE: path.join(temp, 'index'), GIT_TERMINAL_PROMPT: '0', GH_PROMPT_DISABLED: '1' }
      }).trimEnd());
    const git = (args, input) => command('git', args, input);
    const api = args => JSON.parse(command('gh', ['api', ...args]));
    git(['check-ref-format', 'refs/heads/' + branch]);
    const baseHead = git(['rev-parse', 'HEAD']);
    const latest = resolveLatest(command); // Explicit invocation works with autoUpdate:false.
    const ref = 'refs/heads/' + branch;
    const readRemote = () => {
      const value = git(['ls-remote', 'origin', ref]).trim();
      if (!value) return null;
      const parts = value.split(/\s+/);
      if (parts.length !== 2 || !sha(parts[0]) || parts[1] !== ref) throw Error('Malformed upgrade branch identity');
      return parts[0];
    };
    const remoteHead = readRemote();
    const directory = path.join(context.stateDirectory, 'upgrade-pr');
    fs.mkdirSync(directory, { recursive: true });
    const file = path.join(directory, crypto.createHash('sha256').update(repository + '\n' + branch).digest('hex') + '.json');
    let state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
    if (state && (state.schema !== 1 || state.repository !== repository || state.base !== base || state.branch !== branch ||
        (state.head !== null && !sha(state.head)) || (state.pending !== null && !sha(state.pending)) ||
        (state.cycle !== null && (!Number.isSafeInteger(state.cycle) || state.cycle < 1))))
      throw Error('Malformed or mismatched upgrade ownership record');
    let cycle = state?.cycle || null;
    const save = (head, pending = null) => {
      state = { schema: 1, repository, base, branch, head, pending, cycle };
      // Stage beside the destination so rename is atomic even with separate temp/state volumes.
      const adjacent = file + '.tmp';
      fs.writeFileSync(adjacent, JSON.stringify(state, null, 2) + '\n'); fs.renameSync(adjacent, file);
    };
    let pendingPublished = false;
    if (remoteHead) {
      if (!state || (!state.head && !state.pending)) throw Error('Existing upgrade branch has no ownership record; refusing to adopt it');
      git(['fetch', 'origin', ref]);
      if (git(['rev-parse', 'FETCH_HEAD']) !== remoteHead) throw Error('Upgrade branch moved during preflight');
      // Appended reports or operator commits are retained. Divergent/reset branches require inspection.
      const ancestor = head => {
        if (!head) return false;
        try { return git(['merge-base', head, remoteHead]) === head; } catch { return false; }
      };
      pendingPublished = ancestor(state.pending);
      if (!pendingPublished && !ancestor(state.head)) throw Error('Upgrade branch diverged from its ownership record');
    }
    const endpoint = `repos/${repository}/pulls`;
    const pages = api(['--paginate', '--slurp', `${endpoint}?state=all&head=${encodeURIComponent(repository.split('/')[0] + ':' + branch)}&per_page=100`]);
    if (!Array.isArray(pages) || pages.some(page => !Array.isArray(page))) throw Error('Malformed PR listing');
    const prs = pages.flat();
    if (prs.some(pr => !Number.isSafeInteger(pr.number) || !['open', 'closed'].includes(pr.state) ||
        pr.head?.ref !== branch || pr.head?.repo?.full_name !== repository || pr.base?.ref !== base || pr.base?.repo?.full_name !== repository))
      throw Error('Upgrade PR identity mismatch');
    const open = prs.filter(pr => pr.state === 'open');
    if (open.length > 1) throw Error('Multiple open upgrade PRs require inspection');
    let pr = open[0];
    const previous = prs.sort((a, b) => b.number - a.number)[0];
    if (!pr && previous && !previous.merged_at) throw Error('Upgrade PR is closed without merge; reopen it before running again');
    if (pr && (!remoteHead || pr.head.sha !== remoteHead)) throw Error('Open upgrade PR source changed or branch is missing');
    const resumingCycle = !pr && previous?.merged_at && cycle === previous.number && remoteHead && (!state.pending || pendingPublished);
    const newCycle = !pr && previous?.merged_at && !resumingCycle;
    if (newCycle && remoteHead && remoteHead !== previous.head.sha) throw Error('Merged upgrade branch changed; inspect before reuse');
    if (newCycle) cycle = previous.number;
    // Start a new cycle from the trusted target tree; otherwise append to the existing PR.
    const source = newCycle || !remoteHead ? baseHead : remoteHead;
    const prepared = prepareUpgrade(source, latest, git);
    if (!prepared.files.length && (!remoteHead || newCycle)) return { status: 'current', commit: latest, head: baseHead, pr: null };
    let head = remoteHead, status = 'current';
    if (prepared.files.length) {
      const parents = [...new Set([source, ...(newCycle && remoteHead ? [remoteHead] : [])])];
      head = git(['-c', 'commit.gpgSign=false', 'commit-tree', prepared.tree, ...parents.flatMap(p => ['-p', p])],
        `chore: update MARC to master ${latest}\n`);
      save(remoteHead, head); // Crash recovery may recognize this exact pending push.
      if (readRemote() !== remoteHead) throw Error('Upgrade branch moved before push');
      const target = git(['ls-remote', 'origin', 'refs/heads/' + base]).trim().split(/\s+/);
      if (git(['rev-parse', 'HEAD']) !== baseHead || target.length !== 2 || target[0] !== baseHead || target[1] !== 'refs/heads/' + base)
        throw Error('Trusted target moved before push; refresh the controller and retry');
      // Always append. A retained branch after squash merge gains the target as a parent too.
      git(['push', 'origin', `${head}:${ref}`]);
      if (readRemote() !== head) throw Error('Upgrade push state uncertain; inspect remote before retrying');
      save(head);
      status = 'updated';
    } else if (remoteHead) save(remoteHead);
    if (!pr) {
      pr = api(['-X', 'POST', endpoint, '-f', 'title=chore: update MARC', '-f', 'head=' + branch, '-f', 'base=' + base,
        '-f', 'body=Updates the pinned MARC bundle, existing member versions and generated integration files. This maintenance branch is reused: later runs append newer verified upstream commits to this PR. Inspect the current diff and pin. Each source/base/policy change requires fresh evidence and any applicable exact operator approval. All consumer CI, independent review, scan, browser, report-integrity, budget and guarded merge requirements still apply. This command does not approve, merge, activate or deploy the update.']);
      if (!Number.isSafeInteger(pr.number)) throw Error('PR creation response is uncertain; rerun to discover the existing PR');
      if (status === 'current') status = 'created';
    }
    return { status, commit: latest, head, branch, pr: pr.number, url: pr.html_url, files: prepared.files,
      note: 'Recapture changed identities and obtain fresh applicable human approval; existing records and budgets are preserved.' };
  } finally {
    try { if (temp) fs.rmSync(temp, { recursive: true, force: true }); }
    finally {
      fs.closeSync(lock);
      let current;
      try { current = fs.lstatSync(context.runLock); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (current && current.dev === lockIdentity.dev && current.ino === lockIdentity.ino) fs.unlinkSync(context.runLock);
    }
  }
}

function main(args = process.argv.slice(2)) {
  if (args.length === 1 && args[0] === '--help') { console.log(usage); return; }
  const { repo, ...options } = parseArgs(args);
  console.log(JSON.stringify(runUpgrade(require('./config.cjs').loadConfig(repo), options), null, 2));
}
module.exports = { runUpgrade, parseArgs, main };
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
