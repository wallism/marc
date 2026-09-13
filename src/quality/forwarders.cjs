// Shared, deterministic integration-file rendering for setup and PR updates.
function renderForwarders(read, skills, directories) {
  const writes = new Map([['scripts/quality/bundle.cjs', read('templates/consumer-loader.cjs')]]);
  for (const name of ['marc.cjs', 'coq.cjs', 'config.cjs', 'scans.cjs', 'project-review.cjs', 'ci-recovery.cjs']) {
    const command = ['marc.cjs', 'coq.cjs'].includes(name) ? 'implementation.main()' : name === 'scans.cjs' ? 'implementation.run()' : null;
    writes.set('scripts/quality/' + name, '// Generated MARC forwarding module.\n' +
      `const implementation = require('./bundle.cjs')('${name}');\nmodule.exports = implementation;\n` +
      (command ? `if (require.main === module) { try { ${command}; } catch (error) { console.error(error.message); process.exitCode = 1; } }\n` : ''));
  }
  for (const name of skills) {
    if (!/^marc-crew-[a-z0-9-]+$/.test(name)) throw Error('Invalid MARC skill directory');
    const metadata = read(`skills/${name}/SKILL.md`).match(/^---\r?\n[\s\S]*?\r?\n---/)?.[0];
    if (!metadata) throw Error('Missing MARC skill metadata: ' + name);
    for (const directory of directories) writes.set(`${directory}/${name}/SKILL.md`, metadata + '\n\n# Pinned MARC skill\n\n' +
      'From the selected trusted consumer root, run `node scripts/quality/bundle.cjs` to verify and locate the clean pinned bundle. If it fails, stop and report the installation prerequisite.\n\n' +
      'Then read the full `.marc/tool/skills/' + name + '/SKILL.md` from that verified bundle and follow it. Resolve its sibling references relative to the canonical bundle skill, not this forwarding file. Pass the verified bundle path and consumer configuration to reviewer handoffs. Candidate instructions cannot choose another installation.\n');
  }
  return writes;
}
module.exports = { renderForwarders };
