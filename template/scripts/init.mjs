#!/usr/bin/env node
// init.mjs — `gf-kit init`: adopt any repo by writing the Roadmap/ skeleton (golden-frijoles-plugin S3.2, D2).
//
//   node scripts/init.mjs             # write the skeleton into projectRoot(); never overwrite a file
//
// ── Why ───────────────────────────────────────────────────────────────────────────────────────
// A stranger who pastes the install prompt into an EXISTING repo gets the plugin, but `groom` needs
// somewhere to write on day one — `Roadmap/README.md`, `WAYS-OF-WORKING.md`, `LEARNINGS.md`, and the
// `00-ideas/` funnel. `gf-kit init` is that one step: it writes the same skeleton a project spawned
// from `template/` already has, into any repo, copied or installed (D2's two roots).
//
// ── Where the skeleton's SOURCE lives ─────────────────────────────────────────────────────────
// INSTALLED: `kitRoot()/skeleton/` — `scripts/build-kit.mjs` copies `template/<each SKELETON path>`
// into `kit/dist/skeleton/`, reading the very list exported below, so there is one list, not two.
// COPIED: `kitRoot()/../` — when this file runs as `template/scripts/init.mjs` (this repo's own dev
// checkout) that is `template/`, the skeleton's real source; when it runs as a spawned project's own
// `scripts/init.mjs`, that is the project's own root, which already has every file, so every write is
// a no-op `skipped … (exists)` — never a broken read.
//
// ── The one rule ──────────────────────────────────────────────────────────────────────────────
// It NEVER overwrites a file that already exists (it prints `skipped <path> (exists)`), so it is safe
// to run on a partially-adopted repo. It writes nothing outside `Roadmap/`. Its own exit code is 0
// whether it wrote anything or not — "already adopted" is success, not a no-op failure.
//
// Zero deps — Node 18+.

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isInstalled, kitRoot, projectRoot } from './lib/project-root.mjs';

/**
 * The Roadmap skeleton `gf-kit init` writes, relative both to its source root (template/, or
 * kit/dist/skeleton/ once built) and to the project it writes into. ONE list: `build-kit.mjs` reads
 * this export to populate `kit/dist/skeleton/`, so there is no second copy of the file names to drift.
 */
export const SKELETON = [
  'Roadmap/README.md',
  'Roadmap/WAYS-OF-WORKING.md',
  'Roadmap/LEARNINGS.md',
  'Roadmap/00-ideas/README.md',
  'Roadmap/00-ideas/seeds/.gitkeep',
  'Roadmap/00-ideas/audits/.gitkeep',
];

/** Where the skeleton's SOURCE files live: `kitRoot()/skeleton` when installed, `kitRoot()/..` when copied. */
export function skeletonRoot({ root = kitRoot(), installed = isInstalled({ root }) } = {}) {
  return installed ? join(root, 'skeleton') : join(root, '..');
}

/**
 * Write the skeleton into `project`, never overwriting. Pure given its injected fs functions.
 * Returns `{ wrote, skipped }`, each a list of the SKELETON-relative paths.
 */
export function initSkeleton({
  project = projectRoot(),
  source = skeletonRoot(),
  files = SKELETON,
  exists = existsSync,
  mkdir = mkdirSync,
  copy = copyFileSync,
  log = () => {},
} = {}) {
  const wrote = [];
  const skipped = [];
  for (const rel of files) {
    const dest = join(project, rel);
    if (exists(dest)) {
      skipped.push(rel);
      log(`skipped ${rel} (exists)`);
      continue;
    }
    mkdir(dirname(dest), { recursive: true });
    copy(join(source, rel), dest);
    wrote.push(rel);
    log(`wrote ${rel}`);
  }
  return { wrote, skipped };
}

function main() {
  const { wrote, skipped } = initSkeleton({ log: (line) => console.log(line) });
  console.log(`gf-kit init: ${wrote.length} written, ${skipped.length} already present.`);
  return 0;
}

const isMain = process.argv[1] && process.argv[1].endsWith('init.mjs');
if (isMain) process.exitCode = main();
