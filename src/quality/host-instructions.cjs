// Tracked harness inputs, including nested project rules and legacy Cursor rules.
// External/user-level instructions must be inspected by setup; they are not repository inputs.
const isHostInstruction = file => /(^|\/)(\.(agents|claude|cursor|codex)\/|(AGENTS|CLAUDE)\.md$|\.cursorrules$)/i.test(file);
module.exports = { isHostInstruction };
