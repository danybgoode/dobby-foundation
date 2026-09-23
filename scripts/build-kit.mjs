#!/usr/bin/env node
// build-kit.mjs — build @golden-frijoles/kit's dist/ from the skills' declared closure (golden-frijoles-plugin D1).
//
//   node scripts/build-kit.mjs            # wipe kit/dist/, copy the closure, print what went in
//   node scripts/build-kit.mjs --list     # print the manifest (relative paths), build nothing
//
// ── Why it is built, not committed ──────────────────────────────────────────────────────────────
// template/scripts/ is the one source of every script a skill runs. A committed kit/ copy would be a second
// source that drifts, which is the exact fork problem this repo exists to end. So the kit is GENERATED from
// the single list that already says what the skills need: each SKILL.md's `requires_scripts:`. That list is
// already held to the real import closure by check-skill-scripts.mjs, so the kit can be neither short (a
// skill's script missing from npm) nor padded. kit/dist/ is gitignored by the repo's `dist/` rule.
//
// The layout mirrors a project's scripts/ exactly: dist/<entry>.mjs, dist/lib/…, dist/pmo/…. That is what
// lets the same bytes run copied or installed (D2: kitRoot() is simply "the directory holding lib/").
//
// Zero deps — Node 18+.

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listSkills, parseRequiresScripts } from './check-skill-scripts.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SKILLS_DIR = join(repoRoot, 'plugins', 'golden-frijoles', 'skills');
export const SOURCE_DIR = join(repoRoot, 'template', 'scripts');
export const KIT_DIR = join(repoRoot, 'kit');
// Shipped beside the scripts so the package carries its own license terms (npm also reads the root LICENSE of
// the package dir, which for kit/ is this copy).
export const LEGAL_FILES = ['LICENSE', 'NOTICE'];

/** Pure (given `read`) — the sorted union of every skill's declared `requires_scripts`. */
export function kitManifest({ skillsDir = SKILLS_DIR, read = readFileSync } = {}) {
  const files = new Set();
  for (const skill of listSkills(skillsDir)) {
    const declared = parseRequiresScripts(read(join(skillsDir, skill, 'SKILL.md'), 'utf8'));
    for (const rel of declared ?? []) files.add(rel);
  }
  return [...files].sort();
}

/** Build dist/. Throws, naming every absent file, before writing anything. */
export function buildKit({
  manifest = kitManifest(),
  sourceDir = SOURCE_DIR,
  kitDir = KIT_DIR,
  legalDir = repoRoot,
  exists = existsSync,
} = {}) {
  const missing = manifest.filter((rel) => !exists(join(sourceDir, rel)));
  const missingLegal = LEGAL_FILES.filter((f) => !exists(join(legalDir, f)));
  if (missing.length || missingLegal.length) {
    throw new Error(
      `build-kit: declared but absent — ${[...missing.map((m) => `template/scripts/${m}`), ...missingLegal].join(', ')}`
    );
  }
  const dist = join(kitDir, 'dist');
  rmSync(dist, { recursive: true, force: true });
  for (const rel of manifest) {
    mkdirSync(dirname(join(dist, rel)), { recursive: true });
    copyFileSync(join(sourceDir, rel), join(dist, rel));
  }
  for (const f of LEGAL_FILES) copyFileSync(join(legalDir, f), join(dist, f));
  return { dist, files: manifest };
}

function main(argv) {
  if (argv.includes('--list')) {
    process.stdout.write(`${kitManifest().join('\n')}\n`);
    return 0;
  }
  try {
    const { dist, files } = buildKit();
    console.log(`build-kit: ${files.length} file(s) + ${LEGAL_FILES.join(', ')} → ${dist}`);
    return 0;
  } catch (err) {
    console.error(err.message);
    return 1;
  }
}

const isMain = process.argv[1] && process.argv[1].endsWith('build-kit.mjs');
if (isMain) process.exitCode = main(process.argv.slice(2));
