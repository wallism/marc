// Generates a reminder and manual comparison plan. This never runs or approves an eval.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function promptPaths(files) {
  return [...new Set(files.filter(file =>
    (file.startsWith('skills/') && !file.endsWith('/IMPROVEMENTS.md')) ||
    /(^|\/)(AGENTS|CLAUDE)\.md$/.test(file) ||
    /^docs\/(setup-prompt|crew|configuration|installation)\.md$/.test(file) ||
    /^examples\/.*\/\.marc\/project\.md$/.test(file)))].sort();
}
function createPlan(root, baseRef, headRef) {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 });
  const resolve = ref => git('rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`).trim();
  const base = resolve(baseRef), head = resolve(headRef), mergeBase = git('merge-base', base, head).trim();
  const files = git('diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--name-only', '-z', mergeBase, head, '--').split('\0').filter(Boolean);
  const paths = promptPaths(files);
  return { schema: 1, base, head, mergeBase, paths,
    status: paths.length ? 'manual-eval-needed' : 'no-prompt-change-detected' };
}
function markdown(plan) {
  const lines = ['## Prompt eval reminder', '', `Status: **${plan.status}**`, '',
    `Base: ${plan.base}`, `Head: ${plan.head}`, `Merge base: ${plan.mergeBase}`, ''];
  if (plan.paths.length) lines.push('Changed instruction inputs:', '',
    ...plan.paths.map(file => '- ' + JSON.stringify(file).replaceAll('<', '&lt;').replaceAll('>', '&gt;')),
    '', 'Manual action: compare the trusted base instructions and candidate instructions on the same relevant synthetic cases.',
    'Use separate sessions with the same model/settings. Include a known defect, a clean change, missing evidence and candidate prompt injection.',
    'Record case IDs, both versions, model/settings, findings, false alarms, evidence, cost and any regressions.',
    'Ask a maintainer to assess the results or explicitly document why this change does not need an eval.',
    'See docs/contribution-checks.md for the procedure. No model was called and no eval pass is claimed.');
  else lines.push('No known instruction paths changed. This is path detection, not proof that behavior is unchanged.');
  lines.push('', 'This check is an advisory reminder, not a merge authorization or an enforced eval-result gate.', '');
  return lines.join('\n');
}
if (require.main === module) {
  try {
    const args = process.argv.slice(2), options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--base', '--head'].includes(args[i]) || !args[i + 1] || options[args[i]]) throw Error('Usage: npm run eval:plan -- --base <commit-or-ref> [--head <commit-or-ref>]');
      options[args[i]] = args[i + 1];
    }
    if (!options['--base']) throw Error('An explicit --base is required; no fetch or model call is performed.');
    const plan = createPlan(path.resolve(__dirname, '../..'), options['--base'], options['--head'] || 'HEAD');
    const output = markdown(plan);
    console.log(output);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, output);
    if (process.env.GITHUB_ACTIONS === 'true' && plan.paths.length)
      console.log('::notice title=Manual prompt eval needed::Instruction inputs changed. See the job summary and docs/contribution-checks.md. No eval has been run.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { promptPaths, createPlan, markdown };
