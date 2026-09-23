// init.test.mjs — `gf-kit init` writes the Roadmap skeleton and never overwrites (golden-frijoles-plugin S3.2).
// Run: node --test template/scripts/init.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initSkeleton, SKELETON, skeletonRoot } from './init.mjs';

/** A skeleton "source" dir carrying each SKELETON path with distinctive, path-derived content. */
function sourceFixture(files = SKELETON) {
  const dir = mkdtempSync(join(tmpdir(), 'init-source-'));
  for (const rel of files) {
    mkdirSync(join(dir, rel, '..'), { recursive: true });
    writeFileSync(join(dir, rel), `source: ${rel}\n`);
  }
  return dir;
}

test('a fresh repo gets every skeleton file, byte-identical to the source', () => {
  const source = sourceFixture();
  const project = mkdtempSync(join(tmpdir(), 'init-fresh-'));
  const { wrote, skipped } = initSkeleton({ project, source });
  assert.deepEqual(wrote.sort(), [...SKELETON].sort());
  assert.deepEqual(skipped, []);
  for (const rel of SKELETON) {
    assert.equal(readFileSync(join(project, rel), 'utf8'), `source: ${rel}\n`);
  }
});

test('a partially-present repo gets only what is missing, and keeps what is already there', () => {
  const source = sourceFixture();
  const project = mkdtempSync(join(tmpdir(), 'init-partial-'));
  mkdirSync(join(project, 'Roadmap'), { recursive: true });
  writeFileSync(join(project, 'Roadmap', 'README.md'), 'the project’s own words, not the template’s\n');

  const { wrote, skipped } = initSkeleton({ project, source });
  assert.deepEqual(skipped, ['Roadmap/README.md']);
  assert.deepEqual(wrote.sort(), SKELETON.filter((f) => f !== 'Roadmap/README.md').sort());
  assert.equal(readFileSync(join(project, 'Roadmap', 'README.md'), 'utf8'), 'the project’s own words, not the template’s\n');
});

test('a fully-adopted repo: every file is skipped, nothing is written, exit is still success', () => {
  const source = sourceFixture();
  const project = mkdtempSync(join(tmpdir(), 'init-full-'));
  initSkeleton({ project, source }); // first pass writes everything
  const before = SKELETON.map((rel) => readFileSync(join(project, rel), 'utf8'));

  const { wrote, skipped } = initSkeleton({ project, source }); // second pass: idempotent
  assert.deepEqual(wrote, []);
  assert.deepEqual(skipped.sort(), [...SKELETON].sort());
  const after = SKELETON.map((rel) => readFileSync(join(project, rel), 'utf8'));
  assert.deepEqual(after, before, 'a re-run must not touch bytes it already skipped');
});

test('it is idempotent end to end: source A, then source B, keeps A’s bytes everywhere', () => {
  const sourceA = sourceFixture();
  const project = mkdtempSync(join(tmpdir(), 'init-idempotent-'));
  initSkeleton({ project, source: sourceA });

  const sourceB = mkdtempSync(join(tmpdir(), 'init-source-b-'));
  for (const rel of SKELETON) {
    mkdirSync(join(sourceB, rel, '..'), { recursive: true });
    writeFileSync(join(sourceB, rel), `DIFFERENT: ${rel}\n`);
  }
  const { wrote, skipped } = initSkeleton({ project, source: sourceB });
  assert.deepEqual(wrote, []);
  assert.deepEqual(skipped.sort(), [...SKELETON].sort());
  for (const rel of SKELETON) {
    assert.equal(readFileSync(join(project, rel), 'utf8'), `source: ${rel}\n`, `${rel} must keep its FIRST bytes`);
  }
});

test('skeletonRoot: installed mode reads from kitRoot()/skeleton, copied mode from kitRoot()/..', () => {
  assert.equal(skeletonRoot({ root: '/kit/dist', installed: true }), join('/kit/dist', 'skeleton'));
  assert.equal(skeletonRoot({ root: '/project/scripts', installed: false }), join('/project/scripts', '..'));
});

test('writes nothing outside Roadmap/', () => {
  const source = sourceFixture();
  const project = mkdtempSync(join(tmpdir(), 'init-scope-'));
  initSkeleton({ project, source });
  for (const rel of SKELETON) assert.ok(rel.startsWith('Roadmap/'), `${rel} is outside Roadmap/`);
  assert.equal(existsSync(join(project, 'scripts')), false, 'gf-kit init must not create a scripts/ dir');
});
