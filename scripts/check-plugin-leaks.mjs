#!/usr/bin/env node
// check-plugin-leaks.mjs — the grep-to-zero guard against origin-project residue.
//
// This repo is a PORTABLE plugin + template. It was extracted from one project (`medusa-bonsai`) and
// spent months quietly carrying that project's app paths, repo names, auth provider, chat bot, Vercel
// project and the product owner's personal name. A consuming project had to read around someone else's
// project to use its own tooling. The harness-portability bet (#7) cleared 16 files of it.
//
// Residue comes back one careless sentence at a time — usually written by someone (or some agent)
// working in the origin project, where naming it feels natural. This guard makes that a red CI check
// instead of a discovery six months later.
//
// It is deliberately DUMB — a line-level regex sweep. It cannot tell a leak from provenance, so the
// judgment lives in ALLOW below: every deliberate match is listed with its reason. Adding to ALLOW is
// a normal, reviewable act; doing it without a reason is the thing to catch in review.
//
// Zero deps — Node 18+. Run: `node scripts/check-plugin-leaks.mjs`
//
// NOTE: this script and its CI workflow are NOT scanned (they necessarily contain the patterns). Same
// carve-out golden-beans' check-template-drift.mjs makes for its own header.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, extname, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

// Everything a consuming project actually receives: the plugin, the spawn template, the marketplace
// manifest, and the front-door README. `scripts/` is excluded — it is this repo's own tooling, not
// shipped, and this file lives there.
const SCAN_ROOTS = ['plugins', 'template', '.claude-plugin'];
const SCAN_FILES = ['README.md'];

// Text formats this repo actually ships. Anything else (an image, a lockfile) is skipped rather than
// guessed at — every shipped file here is one of these today, and a new format is a deliberate add.
const TEXT_EXT = new Set([
  '.md', '.json', '.mjs', '.js', '.ts', '.tsx', '.yml', '.yaml', '.sh', '.txt', '.example', '.gitkeep',
]);
// Extensionless files this repo ships (git hooks).
const TEXT_NAMES = new Set(['pre-commit', 'pre-push', 'pre-push.example', 'post-merge', 'post-checkout']);

const RULES = [
  {
    name: 'origin-project residue',
    pattern: /miyagi|medusa|despacho|honest-eel|smalldocs/i,
    why: 'Names the project this plugin was extracted from. A consuming project cannot act on it — '
       + 'state the SHAPE it needs (a repo list, an auth provider, a chat destination) as a named '
       + 'TEMPLATE FILL-IN instead, and keep the concrete values in that project\'s own docs.',
  },
  {
    name: 'personal name',
    pattern: /\bDaniel\b/,
    why: 'Role names survive a change of person; personal names do not. Use "the product owner". '
       + '(The author fields in plugin.json / marketplace.json are the exception — see ALLOW.)',
  },
  {
    name: 'decommissioned flag tooling',
    pattern: /flagsmith|edge config/i,
    why: 'Both are decommissioned. A template that names dead tooling is worse than one that names '
       + 'none: it sends a fresh agent to build against something that no longer exists. Point at '
       + '"this project\'s own flag provider" and let its AGENTS.md name the mechanism.',
  },
];

// Deliberate matches. Each entry is matched on the file plus the EXACT trimmed line text, so a line
// moving is fine and a line being reworded is not — that is on purpose. If you rewrite one of these,
// update the entry; if you delete one, delete the entry (a stale entry fails too, below).
const ALLOW = [
  {
    file: 'README.md',
    line: 'Portable ways-of-work for the `~/dobby/` sibling-repo workspace (`medusa-bonsai`, `golden-beans`, and',
    why: 'Names the concrete workspace THIS repo serves. Not something a consumer must read around.',
  },
  {
    file: 'README.md',
    line: 'Extracted from `medusa-bonsai` (`danybgoode/miyagi-product-management`) as the S0 workstream of the',
    why: 'The `## Origin` section — where-it-came-from IS the content here. Removing it deletes history.',
  },
  // REMOVED 2026-08-06. This entry allowed the README to say the origin project "has them today" as
  // the concrete example behind the wraps-a-repo-local-script gotcha. It was worse than a leak: it
  // was FALSE COMFORT. check-skill-scripts.mjs proved eight of the ten scripts exist in no consuming
  // project and not in template/ either — so the sentence reassured every reader that a dependency
  // was satisfied somewhere while eight skills shipped dark. The README now states the real status
  // and the guard enforces it, so the clause is gone and this allowance with it.
  {
    file: '.claude-plugin/marketplace.json',
    line: '"name": "Daniel"',
    why: 'An author field is supposed to name a person. Excluded by the harness-portability pitch.',
  },
  {
    file: 'plugins/ways-of-work/.claude-plugin/plugin.json',
    line: '"name": "Daniel"',
    why: 'Same — the plugin manifest author field.',
  },
];

function isText(p) {
  return TEXT_EXT.has(extname(p)) || TEXT_NAMES.has(basename(p));
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // an optional root that does not exist is not a failure
  }
  for (const name of entries) {
    if (name === '.git' || name === 'node_modules') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (isText(full)) out.push(full);
  }
  return out;
}

const targets = [
  ...SCAN_ROOTS.flatMap((r) => walk(join(repoRoot, r))),
  ...SCAN_FILES.map((f) => join(repoRoot, f)),
];

const violations = [];
const usedAllow = new Set();

for (const abs of targets) {
  const rel = relative(repoRoot, abs);
  let text;
  try {
    text = readFileSync(abs, 'utf8');
  } catch {
    continue;
  }

  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    for (const rule of RULES) {
      if (!rule.pattern.test(line)) continue;
      const allowIdx = ALLOW.findIndex((a) => a.file === rel && a.line === line);
      if (allowIdx !== -1) {
        usedAllow.add(allowIdx);
        continue;
      }
      violations.push({ rel, lineNo: i + 1, line, rule });
    }
  });
}

const stale = ALLOW.map((a, i) => ({ ...a, i })).filter((a) => !usedAllow.has(a.i));

if (!violations.length && !stale.length) {
  console.log(`check-plugin-leaks: clean (${targets.length} files scanned, ${ALLOW.length} deliberate matches allowed).`);
  process.exit(0);
}

if (violations.length) {
  console.error(`\ncheck-plugin-leaks: ${violations.length} leak(s) found.\n`);
  const byRule = new Map();
  for (const v of violations) {
    if (!byRule.has(v.rule.name)) byRule.set(v.rule.name, []);
    byRule.get(v.rule.name).push(v);
  }
  for (const [name, vs] of byRule) {
    console.error(`  ${name}`);
    console.error(`  ${'-'.repeat(name.length)}`);
    console.error(`  ${vs[0].rule.why}\n`);
    for (const v of vs) console.error(`    ${v.rel}:${v.lineNo}\n      ${v.line}`);
    console.error('');
  }
  console.error('  If a match is genuinely deliberate (provenance, an author field), add it to ALLOW');
  console.error('  in scripts/check-plugin-leaks.mjs WITH a reason. A reason nobody can defend is a leak.\n');
}

if (stale.length) {
  console.error(`check-plugin-leaks: ${stale.length} stale ALLOW entr(y/ies) — no longer matching anything:\n`);
  for (const s of stale) console.error(`    ${s.file}\n      ${s.line}`);
  console.error('\n  The line was removed or reworded. Update or delete the ALLOW entry so the');
  console.error('  allowlist keeps describing the repo as it actually is.\n');
}

process.exit(1);
