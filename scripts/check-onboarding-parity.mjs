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

import { readFileSync } from 'node:fs';
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
    file: 'plugins/ways-of-work/skills/groom/references/kill-switch.md',
    why: 'Stage 6b: the mechanism a kill-switch story is planned against',
    must: [
      `${CLI_BIN} flags create <domain>.<feature>_enabled --kill-switch --all-envs`,
      `${CLI_BIN} flags ls --env production`,
      'node scripts/preflight.mjs',
    ],
  },
  {
    file: 'template/references/flags-runtime.md',
    why: 'the runtime rules: fail-soft, Edge placement, credential placement',
    must: [ENV_KEYS.flagRead, 'flag_sync', 'CI secrets'],
  },
];

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
