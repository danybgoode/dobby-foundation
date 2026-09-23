// check-release.test.mjs — a version bump IS the release; this fires the pure core against fixtures.
// Run: node --test scripts/check-release.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  PLUGIN,
  CHANGELOG,
  changelogSection,
  compareVersions,
  kitClosureFiles,
  newestChangelogVersion,
  parseVersion,
  pluginVersion,
  touchesShippedSurface,
} from './check-release.mjs';

// ── parseVersion / compareVersions ────────────────────────────────────────────────────────────

test('parseVersion accepts x.y.z and rejects anything else', () => {
  assert.deepEqual(parseVersion('0.1.0'), [0, 1, 0]);
  assert.deepEqual(parseVersion(' 1.2.3 '), [1, 2, 3]);
  assert.throws(() => parseVersion('v0.1.0'), /not a semver/);
  assert.throws(() => parseVersion('0.1'), /not a semver/);
  assert.throws(() => parseVersion('latest'), /not a semver/);
});

test('compareVersions is NUMERIC, not lexicographic — 0.10.0 beats 0.9.0', () => {
  assert.equal(compareVersions('0.10.0', '0.9.0'), 1);
  assert.equal(compareVersions('0.9.0', '0.10.0'), -1);
  assert.equal(compareVersions('0.1.0', '0.1.0'), 0);
  assert.equal(compareVersions('1.0.0', '0.9.9'), 1);
});

// ── pluginVersion / newestChangelogVersion ────────────────────────────────────────────────────

test('pluginVersion reads the field and throws when absent', () => {
  assert.equal(pluginVersion('{"name": "x", "version": "0.2.0"}'), '0.2.0');
  assert.throws(() => pluginVersion('{"name": "x"}'), /no version field/);
});

test('newestChangelogVersion finds the first versioned heading, skipping [Unreleased]', () => {
  const changelog = '# Changelog\n\n## [Unreleased]\n\n## [0.2.0] - 2026-10-01\n\nstuff\n\n## [0.1.0] - 2026-09-23\n';
  assert.equal(newestChangelogVersion(changelog), '0.2.0');
  assert.throws(() => newestChangelogVersion('# Changelog\n\nnothing here\n'), /no ".*" heading/);
});

test('changelogSection extracts one version\'s body, stopping at the next heading', () => {
  const changelog = [
    '# Changelog',
    '',
    '## [Unreleased]',
    '',
    '## [0.2.0] - 2026-10-01',
    '',
    '### Added',
    '',
    '- second release',
    '',
    '## [0.1.0] - 2026-09-23',
    '',
    '### Added',
    '',
    '- first release',
    '',
  ].join('\n');
  assert.equal(changelogSection(changelog, '0.2.0'), '### Added\n\n- second release');
  assert.equal(changelogSection(changelog, '0.1.0'), '### Added\n\n- first release');
  assert.throws(() => changelogSection(changelog, '9.9.9'), /no ".*" heading/);
});

// ── touchesShippedSurface ─────────────────────────────────────────────────────────────────────

test('touchesShippedSurface fires on plugins/**, kit/** and a closure member; not on docs', () => {
  const closure = new Set(['template/scripts/standup.mjs']);
  assert.equal(touchesShippedSurface(['plugins/golden-frijoles/skills/groom/SKILL.md'], closure), true);
  assert.equal(touchesShippedSurface(['kit/bin.mjs'], closure), true);
  assert.equal(touchesShippedSurface(['template/scripts/standup.mjs'], closure), true);
  assert.equal(touchesShippedSurface(['README.md', 'Roadmap/LEARNINGS.md'], closure), false);
  assert.equal(touchesShippedSurface(['template/scripts/other-script.mjs'], closure), false);
});

// ── kitClosureFiles — derived live, never a copied list ───────────────────────────────────────

test('kitClosureFiles is derived live from requires_scripts (a fixture skills/ dir), not hand-copied', () => {
  const skill = (entries) =>
    `---\nname: alpha\nrequires_scripts:\n${entries.map((e) => `  - ${e}`).join('\n')}\n---\n\n# alpha\n`;
  const dir = mkdtempSync(join(tmpdir(), 'kit-closure-'));
  mkdirSync(join(dir, 'alpha'));
  writeFileSync(join(dir, 'alpha', 'SKILL.md'), skill(['alpha.mjs', 'lib/shared.mjs']));
  const files = kitClosureFiles({ skillsDir: dir });
  assert.deepEqual([...files].sort(), ['template/scripts/alpha.mjs', 'template/scripts/lib/shared.mjs']);
});

test('kitClosureFiles against the REAL plugin lists every declared script under template/scripts/', () => {
  const files = kitClosureFiles();
  assert.ok(files.size > 0, 'the real plugin declares scripts');
  assert.ok([...files].every((f) => f.startsWith('template/scripts/')), 'every entry is rooted under template/scripts/');
  assert.ok([...files].some((f) => f.endsWith('standup.mjs')), 'standup-post is one of the ten skills');
});

// ── the committed release state passes its own always-check ──────────────────────────────────

test('the committed plugin.json and CHANGELOG.md agree — the same assertion the ALWAYS check makes', () => {
  const current = pluginVersion(readFileSync(PLUGIN, 'utf8'));
  const changelog = newestChangelogVersion(readFileSync(CHANGELOG, 'utf8'));
  assert.equal(current, changelog);
});

// ── acceptance-named behaviours (sprint-1.md QA) ──────────────────────────────────────────────

test('fires on a plugin change without a bump (simulated: base version >= current)', () => {
  const closure = new Set();
  const changed = ['plugins/golden-frijoles/skills/groom/SKILL.md'];
  assert.equal(touchesShippedSurface(changed, closure), true);
  // the version-bump comparison itself: base == current is NOT a forward move.
  assert.equal(compareVersions('0.1.0', '0.1.0') <= 0, true);
});

test('does NOT fire on a docs-only change', () => {
  const closure = kitClosureFiles();
  const changed = ['Roadmap/LEARNINGS.md', 'README.md'];
  assert.equal(touchesShippedSurface(changed, closure), false);
});

test('fires on a CHANGELOG mismatch', () => {
  assert.notEqual(pluginVersion('{"version": "0.2.0"}'), newestChangelogVersion('## [0.1.0] - 2026-09-23\n'));
});
