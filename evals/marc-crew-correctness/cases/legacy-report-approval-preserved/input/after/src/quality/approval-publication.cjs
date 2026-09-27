// Public approval text is an audit copy, never an authorization capability.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const safe = value => String(value).replace(/[\r\n]+/g, ' ').replace(/[&<>`*_\[\]\\]/g,
  char => `&#${char.charCodeAt(0)};`);

function approvalSection(audit) {
  const r = audit.record;
  return `<!-- marc-approval:${audit.sha256} -->\n### Human approval record\n\n` +
    'Recorded by MARC from an explicit human decision for future agents and auditors. ' +
    'This description entry changes no committed files or HEAD; it is an audit reference, not an approval credential or proof of merge.\n\n' +
    `- Approved by: ${safe(r.approvedBy)}\n- Approval recorded (UTC): ${r.approvedUtc}\n` +
    `- Scope: ${safe(r.scope)}\n- Repository / PR: ${r.repository} #${r.pr}\n` +
    `- Reviewed source: \`${r.sourceHead}\`\n- Target base: \`${r.base}\`\n` +
    `- Policy digest: \`${r.policyHash}\`\n- Record: ${safe(r.id)}\n` +
    `- Operational approval expires (UTC): ${r.expiresUtc}; this historical entry remains after expiry.\n` +
    `- Approval record SHA-256: \`${audit.sha256}\`\n\n` +
    '<details><summary>Approved sensitive paths</summary>\n\n' +
    r.paths.map(file => `- ${safe(file)}`).join('\n') + '\n\n</details>\n' +
    `<!-- /marc-approval:${audit.sha256} -->`;
}
function appendApproval(body, audit) {
  body = body || '';
  const section = approvalSection(audit), marker = `<!-- marc-approval:${audit.sha256} -->`;
  if (body.includes(marker)) {
    if (body.split(marker).length !== 2 || !body.includes(section))
      throw Error('Existing PR approval record differs; preserve history and investigate');
    return body;
  }
  const result = body + (body ? '\n\n' : '') + section;
  if (result.length > 65536) throw Error('PR description has insufficient room for the approval record');
  return result;
}
function requireApprovalPublication(body, audit) {
  if (appendApproval(body, audit) !== (body || '')) throw Error('Record human approval in the PR with record-approval before merging');
}

// Trusted external receipts freeze report bytes independently of later decisions.
// They are written only after rendering or verifying the original published report.
function identity(e) {
  return { repository: e.repository, pr: e.pr, sourceHead: e.sourceHead, base: e.base,
    policyHash: e.policyHash, reportCreatedAt: e.reportCreatedAt || null, reportFormat: e.reportFormat || null,
    priorReports: e.priorReports || [], intent: e.intent || null,
    reportCiReuse: e.reportCiReuse || null, humanApprovalAudit: e.humanApprovalAudit || null };
}
function receiptPath(directory, e) {
  const key = [e.repository, e.pr, e.sourceHead, e.base, e.policyHash, e.reportCreatedAt, e.reportFormat];
  return path.join(directory, 'report-receipts', hash(JSON.stringify(key)) + '.json');
}
function saveReceipt(directory, e, files) {
  const file = receiptPath(directory, e), receipt = { schema: 1, identity: identity(e), files };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) {
    if (!same(JSON.parse(fs.readFileSync(file, 'utf8')), receipt)) throw Error('Existing report receipt differs');
  } else fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  return receipt;
}
function loadReceipt(directory, e) {
  const file = receiptPath(directory, e);
  if (!fs.existsSync(file)) return undefined;
  const receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
  checkReceipt(receipt, e);
  return receipt;
}
function checkReceipt(receipt, e) {
  if (receipt?.schema !== 1 || !same(receipt.identity, identity(e)) || !Array.isArray(receipt.files) ||
      receipt.files.length !== 2 || receipt.files.some(f => typeof f.path !== 'string' || !/^[a-f0-9]{64}$/.test(f.hash)))
    throw Error('Published report receipt identity or audit differs');
}
module.exports = { approvalSection, appendApproval, requireApprovalPublication, saveReceipt, loadReceipt, checkReceipt };
