// check-plugin-leaks.test.mjs — the guard's own rules, fired against fixtures.
//
// ── Why a guard needs a test ──────────────────────────────────────────────────────────────────
// Until golden-flags-by-default S1.3 this script had no test at all, and its behaviour was only
// ever observed as "CI was green" — which is the one observation that cannot distinguish a working
// guard from a broken pattern. The epic that added these cases exists because a leak sat in this
// repo for months while the guard ran clean over it every single day: `lib/flags.ts` /
// `DEFAULT_FLAGS` is one consumer's in-house table, and no rule was looking for a mechanism that is
// not named after its project.
//
// Fixtures rather than the real tree, deliberately. A test that asserts against `plugins/` today
// passes for as long as nobody edits `plugins/`, and says nothing about what the rules DO.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scan, RULES, ALLOW } from './check-plugin-leaks.mjs';

const file = (text, rel = 'template/AGENTS.md') => [{ rel, text }];
const names = (result) => result.violations.map((v) => v.rule.name);

// ── the new rule (S1.3) ───────────────────────────────────────────────────────────────────────

test('the flag-mechanism rule fires on each of the mechanisms the epic named', () => {
  for (const leak of [
    'extend `lib/flags.ts` DEFAULT_FLAGS with the new key',
    'add it to lib/flags.ts',
    'the DEFAULT_FLAGS map',
    'insert a row into platform_flags',
  ]) {
    const result = scan(file(leak), { allow: [] });
    assert.ok(
      names(result).includes('project-specific flag mechanism'),
      `expected a leak for: ${leak}`
    );
  }
});

test('the flag-mechanism rule fires wherever a consumer receives the file', () => {
  for (const rel of ['template/AGENTS.md', 'plugins/ways-of-work/skills/groom/SKILL.md', 'README.md']) {
    assert.equal(scan([{ rel, text: 'DEFAULT_FLAGS' }], { allow: [] }).violations.length, 1, rel);
  }
});

test('`flagsmith` fails the guard — via the decommissioned-tooling rule, and only once', () => {
  const result = scan(file('we could use Flagsmith for this'), { allow: [] });
  assert.equal(result.violations.length, 1, 'one line must not be reported as two leaks');
  assert.deepEqual(names(result), ['decommissioned flag tooling']);
});

test('the flag-mechanism rule does NOT fire on the mechanism this template actually ships', () => {
  const legitimate = [
    'gf flags create checkout.demo_enabled --kill-switch --all-envs',
    "flags.isEnabled('checkout.demo_enabled', false)",
    'The seam lives in apps/example-app/flags.mjs.',
    'See references/flags-runtime.md for the Edge answer.',
    'createFlagProvider takes flagReadKey as an argument.',
  ];
  const result = scan(file(legitimate.join('\n')), { allow: [] });
  assert.deepEqual(result.violations, [], JSON.stringify(result.violations));
});

test('a flag KEY is fine; a file or table that holds defaults is not', () => {
  assert.equal(scan(file('`<domain>.<feature>_enabled`'), { allow: [] }).violations.length, 0);
  assert.equal(scan(file('DEFAULT_FLAGS'), { allow: [] }).violations.length, 1);
});

// ── the pre-existing rules still fire ─────────────────────────────────────────────────────────

test('the origin-project and personal-name rules still fire', () => {
  assert.deepEqual(names(scan(file('see the medusa-bonsai repo'), { allow: [] })), ['origin-project residue']);
  assert.deepEqual(names(scan(file('ask Daniel about it'), { allow: [] })), ['personal name']);
  // A role name is the remedy the rule points at, so it must not itself be a leak.
  assert.deepEqual(scan(file('ask the product owner about it'), { allow: [] }).violations, []);
});

// ── the ALLOW discipline ──────────────────────────────────────────────────────────────────────

test('an ALLOW entry suppresses its own line, matched on file AND exact text', () => {
  const allow = [{ file: 'README.md', line: 'DEFAULT_FLAGS', why: 'fixture' }];
  assert.equal(scan([{ rel: 'README.md', text: 'DEFAULT_FLAGS' }], { allow }).violations.length, 0);
  // Same text, different file — the allowance does not travel.
  assert.equal(scan([{ rel: 'template/x.md', text: 'DEFAULT_FLAGS' }], { allow }).violations.length, 1);
  // Same file, reworded line — an allowance is for a line, not for a topic.
  assert.equal(scan([{ rel: 'README.md', text: 'the DEFAULT_FLAGS map' }], { allow }).violations.length, 1);
});

test('a STALE ALLOW entry is reported, which is what makes the allowlist keep describing the repo', () => {
  const allow = [{ file: 'README.md', line: 'DEFAULT_FLAGS', why: 'fixture' }];
  const result = scan([{ rel: 'README.md', text: 'nothing to see here' }], { allow });
  assert.equal(result.violations.length, 0);
  assert.equal(result.stale.length, 1);
  assert.equal(result.stale[0].line, 'DEFAULT_FLAGS');
});

test('every ALLOW entry the repo actually ships carries a written reason', () => {
  for (const entry of ALLOW) {
    assert.ok(entry.why && entry.why.length > 20, `ALLOW entry for ${entry.file} needs a real reason`);
  }
});

test('every rule carries a name and a remedy, because the failure output is the whole UI', () => {
  for (const rule of RULES) {
    assert.ok(rule.name);
    assert.ok(rule.why.length > 40, `${rule.name} needs a why a reader can act on`);
    assert.ok(rule.pattern instanceof RegExp);
  }
});

test('lines are matched trimmed, so indentation never hides a leak', () => {
  assert.equal(scan(file('        DEFAULT_FLAGS'), { allow: [] }).violations.length, 1);
});
