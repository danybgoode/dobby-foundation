// build-state.test.mjs — the resolver against REAL fixture git repos (build-visualization-claude-mods S3).
// `gh` is injected: a fake that records calls, so --offline can prove it made none.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveBuildState, renderLines, parseBranch, storyIdsIn } from './build-state.mjs';
import { PHASES } from './lib/roadmap-contract.mjs';

const EPIC_README = (phase = 'Building') => `---
status: in-progress
slug: arranged-only
title: Arranged-only delivery
area: 04-shipping
risk: high
type: feature
phase: ${phase}
sprints_total: 2
stories_total: 3
---
# Epic: Arranged-only delivery
`;
const SPRINT = (n, phase, stories) => `---
epic: arranged-only
sprint: ${n}
title: Sprint ${n} title
risk: high
phase: ${phase}
stories_total: ${stories.length}
stories:
${stories
  .map(
    ([id, title]) =>
      `  - id: ${id}\n    title: ${title}\n    as_a: "a buyer's agent"\n    i_want: checkout options to reflect arranged-only listings\n    so_that: "I'm never offered a carrier rail"\n    risk: high\n    status: planned`
  )
  .join('\n')}
---
# Arranged-only delivery — Sprint ${n}: title
`;

function fixture({ sprint1 = 'Shipped', sprint2 = 'Building', epicPhase = 'Building' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'build-state-'));
  const git = (...a) =>
    execFileSync('git', a, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@t');
  git('config', 'user.name', 't');
  const dir = join(root, 'Roadmap', '04-shipping', 'arranged-only');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'README.md'), EPIC_README(epicPhase));
  writeFileSync(join(dir, 'sprint-1.md'), SPRINT(1, sprint1, [['S1.1', 'Contract']]));
  writeFileSync(
    join(dir, 'sprint-2.md'),
    SPRINT(2, sprint2, [
      ['S2.1', 'Agent surface parity'],
      ['S2.2', 'Seller toggle'],
    ])
  );
  git('add', '-A');
  git('commit', '-qm', 'plan: scaffold');
  const commit = (msg) => {
    writeFileSync(join(root, `f${Math.random()}`), msg);
    git('add', '-A');
    git('commit', '-qm', msg);
  };
  return { root, git, commit, done: () => rmSync(root, { recursive: true, force: true }) };
}

const noGh = () => {
  throw new Error('gh must not be called');
};
const ghWith = (pr) => {
  const calls = [];
  const fn = (root, branch) => (calls.push(branch), { ok: true, pr });
  fn.calls = calls;
  return fn;
};

test('parseBranch and storyIdsIn: the conventions D2 reads', () => {
  assert.deepEqual(parseBranch('feat/arranged-only'), { slug: 'arranged-only', sprint: null });
  assert.deepEqual(parseBranch('feat/arranged-only-s3'), { slug: 'arranged-only', sprint: 3 });
  assert.deepEqual(parseBranch('chore/x-sprint-2'), { slug: 'x', sprint: 2 });
  assert.equal(parseBranch('main'), null);
  assert.deepEqual(storyIdsIn('S1.1–S1.4 — the contract (Story 2.10)'), ['S1.1', 'S1.4', 'S2.10']);
  assert.deepEqual(storyIdsIn('fix typo, see PRS1.2x'), []);
});

test('a clean feature branch mid-sprint: epic, story + user story, progress, status', () => {
  const f = fixture();
  try {
    f.git('switch', '-qc', 'feat/arranged-only-s2');
    f.commit('S2.1 — agent surface parity [risk HIGH]');
    const s = resolveBuildState({ root: f.root, offline: true, gh: noGh });
    assert.equal(s.in_flight, true);
    assert.deepEqual(s.epic, {
      slug: 'arranged-only',
      title: 'Arranged-only delivery',
      area: '04-shipping',
      risk: 'high',
      phase: 'Building',
      path: 'Roadmap/04-shipping/arranged-only/README.md',
    });
    assert.equal(s.story.id, 'S2.1');
    assert.equal(s.story.as_a, "a buyer's agent");
    assert.equal(s.story_source, 'commit');
    assert.deepEqual(s.progress, { story: 2, stories: 3, sprint: 2, sprints: 2 });
    assert.equal(s.status, 'Building');
    assert.equal(s.evidence.gh, 'skipped (--offline)');

    f.commit('S2.2 — seller toggle');
    assert.equal(
      resolveBuildState({ root: f.root, offline: true, gh: noGh }).progress.story,
      3,
      'X advances by one'
    );
  } finally {
    f.done();
  }
});

test('the default branch, a branch naming no epic, and a detached HEAD all say "nothing in flight"', () => {
  const f = fixture();
  try {
    const main = resolveBuildState({ root: f.root, offline: true, gh: noGh });
    assert.equal(main.in_flight, false);
    assert.match(main.reason, /on main — not an epic branch/);
    f.git('switch', '-qc', 'feat/some-other-epic');
    const other = resolveBuildState({ root: f.root, offline: true, gh: noGh });
    assert.equal(other.in_flight, false);
    assert.match(other.reason, /names no epic under Roadmap\//);
    f.git('checkout', '-q', '--detach');
    const detached = resolveBuildState({ root: f.root, offline: true, gh: noGh });
    assert.equal(detached.in_flight, false);
    assert.match(detached.reason, /detached HEAD/);
    assert.deepEqual(renderLines(detached), [`No epic in flight — ${detached.reason}`]);
  } finally {
    f.done();
  }
});

test('commits with no story convention and no journal → story unknown, never a guess', () => {
  const f = fixture();
  try {
    f.git('switch', '-qc', 'feat/arranged-only');
    f.commit('wip: tidy things');
    const s = resolveBuildState({ root: f.root, offline: true, gh: noGh });
    assert.equal(s.story, null);
    assert.equal(s.story_source, 'unknown');
    assert.equal(s.sprint, null, 'no -s<N> and no story → no sprint either, not "the first unshipped one"');
    assert.equal(s.progress.story, null);
    assert.equal(renderLines(s)[2], '  Story    unknown');
    assert.match(renderLines(s)[4], /Story \? of 3 · Sprint \? of 2/);
  } finally {
    f.done();
  }
});

test('a commit naming a story this epic does not list → unknown, with the reason', () => {
  const f = fixture();
  try {
    f.git('switch', '-qc', 'feat/arranged-only');
    f.commit('S9.9 — something from another epic');
    const s = resolveBuildState({ root: f.root, offline: true, gh: noGh });
    assert.equal(s.story, null);
    assert.match(s.story_note, /names S9\.9, which no sprint of this epic lists/);
  } finally {
    f.done();
  }
});

test('the journal fallback resolves the story when commits do not', () => {
  const f = fixture();
  try {
    f.git('switch', '-q', '--orphan', 'claude/session-journal');
    writeFileSync(
      join(f.root, 'session-journal.jsonl'),
      `${JSON.stringify({ ts: 't1', kind: 'doing', text: 'starting S1.1', refs: [] })}\n` +
        `${JSON.stringify({ ts: 't2', kind: 'doing', text: 'on the seller toggle', refs: ['S2.2'] })}\n`
    );
    f.git('add', 'session-journal.jsonl');
    f.git('commit', '-qm', 'journal');
    f.git('switch', '-q', 'main');
    f.git('switch', '-qc', 'feat/arranged-only');
    f.commit('wip');
    const s = resolveBuildState({ root: f.root, offline: true, gh: noGh });
    assert.equal(s.story.id, 'S2.2');
    assert.equal(s.story_source, 'journal');
    assert.equal(s.evidence.journal, 'claude/session-journal');
  } finally {
    f.done();
  }
});

test('every one of the six phases is reported as written when no evidence advances it', () => {
  for (const phase of PHASES) {
    const f = fixture({ sprint2: phase });
    try {
      f.git('switch', '-qc', 'feat/arranged-only-s2');
      f.commit('wip: no story named');
      const s = resolveBuildState({ root: f.root, offline: true, gh: noGh });
      assert.equal(s.status, phase, phase);
      assert.equal(s.status_source, 'written');
      assert.equal(s.phase_written, phase);
    } finally {
      f.done();
    }
  }
});

test('evidence only advances: a story commit lifts to Building, an open PR to In review — never to Shipped', () => {
  const f = fixture({ sprint2: 'Shaping' });
  try {
    f.git('switch', '-qc', 'feat/arranged-only-s2');
    f.commit('S2.1 — first');
    const building = resolveBuildState({ root: f.root, offline: true, gh: noGh });
    assert.deepEqual(
      [building.status, building.status_source, building.phase_written],
      ['Building', 'git', 'Shaping']
    );

    const gh = ghWith({ number: 7, url: 'https://example/pr/7' });
    const review = resolveBuildState({ root: f.root, gh });
    assert.deepEqual([review.status, review.status_source], ['In review', 'gh']);
    assert.deepEqual(gh.calls, ['feat/arranged-only-s2']);

    const unavailable = resolveBuildState({ root: f.root, gh: () => ({ ok: false, pr: null }) });
    assert.equal(unavailable.status, 'Building');
    assert.equal(unavailable.evidence.gh, 'unavailable');
  } finally {
    f.done();
  }
  const shipped = fixture({ sprint2: 'Shipped' });
  try {
    shipped.git('switch', '-qc', 'feat/arranged-only-s2');
    shipped.commit('S2.1 — first');
    const s = resolveBuildState({ root: shipped.root, gh: ghWith({ number: 1 }) });
    assert.equal(s.status, 'Shipped', 'a written Shipped is never pulled back to In review');
  } finally {
    shipped.done();
  }
});

test('renderLines is a pure function of the state: the exact five lines, no box', () => {
  const state = {
    in_flight: true,
    epic: { title: 'Arranged-only delivery', area: '04-shipping', risk: 'high' },
    story: {
      id: 'S2.1',
      title: 'Agent surface parity',
      as_a: "a buyer's agent",
      i_want: 'checkout options to reflect arranged-only listings',
      so_that: "I'm never offered a carrier rail the seller can't fulfil",
    },
    progress: { story: 4, stories: 7, sprint: 2, sprints: 2 },
    status: 'Building',
  };
  assert.deepEqual(renderLines(state), [
    'Currently building',
    '  Epic     Arranged-only delivery    04-shipping · risk HIGH',
    '  Story    S2.1 — Agent surface parity',
    "           As a buyer's agent, I want checkout options to reflect arranged-only listings, so that I'm never offered a carrier rail the seller can't fulfil.",
    '  Progress Story 4 of 7 · Sprint 2 of 2',
    '  Status   Building',
  ]);
});
