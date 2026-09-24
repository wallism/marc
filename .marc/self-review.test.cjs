const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadConfig } = require('../src/quality/config.cjs');
const { loadCatalogue, selectCrew, collectImpact } = require('../src/quality/crew.cjs');
const { createController, registeredProducer } = require('../src/quality/marc.cjs');
const { reviewedSecretIgnores } = require('../src/quality/scans.cjs');
const root = path.resolve(__dirname, '..');

test('self-review resolves from another directory with portable standard defaults', () => {
  const result = JSON.parse(execFileSync(process.execPath,
    [path.join(root, 'src/quality/marc.cjs'), '--repo', root, 'config'],
    { cwd: os.tmpdir(), encoding: 'utf8', windowsHide: true }));
  assert.equal(result.trusted, false);
  assert.equal(result.repoRoot, result.bundleRoot);
  assert.equal(result.policy.repository, 'wallism/marc');
  assert.equal(result.policy.base, 'master');
  assert.equal(result.policy.mode, 'report-only');
  assert.equal(result.autoUpdate, false);
  assert.equal(result.toolCommit, null);
  assert.equal(result.agents, null);
  assert.equal(result.controllerDirectory, null);
  assert.equal(result.policy.maxFiles, 50);
  assert.equal(result.policy.maxChangedLines, 3000);
  assert.equal(result.policy.maxRepairCycles, 2);
  assert.deepEqual(result.policy.simpleRoute, { recommendedMaxFiles: 5, recommendedMaxChangedLines: 200 });
  assert.ok(result.stateDirectory.startsWith(path.join(os.homedir(), '.marc', 'state') + path.sep));
  assert.ok(result.artifactRoot.startsWith(path.join(os.tmpdir(), 'marc') + path.sep));
  assert.equal(result.runLock, path.join(result.stateDirectory, 'run.lock'));
});

test('self-review keeps core gates, explicit producers and sensitive governance', () => {
  const { policy, scans } = loadConfig(root);
  assert.deepEqual(policy.reviewGates, ['security', 'correctness', 'code-quality', 'test-integrity']);
  assert.equal(registeredProducer('wallism', 'codex/example', policy), true);
  assert.equal(registeredProducer('another-author', 'codex/example', policy), false);
  assert.equal(registeredProducer('wallism', 'unregistered/example', policy), false);
  for (const file of ['.marc/config.json', '.marc/policy.json', '.marc/gitleaksignore',
    '.github/workflows/node-checks.yml', 'nested/.agents/skills/example/SKILL.md',
    '.claude/settings.json', '.cursor/rules/example.mdc', '.codex/config.toml',
    '.cursorrules', 'AGENTS.md', 'skills/marc-crew-security/SKILL.md',
    'scripts/install-consumer.cjs', 'src/quality/marc.cjs', 'package.json']) {
    assert.ok(policy.humanPathPatterns.some(pattern => new RegExp(pattern, 'i').test(file)), file);
  }
  assert.equal(reviewedSecretIgnores(fs.readFileSync(scans.secretExceptions, 'utf8')).trim(), '');
  assert.equal(scans.npmExceptions, undefined);
  assert.equal(scans.nugetSolution, undefined);
});

test('configured specialists exist and missing expertise still holds', () => {
  const { crew } = loadConfig(root), catalogue = loadCatalogue(root, crew);
  assert.equal(catalogue.length, crew.members.length);
  for (const technology of ['javascript', 'github-actions', 'csharp', 'unknown-runtime']) {
    const selection = selectCrew({ sourceHead: 'a'.repeat(40), base: 'b'.repeat(40),
      policyHash: 'synthetic', toolCommit: 'c'.repeat(40) }, crew, catalogue,
    { files: [], technologies: [technology], holds: [], reasons: ['Synthetic applicability case'],
      uncertain: false, requiresBrowser: false });
    assert.equal(selection.holds.length === 0, technology !== 'unknown-runtime');
    if (technology !== 'unknown-runtime') assert.deepEqual(selection.selected.map(member => member.id), [technology]);
  }
});

test('policy fixture changes resolve to their Node consumers without masking unknown files', () => {
  const { crew } = loadConfig(root), catalogue = loadCatalogue(root, crew);
  const files = ['examples/python/.marc/policy.json', 'src/quality/fixtures/policy.json'];
  // No references in this synthetic diff: classification must come from trusted mappings.
  const readGit = () => '';
  const impact = collectImpact('base', 'head', files, crew, catalogue, readGit);
  assert.deepEqual(impact.holds, []);
  assert.deepEqual(impact.technologies, ['javascript']);
  const selection = selectCrew({ sourceHead: 'a'.repeat(40), base: 'b'.repeat(40),
    policyHash: 'synthetic', toolCommit: 'c'.repeat(40) }, crew, catalogue, impact);
  assert.deepEqual(selection.selected.map(member => member.id), ['javascript']);
  assert.deepEqual(selection.holds, []);
  const unknown = collectImpact('base', 'head', ['src/quality/fixtures/unknown.json'], crew, catalogue, readGit);
  assert.ok(unknown.holds.some(reason => reason.includes('Unclassified impact')));
});

test('configured CI jobs and artifacts have real workflow producers', () => {
  const { ci, policy } = loadConfig(root);
  const workflow = fs.readFileSync(path.join(root, '.github/workflows', ci.workflow), 'utf8');
  const matrix = workflow.match(/os: \[([^\]]+)\]/)[1].split(',').map(value => value.trim());
  const names = [...workflow.matchAll(/^\s+name: (.+)$/gm)].map(match => match[1].trim());
  const expanded = names.flatMap(name => name.includes('${{ matrix.os }}') ?
    matrix.map(os => name.replace('${{ matrix.os }}', os)) : [name]);
  for (const name of [...policy.requiredJobs, ...ci.requiredArtifacts]) assert.ok(expanded.includes(name), name);
  assert.match(workflow, /--test-reporter=junit/);
  assert.match(workflow, /\.marc\/self-review\.test\.cjs/);
  assert.match(workflow, /npm run validate:catalogue/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /sha256sum --check/);
  assert.match(workflow, /node src\/quality\/scans\.cjs secrets/);
  assert.match(workflow, /path: \$\{\{ runner.temp \}\}\/quality-scans\/secrets\.json/);
  assert.doesNotMatch(workflow, /persist-credentials: true|\$\{\{\s*secrets\.|continue-on-error: true/);
});

test('configuration does not bypass the trusted target-branch precondition', () => {
  const context = loadConfig(root);
  const controller = createController(context, { git: (...args) => {
    if (args[0] === 'rev-parse') return root;
    if (args[0] === 'branch') return 'codex/untrusted-candidate';
    throw Error('No subsequent Git or network access should occur');
  } });
  assert.throws(() => controller.checkTrustedCheckout(), /clean trusted target branch/);
});
