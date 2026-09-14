// Repository contribution check for eval corpora; no model calls and no eval verdict.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const CLASSES = ['seeded-defect', 'clean-alternative', 'insufficient-evidence', 'hostile-content', 'beyond-expertise'];
const VERDICTS = ['pass', 'repair', 'human-required', 'blocked'];
const CATEGORIES = ['mandate', 'analysis', 'runtime', 'evidence', 'threshold', 'scope', 'conduct', 'output', 'principle', 'boundary'];
const POLARITIES = ['must-find', 'must-not-find', 'conduct'];
// Classes whose expectation is behavior rather than a named finding.
const BEHAVIOR_CLASSES = ['insufficient-evidence', 'hostile-content', 'beyond-expertise'];

function readJson(file) {
  if (fs.lstatSync(file).isSymbolicLink() || !fs.statSync(file).isFile()) throw Error('Expected regular corpus file: ' + file);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function regular(root, file) {
  const resolved = path.resolve(root, file);
  if (!resolved.startsWith(root + path.sep)) throw Error('Corpus reference escapes the member directory: ' + file);
  if (!fs.existsSync(resolved) || fs.lstatSync(resolved).isSymbolicLink() || !fs.statSync(resolved).isFile())
    throw Error('Missing corpus file: ' + file);
  return resolved;
}
// Case identity over the bytes a reviewer can see. Line endings are normalized so a
// checkout with a different newline policy does not change a case's identity.
function contentDigest(folder) {
  const hash = crypto.createHash('sha256'), files = [];
  for (const area of ['input', 'evidence']) {
    const root = path.join(folder, area);
    if (!fs.existsSync(root)) continue;
    (function walk(current) {
      for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
        const file = path.join(current, entry.name);
        if (entry.isSymbolicLink()) throw Error('Corpus cannot use symlinks: ' + file);
        if (entry.isDirectory()) walk(file);
        else files.push(file);
      }
    })(root);
  }
  for (const file of files.map(file => path.relative(folder, file).split(path.sep).join('/')).sort()) {
    hash.update(JSON.stringify(file));
    hash.update(fs.readFileSync(path.join(folder, file)).toString('utf8').replace(/\r\n/g, '\n'));
  }
  return hash.digest('hex');
}
function validateRules(memberRoot) {
  const document = readJson(path.join(memberRoot, 'rules.json'));
  if (document.schema !== 1 || !Array.isArray(document.rules) || !document.rules.length) throw Error('rules.json must declare schema 1 and a nonempty rules array');
  if (!Array.isArray(document.extractedFrom) || !document.extractedFrom.length) throw Error('rules.json must record the skill files it was extracted from');
  const ids = new Set();
  for (const rule of document.rules) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rule.id ?? '')) throw Error('Invalid rule id: ' + rule.id);
    if (ids.has(rule.id)) throw Error('Duplicate rule id: ' + rule.id);
    if (!CATEGORIES.includes(rule.category)) throw Error('Unknown rule category for ' + rule.id);
    if (!POLARITIES.includes(rule.polarity)) throw Error('Unknown rule polarity for ' + rule.id);
    // Every rule must be traceable to the skill text it came from, and state one obligation.
    if (!rule.source || !rule.source.includes('#')) throw Error('Rule needs a source anchor: ' + rule.id);
    if (!rule.requirement || rule.requirement.length < 20) throw Error('Rule needs a stated requirement: ' + rule.id);
    ids.add(rule.id);
  }
  return { document, ids };
}
function validateCase(memberRoot, entry, ruleIds) {
  const folder = path.join(memberRoot, 'cases', entry.id);
  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) throw Error('Missing case directory: ' + entry.id);
  const document = readJson(path.join(folder, 'case.json')), cited = new Set();
  const fail = message => { throw Error(`Case ${entry.id}: ${message}`); };
  if (document.id !== entry.id) fail('case.json id does not match its directory');
  if (!Number.isInteger(document.caseVersion) || document.caseVersion < 1) fail('caseVersion must be a positive integer');
  if (document.class !== entry.class) fail('class does not match the corpus manifest');
  if (!CLASSES.includes(document.class)) fail('unknown class');
  if (document.expectedVerdict !== entry.expectedVerdict) fail('expectedVerdict does not match the corpus manifest');
  if (!VERDICTS.includes(document.expectedVerdict)) fail('unknown expectedVerdict');
  if (!document.title || !document.notes) fail('needs a title and notes');
  // corpus.json is the human-scannable index; its title cannot drift from the case.
  if (document.title !== entry.title) fail('title does not match the corpus manifest');
  if (!/^[0-9a-f]{64}$/.test(document.contentDigest ?? '')) fail('needs a 64-character contentDigest over its input and evidence');

  const capture = document.capture ?? {};
  if (!/^[0-9a-f]{40}$/.test(capture.sourceHead ?? '') || !/^[0-9a-f]{40}$/.test(capture.base ?? '')) fail('capture needs 40-character source and base identities');
  if (capture.sourceHead === capture.base) fail('capture source and base must differ');
  if (!/^[0-9a-f]{64}$/.test(capture.policyHash ?? '')) fail('capture needs a 64-character policy digest');
  if (!Array.isArray(capture.files) || !capture.files.length) fail('capture needs a changed file inventory');
  if (!Number.isInteger(capture.changedLines) || capture.changedLines < 1) fail('capture needs a positive changedLines count');
  const selection = capture.selection ?? {};
  if (selection.memberId !== path.basename(memberRoot).replace(/^marc-crew-/, '')) fail('captured selection names another member');
  if (!/^\d+\.\d+\.\d+$/.test(selection.memberVersion ?? '')) fail('captured selection needs a semantic memberVersion');
  for (const field of ['memberHash', 'selectionHash'])
    if (!/^[0-9a-f]{64}$/.test(selection[field] ?? '')) fail(`captured selection needs a 64-character ${field}`);

  const guidance = document.consumerGuidance ?? {};
  if (!Array.isArray(guidance.targetFrameworks) || !guidance.targetFrameworks.length) fail('needs trusted consumer guidance with target frameworks');
  if (!guidance.architecture) fail('needs the trusted architecture statement the reviewer must respect');

  if (!Array.isArray(document.evidence)) fail('evidence must be an array, empty only for a deliberate gap');
  for (const reference of document.evidence) regular(memberRoot, reference);

  const required = document.requiredFindings ?? [], forbidden = document.forbiddenFindings ?? [];
  if (!Array.isArray(required) || !Array.isArray(forbidden)) fail('requiredFindings and forbiddenFindings must be arrays');
  if (!forbidden.length) fail('every case must declare at least one forbidden finding');
  for (const finding of required) {
    if (!ruleIds.has(finding.rule)) fail('requiredFindings names an unknown rule: ' + finding.rule);
    if (!finding.where || !finding.where.includes(':')) fail('requiredFindings needs a file and line for ' + finding.rule);
    if (!Array.isArray(finding.mustCite) || finding.mustCite.length < 3)
      fail('requiredFindings must state the changed code, consequence and correction to cite for ' + finding.rule);
    if (finding.severity && !['blocking', 'advisory'].includes(finding.severity)) fail('unknown severity for ' + finding.rule);
    cited.add(finding.rule);
  }
  for (const finding of forbidden) {
    if (!ruleIds.has(finding.rule)) fail('forbiddenFindings names an unknown rule: ' + finding.rule);
    if (!finding.example) fail('forbiddenFindings needs the concrete false alarm for ' + finding.rule);
    cited.add(finding.rule);
  }
  for (const rule of document.rules ?? []) {
    if (!ruleIds.has(rule)) fail('rules names an unknown rule: ' + rule);
    cited.add(rule);
  }
  if (!cited.size) fail('covers no rule');

  if (document.class === 'clean-alternative') {
    if (required.length) fail('a clean alternative expects no findings');
    if (document.expectedVerdict !== 'pass') fail('a clean alternative expects a pass');
  }
  if (document.class === 'seeded-defect') {
    if (!required.length) fail('a seeded defect needs at least one required finding');
    if (document.expectedVerdict === 'pass' && !required.every(finding => finding.severity === 'advisory'))
      fail('a seeded defect that expects a pass must mark every required finding advisory');
  }
  if (BEHAVIOR_CLASSES.includes(document.class)) {
    const behavior = document.requiredBehavior ?? [];
    if (!Array.isArray(behavior) || behavior.length < 3) fail('this class needs the expected behavior stated explicitly');
  }

  // Inputs the reviewer receives, and the rubric it must never receive.
  const rubric = regular(memberRoot, path.join('cases', entry.id, 'rubric.md'));
  if (fs.readFileSync(rubric, 'utf8').length < 400) fail('rubric.md is too short to score against');
  regular(memberRoot, path.join('cases', entry.id, 'input/change.patch'));
  const after = path.join(folder, 'input/after');
  if (!fs.existsSync(after) || !fs.statSync(after).isDirectory()) fail('needs input/after with the post-change source');
  const sources = [];
  (function walk(folderPath) {
    for (const item of fs.readdirSync(folderPath, { withFileTypes: true })) {
      const file = path.join(folderPath, item.name);
      if (item.isSymbolicLink()) fail('corpus cannot use symlinks: ' + file);
      if (item.isDirectory()) walk(file);
      else sources.push(file);
    }
  })(after);
  if (!sources.some(file => file.endsWith('.cs'))) fail('needs at least one C# source file under input/after');
  if (sources.some(file => path.basename(file) === 'rubric.md' || path.basename(file) === 'case.json'))
    fail('expectations must never sit inside the reviewer input');
  // A changed case is a new case version, never a silent edit under an existing identity.
  const digest = contentDigest(folder);
  if (digest !== document.contentDigest)
    fail(`content has changed under an unchanged identity; recompute contentDigest (expected ${digest}) and raise caseVersion`);
  return cited;
}
function validateCorpus(directory) {
  const memberRoot = fs.realpathSync(directory);
  const corpus = readJson(path.join(memberRoot, 'corpus.json'));
  if (corpus.schema !== 1 || !Number.isInteger(corpus.corpusVersion)) throw Error('corpus.json must declare schema 1 and an integer corpusVersion');
  if (!Array.isArray(corpus.cases) || !corpus.cases.length) throw Error('corpus.json must list cases');
  const { document: rules, ids: ruleIds } = validateRules(memberRoot);
  if (corpus.member !== rules.member) throw Error('corpus.json and rules.json name different members');

  const covered = new Set();
  for (const rule of corpus.universalRules ?? []) {
    if (!ruleIds.has(rule)) throw Error('corpus.json universalRules names an unknown rule: ' + rule);
    covered.add(rule);
  }
  const listed = new Set();
  for (const entry of corpus.cases) {
    if (listed.has(entry.id)) throw Error('Duplicate case in corpus.json: ' + entry.id);
    listed.add(entry.id);
    for (const rule of validateCase(memberRoot, entry, ruleIds)) covered.add(rule);
  }
  const present = fs.readdirSync(path.join(memberRoot, 'cases')).sort();
  for (const name of present) if (!listed.has(name)) throw Error('Case directory is not listed in corpus.json: ' + name);

  // The coverage contract: every rule extracted from the skill is scored by at least one case.
  const uncovered = [...ruleIds].filter(rule => !covered.has(rule));
  if (uncovered.length) throw Error('Rules with no case coverage: ' + uncovered.join(', '));
  const classes = {};
  for (const entry of corpus.cases) classes[entry.class] = (classes[entry.class] ?? 0) + 1;
  return { member: corpus.member, corpusVersion: corpus.corpusVersion, cases: present.length, rules: ruleIds.size, classes };
}
function corpora(root = path.resolve(__dirname, '../..')) {
  const evalsRoot = path.join(root, 'evals');
  if (!fs.existsSync(evalsRoot)) return [];
  return fs.readdirSync(evalsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory()).map(entry => path.join(evalsRoot, entry.name)).sort();
}

if (require.main === module) {
  try {
    const found = corpora();
    if (!found.length) throw Error('No eval corpora found under evals');
    for (const directory of found) {
      const result = validateCorpus(directory);
      const classes = Object.entries(result.classes).map(([name, count]) => `${count} ${name}`).join(', ');
      console.log(`${result.member} corpus v${result.corpusVersion}: ${result.cases} cases (${classes}) covering ${result.rules} extracted rules.`);
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { validateCorpus, validateRules, corpora };
