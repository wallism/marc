const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('./marc.cjs');
const policy = require('./fixtures/policy.json');
const A = 'a'.repeat(40), B = 'b'.repeat(40), file = 'src/Web/Web.csproj';
function evidence() {
  return { schema: 1, repository: policy.repository, headRepository: policy.repository, pr: 7,
    sourceHead: B, base: A, policyHash: 'policy', state: 'open', draft: false, author: 'maintainer',
    branch: 'bugfix/content', target: 'master', baseIncluded: true, files: [file], changedLines: 3,
    repairCycles: 0, projectChanges: [{ file, classification: 'content-only', reason: 'Only regular Markdown content entries changed.', markdownFiles: ['src/Web/Content/article.md'] }],
    gates: Object.fromEntries(policy.reviewGates.map(name => [name, { verdict: 'pass', sourceHead: B,
      base: A, policyHash: 'policy', reviewer: name, summary: 'Independent review.', evidence: ['source diff'], findings: [] }])),
    ci: { verdict: 'pass', sourceHead: B, runUrl: 'https://github.com/example/project/actions/runs/12' } };
}
test('ordinary Markdown content entry does not require a human solely for csproj extension', () => {
  assert.equal(evaluate(evidence(), policy, 'policy').merge, true);
});
test('project exemption cannot remove CI, specialist or another sensitive path gate', () => {
  for (const change of [e => e.ci.verdict = 'blocked', e => e.gates.security.verdict = 'human-required',
    e => e.files.push('src/Web/Auth.cs'), e => delete e.projectChanges,
    e => e.projectChanges[0].classification = 'review-required', e => e.projectChanges[0].file = 'src/Other.csproj']) {
    const e = evidence(); change(e); assert.equal(evaluate(e, policy, 'policy').merge, false);
  }
});
const { classifyProjectChange, collectProjectChanges, verifyProjectChanges } = require('./project-review.cjs');
const project = item => `<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup><ItemGroup>${item}</ItemGroup></Project>`;
const markdown = '<None Update="Content\\article.md"><CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory></None>';
const classify = (before, after, regular = () => true) => classifyProjectChange(file, before, after, regular, regular);
test('classifies ordinary Markdown content and publish metadata from project syntax', () => {
  for (const item of [markdown, '<Content Include="docs/guide.md" />',
    '<None Update="README.md"><CopyToPublishDirectory>Always</CopyToPublishDirectory></None>']) {
    assert.equal(classify(project(''), project(item)).classification, 'content-only', item);
  }
  assert.equal(classify(project(markdown), project('')).classification, 'content-only');
  assert.equal(classify(project(''), project(markdown), () => false).classification, 'review-required');
});
test('execution, unusual reference and unsupported syntax changes stay held', () => {
  const held = [
    '<ProjectReference Include="../Other/Other.csproj" />',
    '<Reference Include="Unknown"><HintPath>unknown.dll</HintPath></Reference>',
    '<Compile Include="Content/article.md" />',
    '<None Update="../outside.md" />', '<None Update="C:/outside.md" />',
    '<None Update="https://example.invalid/file.md" />', '<None Update="Content/*.md" />',
    '<None Update="$(Document).md" />', '<None Update="Content/a;other.md" />',
    '<None Update="Content/a%3Bother.md" />', '<None Update="Content/a&amp;b.md" />',
    '<None Update="Content/NUL.md" />', '<None Update="Content/script.ps1" />',
    '<None Update="Content/article.md"><TargetPath>../config.json</TargetPath></None>',
    '<None Update="Content/article.md"><Link>other.md</Link></None>',
    '<None Update="Content/article.md" Condition="true" />',
    '<None Remove="Content/article.md" />',
    '<None Update="Content/article.md"><CopyToOutputDirectory>$(Mode)</CopyToOutputDirectory></None>',
    '<!-- <None Update="Content/article.md" /> -->',
    '<None Update="Content/article.md"><CopyToOutputDirectory>Always</CopyToPublishDirectory></None>'
  ];
  for (const item of held) assert.equal(classify(project(''), project(item)).classification, 'review-required', item);
  for (const after of [
    project(markdown).replace('Microsoft.NET.Sdk', 'Unusual.Sdk'),
    project(markdown).replace('net10.0', 'net9.0'),
    project(markdown).replace('<ItemGroup>', '<ItemGroup Condition="true">'),
    `<Project><Target Name="Build"><ItemGroup>${markdown}</ItemGroup></Target></Project>`,
    '<!DOCTYPE Project><Project/>', project(markdown) + '<Other/>',
    project(markdown).replace('</Project>', '<Import Project="remote.targets" /></Project>')]) {
    assert.equal(classify(project(''), after).classification, 'review-required', after);
  }
});
test('content addition cannot disguise dependency version changes, deletions or conditional build logic', () => {
  const dependency = '<PackageReference Include="Example" Version="1.0.0" />';
  for (const after of [project(markdown), project(markdown + dependency.replace('1.0.0', '2.0.0'))])
    assert.equal(classify(project(dependency), after).classification, 'dependency-only');
  const conditional = `<Project><ItemGroup Condition="true">${markdown}</ItemGroup></Project>`;
  assert.equal(classify('<Project/>', conditional).classification, 'review-required');
});

test('committed-source collection and merge recheck reject forged evidence, symlinks and changed source', t => {
  const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
  const { execFileSync } = require('node:child_process');
  const parent = process.env.MARC_TEST_ARTIFACTS || os.tmpdir();
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'project-review-'));
  t.after(() => { if (!path.resolve(root).startsWith(path.resolve(parent) + path.sep)) throw Error('Unsafe cleanup'); fs.rmSync(root, { recursive: true }); });
  const git = (...args) => execFileSync('git', ['-c', 'core.hooksPath=', ...args], { cwd: root,
    encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }).trimEnd();
  git('init'); git('config', 'user.email', 'marc-test@example.invalid'); git('config', 'user.name', 'Synthetic MARC test');
  fs.mkdirSync(path.join(root, 'src/Web/Content'), { recursive: true });
  fs.writeFileSync(path.join(root, file), project(''));
  git('add', '.'); git('commit', '-m', 'base'); const base = git('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(root, file), project(markdown));
  fs.writeFileSync(path.join(root, 'src/Web/Content/article.md'), '# Article\n');
  git('add', '.'); git('commit', '-m', 'content'); const sourceHead = git('rev-parse', 'HEAD');
  const changes = collectProjectChanges(base, sourceHead, [file], git);
  assert.equal(changes[0].classification, 'content-only');
  const e = { base, sourceHead, files: [file], projectChanges: changes };
  assert.doesNotThrow(() => verifyProjectChanges(e, git));
  assert.throws(() => verifyProjectChanges({ ...e, projectChanges: [] }, git), /does not match/);
  fs.writeFileSync(path.join(root, file), project(markdown + '<PackageReference Include="Example" Version="1.0.0"/>'));
  git('add', '.'); git('commit', '-m', 'dependency');
  assert.throws(() => verifyProjectChanges({ ...e, sourceHead: git('rev-parse', 'HEAD') }, git), /does not match/);
  // Index-only symlink mode works on Windows without filesystem symlink privileges.
  const blob = git('rev-parse', `${sourceHead}:src/Web/Content/article.md`);
  git('update-index', '--cacheinfo', `120000,${blob},src/Web/Content/article.md`);
  fs.writeFileSync(path.join(root, file), project(markdown)); git('add', file); git('commit', '-m', 'symlink');
  assert.equal(collectProjectChanges(base, git('rev-parse', 'HEAD'), [file], git)[0].classification, 'review-required');
});
test('reports explain the project classification and retain unrelated holds', () => {
  const { reportMarkdown } = require('./marc.cjs');
  const e = evidence();
  assert.match(reportMarkdown(e, evaluate(e, policy, 'policy')), /Web.csproj.*content-only.*regular Markdown/);
  e.projectChanges[0].classification = 'review-required';
  assert.match(reportMarkdown(e, evaluate(e, policy, 'policy')), /unresolved project change or dependency verification/);
  assert.equal(evaluate(e, { ...policy, projectFileReview: undefined }, 'policy').merge, false);
});
function dependencyEvidence() {
  const e = evidence();
  e.ci.runId = 12; e.ci.runAttempt = 1;
  e.projectChanges = [{ file, classification: 'dependency-only', reason: 'Package reference change.', markdownFiles: [],
    dependencies: [{ name: 'Example.Known', requestedVersion: '1.2.3' }] }];
  e.gates.security.dependencyReview = { verdict: 'pass', ciRunId: 12, ciRunAttempt: 1,
    issues: [], vulnerabilities: [], transitiveChecked: true, auditEvidence: ['Exact CI dependency audit'],
    packages: [{ file, name: 'Example.Known', requestedVersion: '1.2.3', knownPackage: true,
      officialSources: ['https://www.nuget.org/packages/Example.Known/1.2.3'], resolvedVersions: ['1.2.3'] }] };
  return e;
}
test('verified known dependency with clean exact-source audit does not require a human', () => {
  assert.equal(evaluate(dependencyEvidence(), policy, 'policy').merge, true);
});
test('dependency concerns, unknown package, version mismatch and incomplete or stale evidence hold', () => {
  for (const change of [e => delete e.gates.security.dependencyReview,
    e => e.gates.security.dependencyReview.packages[0].knownPackage = false,
    e => e.gates.security.dependencyReview.packages[0].requestedVersion = '9.0.0',
    e => e.gates.security.dependencyReview.packages[0].resolvedVersions = [],
    e => e.gates.security.dependencyReview.packages[0].officialSources = [],
    e => e.gates.security.dependencyReview.vulnerabilities = ['low-severity-advisory'],
    e => e.gates.security.dependencyReview.issues = ['unverified publisher'],
    e => e.gates.security.dependencyReview.transitiveChecked = false,
    e => e.gates.security.dependencyReview.ciRunId = 13,
    e => e.gates.security.dependencyReview.ciRunAttempt = 2,
    e => e.gates.security.sourceHead = A,
    e => e.routing = { route: 'simple' }]) {
    const e = dependencyEvidence(); change(e); assert.equal(evaluate(e, policy, 'policy').merge, false);
  }
});
test('package versions and supported metadata are captured for automated verification', () => {
  const change = classify(project(''), project('<PackageReference Include="Example.Known" Version="1.2.3"><PrivateAssets>all</PrivateAssets></PackageReference>'));
  assert.equal(change.classification, 'dependency-only');
  assert.equal(change.dependencies[0].name, 'Example.Known');
  assert.equal(change.dependencies[0].requestedVersion, '1.2.3');
  assert.equal(change.dependencies[0].configuration.PrivateAssets, 'all');
  for (const item of ['<PackageReference Include="Example.Known" Version="$(Version)"/>',
    '<PackageReference Include="Example.Known" Version="1.2.3" Condition="true"/>',
    '<PackageReference Include="Example.Known" Version="1.2.3"><CustomTask>run</CustomTask></PackageReference>'])
    assert.equal(classify(project(''), project(item)).classification, 'review-required');
});
test('npm dependency-only manifests and locked versions use the same verified automatic route', () => {
  const { classifyNpmChange } = require('./project-review.cjs');
  const manifest = 'src/Web/package.json';
  const a = JSON.stringify({ name: 'app', scripts: { build: 'existing' }, dependencies: { known: '^1.0.0' } });
  const b = JSON.stringify({ name: 'app', scripts: { build: 'existing' }, dependencies: { known: '^1.2.3' } });
  const change = classifyNpmChange(manifest, a, b);
  assert.equal(change.classification, 'dependency-only');
  const e = dependencyEvidence(); e.files = [manifest]; e.projectChanges = [change];
  Object.assign(e.gates.security.dependencyReview.packages[0], { file: manifest, name: 'known', requestedVersion: '^1.2.3' });
  assert.equal(evaluate(e, policy, 'policy').merge, true);
  assert.equal(classifyNpmChange(manifest, a, b.replace('existing', 'unusual-command')).classification, 'review-required');
  assert.equal(classifyNpmChange(manifest, a, b.replace('^1.2.3', 'file:../local')).classification, 'review-required');
  const lock = version => JSON.stringify({ name: 'app', lockfileVersion: 3, packages: { '': { name: 'app' },
    'node_modules/known': { version, resolved: `https://registry.npmjs.org/known/-/known-${version}.tgz`, integrity: 'sha512-YWJjZA==' } } });
  const locked = classifyNpmChange('package-lock.json', lock('1.0.0'), lock('1.2.3'));
  assert.deepEqual(locked.dependencies, [{ name: 'known', requestedVersion: '1.2.3' }]);
  assert.equal(locked.classification, 'dependency-only');
  assert.equal(classifyNpmChange('package-lock.json', lock('1.0.0'), lock('1.2.3').replace('registry.npmjs.org', 'unverified.invalid')).classification, 'review-required');
  assert.equal(classifyNpmChange('package-lock.json', lock('1.0.0'), lock('1.2.3').replace('sha512-YWJjZA==', 'missing')).classification, 'review-required');
});
test('verified dependency-only manifests do not inherit unrelated directory-name holds', () => {
  const e = dependencyEvidence(), sensitiveName = 'src/Auth/Auth.csproj';
  e.files = [sensitiveName]; e.projectChanges[0].file = sensitiveName;
  e.gates.security.dependencyReview.packages[0].file = sensitiveName;
  assert.equal(evaluate(e, policy, 'policy').merge, true);
  e.files.push('src/Auth/Authorization.cs');
  assert.equal(evaluate(e, policy, 'policy').merge, false);
});
