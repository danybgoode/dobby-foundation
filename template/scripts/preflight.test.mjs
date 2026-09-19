// preflight.test.mjs — every state the mandate can be in, decided without a network, a CLI or a
// filesystem. `evaluatePreflight` is a pure function of what was found precisely so this file can
// exist; `main()` does the finding.
//
// The load-bearing test is "an unreachable deployment is a WARNING, not a failure" (D1). If it is
// ever made to pass by changing the assertion rather than the code, every project spawned from this
// template gets a flag provider that can break their CI when someone else's deployment hiccups.
//
// Each assertion below was observed failing once via a deliberate mutation of preflight.mjs before
// being committed — a spec that has never been red is a tautology, not a test.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePreflight, probeSnapshot, findCli, readEnvFile } from './preflight.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compareVersions, readEnvValue, ENV_KEYS, MIN_CLI_VERSION } from './lib/golden-onboarding.mjs';

const CLI_OK = { found: true, version: MIN_CLI_VERSION, source: 'gf (PATH)' };
const ENV_OK = {
  exists: true,
  path: '/repo/.env.local',
  url: 'https://goldenfrijoles.com',
  key: 'gf_flagread_test',
  environment: 'development',
};
const PROBE_OK = { state: 'live', detail: 'Resolved snapshot v7 for development (3 flags).' };

const status = (result, id) => result.checks.find((c) => c.id === id)?.status;

// ── the five init-time states the sprint names ────────────────────────────────────────────────

test('all good: every check passes and the exit code is 0', () => {
  const result = evaluatePreflight({ cli: CLI_OK, env: ENV_OK, probe: PROBE_OK });
  assert.equal(result.ok, true);
  assert.equal(result.exitCode, 0);
  assert.equal(result.showOnboarding, false);
  assert.deepEqual(
    result.checks.map((c) => c.status),
    ['ok', 'ok', 'ok', 'ok', 'ok']
  );
});

test('no project: an absent .env.local fails hard and prints the install remedy', () => {
  const env = { exists: false, path: '/repo/.env.local', url: null, key: null, environment: null };
  const result = evaluatePreflight({ cli: CLI_OK, env, probe: { state: 'skipped', detail: 'no key' } });
  assert.equal(result.exitCode, 1);
  assert.equal(status(result, 'project'), 'fail');
  assert.equal(status(result, 'flag-read-key'), 'skipped', 'no file means the key check cannot run');
  assert.equal(result.showOnboarding, true);
});

test('no project: a .env.local written by something other than `gf init` also fails', () => {
  const env = { ...ENV_OK, url: null };
  const result = evaluatePreflight({ cli: CLI_OK, env, probe: PROBE_OK });
  assert.equal(result.exitCode, 1);
  assert.equal(status(result, 'project'), 'fail');
  assert.match(result.checks.find((c) => c.id === 'project').detail, new RegExp(ENV_KEYS.url));
});

test('no key: a linked project with no flag_read credential fails hard', () => {
  const env = { ...ENV_OK, key: null };
  const result = evaluatePreflight({ cli: CLI_OK, env, probe: { state: 'skipped', detail: 'no key' } });
  assert.equal(result.exitCode, 1);
  assert.equal(status(result, 'project'), 'ok');
  assert.equal(status(result, 'flag-read-key'), 'fail');
  assert.equal(result.showOnboarding, true);
});

test('CLI absent: fails hard, and the version check is skipped rather than guessed at', () => {
  const cli = { found: false, version: null, source: null };
  const result = evaluatePreflight({ cli, env: ENV_OK, probe: PROBE_OK });
  assert.equal(result.exitCode, 1);
  assert.equal(status(result, 'cli'), 'fail');
  assert.equal(status(result, 'cli-version'), 'skipped');
  // A missing CLI is not something `gf init` fixes, so the onboarding block does not ride along.
  assert.equal(result.showOnboarding, false);
});

test('CLI outdated: an older gf cannot complete a kill-switch story, so it fails', () => {
  const cli = { found: true, version: '0.0.9', source: 'gf (PATH)' };
  const result = evaluatePreflight({ cli, env: ENV_OK, probe: PROBE_OK });
  assert.equal(result.exitCode, 1);
  assert.equal(status(result, 'cli-version'), 'fail');
  assert.match(result.checks.find((c) => c.id === 'cli-version').detail, /0\.0\.9/);
});

test('CLI newer than the floor passes; an unreadable version warns rather than failing', () => {
  assert.equal(status(evaluatePreflight({ cli: { found: true, version: '9.9.9', source: 'x' }, env: ENV_OK, probe: PROBE_OK }), 'cli-version'), 'ok');
  const odd = evaluatePreflight({ cli: { found: true, version: 'dev-build', source: 'x' }, env: ENV_OK, probe: PROBE_OK });
  assert.equal(status(odd, 'cli-version'), 'warn');
  assert.equal(odd.exitCode, 0, 'a fork or a local build is not a misconfiguration');
});

// ── D1: the fail-soft case. The load-bearing one ──────────────────────────────────────────────

test('D1: an UNREACHABLE deployment is a warning and the preflight still exits 0', () => {
  const probe = { state: 'unreachable', detail: 'Could not reach https://goldenfrijoles.com/... (fetch failed).' };
  const result = evaluatePreflight({ cli: CLI_OK, env: ENV_OK, probe });
  assert.equal(status(result, 'snapshot'), 'warn');
  assert.equal(result.ok, true);
  assert.equal(result.exitCode, 0, 'a Golden outage must never fail a build, a test run or a deploy');
});

test('D1: a REJECTED credential is configuration, not weather, and does fail', () => {
  const probe = { state: 'dead', detail: '401' };
  const result = evaluatePreflight({ cli: CLI_OK, env: ENV_OK, probe });
  assert.equal(status(result, 'snapshot'), 'fail');
  assert.equal(result.exitCode, 1);
});

test('D1: a key for the WRONG environment fails — it is a silent production bug otherwise', () => {
  const probe = { state: 'wrong-environment', detail: 'resolves development, configured production' };
  const result = evaluatePreflight({ cli: CLI_OK, env: ENV_OK, probe });
  assert.equal(status(result, 'snapshot'), 'fail');
  assert.equal(result.exitCode, 1);
});

// ── the probe itself, against injected transports ─────────────────────────────────────────────

test('probeSnapshot: a 200 naming this environment is live', async () => {
  const probe = await probeSnapshot({
    url: 'https://example.test/',
    key: 'k',
    environment: 'development',
    fetchImpl: async () => new Response(JSON.stringify({ environment: 'development', snapshotVersion: 7, flags: [] }), { status: 200 }),
  });
  assert.equal(probe.state, 'live');
  assert.match(probe.detail, /v7/);
});

test('probeSnapshot: a 200 naming a DIFFERENT environment is wrong-environment, not live', async () => {
  const probe = await probeSnapshot({
    url: 'https://example.test',
    key: 'k',
    environment: 'production',
    fetchImpl: async () => new Response(JSON.stringify({ environment: 'development', snapshotVersion: 1, flags: [] }), { status: 200 }),
  });
  assert.equal(probe.state, 'wrong-environment');
});

test('probeSnapshot: 401 is dead; 404 and 500 are unreachable, never dead', async () => {
  const at = async (code) =>
    (await probeSnapshot({ url: 'https://example.test', key: 'k', environment: null, fetchImpl: async () => new Response('', { status: code }) })).state;
  assert.equal(await at(401), 'dead');
  // 404 is what a deployment with flag serving switched off returns. Treating it as `dead` would
  // fail every project the moment someone flipped that switch.
  assert.equal(await at(404), 'unreachable');
  assert.equal(await at(500), 'unreachable');
});

test('probeSnapshot: a thrown transport is unreachable and says so without leaking the key', async () => {
  const probe = await probeSnapshot({
    url: 'https://example.test',
    key: 'gf_flagread_secret_value',
    environment: null,
    fetchImpl: async () => {
      throw new Error('getaddrinfo ENOTFOUND example.test');
    },
  });
  assert.equal(probe.state, 'unreachable');
  assert.ok(!probe.detail.includes('gf_flagread_secret_value'), 'preflight output is pasted into issues');
});

test('probeSnapshot: the key is sent as its own Bearer credential, to the snapshot route', async () => {
  let seen = null;
  await probeSnapshot({
    url: 'https://example.test/',
    key: 'k',
    environment: null,
    fetchImpl: async (url, init) => {
      seen = { url, auth: init.headers.authorization };
      return new Response(JSON.stringify({ environment: 'development', snapshotVersion: 1, flags: [] }), { status: 200 });
    },
  });
  assert.equal(seen.url, 'https://example.test/api/v1/flags/snapshot', 'the trailing slash must not double up');
  assert.equal(seen.auth, 'Bearer k');
});

// ── the readers ───────────────────────────────────────────────────────────────────────────────

test('readEnvValue: the LAST assignment wins, as dotenv resolves it', () => {
  const contents = 'GOLDEN_FRIJOLES_FLAG_READ_KEY=first\nexport GOLDEN_FRIJOLES_FLAG_READ_KEY="second"\n';
  assert.equal(readEnvValue(contents, ENV_KEYS.flagRead), 'second');
});

test('readEnvValue: an empty assignment is absent, not an empty credential', () => {
  assert.equal(readEnvValue('GOLDEN_FRIJOLES_FLAG_READ_KEY=\n', ENV_KEYS.flagRead), null);
});

test('readEnvFile: a path that does not exist reports exists:false rather than throwing', () => {
  const env = readEnvFile('/nonexistent/definitely-not-here/.env.local', {});
  assert.equal(env.exists, false);
  assert.equal(env.key, null);
});

test('readEnvFile: with no file, CI secrets in the process environment count as linked', () => {
  const env = readEnvFile('/nonexistent/definitely-not-here/.env.local', {
    [ENV_KEYS.url]: 'https://goldenfrijoles.com',
    [ENV_KEYS.flagRead]: 'gf_flagread_ci',
    [ENV_KEYS.environment]: 'production',
  });
  assert.equal(env.exists, true);
  assert.equal(env.url, 'https://goldenfrijoles.com');
  assert.equal(env.environment, 'production');
  assert.equal(env.path, 'the process environment', 'the source is named, never implied');
});

test('readEnvFile: the process environment never overrides what the file actually says', () => {
  // The running app reads the FILE. Reporting on a shell variable it will never see would make this
  // check lie in the most confusing direction available.
  const dir = mkdtempSync(join(tmpdir(), 'preflight-'));
  const file = join(dir, '.env.local');
  writeFileSync(file, `${ENV_KEYS.url}=https://from-the-file.test\n`);
  const env = readEnvFile(file, { [ENV_KEYS.url]: 'https://from-the-shell.test', [ENV_KEYS.flagRead]: 'gf_flagread_ci' });
  assert.equal(env.url, 'https://from-the-file.test');
  assert.equal(env.key, 'gf_flagread_ci', 'but a name the file lacks still falls back');
});

test('compareVersions: unparseable input is null, which callers must not collapse into "older"', () => {
  assert.equal(compareVersions('1.2.3', '1.2.3'), 0);
  assert.ok(compareVersions('0.2.0', '0.1.0') > 0);
  assert.ok(compareVersions('0.1.0-rc.1', '0.1.0') < 0);
  assert.equal(compareVersions('dev', '0.1.0'), null);
});

test('findCli: a spawn that always fails reports found:false rather than throwing', () => {
  const cli = findCli({ cwd: '/repo', spawn: () => ({ error: new Error('ENOENT'), status: null, stdout: '' }) });
  assert.deepEqual(cli, { found: false, version: null, source: null });
});

test('findCli: PATH wins, and the version is the trimmed stdout', () => {
  const cli = findCli({ cwd: '/repo', spawn: () => ({ error: null, status: 0, stdout: '0.1.0\n' }) });
  assert.equal(cli.found, true);
  assert.equal(cli.version, '0.1.0');
  assert.match(cli.source, /PATH/);
});
