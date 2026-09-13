const { test } = require('node:test');
const assert = require('node:assert/strict');
const { nugetFindings, npmFindings, summarize, npmSummary: summarizeNpm, reviewedSecretIgnores } = require('./scans.cjs');
const exceptions = [{ manifest: 'sites/help/package-lock.json', package: 'image-size', severity: 'high',
  reviewBy: '2026-10-10', reason: 'Synthetic acceptance: no published patch.', advisories: [
    'https://github.com/advisories/GHSA-w3rx-r6r6-pgpr', 'https://github.com/advisories/GHSA-5p2g-fcmc-qvqq'] }];
const npmSummary = (report, manifest, now) => summarizeNpm(report, manifest, now, exceptions);

test('new consumers inherit no dependency exceptions and malformed settings fail closed', () => {
  assert.equal(summarizeNpm(deferredReport(), helpManifest, reviewTime).verdict, 'fail');
  assert.throws(() => summarizeNpm(deferredReport(), helpManifest, reviewTime,
    [{ ...exceptions[0], reviewBy: 'invalid' }]), /Malformed/);
  assert.throws(() => summarizeNpm(deferredReport(), helpManifest, reviewTime, [...exceptions, ...exceptions]), /Duplicate/);
  assert.equal(reviewedSecretIgnores('# No exceptions approved.\n').trim(), '');
});

test('secret exceptions require exact historical fingerprints, never broad ignores', () => {
  const fingerprint = `${'a'.repeat(40)}:old/config.json:stripe-access-token:39`;
  assert.equal(reviewedSecretIgnores(`# Revoked credential\n${fingerprint}\n`), `${fingerprint}\n`);
  for (const invalid of ['old/config.json:stripe-access-token:39', '*.json',
    `${'a'.repeat(40)}:*.json:stripe-access-token:39`,
    `${'a'.repeat(40)}:old/config.json:stripe-access-token:0`]) {
    assert.throws(() => reviewedSecretIgnores(invalid), /exact historical fingerprint/);
  }
});
test('NuGet traverses transitive packages and blocks high severity', () => {
  const findings = nugetFindings({ version: 1, projects: [{ path: 'Synthetic.csproj', frameworks: [{ transitivePackages: [
    { id: 'Synthetic.Package', vulnerabilities: [{ severity: 'High', advisoryurl: 'https://example.invalid/advisory' }] }
  ] }] }] });
  assert.equal(summarize(findings).verdict, 'fail');
});
test('NuGet vulnerable-only output omits frameworks for projects without findings', () => {
  assert.deepEqual(nugetFindings({ version: 1, projects: [{ path: 'Clean.csproj' }] }), []);
  assert.throws(() => nugetFindings({ version: 1, projects: [{ path: 'Clean.csproj' }], logs: [{ level: 'Warning', message: 'Audit unavailable' }] }));
});
test('missing or errored audit results cannot pass', () => {
  for (const r of [{}, { version: 1, projects: [] }, { version: 1, projects: [{}] }]) assert.throws(() => nugetFindings(r));
  for (const r of [{}, { error: 'offline' }, { vulnerabilities: {} }]) assert.throws(() => npmFindings(r));
  assert.throws(() => summarize([{ severity: 'unknown' }]));
});
test('moderate npm findings are recorded without blocking; critical findings block', () => {
  const r = { auditReportVersion: 2, metadata: { vulnerabilities: {} }, vulnerabilities: {
    synthetic: { severity: 'moderate', via: [{ url: 'https://example.invalid/advisory' }] } } };
  assert.equal(summarize(npmFindings(r)).verdict, 'pass');
  r.vulnerabilities.synthetic.severity = 'critical';
  assert.equal(summarize(npmFindings(r)).verdict, 'fail');
});

const helpManifest = 'sites/help/package-lock.json';
const reviewTime = new Date('2026-09-10T00:00:00Z');
function deferredReport() {
  return { auditReportVersion: 2, metadata: { vulnerabilities: {} }, vulnerabilities: {
    'image-size': { severity: 'high', fixAvailable: false, via: [
      { url: 'https://github.com/advisories/GHSA-w3rx-r6r6-pgpr' },
      { url: 'https://github.com/advisories/GHSA-5p2g-fcmc-qvqq' }
    ] },
    loader: { severity: 'high', via: ['image-size'] },
    core: { severity: 'high', via: ['loader'] }
  } };
}

test('help-only temporary exceptions retain evidence and defer inherited findings', () => {
  const result = npmSummary(deferredReport(), helpManifest, reviewTime);
  assert.equal(result.verdict, 'pass');
  assert.deepEqual(result.findings, []);
  assert.deepEqual(result.deferredFindings.map(f => f.package).sort(), ['core', 'image-size', 'loader']);
  assert.equal(result.deferredFindings[0].reviewBy, '2026-10-10');
  assert.match(result.deferredFindings[0].reason, /no published patch/i);
});

test('the same advisories still fail in every other manifest', () => {
  for (const manifest of ['', 'src/App.Web/package-lock.json', 'other/sites/help/package-lock.json']) {
    assert.equal(npmSummary(deferredReport(), manifest, reviewTime).verdict, 'fail');
  }
});

test('exception expires at its UTC review deadline', () => {
  assert.equal(npmSummary(deferredReport(), helpManifest, new Date('2026-10-10T00:00:00Z')).verdict, 'fail');
});

test('an available fix or missing fix status disables the exception', () => {
  for (const fixAvailable of [true, { name: 'image-size', version: '2.0.3' }, undefined]) {
    const report = deferredReport();
    report.vulnerabilities['image-size'].fixAvailable = fixAvailable;
    assert.equal(npmSummary(report, helpManifest, reviewTime).verdict, 'fail');
  }
});

test('new image-size advisories and new direct parent advisories still block', () => {
  for (const name of ['image-size', 'loader']) {
    const report = deferredReport();
    report.vulnerabilities[name].via.push({ url: 'https://example.invalid/new-advisory' });
    const result = npmSummary(report, helpManifest, reviewTime);
    assert.equal(result.verdict, 'fail');
    assert.ok(result.findings.some(f => f.package === name));
    assert.ok(result.findings.some(f => f.package === 'core'));
  }
});

test('unrelated high findings remain blocking while the two exceptions remain visible', () => {
  const report = deferredReport();
  report.vulnerabilities.other = { severity: 'high', via: [{ url: 'https://example.invalid/unrelated' }] };
  const result = npmSummary(report, helpManifest, reviewTime);
  assert.equal(result.verdict, 'fail');
  assert.deepEqual(result.findings.map(f => f.package), ['other']);
  assert.equal(result.deferredFindings.length, 3);
});

test('empty, unresolved and cyclic dependency paths cannot be deferred', () => {
  for (const via of [[], ['missing'], ['core']]) {
    const report = deferredReport();
    report.vulnerabilities.loader.via = via;
    assert.equal(npmSummary(report, helpManifest, reviewTime).verdict, 'fail');
  }
});

test('unknown severity and malformed reports still block before applying exceptions', () => {
  const report = deferredReport();
  report.vulnerabilities['image-size'].severity = 'unknown';
  assert.throws(() => npmSummary(report, helpManifest, reviewTime));
  assert.throws(() => npmSummary({ error: 'offline' }, helpManifest, reviewTime));
});
test('NuGet evidence retains resolved versions for direct and transitive dependency verification', () => {
  const { nugetInventory } = require('./scans.cjs');
  const report = { version: 1, projects: [{ path: 'src/App/App.csproj', frameworks: [{ framework: 'net10.0',
    topLevelPackages: [{ id: 'Known', resolvedVersion: '1.2.3' }],
    transitivePackages: [{ id: 'Known.Child', resolvedVersion: '4.5.6' }] }] }] };
  assert.deepEqual(nugetInventory(report), [
    { project: 'src/App/App.csproj', framework: 'net10.0', package: 'Known', version: '1.2.3', dependencyType: 'direct' },
    { project: 'src/App/App.csproj', framework: 'net10.0', package: 'Known.Child', version: '4.5.6', dependencyType: 'transitive' }
  ]);
  report.projects[0].frameworks[0].topLevelPackages[0].resolvedVersion = undefined;
  assert.throws(() => nugetInventory(report), /resolved version/);
  assert.throws(() => nugetInventory({ version: 1, projects: [], logs: [{ level: 'warning' }] }), /Incomplete/);
});
