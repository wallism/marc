// Run this trusted controller from the configured target branch, never from the PR being assessed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { collectProjectChanges, verifyProjectChanges, dependencyReviewPasses, dependencyFile } = require('./project-review.cjs');
const sha = x => typeof x === 'string' && /^[a-f0-9]{40}$/.test(x);
const digest = x => crypto.createHash('sha256').update(x).digest('hex');
const encode = x => JSON.stringify(x, null, 2) + '\n';
function registeredProducer(author, branch, p) {
  // GitHub CLI's GraphQL view uses app/dependabot; REST uses dependabot[bot].
  const login = author === 'app/dependabot' ? 'dependabot[bot]' : author;
  return (p.producers || []).some(producer => producer.author === login &&
    producer.branchPrefixes.some(prefix => typeof branch === 'string' && branch.startsWith(prefix)));
}
function selectQueue(prs, p, { base, policyHash, completed = [] }) {
  if (!sha(base) || !policyHash || !Array.isArray(completed)) throw Error('Invalid queue context');
  let selected = 0;
  return [...prs].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.number - b.number).map(pr => {
    const reasons = [];
    if (pr.state !== 'open' || pr.draft) reasons.push('PR is closed or draft');
    if (pr.base.ref !== p.base) reasons.push(`Target is not ${p.base}`);
    if (pr.head.repo?.full_name !== p.repository) reasons.push('Foreign or unavailable source repository');
    if (!registeredProducer(pr.user.login, pr.head.ref, p)) reasons.push('Unregistered author/branch pair');
    const key = digest(encode([pr.number, pr.head.sha, base, policyHash]));
    let status = 'held';
    if (!reasons.length) {
      if (completed.includes(key)) status = 'awaiting-change';
      else if (selected < 5) { selected++; status = 'review'; }
      else status = 'deferred';
    }
    return { pr: pr.number, url: pr.html_url, title: pr.title, author: pr.user.login, branch: pr.head.ref,
      sourceHead: pr.head.sha, base, policyHash, key, status, reasons };
  });
}
function reportPaths(pr, head, reportCreatedAt) {
  if (!Number.isSafeInteger(pr) || pr < 1 || !sha(head)) throw Error('Invalid PR or source SHA');
  let name = head; // Legacy evidence keeps its original SHA paths and bytes.
  if (reportCreatedAt !== undefined) {
    if (typeof reportCreatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(reportCreatedAt) ||
      !Number.isFinite(Date.parse(reportCreatedAt)) || new Date(reportCreatedAt).toISOString() !== reportCreatedAt)
      throw Error('Invalid report timestamp: use a real UTC minute');
    name = `${reportCreatedAt.slice(0, 10).replaceAll('-', '')}-${reportCreatedAt.slice(11, 16).replace(':', '')}-${pr}`;
  }
  return ['json', 'md'].map(ext => `.quality/reports/pr-${pr}/${name}.${ext}`);
}
function prepareReport(e, now = new Date()) {
  const prepared = { ...e, ...(e.reportCreatedAt === undefined ? { reportFormat: 'marc-v1' } : {}),
    reportCreatedAt: e.reportCreatedAt === undefined ?
    now.toISOString().slice(0, 16) + ':00.000Z' : e.reportCreatedAt };
  reportPaths(prepared.pr, prepared.sourceHead, prepared.reportCreatedAt);
  return prepared;
}
function isOwnReportPath(pr, file) {
  if (!Number.isSafeInteger(pr) || pr < 1) return false;
  const legacy = file.match(new RegExp(`^\\.quality/reports/pr-${pr}/([a-f0-9]{40})\\.(json|md)$`));
  if (legacy) return reportPaths(pr, legacy[1]).includes(file);
  const dated = file.match(new RegExp(`^\\.quality/reports/pr-${pr}/(\\d{4})(\\d{2})(\\d{2})-(\\d{2})(\\d{2})-${pr}\\.(json|md)$`));
  if (!dated) return false;
  const [, year, month, day, hour, minute] = dated;
  try { return reportPaths(pr, 'a'.repeat(40), `${year}-${month}-${day}T${hour}:${minute}:00.000Z`).includes(file); }
  catch { return false; }
}
function writeReportFiles(e, decision, worktree) {
  for (const component of ['.quality', '.quality/reports', `.quality/reports/pr-${e.pr}`]) {
    if (fs.lstatSync(path.join(worktree, component), { throwIfNoEntry: false })?.isSymbolicLink())
      throw Error('Report directory is a symlink');
  }
  const files = reportPaths(e.pr, e.sourceHead, e.reportCreatedAt);
  // Minute collisions fail closed before either member of an existing pair is touched.
  if (files.some(file => fs.lstatSync(path.join(worktree, file), { throwIfNoEntry: false })))
    throw Error('Report name already exists; preserve existing evidence and inspect the minute collision');
  const contents = [encode(e), reportMarkdown(e, decision)];
  files.forEach((file, i) => {
    const target = path.join(worktree, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents[i], { flag: 'wx' });
  });
  return files;
}
function evaluate(e, p, policyHash) {
  const reasons = [];
  const requireThat = (ok, reason) => { if (!ok) reasons.push(reason); };
  requireThat(e.schema === 1 && sha(e.sourceHead) && sha(e.base), 'Invalid evidence identity');
  requireThat(e.repository === p.repository && e.headRepository === p.repository, 'Foreign repository');
  requireThat(e.state === 'open' && e.draft === false && e.target === p.base, `PR must be open, ready and target ${p.base}`);
  requireThat(registeredProducer(e.author, e.branch, p), 'Unregistered PR origin');
  requireThat(e.policyHash === policyHash, 'Policy changed since capture');
  requireThat(e.baseIncluded === true, `PR must include captured ${p.base} before validation`);
  requireThat(Number.isInteger(e.repairCycles) && e.repairCycles >= 0 && e.repairCycles <= p.maxRepairCycles, 'Repair budget exceeded');
  requireThat(Array.isArray(e.files) && e.files.length > 0 && e.files.length <= p.maxFiles &&
    Number.isInteger(e.changedLines) && e.changedLines >= 0 && e.changedLines <= p.maxChangedLines, 'Diff outside size limits');
  const files = Array.isArray(e.files) ? e.files : [];
  const verifiedManifests = new Set();
  for (const file of files.filter(dependencyFile)) {
    const entries = e.projectChanges?.filter(change => change.file === file);
    const change = entries?.length === 1 ? entries[0] : null;
    const verified = p.projectFileReview === 'verified-changes-v1' && change?.reason?.trim() &&
      ((change.classification === 'content-only' && Array.isArray(change.markdownFiles) && change.markdownFiles.length > 0) ||
       (change.classification === 'dependency-only' && dependencyReviewPasses(e, [change])));
    if (verified) verifiedManifests.add(file);
    requireThat(verified,
    `${file}: unresolved project change or dependency verification; inspect the concrete concern`);
  }
  requireThat(!files.some(f => !verifiedManifests.has(f) && p.humanPathPatterns.some(r => new RegExp(r, 'i').test(f))),
    'Sensitive files require a human decision');
  requireThat(!files.some(f => f.startsWith('.quality/')), 'Existing quality evidence changes require a human decision');
  requireThat(e.ci?.verdict === 'pass' && e.ci.sourceHead === e.sourceHead &&
    validCiUrl(p.repository, e.ci.runUrl), 'Successful current CI missing');
  const simple = e.routing?.route === 'simple';
  if (e.routing && !['simple', 'full'].includes(e.routing.route)) reasons.push('Unknown review route');
  if (simple) {
    const r = e.routing;
    const guide = p.simpleRoute;
    requireThat(Number.isInteger(guide?.recommendedMaxFiles) && guide.recommendedMaxFiles > 0 &&
      Number.isInteger(guide?.recommendedMaxChangedLines) && guide.recommendedMaxChangedLines > 0,
      'Simple route size guidance missing');
    const exceedsGuide = files.length > guide?.recommendedMaxFiles || e.changedLines > guide?.recommendedMaxChangedLines;
    requireThat(!exceedsGuide || typeof r.sizeRationale === 'string' && r.sizeRationale.trim(),
      'Simple route above size guide requires a scope rationale');
    requireThat(['additive-tests', 'documentation', 'local-change'].includes(r.changeKind),
      'Simple route requires an explicit supported change kind');
    requireThat(!files.some(f => p.uiPathPatterns.some(pattern => new RegExp(pattern, 'i').test(f))) &&
      !Object.values(e.gates || {}).some(g => g.requiresBrowser === true), 'Simple route has UI impact; use full review');
    requireThat(r.verdict === 'pass' && r.sourceHead === e.sourceHead && r.base === e.base &&
      r.policyHash === policyHash && typeof r.reviewer === 'string' && r.reviewer.trim() &&
      typeof r.summary === 'string' && r.summary.trim() && Array.isArray(r.evidence) && r.evidence.length > 0 &&
      r.evidence.every(x => typeof x === 'string' && x.trim()) && Array.isArray(r.risks) && r.risks.length === 0 &&
      Array.isArray(r.findings) && r.findings.length === 0 && r.requiresBrowser !== true,
      'Simple routing evidence missing, stale or risky');
    requireThat(!p.reviewGates.some(name => e.gates?.[name]), 'Simple route cannot discard specialist results; use full review');
    const t = e.gates?.['simple-tests'];
    requireThat(['existing-sufficient', 'updated', 'not-needed'].includes(t?.testDecision) &&
      typeof t?.testRationale === 'string' && t.testRationale.trim(), 'Focused test decision and rationale required');
  }
  const gates = simple ? ['simple-tests'] : [...p.reviewGates];
  if (files.some(f => p.uiPathPatterns.some(r => new RegExp(r, 'i').test(f))) ||
      Object.values(e.gates || {}).some(g => g.requiresBrowser === true)) gates.push('browser');
  for (const name of gates) {
    const g = e.gates?.[name];
    requireThat(g?.verdict === 'pass' && g.sourceHead === e.sourceHead && g.base === e.base &&
      g.policyHash === policyHash && typeof g.reviewer === 'string' && g.reviewer.length > 0 &&
      typeof g.summary === 'string' && g.summary.length > 0 && Array.isArray(g.evidence) &&
      g.evidence.length > 0 && g.evidence.every(x => typeof x === 'string' && x.length > 0) &&
      Array.isArray(g.findings) && g.findings.every(f => f.severity === 'advisory'), `${name}: missing, stale or blocking evidence`);
  }
  return { eligible: reasons.length === 0, merge: reasons.length === 0 && p.mode === 'automatic', reasons };
}
function reportMarkdown(e, decision) {
  if (e.reportFormat !== undefined && e.reportFormat !== 'marc-v1') throw Error('Unknown report format');
  // Missing format identifies immutable reports produced before the MARC cutover.
  const name = e.reportFormat === 'marc-v1' ? 'MARC' : 'Chief of Quality';
  const clean = x => String(x ?? '').replace(/[\r\n|]/g, ' ');
  return `# ${name} report: PR ${e.pr}\n\n` +
    (e.reportCreatedAt === undefined ? '' : `Report created: ${e.reportCreatedAt.slice(0, 16).replace('T', ' ')} UTC\n\n`) +
    `Source commit: \`${e.sourceHead}\`\n\nBase commit: \`${e.base}\`\n\nPolicy digest: \`${e.policyHash}\`\n\n` +
    `Decision: ${decision.merge ? 'Eligible for guarded merge' : decision.eligible ? 'Report-only: would merge' : 'Held'}\n\n` +
    `Route: ${clean(e.routing?.route || 'full')} — ${clean(e.routing?.summary || 'Full review required by default')}\n\n` +
    (e.routing?.route === 'simple' && e.routing.changeKind ?
      `Change kind: ${clean(e.routing.changeKind)}\n\n` +
      (e.routing.sizeRationale ? `Size rationale: ${clean(e.routing.sizeRationale)}\n\n` : '') : '') +
    `CI: ${clean(e.ci?.verdict || 'blocked')} ${clean(e.ci?.runUrl || '')}\n\n` +
    (e.projectChanges?.length ? '| Project file | Classification | Reason |\n| --- | --- | --- |\n' +
      e.projectChanges.map(x => `| ${clean(x.file)} | ${clean(x.classification)} | ${clean(x.reason)} |`).join('\n') + '\n\n' : '') +
    (e.routing?.route === 'simple' ? 'Security, correctness, code-quality and test-integrity specialist reviews: Not required by simple route if routing is valid; a held decision never authorizes merging. Build, tests and security scans remain mandatory.\n\n' : '') +
    '| Gate | Verdict | Reviewer | Summary |\n| --- | --- | --- | --- |\n' +
    Object.entries(e.gates || {}).map(([name, g]) => `| ${clean(name)} | ${clean(g.verdict)} | ${clean(g.reviewer)} | ${clean(g.summary)} |`).join('\n') +
    '\n\n' + decision.reasons.map(x => `- ${x}`).join('\n') +
    '\n\nThe adjacent JSON contains findings and evidence references. This report assesses the source commit; it is not proof of merge or deployment.\n';
}
function changedFiles(base, head, pr, readGit) {
  // Prior MARC reports may accumulate on the PR. Only additions of regular files in
  // its exact evidence namespace are metadata; changing/removing reports is held.
  const additions = new Set(readGit('diff', '--name-only', '--diff-filter=A', '--no-renames', '-z', base, head, '--').split('\0'));
  return readGit('diff', '--name-only', '--no-renames', '-z', base, head, '--').split('\0').filter(Boolean).filter(f => {
    if (!isOwnReportPath(pr, f) || !additions.has(f)) return true;
    return !readGit('ls-tree', head, '--', f).startsWith('100644 blob ');
  });
}
function changedLines(base, head, files, maximum, readGit) {
  if (!files.length) return 0;
  // Only the size metric recognizes moves. Security/report inventories keep both paths.
  // Pin rename detection rather than inherit the operator's diff.renames/renameLimit.
  const output = readGit('diff', '--numstat', '-z', '--find-renames=50%', '-l0',
    '--no-ext-diff', '--no-textconv', base, head, '--', ...files);
  if (!output) return 0;
  const records = output.split('\0');
  if (records.pop() !== '') throw Error('Incomplete diff size output');
  let total = 0;
  for (let i = 0; i < records.length; i++) {
    const row = records[i].match(/^(\d+|-)\t(\d+|-)\t([\s\S]*)$/);
    if (!row) throw Error('Malformed diff size output');
    if (row[3] === '') {
      // Rename numstat has separate NUL-delimited old and new paths.
      if (!records[i + 1] || !records[i + 2]) throw Error('Incomplete rename size output');
      i += 2;
    }
    total += row[1] === '-' || row[2] === '-' ? maximum + 1 : Number(row[1]) + Number(row[2]);
  }
  return total;
}
function collectCi(head, pr, p, read, readJobs) {
  const runs = read(`repos/${p.repository}/actions/workflows/${p.workflow || 'ci.yml'}/runs?head_sha=${head}&per_page=100`).workflow_runs;
  const matching = runs.filter(r => r.head_sha === head && ['push', 'pull_request', 'workflow_dispatch'].includes(r.event) &&
    (r.event !== 'pull_request' || r.pull_requests?.some(x => x.number === pr)))
    .sort((a, b) => b.id - a.id);
  // A rerun retains its original ID. Do not start more work while an older run
  // for the same commit is pending, even if a newer run has already completed.
  const run = matching.find(r => r.status !== 'completed') || matching[0];
  if (!run) return { verdict: 'blocked', sourceHead: head, status: 'missing', reason: 'No matching CI run for this commit' };
  const identity = { sourceHead: head, runUrl: run.html_url, runId: run.id,
    runAttempt: run.run_attempt, conclusion: run.conclusion };
  if (run.status !== 'completed') return { ...identity, verdict: 'blocked', status: 'pending', reason: 'CI is still running or waiting; reuse this run' };
  if (run.conclusion !== 'success') return { ...identity, verdict: 'blocked', status: 'failed', reason: `CI concluded ${run.conclusion}` };
  const jobs = readJobs(run.id);
  const passed = p.requiredJobs.every(name => jobs.filter(j => j.name === name).length === 1 &&
    jobs.find(j => j.name === name).conclusion === 'success');
  return { ...identity, verdict: passed ? 'pass' : 'blocked', status: passed ? 'complete' : 'incomplete',
    reason: passed ? 'Reused hosted CI for this exact commit' : 'Required jobs missing, duplicated or unsuccessful',
    jobs: jobs.map(({ name, conclusion }) => ({ name, conclusion })) };
}
function verifyReportCommit(e, live, decision, readGit) {
  const paths = reportPaths(e.pr, e.sourceHead, e.reportCreatedAt);
  readGit('merge-base', '--is-ancestor', e.sourceHead, live.head.sha);
  const changed = readGit('diff', '--name-only', '--no-renames', '-z', e.sourceHead, live.head.sha, '--').split('\0').filter(Boolean);
  if (changed.length !== 2 || changed.some(f => !paths.includes(f))) throw Error('Changes after review exceed the exact report files');
  const expected = [encode(e), reportMarkdown(e, decision)];
  paths.forEach((f, i) => {
    if (!readGit('ls-tree', live.head.sha, '--', f).startsWith('100644 blob ')) throw Error('Report is not a regular file');
    if (readGit('show', `${live.head.sha}:${f}`) !== expected[i].trimEnd()) throw Error('Published report differs from trusted evidence');
  });
}
function pushMerge(run, base, head, pr, targetBranch) {
  if (!sha(base) || !sha(head) || !Number.isSafeInteger(pr) || pr < 1 || !/^[\w./-]+$/.test(targetBranch || '') || targetBranch.startsWith('-') || targetBranch.includes('..')) throw Error('Invalid merge identity');
  run(['merge-base', '--is-ancestor', base, head]);
  const tree = run(['rev-parse', `${head}^{tree}`]);
  const commit = run(['-c', 'core.hooksPath=', 'commit-tree', tree, '-p', base, '-p', head],
    `Merge pull request #${pr}: MARC validated\n`);
  run(['-c', 'core.hooksPath=', 'push', 'origin', `${commit}:refs/heads/${targetBranch}`]);
  return commit;
}
function acquireMergeLock(common, lockName = 'marc-merge.lock') {
  // Old and new entry points must contend for the same lock, including during rollback.
  if (!/^[\w.-]+\.lock$/.test(lockName)) throw Error('Invalid merge lock name');
  const lock = path.join(common, lockName);
  const fd = fs.openSync(lock, 'wx');
  return () => { fs.closeSync(fd); fs.unlinkSync(lock); };
}

const { loadConfig, discoverRoot } = require('./config.cjs');
function validCiUrl(repository, url) {
  const prefix = 'https://github.com/' + repository + '/actions/runs/';
  return typeof url === 'string' && url.startsWith(prefix) && /^\d+$/.test(url.slice(prefix.length));
}
function trustedPolicy(context = loadConfig(discoverRoot())) {
  const readGit = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trimEnd();
  const bundleFiles = readGit(context.bundleRoot, 'ls-files', '-z', 'src/quality', 'scripts', 'templates', 'AGENTS.md', 'skills/marc',
    ...['security','correctness','code-quality','test-integrity','repair','simplicity','simple-tests'].map(x => 'skills/marc-' + x))
    .split('\0').filter(Boolean).filter(x => x !== 'src/quality/policy.json').sort();
  for (const suffix of ['', '-security', '-correctness', '-code-quality', '-test-integrity', '-repair', '-simplicity', '-simple-tests']) {
    if (!bundleFiles.includes(`skills/marc${suffix}/SKILL.md`)) throw Error('Required trusted skill missing');
  }
  const tracked = new Set(readGit(context.repoRoot, 'ls-files', '-z').split('\0'));
  if (context.consumerFiles.some(file => !tracked.has(file))) throw Error('Consumer governance must be tracked');
  const chunks = [Buffer.from(encode({ schema: 1, repository: context.policy.repository }))];
  for (const [kind, root, files] of [['tool', context.bundleRoot, bundleFiles], ['consumer', context.repoRoot, context.consumerFiles]]) {
    if (!files.length) throw Error('Trusted policy inputs missing');
    for (const file of files) chunks.push(Buffer.from(kind + ':' + file + '\0'), fs.readFileSync(path.join(root, file)));
  }
  return { policy: context.policy, policyHash: digest(Buffer.concat(chunks)) };
}
function createController(context, adapters = {}) {
  const ROOT = context.repoRoot, REPO = context.policy.repository;
  function command(exe, args, cwd = ROOT, input) {
    return execFileSync(exe, args, { cwd, input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
      timeout: 120000, windowsHide: true }).trimEnd();
  }
  const git = adapters.git || ((...args) => command('git', args));
  const api = adapters.api || (endpoint => JSON.parse(command('gh', ['api', endpoint])));
  function capture(pr, p, hash) {
    reportPaths(pr, 'a'.repeat(40));
    const live = api(`repos/${REPO}/pulls/${pr}`);
    const base = api(`repos/${REPO}/git/ref/heads/${encodeURIComponent(context.policy.base)}`).object.sha;
    git('fetch', 'origin', `refs/pull/${pr}/head`);
    const head = git('rev-parse', 'FETCH_HEAD');
    if (head !== live.head.sha) throw Error('PR changed during capture');
    let baseIncluded = false;
    try { git('merge-base', '--is-ancestor', base, head); baseIncluded = true; } catch {}
    const files = changedFiles(base, head, pr, git);
    const lineCount = changedLines(base, head, files, p.maxChangedLines, git);
    return { schema: 1, repository: REPO, pr, sourceHead: head, base, policyHash: hash,
      state: live.state, draft: live.draft, author: live.user.login, headRepository: live.head.repo?.full_name,
      branch: live.head.ref, target: live.base.ref, baseIncluded, files, changedLines: lineCount, repairCycles: 0,
      projectChanges: collectProjectChanges(base, head, files, git),
      gates: Object.fromEntries(p.reviewGates.map(name => [name, { verdict: 'blocked', sourceHead: head,
        base, policyHash: hash, reviewer: '', summary: 'Awaiting independent review', evidence: [], findings: [] }])),
      ci: collect(head, pr, p) };
  }
  function assertLive(e) {
    const live = api(`repos/${REPO}/pulls/${e.pr}`);
    if (live.state !== 'open' || live.draft || live.base.ref !== context.policy.base || live.head.repo?.full_name !== REPO)
      throw Error('PR is no longer ready');
    if (api(`repos/${REPO}/git/ref/heads/${encodeURIComponent(context.policy.base)}`).object.sha !== e.base) throw Error('Target branch changed; recapture and review');
    git('fetch', 'origin', `refs/pull/${e.pr}/head`);
    if (git('rev-parse', 'FETCH_HEAD') !== live.head.sha) throw Error('PR changed during fetch');
    return live;
  }
  function run(args) {
    const [action, first, second] = args;
    if (!['queue', 'capture', 'decide', 'report', 'merge', 'recover-ci'].includes(action))
      throw Error('Usage: node src/quality/marc.cjs queue <queue.json> [completed-keys.json] | capture <PR> <evidence.json> | decide <evidence.json> | report <evidence.json> <PR-worktree> | merge <evidence.json> | recover-ci <current-capture.json> [investigation.json]');
    if (action === 'capture' && !second) throw Error('An external evidence path is required');
    checkTrustedCheckout();
    const { policy: p, policyHash: hash } = trustedPolicy(context);
    if (action === 'queue') {
      if (!first) throw Error('External queue output path required');
      const prs = JSON.parse(command('gh', ['api', '--paginate', '--slurp', `repos/${REPO}/pulls?state=open&per_page=100`])).flat();
      const base = api(`repos/${REPO}/git/ref/heads/${encodeURIComponent(context.policy.base)}`).object.sha;
      const completed = second ? JSON.parse(fs.readFileSync(second, 'utf8')) : [];
      const queue = selectQueue(prs, p, { base, policyHash: hash, completed });
      fs.writeFileSync(first, encode(queue));
      console.log(encode(queue)); return;
    }
    if (action === 'capture') { fs.writeFileSync(second, encode(capture(Number(first), p, hash))); return; }
    const e = JSON.parse(fs.readFileSync(first, 'utf8'));
    if (action === 'recover-ci') {
      const { recoverCi } = require('./ci-recovery.cjs');
      const investigation = second ? JSON.parse(fs.readFileSync(second, 'utf8')) : undefined;
      const result = recoverCi(e, p, hash, investigation, {
        directory: context.ciRecoveryDirectory,
        requiredArtifacts: context.ci.requiredArtifacts,
        now: () => new Date().toISOString(), verify: () => assertLive(e), collect: () => collect(e.sourceHead, e.pr, p),
        workflowMatches: head => git('show', `${head}:.github/workflows/${context.ci.workflow}`) === git('show', `HEAD:.github/workflows/${context.ci.workflow}`),
        artifacts: id => JSON.parse(command('gh', ['api', '--paginate', '--slurp',
          `repos/${REPO}/actions/runs/${id}/artifacts?per_page=100`])).flatMap(page => page.artifacts),
        send: request => command('gh', ['api', '--method', 'POST',
          ...(request.action === 'dispatch' ? [`repos/${REPO}/actions/workflows/${context.ci.workflow}/dispatches`, '--input', '-'] :
            [`repos/${REPO}/actions/runs/${request.runId}/rerun`])], ROOT,
          request.action === 'dispatch' ? JSON.stringify({ ref: request.branch }) : undefined)
      });
      console.log(encode(result)); return;
    }
    const decision = evaluate(e, p, hash);
    if (action === 'decide') { console.log(encode(decision)); return; }
    const live = assertLive(e);
    if (action === 'report') {
      if (!registeredProducer(live.user.login, live.head.ref, p))
        throw Error('Cannot publish reports to an unregistered producer branch');
      if (!second || live.head.sha !== e.sourceHead || command('git', ['rev-parse', 'HEAD'], second) !== e.sourceHead ||
        command('git', ['status', '--porcelain'], second)) throw Error('Report requires a clean PR worktree at the reviewed head');
      const prepared = prepareReport(e);
      // Persist the timestamp in trusted external evidence before rendering; verification
      // later derives the exact same names/content without consulting the current clock.
      fs.writeFileSync(first, encode(prepared));
      const files = writeReportFiles(prepared, decision, second);
      console.log(encode({ reportCreatedAt: prepared.reportCreatedAt, files }));
      console.log('Report files written. Inspect, commit and push only these two files to the existing PR branch.'); return;
    }
    if (!decision.merge) throw Error('Merge denied: ' + (decision.reasons.join('; ') || 'report-only policy'));
    verifyReportCommit(e, live, decision, git);
    if (collect(e.sourceHead, e.pr, p).verdict !== 'pass') throw Error('Reviewed source CI is no longer valid');
    if (collect(live.head.sha, e.pr, p).verdict !== 'pass') throw Error('Final report commit must pass CI');
    // Check source metadata and changed paths independently instead of trusting editable JSON.
    const source = capture(e.pr, p, hash);
    if (source.sourceHead !== live.head.sha) throw Error('PR moved');
    const actualFiles = changedFiles(e.base, e.sourceHead, e.pr, git);
    if (p.projectFileReview === 'verified-changes-v1') verifyProjectChanges(e, git);
    if (encode(actualFiles) !== encode(e.files) || changedLines(e.base, e.sourceHead, actualFiles, p.maxChangedLines, git) !== e.changedLines ||
      source.author !== e.author || source.branch !== e.branch || !source.baseIncluded)
      throw Error('Evidence does not match actual PR');
    const common = git('rev-parse', '--git-common-dir');
    const releaseLock = acquireMergeLock(path.resolve(ROOT, common), context.mergeLockName);
    try {
      const refreshed = assertLive(e);
      if (refreshed.head.sha !== live.head.sha) throw Error('PR moved before merge');
      // Non-force update refuses a concurrent divergent target. No head/base race fallback.
      const commit = pushMerge((args, input) => command('git', args, ROOT, input), e.base, live.head.sha, e.pr, context.policy.base);
      console.log(encode({ mergeCommit: commit, pr: e.pr, deployment: false,
        note: 'Verify GitHub merged state and target-branch CI; do not repeat a push after an uncertain response.' }));
    } finally { releaseLock(); }
  }

  function checkTrustedCheckout() {
    const branch = context.policy.base;
    if (fs.realpathSync(git('rev-parse', '--show-toplevel')) !== ROOT) throw Error('Consumer must be the repository root');
    if (git('branch', '--show-current') !== branch || git('status', '--porcelain'))
      throw Error('Controller requires clean trusted target branch; use a separate clean controller checkout.');
    const remote = git('remote', 'get-url', 'origin');
    let httpsOrigin = false;
    try {
      const url = new URL(remote);
      // HTTPS user information is authentication, not part of repository identity.
      httpsOrigin = url.protocol === 'https:' && url.hostname === 'github.com' && !url.port &&
        !url.search && !url.hash && [`/${REPO}`, `/${REPO}.git`].includes(url.pathname);
    } catch { /* The supported SSH form is checked separately below. */ }
    if (!httpsOrigin && remote !== `git@github.com:${REPO}.git`)
      throw Error('Unexpected origin');
    if (context.bundleRoot !== ROOT) {
      if (!context.toolCommit || command('git', ['rev-parse', 'HEAD'], context.bundleRoot) !== context.toolCommit ||
          command('git', ['status', '--porcelain'], context.bundleRoot)) throw Error('External MARC installation must be clean and pinned');
    }
    git('fetch', 'origin', branch);
    if (git('rev-parse', 'HEAD') !== git('rev-parse', 'origin/' + branch)) throw Error('Controller target branch is not current');
  }
  const collect = (head, pr, p) => collectCi(head, pr, { ...p, workflow: context.ci.workflow }, api,
    adapters.readJobs || (id => JSON.parse(command('gh', ['api', '--paginate', '--slurp', 'repos/' + REPO + '/actions/runs/' + id + '/jobs?per_page=100'])).flatMap(x => x.jobs)));
  return { run, capture, assertLive, checkTrustedCheckout, collectCi: collect };
}
function main(args = process.argv.slice(2)) {
  let root;
  if (args[0] === '--repo') { root = args[1]; args = args.slice(2); if (!root) throw Error('Repository root required'); }
  if (!['config', 'queue', 'capture', 'decide', 'report', 'merge', 'recover-ci'].includes(args[0]))
    throw Error('Usage: node src/quality/marc.cjs [--repo <trusted-checkout>] config | queue | capture | decide | report | merge | recover-ci');
  const context = loadConfig(root || discoverRoot());
  if (args[0] === 'config') { console.log(encode({ ...context, trusted: false, note: 'Resolution only; operational commands verify clean current trusted code before use.' })); return; }
  createController(context).run(args);
}
module.exports = { evaluate, reportMarkdown, reportPaths, prepareReport, isOwnReportPath, writeReportFiles,
  changedFiles, changedLines, collectCi, verifyReportCommit, pushMerge, registeredProducer, selectQueue,
  main, trustedPolicy, acquireMergeLock, createController };
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
