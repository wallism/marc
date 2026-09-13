const { spawnSync } = require('node:child_process');
const { mkdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } = require('node:fs');
const path = require('node:path');
const { loadConfig, discoverRoot } = require('./config.cjs');
function nugetFindings(report) {
  if (report.version !== 1 || !Array.isArray(report.projects) || report.projects.length === 0 || report.problems?.length ||
      report.logs?.some(log => /error|warning/i.test(log.level || '')))
    throw Error('Incomplete NuGet audit');
  return report.projects.flatMap(project => {
    if (typeof project.path !== 'string' || (project.frameworks !== undefined && !Array.isArray(project.frameworks)))
      throw Error('Malformed NuGet project results');
    // Vulnerable-only output omits frameworks entirely when a project has no findings.
    return (project.frameworks || []).flatMap(f => [...(f.topLevelPackages || []), ...(f.transitivePackages || [])]
      .flatMap(p => (p.vulnerabilities || []).map(v => ({ package: p.id, severity: v.severity, advisory: v.advisoryurl }))));
  });
}
function npmFindings(report) {
  if (report.error || report.auditReportVersion !== 2 || !report.vulnerabilities || !report.metadata?.vulnerabilities)
    throw Error('Incomplete npm audit');
  return Object.entries(report.vulnerabilities).map(([name, v]) => ({ package: name, severity: v.severity,
    advisories: v.via.filter(x => typeof x === 'object').map(x => x.url) }));
}
function nugetInventory(report) {
  // Reuse audit format/error validation; inventory additionally retains clean packages.
  nugetFindings(report);
  return report.projects.flatMap(project => (project.frameworks || []).flatMap(framework =>
    [['topLevelPackages', 'direct'], ['transitivePackages', 'transitive']].flatMap(([key, dependencyType]) =>
      (framework[key] || []).map(item => {
        if (typeof item.id !== 'string' || !item.id || typeof item.resolvedVersion !== 'string' || !item.resolvedVersion ||
            typeof framework.framework !== 'string' || !framework.framework)
          throw Error('Missing resolved version or package framework');
        const projectPath = path.isAbsolute(project.path) ? path.relative(process.cwd(), project.path) : project.path;
        return { project: projectPath.replaceAll('\\', '/'), framework: framework.framework,
          package: item.id, version: item.resolvedVersion, dependencyType };
      }))));
}
function summarize(findings) {
  if (findings.some(f => !['low', 'moderate', 'medium', 'high', 'critical'].includes(String(f.severity).toLowerCase())))
    throw Error('Unknown vulnerability severity');
  return { verdict: findings.some(f => ['high', 'critical'].includes(f.severity.toLowerCase())) ? 'fail' : 'pass', findings };
}
function npmSummary(report, manifest, now = new Date(), exceptions = []) {
  const findings = npmFindings(report);
  const original = summarize(findings); // Validate every severity before considering exceptions.
  if (!Array.isArray(exceptions)) throw Error('Malformed npm exception configuration');
  const matches = exceptions.filter(x => x.manifest === manifest);
  if (matches.length > 1) throw Error('Duplicate npm exception for manifest');
  if (!matches.length) return original;
  const exception = matches[0], { reviewBy } = exception;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewBy || '') || !Number.isFinite(Date.parse(reviewBy)) ||
      !exception.package || exception.severity !== 'high' || !exception.reason?.trim() ||
      !Array.isArray(exception.advisories) || !exception.advisories.length ||
      exception.advisories.some(x => typeof x !== 'string' || !x.startsWith('https://')))
    throw Error('Malformed npm exception configuration');
  if (!(now < new Date(reviewBy + 'T00:00:00Z'))) return original;
  const advisories = new Set(exception.advisories);
  const selected = report.vulnerabilities[exception.package];
  if (!selected || selected.fixAvailable !== false || selected.severity !== exception.severity || !selected.via.length ||
      !selected.via.every(v => v && typeof v === 'object' && advisories.has(v.url))) return original;
  const deferred = new Set([exception.package]);
  // Only inherit the exception when EVERY cause is already deferred. Unknown,
  // direct, empty and cyclic causes cannot become accepted by association.
  let changed;
  do {
    changed = false;
    for (const [name, vulnerability] of Object.entries(report.vulnerabilities)) {
      if (!deferred.has(name) && vulnerability.severity === 'high' && vulnerability.via.length &&
          vulnerability.via.every(v => typeof v === 'string' && deferred.has(v))) {
        deferred.add(name);
        changed = true;
      }
    }
  } while (changed);
  return {
    ...summarize(findings.filter(f => !deferred.has(f.package))),
    deferredFindings: findings.filter(f => deferred.has(f.package)).map(f => ({ ...f,
      reason: exception.reason,
      reviewBy
    }))
  };
}
function reviewedSecretIgnores(contents) {
  const fingerprints = contents.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  if (fingerprints.some(line => !/^[a-f0-9]{40}:[^:*?\r\n]+:[a-z0-9-]+:[1-9][0-9]*$/.test(line)))
    throw Error('Secret exception must be an exact historical fingerprint');
  return fingerprints.join('\n') + '\n';
}
function configuredNpmExceptions(context) {
  if (!context.scans.npmExceptions) return [];
  const settings = JSON.parse(readFileSync(context.scans.npmExceptions, 'utf8'));
  if (settings.schema !== 1 || settings.repository !== context.policy.repository || !Array.isArray(settings.exceptions))
    throw Error('Npm exceptions do not belong to this consumer');
  return settings.exceptions;
}
function run(argv = process.argv.slice(2), context = loadConfig(discoverRoot()), execute = spawnSync) {
  const [kind, output, ...args] = argv;
  if (!['nuget', 'npm', 'secrets'].includes(kind) || !output) throw Error('Usage: scans.cjs nuget|npm|secrets <output.json> [base SHA]');
  mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  let exe, command;
  if (kind === 'nuget') {
    if (!context.scans.nugetSolution) throw Error('NuGet scanner requires a configured solution');
    exe = 'dotnet'; command = ['list', context.scans.nugetSolution, 'package', '--vulnerable', '--include-transitive', '--format', 'json', '--output-version', '1', '--no-restore'];
  } else if (kind === 'npm') {
    exe = process.platform === 'win32' ? 'cmd.exe' : 'npm';
    command = process.platform === 'win32' ? ['/d', '/c', 'npm audit --package-lock-only --ignore-scripts --json'] : ['audit', '--package-lock-only', '--ignore-scripts', '--json'];
  } else {
    if (args[0] && !/^[a-f0-9]{40}$/.test(args[0])) throw Error('Invalid scan base');
    writeFileSync(output + '.toml', '[extend]\nuseDefault = true\n');
    writeFileSync(output + '.ignore', reviewedSecretIgnores(context.scans.secretExceptions ? readFileSync(context.scans.secretExceptions, 'utf8') : ''));
    exe = 'gitleaks'; command = ['git', '--redact=100', '--no-banner', '--report-format=json', `--report-path=${path.resolve(output)}.raw`,
      '--config', path.resolve(output + '.toml'), '--ignore-gitleaks-allow', '--gitleaks-ignore-path', path.resolve(output + '.ignore'),
      '--log-opts=' + (args[0] ? `${args[0]}..HEAD` : 'HEAD'), '.'];
  }
  const result = execute(exe, command, { cwd: kind === 'secrets' ? context.repoRoot : process.cwd(),
    encoding: 'utf8', windowsHide: true, timeout: 600000, maxBuffer: 32 * 1024 * 1024 });
  let summary;
  try {
    if (result.error || result.signal || ![0, 1].includes(result.status) || (kind === 'nuget' && result.status !== 0))
      throw Error('Scanner execution failed');
    if (kind === 'secrets') {
      const leaks = JSON.parse(readFileSync(output + '.raw', 'utf8'));
      if (!Array.isArray(leaks) || (result.status !== 0 && leaks.length === 0)) throw Error('Incomplete secret scan');
      // Do not persist source snippets, matches, secrets, author identities or commit messages.
      summary = { verdict: leaks.length ? 'fail' : 'pass', findings: leaks.map(x => ({ rule: x.RuleID, file: x.File, line: x.StartLine })) };
    } else {
      const report = JSON.parse(result.stdout);
      const manifest = path.relative(context.repoRoot, path.resolve('package-lock.json')).split(path.sep).join('/');
      summary = kind === 'nuget' ? summarize(nugetFindings(report)) : npmSummary(report, manifest, new Date(), configuredNpmExceptions(context));
      if (kind === 'nuget') {
        // Inventory only: no restore, package installation or second vulnerability scan.
        const inventory = execute('dotnet', command.filter(arg => arg !== '--vulnerable'), {
          encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
        if (inventory.error || inventory.signal || inventory.status !== 0) throw Error('NuGet resolved-version inventory unavailable');
        summary.resolvedPackages = nugetInventory(JSON.parse(inventory.stdout));
      }
    }
  } catch (error) { summary = { verdict: 'blocked', reason: error.message }; }
  writeFileSync(output, JSON.stringify({ scanner: kind, ...summary }, null, 2) + '\n');
  if (kind === 'secrets' && existsSync(output + '.raw')) unlinkSync(output + '.raw');
  console.log(`${kind}: ${summary.verdict}; ${summary.deferredFindings?.length || 0} temporarily deferred; sanitized evidence saved`);
  if (summary.verdict !== 'pass') process.exitCode = 1;
  return summary;
}
module.exports = { nugetFindings, nugetInventory, npmFindings, summarize, npmSummary, configuredNpmExceptions, reviewedSecretIgnores, run };
if (require.main === module) { try { run(); } catch (e) { console.error(e.message); process.exitCode = 1; } }
