// Compatibility launcher: share MARC code, policy checks, locks and durable state.
// Keep this path until external launchers have migrated; do not copy the controller.
const marc = require('./marc.cjs');
module.exports = marc;
if (require.main === module) {
  try { marc.main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
