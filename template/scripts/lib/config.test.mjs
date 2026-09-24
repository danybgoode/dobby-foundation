import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CONFIG_FILENAME,
  ConfigError,
  EXIT_NEEDS_SETTING,
  NEEDS_SETTING,
  _resetAsked,
  getKey,
  loadConfig,
  looksLikeSecret,
  migrate,
  needSetting,
  readSection,
  setKey,
} from './config.mjs';

const project = (files = {}) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'gf-config-')));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), typeof body === 'string' ? body : JSON.stringify(body));
  }
  return root;
};

test('no file anywhere: the section is null (the rail decides what that means)', () => {
  assert.deepEqual(readSection('jev', { root: project() }), { raw: null, sources: [], duplicates: [] });
});

test('legacy only: handed back exactly as the legacy file had it', () => {
  const root = project({ 'jev.config.json': { egress: true, rails: { review: { mode: 'jev' } } } });
  const r = readSection('jev', { root });
  assert.deepEqual(r.raw, { egress: true, rails: { review: { mode: 'jev' } } });
  assert.deepEqual(r.sources, [join(root, 'jev.config.json')]);
});

test('new file only: its section', () => {
  const root = project({ [CONFIG_FILENAME]: { jev: { egress: false } } });
  assert.deepEqual(readSection('jev', { root }).raw, { egress: false });
});

test('both: the new file wins PER TOP-LEVEL KEY, legacy fills the gaps, and the overlap is reported', () => {
  const root = project({
    'jev.config.json': { egress: true, model: 'jev-1.13.0' },
    [CONFIG_FILENAME]: { jev: { egress: false } },
  });
  const r = readSection('jev', { root });
  assert.deepEqual(r.raw, { egress: false, model: 'jev-1.13.0' });
  assert.deepEqual(r.duplicates, ['egress']);
  assert.equal(r.sources.length, 2);
});

test('a malformed new file is a CONFIGURATION failure naming the file; an absent one is a fallback', () => {
  const root = project({ [CONFIG_FILENAME]: '{ nope' });
  assert.throws(() => readSection('jev', { root }), (e) => e instanceof ConfigError && e.message.includes(CONFIG_FILENAME));
});

test('an unknown section in the new file is refused, not silently ignored', () => {
  const root = project({ [CONFIG_FILENAME]: { reveiw: {} } });
  assert.throws(() => readSection('review', { root }), /unknown section\(s\) reveiw/);
});

test("a rail keeps its OWN error for an unparseable legacy file (legacy-only repos behave byte-identically)", () => {
  class RailError extends Error {}
  const root = project({ 'jev.config.json': '{ broken' });
  assert.throws(
    () =>
      readSection('jev', {
        root,
        onLegacyError: (p) => {
          throw new RailError(`jev.config.json: unparseable (${p})`);
        },
      }),
    RailError
  );
});

test('legacyPath overrides the table (reporting honours REPORTING_CONFIG)', () => {
  const root = project({ 'config/rep.json': { repos: ['a/b'] } });
  assert.deepEqual(readSection('reporting', { root, legacyPath: 'config/rep.json' }).raw, { repos: ['a/b'] });
});

test('smoke carves out triage/perf: live-smoke never receives the other policies', () => {
  const root = project({
    [CONFIG_FILENAME]: { smoke: { appDir: 'apps/web', triage: { x: 1 }, perf: { y: 2 } } },
    'smoke-triage.config.json': { legacy: true },
  });
  assert.deepEqual(readSection('smoke', { root }).raw, { appDir: 'apps/web' });
  assert.deepEqual(readSection('smoke.triage', { root }).raw, { legacy: true, x: 1 });
  assert.deepEqual(readSection('smoke.perf', { root }).raw, { y: 2 });
});

test('getKey: the effective value, else the registry default', () => {
  const root = project({ 'scripts/review-config.json': { reviewScope: 'every-pr' } });
  assert.equal(getKey('review.reviewScope', { root }), 'every-pr');
  assert.equal(getKey('review.reviewScope', { root: project() }), 'security-paths-only');
  assert.equal(getKey('jev.egress', { root: project() }), null);
});

test('setKey creates the file, round-trips, and leaves other keys alone', () => {
  const root = project({ [CONFIG_FILENAME]: { review: { families: ['codex'] } } });
  setKey('review.reviewScope', 'every-pr', { root });
  const json = JSON.parse(readFileSync(join(root, CONFIG_FILENAME), 'utf8'));
  assert.deepEqual(json, { review: { families: ['codex'], reviewScope: 'every-pr' } });
  assert.equal(getKey('review.reviewScope', { root }), 'every-pr');
});

test('setKey refuses an unknown section and a secret value, and names the fix', () => {
  const root = project();
  assert.throws(() => setKey('nope.x', 1, { root }), ConfigError);
  assert.throws(() => setKey('reporting.botToken', '123:abcDEF', { root }), /env var NAME/);
  assert.throws(() => setKey('jev.key', 'sk-live-123', { root }), ConfigError);
  setKey('reporting.botToken', 'TELEGRAM_BOT_TOKEN', { root }); // an env var NAME is the right answer
  assert.equal(existsSync(join(root, CONFIG_FILENAME)), true);
});

test('looksLikeSecret: token prefixes and secret-named keys with non-env-name values', () => {
  assert.equal(looksLikeSecret('reporting.chatId', 'ghp_abc'), true);
  assert.equal(looksLikeSecret('deploy.apiKey', 'abc123'), true);
  assert.equal(looksLikeSecret('deploy.apiKey', 'VERCEL_TOKEN'), false);
  assert.equal(looksLikeSecret('review.reviewScope', 'every-pr'), false);
  assert.equal(looksLikeSecret('jev.egress', true), false);
});

test('migrate folds legacy into the new file, new wins, legacy files untouched, --dry-run writes nothing', () => {
  const legacy = { reviewScope: 'every-pr', securityPaths: ['a/**'], _about: 'note' };
  const root = project({
    'scripts/review-config.json': legacy,
    [CONFIG_FILENAME]: { review: { reviewScope: 'security-paths-only' } },
  });
  const before = readFileSync(join(root, CONFIG_FILENAME), 'utf8');
  const dry = migrate({ root, dryRun: true });
  assert.deepEqual(dry.folded, ['review.securityPaths']);
  assert.equal(readFileSync(join(root, CONFIG_FILENAME), 'utf8'), before, 'dry run wrote nothing');
  migrate({ root });
  const json = JSON.parse(readFileSync(join(root, CONFIG_FILENAME), 'utf8'));
  assert.deepEqual(json.review, { reviewScope: 'security-paths-only', securityPaths: ['a/**'] });
  assert.deepEqual(JSON.parse(readFileSync(join(root, 'scripts/review-config.json'), 'utf8')), legacy);
});

test('migrate in an empty repo: nothing to fold, no file written', () => {
  const root = project();
  assert.deepEqual(migrate({ root }).folded, []);
  assert.equal(existsSync(join(root, CONFIG_FILENAME)), false);
});

test('migrate never copies a secret-looking value; it reports it', () => {
  const root = project({ 'reporting.config.json': { repos: ['a/b'], botToken: 'xoxb-123' } });
  const r = migrate({ root, dryRun: true });
  assert.deepEqual(r.skipped, ['reporting.botToken']);
  assert.equal('botToken' in r.config.reporting, false);
});

test('loadConfig lists every present section with its sources and duplicates', () => {
  const root = project({ 'jev.config.json': { egress: true }, [CONFIG_FILENAME]: { jev: { egress: false } } });
  const c = loadConfig({ root });
  assert.deepEqual(c.sections.jev, { egress: false });
  assert.deepEqual(c.duplicates, ['jev.egress']);
});

test('needSetting: an unset key emits the protocol line ONCE; a set key never emits', () => {
  _resetAsked();
  const root = project();
  const lines = [];
  const write = (s) => lines.push(s);
  assert.equal(needSetting('review.reviewScope', { root, write }), 'security-paths-only');
  needSetting('review.reviewScope', { root, write });
  assert.equal(lines.length, 1, 'asked once per process');
  assert.ok(lines[0].startsWith(`${NEEDS_SETTING} {`));
  assert.equal(JSON.parse(lines[0].slice(NEEDS_SETTING.length + 1)).key, 'review.reviewScope');

  _resetAsked();
  const set = project({ [CONFIG_FILENAME]: { review: { reviewScope: 'every-pr' } } });
  const quiet = [];
  assert.equal(needSetting('review.reviewScope', { root: set, write: (s) => quiet.push(s) }), 'every-pr');
  assert.equal(quiet.length, 0, 'a set key never asks');
});

test('needSetting: an explicit null counts as unanswered (Jev egress, D12)', () => {
  _resetAsked();
  const root = project({ 'jev.config.json': { egress: null } });
  const lines = [];
  assert.equal(needSetting('jev.egress', { root, write: (s) => lines.push(s) }), null);
  assert.equal(lines.length, 1);
});

test('needSetting: blocking exits 7; non-blocking continues', () => {
  _resetAsked();
  let code;
  needSetting('reporting.destination', { root: project(), write: () => {}, blocking: true, exit: (c) => (code = c) });
  assert.equal(code, EXIT_NEEDS_SETTING);
});

test('needSetting refuses a key that is not registered', () => {
  assert.throws(() => needSetting('nope.x', { root: project(), write: () => {} }), /not in the registry/);
});

test("a rail's injected IO answers ONLY for its legacy file, never for the new file (compat with rail tests)", () => {
  const root = project(); // no new file on disk
  const r = readSection('smoke.perf', {
    root,
    legacyPath: '/fixture/perf.json',
    legacyExists: () => true,
    legacyRead: () => JSON.stringify({ baseUrl: 'https://a' }),
  });
  assert.deepEqual(r.raw, { baseUrl: 'https://a' });
});

test('a converted rail sees the new file: jev egress overridden by golden-frijoles.config.json', async () => {
  const { loadJevConfig } = await import('./jev.mjs');
  const root = project({
    'jev.config.json': { egress: true, rails: { review: { mode: 'jev' }, prose: { mode: 'off' } } },
    [CONFIG_FILENAME]: { jev: { egress: false } },
  });
  const cfg = loadJevConfig({ root });
  assert.equal(cfg.egress, false, 'the new file wins');
  assert.equal(cfg.rails.review.mode, 'jev', 'the legacy file fills the gap');
});
