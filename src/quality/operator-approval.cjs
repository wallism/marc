// Operator CLI input is the authority boundary. Candidate/evidence JSON is never a capability.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const capabilities = new WeakMap();
const text = value => typeof value === 'string' && value.trim().length > 0;
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const utc = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const literalPath = value => text(value) && !/[\\*?\[\]\x00-\x1f:]/.test(value) &&
  !value.startsWith('/') && value.split('/').every(part => part && part !== '.' && part !== '..');

function validate(record, now) {
  const fields = ['schema', 'kind', 'approved', 'id', 'approvedBy', 'approvedUtc', 'expiresUtc',
    'scope', 'repository', 'pr', 'sourceHead', 'base', 'policyHash', 'paths'];
  if (!record || typeof record !== 'object' || Array.isArray(record) ||
      Object.keys(record).length !== fields.length || fields.some(key => !Object.hasOwn(record, key)) ||
      record.schema !== 1 || record.kind !== 'sensitive-paths' || record.approved !== true ||
      ![record.id, record.approvedBy, record.scope].every(text) ||
      !/^[\w.-]+\/[\w.-]+$/.test(record.repository || '') || !Number.isSafeInteger(record.pr) || record.pr < 1 ||
      !sha(record.sourceHead) || !sha(record.base) || !/^[a-f0-9]{64}$/.test(record.policyHash || '') ||
      !Array.isArray(record.paths) || !record.paths.length || !record.paths.every(literalPath) ||
      new Set(record.paths).size !== record.paths.length || !utc(record.approvedUtc) || !utc(record.expiresUtc) ||
      !Number.isFinite(now.getTime()) || Date.parse(record.approvedUtc) > now.getTime() ||
      Date.parse(record.expiresUtc) <= now.getTime() || Date.parse(record.expiresUtc) <= Date.parse(record.approvedUtc))
    throw Error('Operator approval is malformed, future-dated or expired');
}

function loadOperatorApproval(file, now = new Date()) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) throw Error('Operator approval path must be absolute');
  const resolved = path.resolve(file);
  for (let entry = resolved; ; entry = path.dirname(entry)) {
    if (fs.lstatSync(entry).isSymbolicLink()) throw Error('Operator approval path cannot contain a link or alias');
    if (path.dirname(entry) === entry) break;
  }
  // Reject every Git checkout, including other candidate worktrees and bare repositories.
  // Exit 128 with this specific diagnostic means there is no enclosing Git repository;
  // unavailable Git or any other error fails closed.
  try {
    execFileSync('git', ['-C', path.dirname(resolved), 'rev-parse', '--absolute-git-dir'],
      { encoding: 'utf8', stdio: 'pipe', windowsHide: true, timeout: 10000 });
  } catch (error) {
    if (error.status !== 128 || !String(error.stderr).includes('not a git repository')) throw error;
    return readExternal();
  }
  throw Error('Operator approval must be outside every Git checkout');

  function readExternal() {
    const fd = fs.openSync(resolved, 'r');
    try {
      const stat = fs.fstatSync(fd);
      if (!stat.isFile() || stat.nlink !== 1 || stat.size > 64 * 1024)
        throw Error('Operator approval must be a small regular file without hardlinks');
      const bytes = fs.readFileSync(fd);
      const record = JSON.parse(bytes.toString('utf8'));
      validate(record, now);
      const capability = Object.freeze({});
      capabilities.set(capability, { record, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
      return capability;
    } finally { fs.closeSync(fd); }
  }
}

function checkOperatorApproval(capability, identity, sensitivePaths, now = new Date()) {
  const stored = capabilities.get(capability);
  if (!stored) return { accepted: false, reason: 'Sensitive files require a human decision through --operator-approval' };
  try { validate(stored.record, now); }
  catch (error) { return { accepted: false, reason: error.message }; }
  const record = stored.record;
  if (['repository', 'pr', 'sourceHead', 'base', 'policyHash'].some(key => record[key] !== identity[key]))
    return { accepted: false, reason: 'Operator approval identity mismatch; explicit rebinding required' };
  if (record.paths.length !== sensitivePaths.length || !sensitivePaths.every(file => record.paths.includes(file)))
    return { accepted: false, reason: 'Operator approval does not cover the exact sensitive paths; explicit rebinding required' };
  return { accepted: true, audit: structuredClone(stored) };
}

function parseOperatorApproval(args) {
  const index = args.indexOf('--operator-approval');
  if (index === -1) return { args };
  if (!['decide', 'report', 'merge', 'checkpoint'].includes(args[0]) || index !== args.length - 2 ||
      args.lastIndexOf('--operator-approval') !== index || !args[index + 1] || args[index + 1].startsWith('--'))
    throw Error('Use one trailing --operator-approval <absolute-external-file> on decide/report/merge/checkpoint');
  return { args: args.slice(0, index), approvalFile: args[index + 1] };
}

module.exports = { loadOperatorApproval, checkOperatorApproval, parseOperatorApproval };
