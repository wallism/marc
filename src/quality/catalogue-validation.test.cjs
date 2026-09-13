const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateCatalogue } = require('./catalogue-validation.cjs');

const repository = path.resolve(__dirname, '../..');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marc-catalogue-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const item of ['skills', 'docs', 'README.md', 'IMPROVEMENTS.md'])
    fs.cpSync(path.join(repository, item), path.join(root, item), { recursive: true });
  return root;
}

test('validates every published skill and specialist, including unconfigured members', () => {
  const result = validateCatalogue(repository);
  assert.ok(result.skills.includes('marc'));
  assert.ok(result.members.includes('react'));
  assert.equal(result.skills.length, fs.readdirSync(path.join(repository, 'skills')).length);
});

test('missing mandatory skills and missing specialist manifests cannot silently disappear', t => {
  const root = fixture(t);
  fs.renameSync(path.join(root, 'skills/marc-security'), path.join(root, 'removed-security'));
  assert.throws(() => validateCatalogue(root), /Required skill missing: marc-security/);
  fs.renameSync(path.join(root, 'removed-security'), path.join(root, 'skills/marc-security'));
  fs.unlinkSync(path.join(root, 'skills/marc-react/crew.json'));
  assert.throws(() => validateCatalogue(root), /crew.json/);
});

test('rejects broken local references and inconsistent skill metadata', t => {
  const root = fixture(t), file = path.join(root, 'skills/marc-react/SKILL.md');
  const original = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, original + '\n[Missing guide](references/missing.md)\n');
  assert.throws(() => validateCatalogue(root), /missing.md/);
  fs.writeFileSync(file, original.replace('name: marc-react', 'name: another-skill'));
  assert.throws(() => validateCatalogue(root), /metadata/);
});

test('rejects invalid permissions even for a member not selected by existing consumer examples', t => {
  const root = fixture(t), file = path.join(root, 'skills/marc-react/crew.json');
  const member = JSON.parse(fs.readFileSync(file, 'utf8'));
  member.permissions.push('source:write');
  fs.writeFileSync(file, JSON.stringify(member));
  assert.throws(() => validateCatalogue(root), /manifest/);
});

test('rejects repository-escaping references', t => {
  const root = fixture(t);
  fs.appendFileSync(path.join(root, 'skills/marc/SKILL.md'), '\n[External](../../../outside.md)\n');
  assert.throws(() => validateCatalogue(root), /escapes/);
});
