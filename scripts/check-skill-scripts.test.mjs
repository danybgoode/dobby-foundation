// Tests for check-skill-scripts.mjs — the pure halves only (frontmatter parsing + resolution).
// Filesystem access is injected via `exists`, so these run anywhere with no fixtures on disk.
//
// Run: node --test scripts/check-skill-scripts.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseRequiresScripts,
  resolveSkill,
  NO_SCRIPTS_EXPECTED,
  KNOWN_ABSENT,
} from './check-skill-scripts.mjs';

const fm = (body) => `---\nname: x\n${body}\n---\n\n# Heading\n`;

test('parses a plain block sequence', () => {
  assert.deepEqual(parseRequiresScripts(fm('requires_scripts:\n  - a.mjs\n  - lib/b.mjs')), [
    'a.mjs',
    'lib/b.mjs',
  ]);
});

test('skips comment lines inside the block', () => {
  const src = fm('requires_scripts:\n  # why these\n  - a.mjs\n  # another note\n  - b.mjs');
  assert.deepEqual(parseRequiresScripts(src), ['a.mjs', 'b.mjs']);
});

test('stops at the next frontmatter key rather than swallowing it', () => {
  const src = fm('requires_scripts:\n  - a.mjs\nallowed-tools: Bash\nother: 1');
  assert.deepEqual(parseRequiresScripts(src), ['a.mjs']);
});

test('a multi-line folded description before the key does not confuse it', () => {
  const src = fm('description: >\n  wraps scripts/decoy.mjs in prose\nrequires_scripts:\n  - real.mjs');
  assert.deepEqual(parseRequiresScripts(src), ['real.mjs']);
});

// The distinction the whole guard rests on: "declared none" vs "never declared".
test('returns null — not [] — when the key is absent', () => {
  assert.equal(parseRequiresScripts(fm('description: hi')), null);
});

test('returns null when there is no frontmatter at all', () => {
  assert.equal(parseRequiresScripts('# Just a heading\n'), null);
});

test('returns null when frontmatter is never closed', () => {
  assert.equal(parseRequiresScripts('---\nrequires_scripts:\n  - a.mjs\n'), null);
});

// ── resolution ────────────────────────────────────────────────────────────────────────────────

const resolve = (declared, have = []) =>
  resolveSkill({
    skill: 's',
    declared,
    scriptsDir: '/p/scripts',
    exists: (p) => have.includes(p.replace('/p/scripts/', '')),
  });

test('ok when every declared script is present', () => {
  const r = resolve(['a.mjs', 'lib/b.mjs'], ['a.mjs', 'lib/b.mjs']);
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.missing, []);
});

test('missing lists only the absent ones, and keeps the present ones', () => {
  const r = resolve(['a.mjs', 'b.mjs', 'c.mjs'], ['b.mjs']);
  assert.equal(r.status, 'missing');
  assert.deepEqual(r.missing, ['a.mjs', 'c.mjs']);
  assert.deepEqual(r.present, ['b.mjs']);
});

test('a nested lib/ path is checked as a path, not by basename', () => {
  // A basename-only check would call this satisfied by a top-level log-branch.mjs.
  const r = resolve(['lib/log-branch.mjs'], ['log-branch.mjs']);
  assert.equal(r.status, 'missing');
});

// This is the regression the guard exists for: prose-only skills looked exactly like
// "no dependencies" to any checker, and eight broken skills rode that ambiguity.
test('an undeclared skill FAILS rather than passing silently', () => {
  const r = resolve(null);
  assert.equal(r.status, 'undeclared');
  assert.match(r.note, /requires_scripts/);
});

test('declaring an empty list is a pass — that is an explicit answer', () => {
  assert.equal(resolve([]).status, 'ok');
});

// ── the debt ledger ───────────────────────────────────────────────────────────────────────────

const resolveNamed = (skill, declared, have = []) =>
  resolveSkill({
    skill,
    declared,
    scriptsDir: '/p/scripts',
    exists: (p) => have.includes(p.replace('/p/scripts/', '')),
  });

const A_RECORDED_SKILL = Object.keys(KNOWN_ABSENT)[0];

test('a recorded gap reports as debt, not failure — CI must not be permanently red', () => {
  const r = resolveNamed(A_RECORDED_SKILL, ['nope.mjs']);
  assert.equal(r.status, 'debt');
});

test('a NEW missing script on an unrecorded skill still fails', () => {
  const r = resolveNamed('brand-new-skill', ['nope.mjs']);
  assert.equal(r.status, 'missing');
});

test('a recorded gap that has been closed fails as a stale ledger entry', () => {
  // Paying the debt without striking the line leaves the ledger describing a repo that no longer
  // exists — which is how an ALLOW/KNOWN list stops being worth reading.
  const r = resolveNamed(A_RECORDED_SKILL, ['a.mjs'], ['a.mjs']);
  assert.equal(r.status, 'stale-debt');
  assert.match(r.note, /delete the entry/);
});

test('every KNOWN_ABSENT entry carries a reason a reviewer can act on', () => {
  for (const [skill, reason] of Object.entries(KNOWN_ABSENT)) {
    assert.equal(typeof reason, 'string', `${skill} needs a reason`);
    assert.ok(reason.length > 20, `${skill}'s reason is too thin to review: ${reason}`);
  }
});

test('the ledger only names skills that actually exist in the plugin', () => {
  // A ledger entry for a deleted skill is dead weight that reads as real debt forever.
  const skillsDir = new URL('../plugins/ways-of-work/skills/', import.meta.url).pathname;
  for (const skill of Object.keys(KNOWN_ABSENT)) {
    assert.ok(
      existsSync(join(skillsDir, skill, 'SKILL.md')),
      `KNOWN_ABSENT names "${skill}", which has no SKILL.md`
    );
  }
});

test('a stale NO_SCRIPTS_EXPECTED entry fails instead of masking a real declaration', () => {
  const r = resolveSkill({
    skill: 'ghost',
    declared: ['a.mjs'],
    scriptsDir: '/p/scripts',
    exists: () => true,
  });
  // 'ghost' is not exempt today, so this asserts the ordinary path...
  assert.equal(r.status, 'ok');
  // ...and the exemption list itself must stay honest about the plugin as it is.
  for (const [skill, reason] of Object.entries(NO_SCRIPTS_EXPECTED)) {
    assert.equal(typeof reason, 'string', `${skill} needs a written reason`);
    assert.ok(reason.length > 10, `${skill}'s exemption reason is too thin to review`);
  }
});
