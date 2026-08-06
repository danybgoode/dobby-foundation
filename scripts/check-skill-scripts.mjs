#!/usr/bin/env node
// check-skill-scripts.mjs — does a consuming project actually have the scripts its skills wrap?
//
// ── Why this exists ────────────────────────────────────────────────────────────────────────────
// Each skill in plugins/ways-of-work/skills/ wraps a repo-local `scripts/<name>.mjs` that
// deliberately does NOT ship inside the plugin (plugins are copied to a cache dir on install, so a
// skill cannot reach `../scripts/`). The consuming project supplies it. That contract was written
// down in prose — inside each SKILL.md's `description` and a "Distribution note" paragraph — and
// prose is not checkable, so nothing noticed that EIGHT of the ten skills had no script anywhere:
// not in a consuming project, and not in `template/` either. Every project spawned from this repo
// got eight skills that could never run, and the harness-portability bet swept sixteen files
// without catching it.
//
// The fix is structural, not a re-reading: every skill now DECLARES its dependency in frontmatter
// (`requires_scripts:`), and this script is the one registry-walker that checks them. A new skill
// inherits the check instead of needing someone to remember it. (LEARNINGS: "the fix for a
// predicted-but-unguarded failure is structural — put every instance in ONE registry the checker
// walks".)
//
// ── What it does NOT do ────────────────────────────────────────────────────────────────────────
// It checks EXISTENCE, not correctness. A present script that is broken, or wraps a different
// contract than the skill expects, passes here. This is a floor.
//
// ── Usage ──────────────────────────────────────────────────────────────────────────────────────
//   node scripts/check-skill-scripts.mjs                      # audit template/ (the CI gate)
//   node scripts/check-skill-scripts.mjs --repo-root ~/dobby/golden-beans
//   node scripts/check-skill-scripts.mjs --repo-root <path> --json
//
// Exit 0 = no NEW breakage. Exit 1 = a skill is missing a script that isn't recorded debt, a skill
// declares nothing at all, or a recorded gap has quietly been closed without updating the ledger.
//
// A permanently-red check is worse than no check — it trains everyone to scroll past it. So the
// eight skills that have never had a script anywhere are recorded in KNOWN_ABSENT with a reason and
// reported as `debt`, not failure. What DOES fail: an undeclared skill, a NEW missing script, and a
// stale KNOWN_ABSENT entry. Same discipline as check-plugin-leaks.mjs's ALLOW list — the ledger has
// to keep describing the repo as it actually is.
//
// Zero deps — Node 18+.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const SKILLS_DIR = join(repoRoot, 'plugins', 'ways-of-work', 'skills');

// Skills that legitimately wrap nothing repo-local. Each needs a written reason, same discipline as
// check-plugin-leaks.mjs's ALLOW list — an entry with no reason is the thing to catch in review.
// A skill listed here that DOES declare requires_scripts is a stale entry and fails, so the list
// has to keep describing the plugin as it actually is.
export const NO_SCRIPTS_EXPECTED = {
  // (none today — every current skill wraps at least one repo-local script)
};

// ── The debt ledger ────────────────────────────────────────────────────────────────────────────
// Skills whose scripts have NEVER shipped anywhere: not in template/, not in any consuming project.
// Discovered 2026-08-06 when the prose contract was made machine-readable. They live in the origin
// project this repo was extracted from; the extraction moved the skills and left the scripts behind.
//
// Listed here so the check is GREEN on today's known state and RED on anything new. Two rules keep
// it honest, both enforced below:
//   • a skill here that becomes satisfied is a STALE entry and fails — pay the debt, delete the line
//   • a skill here that is missing a script NOT listed for it still fails
//
// Removing a line without supplying the script does not make the problem go away; it makes it
// invisible, which is the exact failure this whole guard exists to end.
export const KNOWN_ABSENT = {
  'babysit-pr': 'never extracted from the origin project — port scripts/babysit-pr.mjs',
  'build-order-sync': 'never extracted — port scripts/build-order-sync.mjs',
  'doc-hygiene': 'never extracted — port scripts/doc-hygiene.mjs',
  'live-smoke': 'never extracted — port scripts/live-smoke.mjs + the Playwright browser project',
  'pmo-report': 'never extracted — port scripts/pmo-report.mjs + its four scripts/lib/ helpers',
  'standup-post': 'never extracted — port scripts/standup.mjs + lib/log-branch.mjs',
  'vercel-prune': 'never extracted — port scripts/vercel-prune-previews.mjs',
  'weekly-recap': 'never extracted — port scripts/weekly-recap.mjs',
};

/**
 * Pull `requires_scripts:` out of a SKILL.md's YAML frontmatter.
 *
 * Deliberately a small hand-rolled reader rather than a YAML dependency: this repo ships with no
 * package.json and no install step by design (see .github/workflows/ci.yml), and the shape we
 * accept is exactly one block sequence of plain scalars. Anything else should fail loudly here
 * rather than be silently coerced into a wrong answer.
 *
 * Returns null when the file has no frontmatter or no `requires_scripts:` key — distinct from []
 * ("declared, and the answer is none"). The caller treats those two differently on purpose.
 */
export function parseRequiresScripts(source) {
  if (!source.startsWith('---\n')) return null;
  const close = source.indexOf('\n---\n', 3);
  if (close === -1) return null;
  const frontmatter = source.slice(4, close + 1);

  const lines = frontmatter.split('\n');
  const start = lines.findIndex((l) => /^requires_scripts:\s*$/.test(l));
  if (start === -1) return null;

  const out = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\s*#/.test(line) || line.trim() === '') continue;
    const item = line.match(/^\s+-\s+(.+?)\s*$/);
    if (!item) break; // dedent — the block ended, and the next key begins
    out.push(item[1]);
  }
  return out;
}

/** Every skill directory that has a SKILL.md, sorted for stable output. */
export function listSkills(skillsDir = SKILLS_DIR) {
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir)
    .filter((name) => {
      const p = join(skillsDir, name);
      return statSync(p).isDirectory() && existsSync(join(p, 'SKILL.md'));
    })
    .sort();
}

/**
 * Resolve one skill's declaration against a target project's scripts/ dir.
 *
 * `declared === null` (no frontmatter key) is an ERROR, not a pass. That is the whole point: the
 * prose-only era looked exactly like "no dependencies" to any checker, and eight broken skills rode
 * that ambiguity. An intentional no-dependency skill says so in NO_SCRIPTS_EXPECTED.
 */
export function resolveSkill({ skill, declared, scriptsDir, exists }) {
  const exempt = Object.prototype.hasOwnProperty.call(NO_SCRIPTS_EXPECTED, skill);

  if (declared === null) {
    return exempt
      ? { skill, status: 'exempt', missing: [], present: [] }
      : {
          skill,
          status: 'undeclared',
          missing: [],
          present: [],
          note: 'no requires_scripts: in frontmatter — declare it, or add a reasoned '
              + 'NO_SCRIPTS_EXPECTED entry',
        };
  }

  if (exempt) {
    return {
      skill,
      status: 'stale-exemption',
      missing: [],
      present: [],
      note: `listed in NO_SCRIPTS_EXPECTED but declares ${declared.length} script(s) — remove the entry`,
    };
  }

  const missing = declared.filter((rel) => !exists(join(scriptsDir, rel)));
  const present = declared.filter((rel) => exists(join(scriptsDir, rel)));
  const recorded = Object.prototype.hasOwnProperty.call(KNOWN_ABSENT, skill);

  if (!missing.length) {
    // A recorded gap that is now satisfied must be struck from the ledger, or the ledger starts
    // describing a repo that no longer exists and stops being worth reading.
    return recorded
      ? {
          skill,
          status: 'stale-debt',
          missing: [],
          present,
          note: 'listed in KNOWN_ABSENT but every script is present now — delete the entry',
        }
      : { skill, status: 'ok', missing, present };
  }

  return { skill, status: recorded ? 'debt' : 'missing', missing, present };
}

export function audit({ target, skillsDir = SKILLS_DIR, exists = existsSync } = {}) {
  const scriptsDir = join(target, 'scripts');
  return listSkills(skillsDir).map((skill) =>
    resolveSkill({
      skill,
      declared: parseRequiresScripts(readFileSync(join(skillsDir, skill, 'SKILL.md'), 'utf8')),
      scriptsDir,
      exists,
    })
  );
}

function main(argv) {
  const rootIdx = argv.indexOf('--repo-root');
  const target = rootIdx !== -1 ? argv[rootIdx + 1] : join(repoRoot, 'template');
  const asJson = argv.includes('--json');

  if (rootIdx !== -1 && !target) {
    console.error('check-skill-scripts: --repo-root needs a path');
    return 2;
  }
  if (!existsSync(target)) {
    console.error(`check-skill-scripts: no such directory: ${target}`);
    return 2;
  }

  const results = audit({ target });
  const PASSING = new Set(['ok', 'exempt', 'debt']);
  const bad = results.filter((r) => !PASSING.has(r.status));
  const debt = results.filter((r) => r.status === 'debt');

  if (asJson) {
    process.stdout.write(JSON.stringify({ target, results, ok: bad.length === 0 }, null, 2) + '\n');
    return bad.length ? 1 : 0;
  }

  const label = relative(repoRoot, target) || target;
  console.log(`check-skill-scripts: ${results.length} skill(s) against ${label}/scripts/\n`);

  for (const r of results) {
    if (r.status === 'ok') {
      console.log(`  ok        ${r.skill} — ${r.present.length} script(s) present`);
    } else if (r.status === 'exempt') {
      console.log(`  exempt    ${r.skill} — ${NO_SCRIPTS_EXPECTED[r.skill]}`);
    } else if (r.status === 'debt') {
      console.log(`  debt      ${r.skill} — ${r.missing.join(', ')} (${KNOWN_ABSENT[r.skill]})`);
    } else if (r.status === 'missing') {
      console.log(`  MISSING   ${r.skill} — ${r.missing.join(', ')}`);
    } else {
      console.log(`  ${r.status.toUpperCase().padEnd(9)} ${r.skill} — ${r.note}`);
    }
  }

  if (!bad.length) {
    if (debt.length) {
      console.log(
        `\n✓ no new breakage — but ${debt.length} skill(s) still cannot run here.` +
        '\n  Each is recorded in KNOWN_ABSENT with a reason. They are DARK, not working:' +
        '\n  a skill whose script is absent must say so and STOP, never reimplement it inline.'
      );
    } else {
      console.log('\n✓ every declared script is present.');
    }
    return 0;
  }

  // Report each failure class in its own words — "8 skills broken" is misleading when the real
  // finding is "8 debts were paid and nobody updated the ledger", and a wrong summary is how a
  // reader stops trusting the tool.
  const byStatus = (s) => bad.filter((r) => r.status === s);
  const lines = [`\n✗ ${bad.length} skill(s) need attention against ${label}.`];

  const newlyMissing = byStatus('missing');
  if (newlyMissing.length) {
    const scripts = [...new Set(newlyMissing.flatMap((r) => r.missing))].sort();
    lines.push(
      `\n  ${newlyMissing.length} NEWLY BROKEN — absent and not recorded debt: ${scripts.join(', ')}`,
      '  A skill whose script is absent must say so and STOP — never reimplement its logic inline.',
      '  Supply the script (template/scripts/ covers every future project), or correct the skill\'s',
      '  requires_scripts: if the declaration is wrong. Do NOT silence this with a KNOWN_ABSENT entry.'
    );
  }
  const stale = [...byStatus('stale-debt'), ...byStatus('stale-exemption')];
  if (stale.length) {
    lines.push(
      `\n  ${stale.length} STALE LEDGER ENTR${stale.length === 1 ? 'Y' : 'IES'} — the debt was paid:`,
      `  ${stale.map((r) => r.skill).join(', ')}`,
      '  Delete them from KNOWN_ABSENT / NO_SCRIPTS_EXPECTED so the ledger keeps describing reality.'
    );
  }
  const undeclared = byStatus('undeclared');
  if (undeclared.length) {
    lines.push(
      `\n  ${undeclared.length} UNDECLARED — no requires_scripts: in frontmatter:`,
      `  ${undeclared.map((r) => r.skill).join(', ')}`,
      '  Silence is what let eight broken skills ship. Declare the dependency, even if it is empty.'
    );
  }
  console.error(lines.join('\n'));
  return 1;
}

const isMain = process.argv[1] && process.argv[1].endsWith('check-skill-scripts.mjs');
if (isMain) process.exitCode = main(process.argv.slice(2));
