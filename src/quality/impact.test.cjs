const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { collectImpact, selectCrew, loadCatalogue } = require('./crew.cjs');
const { discoverReferences } = require('./impact.cjs');

const config = { schema: 1, members: ['csharp', 'javascript', 'blazor', 'frontend', 'terraform'].map(id =>
  ({ id, version: id === 'csharp' ? '1.1.0' : '1.0.0' })), areas: [
  { paths: ['^infra/'], technologies: ['terraform'], reason: 'Infrastructure deployment inputs.' }
] };
const catalogue = loadCatalogue(path.resolve(__dirname, '../..'), config);

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-impact-scope-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, stdio: 'pipe' }).trimEnd();
  const write = (file, content) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), content); };
  const commit = () => { git('add', '.'); git('-c', 'core.hooksPath=', '-c', 'user.name=Synthetic', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture'); return git('rev-parse', 'HEAD'); };
  git('init');
  return { root, git, write, commit, capture: (base, head, files) => collectImpact(base, head, files, config, catalogue, git) };
}

test('added, updated and deleted submodule pins remain reviewed without reading commit entries as source', t => {
  const { git, write, commit, capture } = fixture(t);
  write('README.md', 'Synthetic consumer');
  const empty = commit();
  const pin = target => {
    git('update-index', '--add', '--cacheinfo', `160000,${target},.marc/tool`);
    git('-c', 'core.hooksPath=', '-c', 'user.name=Synthetic', '-c', 'user.email=test@example.invalid',
      'commit', '-m', 'pin');
    return git('rev-parse', 'HEAD');
  };
  const added = pin(empty), updated = pin(added);
  git('update-index', '--force-remove', '.marc/tool');
  git('-c', 'core.hooksPath=', '-c', 'user.name=Synthetic', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'remove pin');
  const removed = git('rev-parse', 'HEAD');
  for (const [base, head] of [[empty, added], [added, updated], [updated, removed]]) {
    const result = capture(base, head, ['.marc/tool']);
    assert.equal(result.incomplete, false);
    assert.deepEqual(result.holds, []);
    assert.deepEqual(result.changedFiles, ['.marc/tool']);
    assert.deepEqual(result.files, ['.marc/tool']);
    assert.equal(result.uncertain, true, 'Governance still receives conservative review');
    assert.equal(selectCrew({}, config, catalogue, result).requiresFull, true);
  }
});

test('symlinks and unreadable source still hold discovery', () => {
  for (const entry of [`120000 blob ${'a'.repeat(40)}\tsrc/Link.cs`, `040000 tree ${'a'.repeat(40)}\tsrc/Link.cs`]) {
    const result = discoverReferences('base', 'head', ['src/Link.cs'], command => {
      assert.equal(command, 'ls-tree');
      return entry;
    }, () => true);
    assert.equal(result.incomplete, true);
    assert.match(result.holds.join(' '), /inspection unavailable/);
  }
});

test('name-preserving function changes retain callers and old callers, with concrete provenance', t => {
  const { write, commit, capture } = fixture(t);
  write('src/policy.js', 'export function FunctionA(value) {\n  return value > 1;\n}\n');
  write('src/presenter.js', 'export function present(value) { return FunctionA(value); }\n');
  write('src/Panel.tsx', "import { present } from './presenter.js';\nexport function Panel() { return present(2); }\n");
  const base = commit();
  write('src/policy.js', 'export function FunctionA(value) {\n  return value > 2;\n}\n');
  write('src/presenter.js', 'export function present(value) { return value; }\n');
  const head = commit(), result = capture(base, head, ['src/policy.js']);
  assert.ok(result.files.includes('src/Panel.tsx'));
  assert.equal(result.requiresBrowser, true);
  assert.deepEqual(result.changedFiles, ['src/policy.js']);
  assert.ok(result.references.some(r => r.file === 'src/presenter.js' && r.from === 'src/policy.js' && r.revision === base && r.line > 0));
  assert.ok(result.references.some(r => r.file === 'src/Panel.tsx' && r.from === 'src/presenter.js'));
});

test('registration, tests, comments and common substrings do not turn a local authorization change into infra impact', t => {
  const { write, commit, capture } = fixture(t);
  write('src/AccountAdminService.cs', 'class AccountAdminService { public bool Allowed() => false; }');
  write('src/Program.cs', 'services.AddScoped<AccountAdminService>();');
  write('tests/AccountAdminTests.cs', 'class AccountAdminTests { AccountAdminService service; }');
  write('src/Unrelated.cs', 'class Unrelated { string message = "AccountAdminService"; /* AccountAdminService */ }');
  write('src/BlockComment.cs', '/*\nAccountAdminService\n*/\nclass BlockComment {}');
  write('tests/ModelTests.cs', 'class ModelTests { void ProgrammingErrors_DoNotSpendOnFallback() {} }');
  write('infra/main.tf', 'description = "GoogleCloudServiceAccount"\n# Program AccountAdminTests\n');
  write('infra/README.md', 'Program.cs AccountAdminService');
  const base = commit();
  write('src/AccountAdminService.cs', 'class AccountAdminService { public bool Allowed() => true; }');
  const result = capture(base, commit(), ['src/AccountAdminService.cs']);
  assert.deepEqual(result.files, ['src/AccountAdminService.cs', 'src/Program.cs', 'tests/AccountAdminTests.cs']);
  assert.equal(result.uncertain, false);
  assert.deepEqual(result.holds, []);
  assert.ok(result.references.every(r => r.from === 'src/AccountAdminService.cs'));
  assert.deepEqual(selectCrew({}, config, catalogue, result).selected.map(m => m.id), ['csharp']);
});

test('a genuine dependency chain reaches UI while unrelated declarations in a caller do not become new search roots', t => {
  const { write, commit, capture } = fixture(t);
  write('src/Clock.cs', 'class Clock { public int Value = 1; }');
  write('src/Bridge.cs', 'class Presenter { Clock value; }\nclass Account { }');
  write('src/View.razor', '@inject Presenter State');
  write('src/Unrelated.cs', 'class Unrelated { Account value; }');
  const base = commit();
  write('src/Clock.cs', 'class Clock { public int Value = 2; }');
  const result = capture(base, commit(), ['src/Clock.cs']);
  assert.ok(result.files.includes('src/View.razor'));
  assert.ok(!result.files.includes('src/Unrelated.cs'));
  assert.equal(result.requiresBrowser, true);
});

test('same-named C# types in different visible namespaces do not join unrelated dependency chains', t => {
  const { write, commit, capture } = fixture(t);
  write('src/Page/AccountSettings.cs', 'namespace Pages; class AccountSettings { public int Value = 1; }');
  write('src/Model/AccountSettings.cs', 'namespace Models; class AccountSettings {}');
  write('src/Model/Account.cs', 'namespace Models; class Account { AccountSettings settings; }');
  write('src/Fields.cs', 'namespace Models; class Fields { public string AccountSettings = ""; int Value() => AccountSettings.Length; }');
  write('src/FieldConsumer.cs', 'namespace Models; class FieldConsumer { string value = Fields.AccountSettings; }');
  write('src/Consumer.cs', 'using Pages; namespace UI; class Consumer { AccountSettings settings; }');
  const base = commit();
  write('src/Page/AccountSettings.cs', 'namespace Pages; class AccountSettings { public int Value = 2; }');
  const result = capture(base, commit(), ['src/Page/AccountSettings.cs']);
  assert.deepEqual(result.files, ['src/Consumer.cs', 'src/Page/AccountSettings.cs']);
});

test('body-only implementation changes retain interface callers and the authorization boundary', t => {
  const { write, commit, capture } = fixture(t);
  write('src/IAccessPolicy.cs', 'namespace App; interface IAccessPolicy { bool FunctionA(); }');
  write('src/AccessPolicy.cs', 'namespace App; class AccessPolicy : IAccessPolicy { public bool FunctionA() => false; }');
  write('src/Endpoint.cs', 'namespace App; class Endpoint { IAccessPolicy policy; bool Allowed() => policy.FunctionA(); }');
  const base = commit();
  write('src/AccessPolicy.cs', 'namespace App; class AccessPolicy : IAccessPolicy { public bool FunctionA() => true; }');
  const result = capture(base, commit(), ['src/AccessPolicy.cs']);
  assert.deepEqual(result.files, ['src/AccessPolicy.cs', 'src/Endpoint.cs', 'src/IAccessPolicy.cs']);
  assert.ok(result.references.some(r => r.kind === 'contract' && r.file === 'src/Endpoint.cs'));
});

test('revision edges are never combined into an impossible caller chain', t => {
  const { write, commit, capture } = fixture(t);
  write('src/policy.js', 'function FunctionA() { return 1; }');
  write('src/middle.js', 'function Middle() { return 0; }');
  write('src/OldPanel.tsx', 'function OldPanel() { return Middle(); }');
  const base = commit();
  write('src/policy.js', 'function FunctionA() { return 2; }');
  write('src/middle.js', 'function Middle() { return FunctionA(); }');
  write('src/OldPanel.tsx', 'function OldPanel() { return 0; }');
  const result = capture(base, commit(), ['src/policy.js']);
  assert.ok(result.files.includes('src/middle.js'));
  assert.ok(!result.files.includes('src/OldPanel.tsx'));
});

test('discovery exhaustion holds instead of recruiting unrelated technology expertise', t => {
  const { write, commit, capture } = fixture(t);
  write('src/Root.cs', 'class Root { int value = 1; }');
  for (let i = 1; i <= 6; i++) write(`src/Layer${i}.cs`, `class Layer${i} { ${i === 1 ? 'Root' : 'Layer' + (i - 1)} inner; }`);
  const base = commit();
  write('src/Root.cs', 'class Root { int value = 2; }');
  const result = capture(base, commit(), ['src/Root.cs']);
  assert.equal(result.incomplete, true);
  assert.match(result.holds.join(' '), /depth budget/);
  assert.deepEqual(selectCrew({}, config, catalogue, result).selected.map(m => m.id), ['csharp']);
});

test('Razor code-behind members do not become same-named component dependencies', t => {
  const { write, commit, capture } = fixture(t);
  write('src/EmployerGroups.razor.cs', 'class EmployerGroups { int value = 1; }');
  write('src/History.razor.cs', 'partial class History { public List<string> EmployerGroups { get; set; } }');
  write('src/History.razor', '@if (EmployerGroups.Count == 0) { <p>Empty</p> }');
  write('src/Profile.razor', '<History />');
  write('src/ActualCaller.razor.cs', 'partial class ActualCaller { public string EmployerGroups { get; set; } }');
  write('src/ActualCaller.razor', '<EmployerGroups />');
  write('src/TypedCaller.razor.cs', 'partial class TypedCaller { public string EmployerGroups { get; set; } }');
  write('src/TypedCaller.razor', '@typeof(EmployerGroups)');
  write('src/UnrelatedMember.razor.cs', 'partial class UnrelatedMember {} class Other { public string EmployerGroups { get; set; } }');
  write('src/UnrelatedMember.razor', '@EmployerGroups.Value');
  const base = commit();
  write('src/EmployerGroups.razor.cs', 'class EmployerGroups { int value = 2; }');
  const result = capture(base, commit(), ['src/EmployerGroups.razor.cs']);
  assert.ok(!result.files.includes('src/History.razor'));
  assert.ok(!result.files.includes('src/Profile.razor'));
  assert.ok(result.files.includes('src/ActualCaller.razor'));
  assert.ok(result.files.includes('src/TypedCaller.razor'));
  assert.ok(result.files.includes('src/UnrelatedMember.razor'));
  assert.deepEqual(result.holds, []);
});

test('Razor companion members are resolved separately in each captured revision', t => {
  const { write, commit, capture } = fixture(t);
  write('src/Options.cs', 'class Options { public static int Count = 1; }');
  write('src/View.razor', '@Options.Count');
  write('src/View.razor.cs', 'partial class View {}');
  const base = commit();
  write('src/Options.cs', 'class Options { public static int Count = 2; }');
  write('src/View.razor.cs', 'partial class View { public List<string> Options { get; set; } }');
  const head = commit(), result = capture(base, head, ['src/Options.cs']);
  assert.deepEqual(result.references.filter(r => r.file === 'src/View.razor').map(r => r.revision), [base]);
  assert.deepEqual(result.holds, []);
});
