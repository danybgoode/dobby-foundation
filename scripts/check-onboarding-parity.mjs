#!/usr/bin/env node
// check-onboarding-parity.mjs — the Golden Frijoles onboarding text is ONE surface, checked.
//
// ── Why this exists ────────────────────────────────────────────────────────────────────────────
// golden-flags-by-default S1.4's acceptance: the text the agent prints, the install page's CLI
// block and `gf init`'s own next-step line must say the same thing. The commands live once, in
// `template/scripts/lib/golden-onboarding.mjs`, and `scripts/preflight.mjs` prints them from there
// — but a README is prose, and prose drifts silently. Three copies of
// `npx @golden-frijoles/cli init` agree right up until one of them is edited, and the one that
// drifts is always the one nobody runs.
//
// So: every shipped surface that tells someone how to wire the flag provider must contain the
// EXACT strings the module defines. A reworded command fails here.
//
// ── `--exec`: presence is not execution, and that distinction cost a real defect ───────────────
// The first version of this file only checked that strings were PRESENT, and the string it was
// welding into five surfaces was `gf flags ls --env production` — a command that does not exist.
// `gf flags ls` accepts only `--project`, so it exits 1 with a usage error before it ever reaches
// auth. Every surface agreed with every other surface, perfectly, about something untrue.
//
// `--exec` closes that: it RUNS each command the surfaces tell a reader to run and asserts the CLI
// parsed it. `unauthorized` (exit 2) is a PASS — the parser accepted the command and the dispatcher
// then asked for a credential, which is exactly as far as a check like this should get. `invalid`
// (exit 1) is the failure: that is the CLI saying the command does not exist.
//
// It SKIPS, loudly, when no `gf` is resolvable — "could not look" is its own outcome and never the
// failure one (LEARNINGS), because a check that goes red when npm is having a bad day is the same
// mistake `preflight.mjs` refuses to make. The skip prints a `::warning::` so a skipped run cannot
// read as a green one on the surface people actually look at.
//
// ⚠️ **AND IT RUNS UNAUTHENTICATED, DELIBERATELY AND BY CONSTRUCTION. Read this before touching
// `probeCommand`.** Two of the three advertised commands are WRITE verbs:
// `gf flags create … --all-envs` creates a definition **and activates it in production**, and
// `gf flags kill … --env production` kills it there. The first version of this mode spawned the CLI
// with no `env` option, so the child inherited `process.env` and `$HOME` — and the CLI resolves a
// credential from `GOLDEN_FRIJOLES_TOKEN` or from `~/.config/golden-frijoles/credentials.json`.
// On any machine that had run `gf login` — including, precisely, the one this epic still owes a
// live `gf init` on — a documentation parity check would have written to the product owner's real
// flag catalog. Caught in re-review before it ever ran that way.
//
// So the child gets a scrubbed environment (blank token, `XDG_CONFIG_HOME` and `HOME` pointed at an
// empty temp dir), **and `unauthorized` is now REQUIRED rather than merely accepted**. If the
// isolation ever fails, the probe comes back `ok` — and that FAILS, loudly, instead of passing as
// "well, it parsed". The safe state is asserted, not assumed.
//
// ── The half this cannot check, stated rather than implied ─────────────────────────────────────
// Two of the surfaces are in the Golden Frijoles product repo — its `/install` page
// (`apps/web/lib/cli-install.ts`) and `gf init`'s printed next-steps
// (`packages/cli/src/commands/init.ts`). A template cannot import a product's web app to read a
// string, so those are transcribed into the module with their origin named, and re-checked by hand
// at each CLI release. What is NOT left to prose: `preflight.mjs` exercises the real deployment
// with the real variable names, so a rename in the CLI surfaces as a failing preflight rather than
// as a stale sentence.
//
// This script is dobby-foundation's own tooling and does NOT ship to consuming projects — it
// asserts things about this repo's README files, which a spawned project does not have.
//
// Usage: node scripts/check-onboarding-parity.mjs
//
// Zero deps — Node 18+.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CLI_BIN,
  CLI_GLOBAL_INSTALL,
  CLI_NPX_INIT,
  CLI_NPX_LOGIN,
  ENV_KEYS,
  KILL_SWITCH_STORY,
} from '../template/scripts/lib/golden-onboarding.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Each surface, and the strings it must carry verbatim.
 *
 * Deliberately not "every surface must carry everything": a README section aimed at someone
 * spawning a project needs the two commands, while the skill reference that plans a kill-switch
 * story needs the creation verb and the activation check. Requiring the union would force noise
 * into each file, and noise is how a doc stops being read.
 */
const SURFACES = [
  {
    file: 'README.md',
    why: 'the front door: how a consumer wires the provider after installing the plugin',
    must: [CLI_NPX_LOGIN, CLI_NPX_INIT, CLI_GLOBAL_INSTALL, 'node scripts/preflight.mjs', ...KILL_SWITCH_STORY],
  },
  {
    file: 'template/README.md',
    why: 'the spawn checklist: the step that links a fresh project to a Golden Frijoles project',
    must: [CLI_NPX_LOGIN, CLI_NPX_INIT, CLI_GLOBAL_INSTALL, 'node scripts/preflight.mjs'],
  },
  {
    file: 'template/AGENTS.md',
    why: 'the cannot-be-violated rule an agent reads at session start',
    must: [
      'Feature flags are Golden Frijoles. Never build a parallel flag store.',
      'node scripts/preflight.mjs',
      ENV_KEYS.url,
      ENV_KEYS.flagRead,
      ENV_KEYS.environment,
      `${CLI_BIN} flags create`,
      'NOT ENFORCED',
    ],
  },
  {
    file: 'plugins/golden-frijoles/skills/groom/references/kill-switch.md',
    why: 'Stage 6b: the mechanism a kill-switch story is planned against',
    must: [
      `${CLI_BIN} flags create <domain>.<feature>_enabled --kill-switch --all-envs`,
      `${CLI_BIN} flags get <domain>.<feature>_enabled`,
      'node scripts/preflight.mjs',
    ],
  },
  {
    file: 'template/references/flags-runtime.md',
    why: 'the runtime rules: fail-soft, Edge placement, credential placement',
    must: [ENV_KEYS.flagRead, 'flag_sync', 'CI secrets'],
  },
];

/**
 * Run one command the surfaces advertise and decide whether the CLI PARSED it.
 *
 * `<domain>.<feature>_enabled` is a placeholder in the docs; the CLI validates flag keys, so the
 * probe substitutes a syntactically valid one. What is being checked is the command's SHAPE — verb
 * path and flags — not that a particular flag exists.
 */
function probeCommand(cliPath, command, scrubbedEnv) {
  const argv = command
    .replace(/\s+#.*$/, '')
    .replace(/<domain>\.<feature>_enabled/g, 'preflight.parity_probe')
    .trim()
    .split(/\s+/)
    .slice(1); // drop the `gf`
  const run = spawnSync(cliPath, [...argv, '--json'], {
    encoding: 'utf8',
    timeout: 30_000,
    // The whole safety property of this mode, in one option. See the header.
    env: scrubbedEnv,
  });
  if (run.error) return { ok: false, why: `could not run: ${run.error.message}` };
  let body = {};
  try {
    body = JSON.parse(run.stdout || '{}');
  } catch {
    return { ok: false, why: `unparseable --json output: ${(run.stdout || '').slice(0, 120)}` };
  }
  // `invalid` is the CLI saying "this command does not exist" — the defect this mode exists for.
  if (body.code === 'invalid') return { ok: false, why: body.error ?? 'usage error' };
  // Anything OTHER than `unauthorized` means the credential scrub did not hold, and two of these
  // three commands WRITE. Refuse rather than report a pass.
  if (body.code !== 'unauthorized') {
    return {
      ok: false,
      why:
        `expected \`unauthorized\` and got \`${body.code ?? 'ok'}\` — the credential isolation FAILED, ` +
        'and this command may have written to a real flag catalog. Do not re-run until the env scrub ' +
        'in probeCommand() is fixed.',
    };
  }
  return { ok: true, why: 'unauthorized (parsed, then refused for want of a credential)' };
}

function execCheck() {
  const candidates = [CLI_BIN, join(repoRoot, 'node_modules', '.bin', CLI_BIN)];
  const cliPath = candidates.find((candidate) => {
    const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8', timeout: 20_000 });
    return !probe.error && probe.status === 0;
  });
  if (!cliPath) {
    // `::warning::` so a SKIP is visible in the one place people read — the checks list. Printing
    // only to stdout made a skipped run indistinguishable from a passing one, which is the same
    // ambiguous-green shape this whole mode exists to end.
    console.log(
      `::warning::check-onboarding-parity --exec was SKIPPED, not passed — no \`${CLI_BIN}\` resolvable.`
    );
    console.log(
      `check-onboarding-parity --exec: SKIPPED — no \`${CLI_BIN}\` resolvable. ${CLI_GLOBAL_INSTALL} to run it.\n` +
        '  "Could not look" is not the failure outcome; this is a release-time check, not a gate on npm being up.'
    );
    return 0;
  }

  // An empty config home, so `~/.config/golden-frijoles/credentials.json` cannot be found, and a
  // blank token, which `resolveAuth` treats as absent (it trims, then tests for truthiness).
  const emptyHome = mkdtempSync(join(tmpdir(), 'gf-parity-no-credentials-'));
  const scrubbedEnv = {
    ...process.env,
    GOLDEN_FRIJOLES_TOKEN: '',
    XDG_CONFIG_HOME: emptyHome,
    HOME: emptyHome,
  };

  const failures = [];
  for (const command of KILL_SWITCH_STORY) {
    const result = probeCommand(cliPath, command, scrubbedEnv);
    console.log(`  ${result.ok ? '✅' : '❌'} ${command.replace(/\s+#.*$/, '')}  →  ${result.why}`);
    if (!result.ok) failures.push({ command, why: result.why });
  }
  if (!failures.length) {
    console.log(
      `check-onboarding-parity --exec: every advertised command was PARSED by ${cliPath}, and every one of them ` +
        'stopped at the credential check — nothing was written.'
    );
    return 0;
  }
  console.error('\ncheck-onboarding-parity --exec: the docs advertise a command the CLI does not have.\n');
  for (const failure of failures) console.error(`    ${failure.command}\n      ${failure.why}`);
  console.error('\n  Fix it in template/scripts/lib/golden-onboarding.mjs and propagate. Presence in every');
  console.error('  surface is not the same as the command existing — that is the defect this mode exists for.\n');
  return 1;
}

if (process.argv.includes('--exec')) process.exit(execCheck());

const problems = [];
for (const surface of SURFACES) {
  let text;
  try {
    text = readFileSync(join(repoRoot, surface.file), 'utf8');
  } catch {
    problems.push({ file: surface.file, missing: ['(the file itself)'], why: surface.why });
    continue;
  }
  const missing = surface.must.filter((needle) => !text.includes(needle));
  if (missing.length) problems.push({ file: surface.file, missing, why: surface.why });
}

if (!problems.length) {
  console.log(
    `check-onboarding-parity: clean (${SURFACES.length} surfaces carry the canonical commands from template/scripts/lib/golden-onboarding.mjs).`
  );
  process.exit(0);
}

console.error('\ncheck-onboarding-parity: the onboarding surfaces have drifted apart.\n');
for (const problem of problems) {
  console.error(`  ${problem.file}`);
  console.error(`  ${'-'.repeat(problem.file.length)}`);
  console.error(`  ${problem.why}\n`);
  for (const missing of problem.missing) console.error(`    missing: ${missing}`);
  console.error('');
}
console.error('  These strings are defined ONCE, in template/scripts/lib/golden-onboarding.mjs, and');
console.error('  printed from there by scripts/preflight.mjs. If a command genuinely changed, change');
console.error('  it in the module and update every surface — not the other way around.\n');
process.exit(1);
