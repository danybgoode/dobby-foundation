// jev-eval.test.mjs — the replay harness and the shadow rot guard (jev-semantic-guards S1.4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluate, expiredShadowRails, FIXTURES_PATH, loadRails, replayAsk } from './jev-eval.mjs';
import { loadJevConfig, parseJevConfig, repoRoot } from './lib/jev.mjs';

test('expiredShadowRails: a shadow rail past its date is named; a live one and an off one are not', () => {
  const c = parseJevConfig({
    rails: { review: { mode: 'shadow', shadowExpires: '2026-01-01' }, prose: { mode: 'shadow', shadowExpires: '2099-01-01' } },
  });
  assert.deepEqual(expiredShadowRails(c, '2026-09-22'), [{ rail: 'review', shadowExpires: '2026-01-01' }]);
  assert.deepEqual(expiredShadowRails(parseJevConfig({}), '2099-12-31'), []);
});

test('replayAsk: answers only from the recording; a missing answer is could-not-look (a stale fixture)', async () => {
  const ask = replayAsk({ model: 'jev-1.13.0', answers: { a: { type: 'noul', noul: 1 } } });
  assert.equal((await ask({ questions: { a: {} } })).answers.a.noul, 1);
  const r = await ask({ questions: { a: {}, b: {} } });
  assert.equal(r.state, 'could-not-look');
  assert.match(r.error, /no recording for b/);
});

test('evaluate: a replay that disagrees with its recorded decision is a failure', async () => {
  const rail = {
    run: async (fx, deps) => ({ ok: (await deps.ask({ questions: { q: {} } })).answers.q.noul > 0.5, decider: 'jev' }),
    regex: () => false,
    predicted: (d) => d.ok,
    expected: (fx) => fx.label,
    summary: (d) => ({ ok: d.ok, decider: d.decider }),
  };
  const fx = (noul, recordedOk) => ({
    id: `n${noul}`,
    label: true,
    recorded: { model: 'm', answers: { q: { type: 'noul', noul } } },
    decision: { ok: recordedOk, decider: 'jev' },
  });
  const { failures, report } = await evaluate({
    fixtures: { review: [fx(0.9, true), fx(0.1, true)] },
    rails: { review: rail },
    config: parseJevConfig({}),
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /review\/n0.1/);
  assert.equal(report.review.jevRight, 1);
  assert.equal(report.review.regexRight, 0);
});

test('the committed fixtures replay clean against the committed judges', async () => {
  const fixtures = JSON.parse(readFileSync(FIXTURES_PATH, 'utf8'));
  const { failures } = await evaluate({ fixtures, rails: await loadRails(), config: loadJevConfig({ root: repoRoot() }) });
  assert.deepEqual(failures, []);
});
