// build-view.test.mjs — the mod's pure half (build-visualization-claude-mods S4).
// The hook file itself is four calls on `$`; everything decidable without `$` is here, and tested.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cacheKeyFrom, shouldRefresh, statusTextFrom, MAX_AGE_MS } from './build-view.mjs';

test('cacheKeyFrom: branch@sha from `git rev-parse HEAD --abbrev-ref HEAD`, else null', () => {
  assert.equal(cacheKeyFrom('abc123\nfeat/foo-s2\n'), 'feat/foo-s2@abc123');
  for (const bad of ['', 'abc123\n', null, undefined, '\n\n']) assert.equal(cacheKeyFrom(bad), null, String(bad));
});

test('shouldRefresh: no cache, a moved branch/HEAD, or an aged view — otherwise the cache holds', () => {
  const now = 1_000_000;
  const fresh = { key: 'b@1', at: now - 1, text: 'lines' };
  assert.equal(shouldRefresh(fresh, 'b@1', now), false, 'a second turn on the same branch does no work');
  assert.equal(shouldRefresh(fresh, 'b@2', now), true, 'a commit refreshes it');
  assert.equal(shouldRefresh(fresh, 'other@1', now), true, 'a branch change refreshes it');
  assert.equal(shouldRefresh({ ...fresh, at: now - MAX_AGE_MS }, 'b@1', now), true, 'an aged view refreshes');
  assert.equal(shouldRefresh(undefined, 'b@1', now), true);
  assert.equal(shouldRefresh({ key: 'b@1', at: now, text: 42 }, 'b@1', now), true, 'a junk entry refreshes');
  assert.equal(shouldRefresh(fresh, null, now), true, 'no key (git unreadable) always refreshes');
});

test('statusTextFrom: build-state’s OWN lines, joined — and nothing at all on any doubt', () => {
  const state = { lines: ['Currently building', '  Epic     X', '  Status   Building'] };
  assert.equal(statusTextFrom(JSON.stringify(state)), 'Currently building\n  Epic     X\n  Status   Building');
  assert.equal(statusTextFrom(JSON.stringify(state), 1), null, 'a non-zero exit renders nothing');
  assert.equal(statusTextFrom('not json'), null);
  assert.equal(statusTextFrom(JSON.stringify({ lines: [] })), null);
  assert.equal(statusTextFrom(JSON.stringify({ in_flight: false })), null);
  assert.equal(statusTextFrom(''), null);
});

test('the renderer invents nothing: the text is exactly the resolver’s lines', () => {
  const lines = ['No epic in flight — on main — not an epic branch (feat/<slug>…), so no epic in flight'];
  assert.equal(statusTextFrom(JSON.stringify({ in_flight: false, lines })), lines[0]);
});
