// Read-only discovery workbench. This emits scope evidence, not a MARC verdict.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { scanReferencePage } = require('./impact.cjs');
const { reviewImpact } = require('./impact-review.cjs');
const { fileTechnologies } = require('./crew.cjs');

function run(repo, request, resume) {
  if (!request || !/^[a-f0-9]{40}$/.test(request.base) || !/^[a-f0-9]{40}$/.test(request.sourceHead) ||
      !['review', 'scan'].includes(request.mode)) throw Error('Frozen discovery request required');
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true,
    maxBuffer: 32 * 1024 * 1024, stdio: 'pipe' }).trimEnd();
  const files = git('diff', '--name-only', '-z', request.base, request.sourceHead).split('\0')
    .filter(file => file && !file.startsWith('.quality/'));
  const isSource = file => fileTechnologies(file).length > 0 || /\.(ya?ml|tf|bicep|ps1|json)$/i.test(file);
  if (request.mode === 'review') {
    if (resume) throw Error('Resume is for scan requests; review plans are replayed from immutable source');
    return reviewImpact(request.base, request.sourceHead, files, git, isSource, request.plan);
  }
  if (!Array.isArray(request.roots) || !request.roots.length || request.roots.some(r =>
    ![request.base, request.sourceHead].includes(r.revision) || typeof r.file !== 'string' ||
    !Array.isArray(r.names) || r.names.some(n => typeof n !== 'string' || !/^[\w$-]+$/.test(n))))
    throw Error('Explicit scan roots required');
  if (resume && !resume.continuation) throw Error('Previous scan has no continuation');
  return scanReferencePage(request.base, request.sourceHead, files, git, isSource,
    { roots: request.roots, batchSize: request.batchSize, continuation: resume?.continuation });
}

if (require.main === module) {
  try {
    const [repo, requestFile, output, resumeFile] = process.argv.slice(2);
    if (!repo || !requestFile || !output || path.resolve(requestFile) === path.resolve(output) ||
        resumeFile && path.resolve(resumeFile) === path.resolve(output)) throw Error('Usage: discovery.cjs <repo> <request.json> <new-output.json> [previous-output.json]');
    const result = run(repo, JSON.parse(fs.readFileSync(requestFile, 'utf8')),
      resumeFile ? JSON.parse(fs.readFileSync(resumeFile, 'utf8')) : undefined);
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ files: result.files.length, pending: result.reviewScopes?.filter(s => !s.decision).length,
      incomplete: result.incomplete, resumable: !!result.continuation, holds: result.holds }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { run };
