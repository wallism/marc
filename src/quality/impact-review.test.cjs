const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { discoverReferences, scanReferencePage } = require('./impact.cjs');
const { reviewImpact } = require('./impact-review.cjs');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-scope-decisions-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, stdio: 'pipe' }).trimEnd();
  const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), text); };
  const commit = () => { git('add', '.'); git('-c', 'core.hooksPath=', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'fixture'); return git('rev-parse', 'HEAD'); };
  git('init'); return { git, write, commit };
}
const decide = (scope, action) => ({ scope: scope.id, action, reason: action === 'stop' ?
  'The return and side-effect contract at this boundary is unchanged.' : 'Changed result is consumed by callers; inspect their assumptions.',
  evidence: [`${scope.revision}:${scope.file}`] });

test('component names do not connect namespace segments or positional record parameters to unrelated driver code', t => {
  const { git, write, commit } = fixture(t);
  write('src/Summary.cs', 'namespace Pages; class Summary { int value = 1; }');
  write('src/Skills.cs', 'namespace Pages; class Skills { int value = 1; }');
  write('src/Driver.cs', 'namespace Driver; internal record ExecutionSummary(IResultSummary Summary, string[] Keys);');
  write('src/DriverConsumer.cs', 'class DriverConsumer { ExecutionSummary value; }');
  write('src/SkillDtos.cs', 'using Graph.Nodes.Skills; namespace Api.Skills; class SkillDtos {}');
  write('src/Actual.cs', 'namespace Consumer; class Actual { Pages.Summary summary; Pages.Skills skills; }');
  write('src/View.razor', '<Summary /><Skills />');
  const base = commit();
  write('src/Summary.cs', 'namespace Pages; class Summary { int value = 2; }');
  write('src/Skills.cs', 'namespace Pages; class Skills { int value = 2; }');
  const result = discoverReferences(base, commit(), ['src/Summary.cs', 'src/Skills.cs'], git, () => true);
  assert.deepEqual(result.files, ['src/Actual.cs', 'src/Skills.cs', 'src/Summary.cs', 'src/View.razor']);
  assert.equal(result.incomplete, false);
});

test('a Razor component reached through a caller does not match an unrelated namespace import', t => {
  const { git, write, commit } = fixture(t);
  write('src/Skills.razor', '<p>Skills</p>');
  write('src/SkillDtos.cs', 'using Graph.Nodes.Skills; namespace Api.Skills; class SkillDtos {}');
  write('src/View.razor', '<Skills />');
  const base = commit(); write('src/Skills.razor', '<p>Updated skills</p>');
  const head = commit();
  const result = discoverReferences(base, head, ['src/Skills.razor'], git, () => true,
    { roots: [{ revision: head, file: 'src/Skills.razor', names: ['Skills'] }] });
  assert.deepEqual(result.files, ['src/Skills.razor', 'src/View.razor']);
});

test('ordinary functions require the same consequence decision as class members', t => {
  const { git, write, commit } = fixture(t);
  write('src/policy.js', 'export function allowed() { return false; }');
  write('src/caller.js', 'function endpoint() { return allowed(); }');
  const base = commit(); write('src/policy.js', 'export function allowed() { return true; }');
  const head = commit(), changed = ['src/policy.js'];
  const initial = reviewImpact(base, head, changed, git, () => true);
  assert.deepEqual(initial.files, changed);
  const plan = { schema: 1, base, sourceHead: head, decisions: initial.reviewScopes.map(s => decide(s, 'follow')) };
  const found = reviewImpact(base, head, changed, git, () => true, plan);
  assert.ok(found.files.includes('src/caller.js'));
  assert.ok(found.reviewScopes.some(s => s.names.includes('endpoint') && !s.decision));
});

function broadFixture() {
  const base = 'a'.repeat(40), head = 'b'.repeat(40);
  const texts = new Map([['src/Root.cs', 'class Root {}'], ...Array.from({ length: 650 }, (_, i) =>
    [`src/Consumer${String(i).padStart(3, '0')}.cs`, `class Consumer${i} { Root value; }`])]);
  const git = (command, ...args) => {
    if (command === 'diff') return '@@ -1 +1 @@';
    if (command === 'ls-tree') return `100644 blob ${'c'.repeat(40)}\t${args.at(-1)}`;
    if (command === 'show') return texts.get(args[0].slice(41));
    if (command === 'grep') return [...texts.keys()].map(f => `${args.at(-2)}:${f}`).join('\0');
    throw Error(command);
  };
  return { base, head, git, roots: [{ revision: head, file: 'src/Root.cs', names: ['Root'] }] };
}

test('more than 600 candidates and 300 affected files finish in bounded resumable pages without dropped evidence', () => {
  const { base, head, git, roots } = broadFixture();
  let continuation, result, pages = 0;
  do {
    result = scanReferencePage(base, head, ['src/Root.cs'], git, () => true, { roots, batchSize: 100, continuation });
    if (result.continuation) {
      assert.equal(result.incomplete, true);
      assert.ok(result.continuation.inspected <= (pages + 1) * 100);
      continuation = JSON.parse(JSON.stringify(result.continuation));
    }
    pages++;
  } while (result.continuation && pages < 30);
  assert.ok(pages > 6);
  assert.equal(result.incomplete, false);
  assert.equal(result.files.length, 651);
  assert.equal(result.references.length, 650);
  const complete = discoverReferences(base, head, ['src/Root.cs'], git, () => true, { roots });
  assert.deepEqual(result, complete, 'Page size cannot change evidence or ordering');
  assert.throws(() => scanReferencePage(base, 'd'.repeat(40), ['src/Root.cs'], git, () => true,
    { roots, continuation }), /Stale/);
  assert.throws(() => scanReferencePage(base, head, ['src/Other.cs'], git, () => true,
    { roots, continuation }), /Stale/);
  assert.throws(() => scanReferencePage(base, head, ['src/Root.cs'], git, () => true,
    { roots, continuation: { ...continuation, references: [] } }), /Corrupt/);
});

test('a paused namespace index still rejects a later same-named type before matching', t => {
  const { git, write, commit } = fixture(t);
  write('src/Pages/Summary.cs', 'namespace Pages; class Summary { int value = 1; }');
  write('src/AConsumer.cs', 'namespace Models; class Consumer { Summary value; }');
  write('src/ZModel.cs', 'namespace Models; class Summary {}');
  const base = commit(); write('src/Pages/Summary.cs', 'namespace Pages; class Summary { int value = 2; }');
  const head = commit(), roots = [{ revision: head, file: 'src/Pages/Summary.cs', names: ['Summary'] }];
  let result, continuation;
  do { result = scanReferencePage(base, head, ['src/Pages/Summary.cs'], git, () => true, { roots, batchSize: 1, continuation });
    continuation = result.continuation && JSON.parse(JSON.stringify(result.continuation)); } while (continuation);
  assert.deepEqual(result.files, ['src/Pages/Summary.cs']);
});

test('new interface and class members seed the new method without exploring unrelated interface users', t => {
  const { git, write, commit } = fixture(t);
  write('src/IProfile.cs', 'interface IProfile\n{\n    void Existing();\n}\n');
  write('src/Profile.cs', 'class Profile : IProfile\n{\n    public void Existing() {}\n}\n');
  write('src/ExistingUser.cs', 'class ExistingUser { IProfile p; void Run() { p.Existing(); } }');
  const base = commit();
  write('src/IProfile.cs', 'interface IProfile\n{\n    void Existing();\n\n    /// <summary>New behavior.</summary>\n    void Added();\n\n}\n');
  write('src/Profile.cs', 'class Profile : IProfile\n{\n    public void Existing() {}\n\n    public void Added() {}\n\n}\n');
  const head = commit(), changed = ['src/IProfile.cs', 'src/Profile.cs'];
  let result = reviewImpact(base, head, changed, git, () => true);
  assert.ok(result.reviewScopes.length);
  assert.ok(result.reviewScopes.every(s => s.names.length === 1 && s.names[0] === 'Added'), JSON.stringify(result.reviewScopes));
  const plan = { schema: 1, base, sourceHead: head, decisions: result.reviewScopes.map(s => decide(s, 'follow')) };
  result = reviewImpact(base, head, changed, git, () => true, plan);
  assert.ok(!result.files.includes('src/ExistingUser.cs'));
  assert.ok(result.files.includes('src/Profile.cs'));
});

test('public and protected class methods receive local stop or one-step follow decisions, independently at each caller', t => {
  const { git, write, commit } = fixture(t);
  write('src/Policy.cs', 'class Policy\n{\n    protected bool Allowed()\n    {\n        return false;\n    }\n}\n');
  write('src/Endpoint.cs', 'class Endpoint : Policy\n{\n    public bool Respond()\n    {\n        return Allowed();\n    }\n}\n');
  write('src/Ui.cs', 'class Ui { Endpoint endpoint; bool Show() => endpoint.Respond(); }');
  const base = commit();
  write('src/Policy.cs', 'class Policy\n{\n    protected bool Allowed()\n    {\n        return true;\n    }\n}\n');
  const head = commit(), changed = ['src/Policy.cs'];
  const first = reviewImpact(base, head, changed, git, () => true);
  assert.ok(first.reviewScopes.every(s => s.names.join() === 'Allowed'));
  assert.equal(first.incomplete, true);
  const stopped = { schema: 1, base, sourceHead: head, decisions: first.reviewScopes.map(s => decide(s, 'stop')) };
  assert.deepEqual(reviewImpact(base, head, changed, git, () => true, stopped).files, changed);
  const plan = { ...stopped, decisions: first.reviewScopes.map(s => decide(s, 'follow')) };
  let result = reviewImpact(base, head, changed, git, () => true, plan);
  assert.ok(result.files.includes('src/Endpoint.cs'));
  assert.ok(!result.files.includes('src/Ui.cs'));
  assert.ok(result.reviewScopes.some(s => !s.decision && s.names.includes('Respond')));
  plan.decisions.push(...result.reviewScopes.filter(s => !s.decision).map(s => decide(s, 'stop')));
  result = reviewImpact(base, head, changed, git, () => true, plan);
  assert.equal(result.incomplete, false);
  assert.ok(!result.files.includes('src/Ui.cs'));
  assert.throws(() => reviewImpact(base, head, changed, git, () => true, { ...plan, sourceHead: base }), /stale/);
  assert.throws(() => reviewImpact(base, head, changed, git, () => true, { ...plan, decisions: [{ ...plan.decisions[0], evidence: [] }] }), /Invalid/);
});
