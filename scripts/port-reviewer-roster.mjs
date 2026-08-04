#!/usr/bin/env node
// port-reviewer-roster.mjs — one-shot porter that lands the extended reviewer roster (Mistral Vibe +
// Claude Code as CLI reviewers) and the routing script into a consuming project.
//
// WHY A SCRIPT AND NOT HAND EDITS: the same change has to land identically in every consuming project,
// and the failure mode of doing it by hand is three subtly different rosters that all look right. This
// applies the edit deterministically and is IDEMPOTENT — running it twice is a no-op, so it is safe to
// re-run after a project pulls a newer template.
//
// It is deliberately conservative: it refuses to guess. If a target file doesn't have the exact anchor
// text it expects, it says which file and which anchor and changes nothing, rather than appending
// something plausible in the wrong place.
//
// Usage:
//   node scripts/port-reviewer-roster.mjs --target <path-to-project> [--dry-run]

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = resolve(__dirname, '..', 'template', 'scripts');

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith('--')) continue;
    const key = t.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) a[key] = true;
    else { a[key] = next; i++; }
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
if (!args.target || args.target === true) {
  console.error('port-reviewer-roster: --target <path-to-project> is required');
  process.exit(1);
}
const dryRun = !!args['dry-run'];
const target = resolve(String(args.target));
const targetScripts = join(target, 'scripts');
if (!existsSync(targetScripts)) {
  console.error(`port-reviewer-roster: no scripts/ dir under "${target}"`);
  process.exit(1);
}

const changes = [];
const skipped = [];

function edit(file, label, fn) {
  const path = join(targetScripts, file);
  if (!existsSync(path)) { skipped.push(`${file} — not present in this project`); return; }
  const before = readFileSync(path, 'utf8');
  const after = fn(before);
  if (after === null) { skipped.push(`${file} — ${label}: anchor not found, left untouched`); return; }
  if (after === before) { skipped.push(`${file} — ${label}: already applied`); return; }
  if (!dryRun) writeFileSync(path, after);
  changes.push(`${file} — ${label}`);
}

// ── 1. cross-agent-cli.mjs: extend the roster + append the two runners ───────────────────────────────
// The runners are lifted VERBATIM from the template so the four projects can't drift. `fail()` and
// `lastLine()` are function declarations in every copy of this module, so hoisting makes appending safe.
const tplCli = readFileSync(join(TEMPLATE, 'lib', 'cross-agent-cli.mjs'), 'utf8');
const sliceBetween = (text, startMarker, endMarker) => {
  const s = text.indexOf(startMarker);
  if (s === -1) return null;
  const e = endMarker ? text.indexOf(endMarker, s) : -1;
  return e === -1 ? text.slice(s) : text.slice(s, e);
};
const VIBE_CLAUDE_CONSTS = sliceBetween(tplCli, '// ── Mistral Vibe (`vibe`) ─', '\nexport function die(');
const RUN_VIBE = sliceBetween(tplCli, '// One `vibe --prompt', null);
if (!VIBE_CLAUDE_CONSTS || !RUN_VIBE) {
  console.error('port-reviewer-roster: could not extract the runners from the template — did the template move?');
  process.exit(1);
}

edit('lib/cross-agent-cli.mjs', 'roster + vibe/claude runners', (src) => {
  if (src.includes('runClaudeCode')) return src; // idempotent
  const agentsRe = /export const AGENTS = \{([^}]*)\};/;
  const m = src.match(agentsRe);
  if (!m) return null;

  // Preserve whatever families this project already has (medusa carries devin) and add the two new ones.
  const existing = m[1].trim().replace(/,$/, '');
  const extended =
    `export const AGENTS = { ${existing}, vibe: 'Mistral Vibe', claude: 'Claude Code' };\n\n` +
    `// The binary each --agent value dispatches to — \`antigravity\` → \`agy\` is the one place the flag\n` +
    `// value and the executable name genuinely differ.\n` +
    `export const AGENT_BIN = { codex: 'codex', antigravity: 'agy', devin: 'devin', vibe: 'vibe', claude: 'claude' };`;

  return src.replace(agentsRe, extended).trimEnd() + '\n\n' + VIBE_CLAUDE_CONSTS.trimEnd() + '\n\n' + RUN_VIBE.trimEnd() + '\n';
});

// ── 2. cross-review.mjs: dispatch + presence check for the two new agents ────────────────────────────
edit('cross-review.mjs', 'vibe/claude dispatch', (src) => {
  if (src.includes("agent === 'vibe'")) return src; // idempotent

  // Dispatch: insert before runReview's trailing die(), which every copy of this file ends with.
  const dieRe = /(\n\s*)die\(`unknown --agent '\$\{agent\}'; use \$\{Object\.keys\(AGENTS\)\.join\('\|'\)\}`\);(\n\})/;
  if (!dieRe.test(src)) return null;
  let out = src.replace(
    dieRe,
    `$1if (agent === 'vibe') {$1  return { findings: runVibe(agyArgv(prompt, diff)), fellBack: false };$1}` +
      `$1if (agent === 'claude') {$1  // stdin, like codex — same prompt body, so the pass is comparable.$1  return { findings: runClaudeCode(prompt, diff), fellBack: false };$1}` +
      `$1die(\`unknown --agent '\${agent}'; use \${Object.keys(AGENTS).join('|')}\`);$2`
  );

  // Imports.
  out = out.replace(/(\n\s*)runAntigravity,/, `$1runAntigravity,$1runVibe,$1runClaudeCode,$1AGENT_BIN,`);

  // Presence check: extend the ensureCmd chain.
  out = out.replace(
    /(\} else if \(agent === 'antigravity'\) \{[\s\S]*?checkAgyVersion\(\);\n  \})/,
    `$1 else if (agent === 'vibe') {\n` +
      `    ensureCmd(AGENT_BIN.vibe, 'vibe not found — install the Mistral Vibe CLI (\`uv tool install mistral-vibe\`) and authenticate it, then retry.');\n` +
      `  } else if (agent === 'claude') {\n` +
      `    ensureCmd(AGENT_BIN.claude, 'claude not found — install Claude Code (https://claude.com/claude-code) and run \`claude auth login\`, then retry.');\n` +
      `  }`
  );
  return out;
});

// ── 3. review-route.mjs (+ test): copy from the template ─────────────────────────────────────────────
// A straight copy, not a merge: the routing POLICY must be byte-identical across projects. A project
// that needs a different roster narrows it through `available`, which is computed from what's installed.
for (const f of ['review-route.mjs', 'review-route.test.mjs']) {
  const dest = join(targetScripts, f);
  const src = join(TEMPLATE, f);
  const fresh = readFileSync(src, 'utf8');
  if (existsSync(dest) && readFileSync(dest, 'utf8') === fresh) { skipped.push(`${f} — already identical`); continue; }
  if (!dryRun) copyFileSync(src, dest);
  changes.push(`${f} — ${existsSync(dest) ? 'updated' : 'created'} from template`);
}

console.log(`port-reviewer-roster${dryRun ? ' [dry-run]' : ''} → ${target}`);
for (const c of changes) console.log(`  ✓ ${c}`);
for (const s of skipped) console.log(`  · ${s}`);
if (!changes.length) console.log('  (nothing to do)');
