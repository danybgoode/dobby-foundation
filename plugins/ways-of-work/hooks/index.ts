// index.ts — the build view, as a Claude Code function hook (build-visualization-claude-mods S4).
//
// A THIN RENDERER (D3): every fact on screen comes from `scripts/build-state.mjs --json --offline`, which
// is plain Node, tested, and useful on its own. This file decides nothing about epics, stories or status.
//
// The latency budget (D4): one `git rev-parse` per turn, and a full resolve only when the branch or HEAD
// moved or the cached view aged out — the view is kept in `$.store`. `--offline` is passed on purpose:
// **no `gh` call ever happens inside the hook**, so a network stall cannot slow a turn. The price is that
// the `In review` rung is only shown when the docs say so, which is the written-phase rule anyway.
//
// It never throws into the turn: any failure logs (visible with `claude --debug`) and renders nothing.
import { cacheKeyFrom, shouldRefresh, statusTextFrom } from './build-view.mjs';

const STORE_KEY = 'build-view';

export function register(on) {
  on('turn.start', async ($, e, next) => {
    try {
      const head = await $.process.run(['git', 'rev-parse', 'HEAD', '--abbrev-ref', 'HEAD']);
      const key = cacheKeyFrom(head.stdout);
      const cached = await $.store.get(STORE_KEY);
      if (!shouldRefresh(cached, key)) {
        $.ui.log(`build view: cached (${key})`);
        if (cached.text) $.ui.status(cached.text);
        return next(e);
      }
      const run = await $.process.run(['node', 'scripts/build-state.mjs', '--json', '--offline']);
      const text = statusTextFrom(run.stdout, run.exitCode);
      $.ui.log(`build view: resolved (${key}) (${run.exitCode === 0 ? "ok" : `exit ${run.exitCode}`})`);
      await $.store.set(STORE_KEY, { key, at: Date.now(), text });
      if (text) $.ui.status(text);
    } catch (err) {
      $.ui.log(`build view: ${String(err)}`);
    }
    return next(e);
  });
}
