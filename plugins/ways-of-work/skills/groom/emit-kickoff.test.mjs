// emit-kickoff.test.mjs — pure-logic coverage for the Stage-8 kickoff generator. No filesystem
// walking of a real Roadmap tree: small fixture strings stand in for README.md / sprint-N.md.
// (The script guards main() with an isMain check — importing it here must be side-effect-free.)

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseArgs,
  sub,
  parseFrontmatter,
  parseEpicTitle,
  parseSprintHeader,
  parseStoryHeadings,
  buildStoryList,
  buildKickoff,
} from './emit-kickoff.mjs';

test('parseArgs: flags with values and boolean flags', () => {
  const a = parseArgs(['--epic', 'ssrf-dns-pinning', '--sprint', '1', '--dry-run']);
  assert.equal(a.epic, 'ssrf-dns-pinning');
  assert.equal(a.sprint, '1');
  assert.equal(a['dry-run'], true);
});

test('sub: replaces known placeholders, leaves unknown ones untouched', () => {
  const out = sub('Hello {{NAME}}, {{MISSING}}!', { NAME: 'World' });
  assert.equal(out, 'Hello World, {{MISSING}}!');
});

test('parseFrontmatter: simple key: value block between --- fences', () => {
  const text = '---\nstatus: scaffolded\nslug: my-epic\n---\n\n# Epic: My Epic\n';
  const fm = parseFrontmatter(text);
  assert.equal(fm.status, 'scaffolded');
  assert.equal(fm.slug, 'my-epic');
});

test('parseFrontmatter: no leading fence returns empty object', () => {
  assert.deepEqual(parseFrontmatter('# Epic: My Epic\n'), {});
});

test('parseEpicTitle: strips the "Epic: " prefix from the H1', () => {
  const text = '---\nstatus: scaffolded\nslug: x\n---\n\n# Epic: Process token-diet\n\n## Why\n';
  assert.equal(parseEpicTitle(text), 'Process token-diet');
});

test('parseEpicTitle: returns null when no H1 present', () => {
  assert.equal(parseEpicTitle('no heading here\n'), null);
});

test('parseSprintHeader: parses epic title, sprint number, and sprint title', () => {
  const text = '# Process token-diet — Sprint 1: Script the boilerplate, flip the review policy\n\n**Status:** not started\n';
  const h = parseSprintHeader(text);
  assert.deepEqual(h, {
    epicTitle: 'Process token-diet',
    sprintNum: '1',
    sprintTitle: 'Script the boilerplate, flip the review policy',
  });
});

test('parseSprintHeader: epic title itself containing an em-dash still parses (non-greedy match)', () => {
  const text = '# Homepage Polish — Dirección B — Sprint 1: Icon language migration\n';
  const h = parseSprintHeader(text);
  assert.equal(h.epicTitle, 'Homepage Polish — Dirección B');
  assert.equal(h.sprintNum, '1');
  assert.equal(h.sprintTitle, 'Icon language migration');
});

test('parseSprintHeader: returns null when the H1 does not match the expected shape', () => {
  assert.equal(parseSprintHeader('# Just a title\n'), null);
});

test('parseStoryHeadings: collects every "### Story N.M — <title>" heading in order', () => {
  const text = [
    '## Stories',
    '',
    '### Story 1.1 — Kickoff-prompt generator',
    'body text here',
    '',
    '### Story 1.2 — Smoke-walkthrough skeleton in the scaffolder',
    'more body',
  ].join('\n');
  const headings = parseStoryHeadings(text);
  assert.deepEqual(headings, [
    'Story 1.1 — Kickoff-prompt generator',
    'Story 1.2 — Smoke-walkthrough skeleton in the scaffolder',
  ]);
});

test('parseStoryHeadings: empty array when none found', () => {
  assert.deepEqual(parseStoryHeadings('## Stories\nnone here\n'), []);
});

test('buildStoryList: renders a bullet per heading', () => {
  const out = buildStoryList(['Story 1.1 — A', 'Story 1.2 — B']);
  assert.equal(out, '- Story 1.1 — A\n- Story 1.2 — B');
});

test('buildStoryList: says so plainly when there are no headings', () => {
  const out = buildStoryList([]);
  assert.match(out, /no `### Story N\.M/);
});

test('buildKickoff: substitutes macro/slug/sprint/epic-title/story-list into the template', () => {
  const templateText = 'Roadmap/{{MACRO}}/{{SLUG}}/sprint-{{N}}.md — "{{EPIC_TITLE}}"\n{{STORY_LIST}}';
  const out = buildKickoff({
    macro: '09-platform-infra',
    slug: 'process-token-diet',
    sprintNum: '1',
    epicTitle: 'Process token-diet',
    storyList: '- Story 1.1 — A',
    templateText,
  });
  assert.equal(out, 'Roadmap/09-platform-infra/process-token-diet/sprint-1.md — "Process token-diet"\n- Story 1.1 — A');
});
