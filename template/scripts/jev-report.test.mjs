// jev-report.test.mjs — the agreement report and the labelling round-trip (jev-semantic-guards S5.1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendLabels, classify, dedupe, markerRows, parseLog, render, summarize } from './jev-report.mjs';
import { jevMarker } from './lib/review-guard.mjs';

const T = { review: { real: 0.85, notReal: 0.3 }, prose: { claim: 0.8 } };
const rv = (regex, confidence, extra = {}) => ({
  rail: 'review',
  regex,
  confidence,
  textHash: `h${Math.random()}`,
  text: 't',
  ...extra,
});
const pr = (regex, jev, extra = {}) => ({
  rail: 'prose',
  regex,
  jev,
  confidence: 0.9,
  textHash: `p${Math.random()}`,
  text: 'd',
  ...extra,
});

test('classify: review agreement, disagreement, the uncertain band and could-not-look', () => {
  assert.equal(classify(rv(true, 0.97), T), 'agree');
  assert.equal(classify(rv(true, 0.05), T), 'disagree');
  assert.equal(classify(rv(false, 0.97), T), 'disagree');
  assert.equal(classify(rv(true, 0.5), T), 'uncertain');
  assert.equal(classify(rv(true, null), T), 'could-not-look');
  assert.equal(classify(rv(true, 0.9, { error: 'HTTP 429' }), T), 'could-not-look');
});

test('classify: prose compares code SETS, order-free', () => {
  assert.equal(classify(pr(['a', 'b'], ['b', 'a']), T), 'agree');
  assert.equal(classify(pr([], ['invented-commitment']), T), 'disagree');
  assert.equal(classify(pr([], null), T), 'could-not-look');
});

test('parseLog skips blank and malformed lines; dedupe keeps one row per text per source', () => {
  const { rows, bad } = parseLog(
    '{"rail":"review","textHash":"a"}\n\nnot json\n{"rail":"review","textHash":"a"}\n'
  );
  assert.equal(bad, 1);
  assert.equal(dedupe(rows).length, 1);
});

test('markerRows: a posted comment is a regex-ACCEPTED reply with Jev’s noul; no marker, no row', () => {
  const body = `### 🔎 Cross-agent review (x)\n\n---\n\nClean.${jevMarker({ mode: 'shadow', decider: 'regex', jev: { noul: 0.1, severity: 'clean', model: 'm' } })}`;
  const rows = markerRows([
    { url: 'u', body, reply: 'Clean.' },
    { url: 'v', body: 'plain' },
  ]);
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0].regex, rows[0].confidence], [true, 0.1]);
  assert.equal(classify(rows[0], T), 'disagree');
});

test('summarize + render: per-rail agreement and a disagreement table with a label column', () => {
  const { summary, candidates } = summarize(
    [rv(true, 0.97), rv(true, 0.05), pr([], []), pr([], ['invented-commitment'])],
    T
  );
  assert.equal(summary.review.agreement, 0.5);
  assert.equal(summary.prose.disagree, 1);
  assert.equal(candidates.length, 2);
  assert.ok(candidates.every((c) => c.label === null));
  const md = render({ summary, candidates });
  assert.match(md, /\| review \| 2 \| 50\.0% \|/);
  assert.match(md, /\| label: \|/);
});

test('appendLabels: only labelled rows are appended, unrecorded, never twice', () => {
  const fixtures = { review: [{ id: 'old' }], prose: [] };
  const labelled = [
    { rail: 'review', id: 'shadow-1', label: false, text: 't', regex: true, jev: 0.1 },
    { rail: 'prose', id: 'shadow-2', label: null, draft: 'd' },
    { rail: 'review', id: 'old', label: true, text: 'x' },
  ];
  const { fixtures: next, added } = appendLabels(fixtures, labelled);
  assert.equal(added, 1);
  assert.deepEqual(next.review[1], {
    id: 'shadow-1',
    label: false,
    text: 't',
    recorded: null,
    decision: null,
  });
});
