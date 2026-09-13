const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
let count = 0;
function check(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw Error('Unexpected source symlink: ' + file);
    if (entry.isDirectory()) check(file);
    else if (/\.(cjs|mjs|js)$/.test(entry.name)) {
      execFileSync(process.execPath, ['--check', file], { stdio: 'inherit', windowsHide: true });
      count++;
    }
  }
}
for (const folder of ['src', 'scripts']) check(path.join(root, folder));
console.log(`Syntax checked ${count} JavaScript files.`);
