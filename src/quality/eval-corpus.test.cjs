const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateCorpus, validateRules, corpora } = require('./eval-corpus.cjs');

const REPO = path.resolve(__dirname, '../..');
const CSHARP = path.join(REPO, 'evals/marc-crew-csharp');

function copy(t) {
  const parent = process.env.MARC_TEST_ARTIFACTS || os.tmpdir();
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'evals-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const member = path.join(root, 'marc-crew-csharp');
  fs.cpSync(CSHARP, member, { recursive: true });
  return member;
}
function edit(member, relative, mutate) {
  const file = path.join(member, relative), document = JSON.parse(fs.readFileSync(file, 'utf8'));
  mutate(document);
  fs.writeFileSync(file, JSON.stringify(document, null, 2));
}

test('every published corpus validates', () => {
  const found = corpora(REPO);
  assert.ok(found.length, 'expected at least one eval corpus');
  for (const directory of found) {
    const result = validateCorpus(directory);
    assert.ok(result.cases > 0 && result.rules > 0);
  }
});

test('the C# corpus covers every rule extracted from the skill', () => {
  const { document, ids } = validateRules(CSHARP);
  const corpus = JSON.parse(fs.readFileSync(path.join(CSHARP, 'corpus.json'), 'utf8'));
  const covered = new Set(corpus.universalRules);
  for (const entry of corpus.cases) {
    const declared = JSON.parse(fs.readFileSync(path.join(CSHARP, 'cases', entry.id, 'case.json'), 'utf8'));
    for (const rule of declared.rules ?? []) covered.add(rule);
    for (const finding of declared.requiredFindings ?? []) covered.add(finding.rule);
    for (const finding of declared.forbiddenFindings ?? []) covered.add(finding.rule);
  }
  assert.deepEqual([...ids].filter(rule => !covered.has(rule)), [], 'rules with no case coverage');
  // Each declared source file must still exist, so a renamed skill cannot silently orphan the rules.
  for (const source of document.extractedFrom) assert.ok(fs.existsSync(path.join(REPO, source)), source);
});

test('the corpus keeps both a defect and a legitimate counterexample for calibrated behavior', () => {
  const corpus = JSON.parse(fs.readFileSync(path.join(CSHARP, 'corpus.json'), 'utf8'));
  const classes = corpus.cases.map(entry => entry.class);
  for (const required of ['seeded-defect', 'clean-alternative', 'insufficient-evidence', 'hostile-content', 'beyond-expertise'])
    assert.ok(classes.includes(required), 'missing case class: ' + required);
  // Negative cases exist for the exclusions most likely to regress on a prompt edit.
  const forbidden = new Set();
  for (const entry of corpus.cases)
    for (const finding of JSON.parse(fs.readFileSync(path.join(CSHARP, 'cases', entry.id, 'case.json'), 'utf8')).forbiddenFindings ?? [])
      forbidden.add(finding.rule);
  for (const rule of ['style-exclusions', 'pr-scope-only', 'no-mandated-patterns', 'analyzer-failures-are-ci-evidence'])
    assert.ok(forbidden.has(rule), 'no false-alarm probe for: ' + rule);
});

test('an uncovered rule is rejected', t => {
  const member = copy(t);
  edit(member, 'rules.json', document => document.rules.push({
    id: 'newly-added-rule', category: 'scope', polarity: 'must-not-find',
    source: 'SKILL.md#scope', requirement: 'A newly added obligation that no case scores yet.'
  }));
  assert.throws(() => validateCorpus(member), /Rules with no case coverage: newly-added-rule/);
});

test('an unknown rule reference is rejected', t => {
  const member = copy(t);
  edit(member, 'cases/cohesive-growth/case.json', document => document.rules.push('invented-rule'));
  assert.throws(() => validateCorpus(member), /unknown rule: invented-rule/);
});

test('a clean alternative cannot expect a finding', t => {
  const member = copy(t);
  edit(member, 'cases/cohesive-growth/case.json', document => {
    document.requiredFindings = [{ rule: 'srp-entangled-policies', where: 'src/x.cs:1', mustCite: ['a', 'b', 'c'] }];
  });
  assert.throws(() => validateCorpus(member), /a clean alternative expects no findings/);
});

test('a seeded defect cannot expect a pass unless every finding is advisory', t => {
  const member = copy(t);
  edit(member, 'cases/speculative-abstraction/case.json', document => {
    document.requiredFindings[0].severity = 'blocking';
  });
  assert.throws(() => validateCorpus(member), /must mark every required finding advisory/);
});

test('expectations inside the reviewer input are rejected', t => {
  const member = copy(t);
  fs.cpSync(path.join(member, 'cases/cohesive-growth/rubric.md'),
    path.join(member, 'cases/cohesive-growth/input/after/rubric.md'));
  assert.throws(() => validateCorpus(member), /expectations must never sit inside the reviewer input/);
});

test('an unlisted case directory is rejected', t => {
  const member = copy(t);
  fs.cpSync(path.join(member, 'cases/cohesive-growth'), path.join(member, 'cases/cohesive-growth-copy'), { recursive: true });
  assert.throws(() => validateCorpus(member), /not listed in corpus.json: cohesive-growth-copy/);
});

test('missing evidence references are rejected', t => {
  const member = copy(t);
  edit(member, 'cases/cohesive-growth/case.json', document => { document.evidence = ['shared/absent.json']; });
  assert.throws(() => validateCorpus(member), /Missing corpus file/);
});

test('a capture without exact source identity is rejected', t => {
  const member = copy(t);
  edit(member, 'cases/cohesive-growth/case.json', document => { document.capture.sourceHead = 'not-a-sha'; });
  assert.throws(() => validateCorpus(member), /40-character source and base identities/);
});

test('a silent edit to case input is rejected', t => {
  const member = copy(t);
  const file = path.join(member, 'cases/cohesive-growth/input/change.patch');
  fs.appendFileSync(file, '# edited without raising the case version\n');
  assert.throws(() => validateCorpus(member), /content has changed under an unchanged identity/);
});

test('an edit to case evidence is rejected', t => {
  const member = copy(t);
  const file = path.join(member, 'cases/stale-ci-evidence/evidence/ci-base-commit.json');
  const document = JSON.parse(fs.readFileSync(file, 'utf8'));
  document.conclusion = 'failure';
  fs.writeFileSync(file, JSON.stringify(document, null, 2));
  assert.throws(() => validateCorpus(member), /content has changed under an unchanged identity/);
});

test('the corpus index cannot drift from its cases', t => {
  const member = copy(t);
  edit(member, 'corpus.json', document => { document.cases[0].title = 'A title nobody maintained'; });
  assert.throws(() => validateCorpus(member), /title does not match the corpus manifest/);
});
