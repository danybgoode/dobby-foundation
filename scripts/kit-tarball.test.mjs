// kit-tarball.test.mjs — the PUBLISHED shape works: pack the kit, install it into a stranger's repo, run it
// from a subdirectory, and it writes THAT repo's files (golden-frijoles-plugin S2.1 QA, D2).
//
// It tests the tarball `npm publish` would upload, not the source tree, because "works from template/" and
// "works from node_modules/" are exactly the two modes D2 exists to reconcile. It SKIPS, loudly, when npm is
// absent — could not look is not a failure. Offline by construction: the kit has zero dependencies.
// Run: node --test scripts/kit-tarball.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildKit } from './build-kit.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// git exports GIT_DIR & co. into hooks, and from a worktree they point at the REAL repo (LEARNINGS, 2026-09-23).
function sealedEnv() {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k];
  return env;
}

const npm = spawnSync('npm', ['--version'], { encoding: 'utf8' });
const hasNpm = !npm.error && npm.status === 0;

test('the packed kit, installed in a stranger repo, runs build-order from a subdir against that repo', { skip: !hasNpm && 'npm not found — could not look' }, () => {
  buildKit();
  const packDir = realpathSync(mkdtempSync(join(tmpdir(), 'kit-pack-')));
  const pack = spawnSync('npm', ['pack', '--pack-destination', packDir, join(repoRoot, 'kit')], {
    encoding: 'utf8',
    env: sealedEnv(),
  });
  assert.equal(pack.status, 0, pack.stderr);
  const tgz = readdirSync(packDir).find((f) => f.endsWith('.tgz'));
  assert.ok(tgz, 'npm pack produced no tarball');

  const repo = realpathSync(mkdtempSync(join(tmpdir(), 'kit-stranger-')));
  mkdirSync(join(repo, 'Roadmap', '00-ideas', 'seeds'), { recursive: true });
  mkdirSync(join(repo, 'apps', 'web', 'src'), { recursive: true });
  writeFileSync(
    join(repo, 'Roadmap', '00-ideas', 'seeds', 'a-seed.md'),
    '---\ntitle: "A seed"\nslug: a-seed\nstatus: raw\ntype: feature\nepic: null\n---\n# A seed\n'
  );
  writeFileSync(join(repo, 'package.json'), JSON.stringify({ name: 'stranger', private: true }));
  const git = spawnSync('git', ['init', '-q'], { cwd: repo, env: sealedEnv() });
  assert.equal(git.status, 0, String(git.stderr));

  const install = spawnSync('npm', ['install', '--offline', '--no-audit', '--no-fund', join(packDir, tgz)], {
    cwd: repo,
    encoding: 'utf8',
    env: sealedEnv(),
  });
  assert.equal(install.status, 0, install.stderr);

  const bin = join(repo, 'node_modules', '.bin', 'gf-kit');
  const run = spawnSync(bin, ['build-order'], { cwd: join(repo, 'apps', 'web', 'src'), encoding: 'utf8', env: sealedEnv() });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);

  const board = join(repo, 'Roadmap', '00-ideas', 'BUILD-ORDER.md');
  assert.ok(existsSync(board), 'BUILD-ORDER.md was not written into the stranger repo');
  assert.match(readFileSync(board, 'utf8'), /\[A seed\]\(seeds\/a-seed\.md\)/, 'the board must list THIS repo’s seed');
  const pkgDir = join(repo, 'node_modules', '@golden-frijoles', 'kit');
  assert.equal(existsSync(join(pkgDir, 'Roadmap')), false, 'the kit wrote into its own package');
  assert.equal(existsSync(join(pkgDir, 'dist', 'Roadmap')), false, 'the kit wrote into its own dist/');
  assert.equal(existsSync(join(repo, 'scripts')), false, 'nothing may be copied into the stranger repo');

  const list = spawnSync(bin, ['--list'], { cwd: repo, encoding: 'utf8', env: sealedEnv() });
  assert.match(list.stdout, /^build-order$/m);
});
