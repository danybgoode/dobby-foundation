#!/usr/bin/env node
// check-config-reads.mjs — after golden-frijoles-plugin S4.2, no template rail reads its config file directly.
//
// Every rail now asks lib/config.mjs for its section, which lays golden-frijoles.config.json over the legacy file
// (D9). A rail that goes back to `JSON.parse(readFileSync('review-config.json'))` would silently ignore the new file,
// so a user's `gf config set` would stop reaching it. This guard fails on that, in template/scripts/ (X16: consumer
// forks keep their own reads, by design, and are not scanned).
//
// What counts as a direct read: a read (readFileSync / read) whose argument names one of the seven legacy config
// files, or one of the rails' config-path constants. Only lib/config.mjs may do that.
//
// Zero deps. `node scripts/check-config-reads.mjs` (CI). Exit 1 on a direct read.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_ROOT = join(repoRoot, 'template', 'scripts');
export const OWNER = 'lib/config.mjs';

const LEGACY_FILES = [
  'jev\\.config\\.json',
  'reporting\\.config\\.json',
  'live-smoke\\.config\\.json',
  'smoke-triage\\.config\\.json',
  'perf-probe\\.config\\.json',
  'review-config\\.json',
  'fill-ins\\.yml',
];
const PATH_CONSTANTS = ['CONFIG_PATH', 'POLICY_PATH', 'REVIEW_CONFIG_PATH', 'FILLINS_PATH'];

export const RULES = [
  // read(… 'review-config.json' …) / readFileSync(join(__dirname, 'jev.config.json'))
  new RegExp(`\\b(readFileSync|read)\\(\\s*[^)]*['"\`](?:[^'"\`]*/)?(?:${LEGACY_FILES.join('|')})['"\`]`),
  // readFileSync(CONFIG_PATH …) — a rail's own config-path constant read directly
  new RegExp(`\\b(readFileSync|read)\\(\\s*(?:${PATH_CONSTANTS.join('|')})\\b`),
];

/** Pure — the offending lines of one file (1-based), skipping comments. */
export function scan(rel, text) {
  if (rel === OWNER) return [];
  const hits = [];
  text.split('\n').forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '');
    if (/^\s*\*/.test(code)) return;
    if (RULES.some((re) => re.test(code))) hits.push({ rel, line: i + 1, text: line.trim() });
  });
  return hits;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.mjs') && !name.endsWith('.test.mjs') && !name.includes('test-fixture')) out.push(full);
  }
  return out;
}

function main() {
  const hits = walk(SCAN_ROOT).flatMap((abs) => scan(relative(SCAN_ROOT, abs), readFileSync(abs, 'utf8')));
  if (!hits.length) {
    console.log('check-config-reads: clean. Every template rail reads its config through lib/config.mjs.');
    return 0;
  }
  console.error(`check-config-reads: ${hits.length} direct config read(s) outside ${OWNER}:\n`);
  for (const h of hits) console.error(`  template/scripts/${h.rel}:${h.line}  ${h.text}`);
  console.error(
    `\n  Ask lib/config.mjs for the section instead (readSection('<section>', { legacyPath, onLegacyError })), so` +
      '\n  golden-frijoles.config.json keeps reaching this rail. Validation stays in the rail\'s own parser.'
  );
  return 1;
}

if (process.argv[1] && process.argv[1].endsWith('check-config-reads.mjs')) process.exitCode = main();
