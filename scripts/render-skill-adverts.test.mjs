// Tests for render-skill-adverts.mjs — the advertised skill list is generated, never hand-kept.
// Run: node --test scripts/render-skill-adverts.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  END,
  loadSkills,
  parseSkillHeader,
  renderAll,
  renderReadmeBlock,
  spliceReadme,
} from './render-skill-adverts.mjs';

const skill = (name, summary) => `---\nname: ${name}\nsummary: "${summary}"\ndescription: >\n  long\n---\n\n# ${name}\n`;
const MARKETPLACE = JSON.stringify({ name: 'm', plugins: [{ name: 'ways-of-work', source: './x', description: 'hand-kept' }] }, null, 2);
const PLUGIN = JSON.stringify({ name: 'ways-of-work', description: 'hand-kept' }, null, 2);
const README = `# r\n\n<!-- skills:start -->\nold list\n${END}\n\ntail\n`;

function skillsDir(entries) {
  const dir = mkdtempSync(join(tmpdir(), 'adverts-'));
  for (const [name, summary] of entries) {
    mkdirSync(join(dir, name));
    writeFileSync(join(dir, name, 'SKILL.md'), skill(name, summary));
  }
  mkdirSync(join(dir, 'not-a-skill')); // a directory with no SKILL.md is not advertised
  return dir;
}

test('parseSkillHeader reads name + quoted summary, and refuses a skill with no summary', () => {
  assert.deepEqual(parseSkillHeader(skill('a', 'Does: a thing')), { name: 'a', summary: 'Does: a thing' });
  assert.throws(() => parseSkillHeader('---\nname: a\n---\n', 'a/SKILL.md'), /a\/SKILL\.md: no summary/);
});

test('smoke step 9 — a NEW skill directory appears in every advert without touching the advert files', () => {
  const before = renderAll({ skills: loadSkills(skillsDir([['alpha', 'A.']])), marketplaceText: MARKETPLACE, pluginText: PLUGIN, readmeText: README });
  const after = renderAll({
    skills: loadSkills(skillsDir([['alpha', 'A.'], ['beta', 'B.']])),
    marketplaceText: MARKETPLACE,
    pluginText: PLUGIN,
    readmeText: README,
  });
  for (const text of Object.values(before)) assert.doesNotMatch(text, /beta/);
  for (const text of Object.values(after)) assert.match(text, /beta/);
});

test('a hand-kept description is replaced wholesale, and the README outside the markers is untouched', () => {
  const out = Object.values(renderAll({ skills: [{ name: 'alpha', summary: 'A.' }], marketplaceText: MARKETPLACE, pluginText: PLUGIN, readmeText: README }));
  for (const text of out) assert.doesNotMatch(text, /hand-kept|old list/);
  const readme = out.find((t) => t.startsWith('# r'));
  assert.ok(readme.startsWith('# r\n\n<!-- skills:start'));
  assert.ok(readme.endsWith(`${END}\n\ntail\n`));
});

test('a skill whose name does not match its directory fails loudly', () => {
  const dir = mkdtempSync(join(tmpdir(), 'adverts-'));
  mkdirSync(join(dir, 'alpha'));
  writeFileSync(join(dir, 'alpha', 'SKILL.md'), skill('alfa', 'typo'));
  assert.throws(() => loadSkills(dir), /does not match its directory/);
});

test('missing README markers throw instead of silently passing --check', () => {
  assert.throws(() => spliceReadme('# no markers\n', renderReadmeBlock([])), /markers are missing/);
});

test('the committed adverts are current — the same assertion CI makes with --check', () => {
  const root = new URL('..', import.meta.url).pathname;
  const files = {
    marketplace: join(root, '.claude-plugin', 'marketplace.json'),
    plugin: join(root, 'plugins', 'ways-of-work', '.claude-plugin', 'plugin.json'),
    readme: join(root, 'README.md'),
  };
  const out = renderAll({
    skills: loadSkills(join(root, 'plugins', 'ways-of-work', 'skills')),
    marketplaceText: readFileSync(files.marketplace, 'utf8'),
    pluginText: readFileSync(files.plugin, 'utf8'),
    readmeText: readFileSync(files.readme, 'utf8'),
  });
  for (const [path, text] of Object.entries(out)) assert.equal(text, readFileSync(path, 'utf8'), `${path} is stale`);
  // …and it lists exactly the skill directories that exist.
  const dirs = readdirSync(join(root, 'plugins', 'ways-of-work', 'skills'))
    .filter((d) => existsSync(join(root, 'plugins', 'ways-of-work', 'skills', d, 'SKILL.md')));
  const plugin = JSON.parse(readFileSync(files.plugin, 'utf8'));
  for (const d of dirs) assert.match(plugin.description, new RegExp(`\\b${d}\\b`));
});
