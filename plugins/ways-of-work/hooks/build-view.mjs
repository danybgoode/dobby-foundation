// build-view.mjs — the build view mod's PURE half (build-visualization-claude-mods S4, D3).
//
// The hook module (./index.ts) may only call `$.noun.event(...)` at a call site — the runtime rejects a
// module that passes `$` around — so everything that can be decided without `$` lives here, where
// `node --test` can reach it. The mod itself is then: read the key, ask this module whether to refresh,
// run `scripts/build-state.mjs`, hand the text to `$.ui.status`. No markdown parsing, no logic of its own.

/** The cache key: the branch and HEAD this view was derived from. `git rev-parse HEAD --abbrev-ref HEAD`. */
export function cacheKeyFrom(stdout) {
  const [sha = '', branch = ''] = String(stdout || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return sha && branch ? `${branch}@${sha}` : null;
}

// A Roadmap/ write changes no git ref, so a key alone would serve a stale view until the next commit.
// Stat-ing the whole tree every turn is the cost the cache exists to avoid (860+ docs in the largest
// consumer), so a refresh also happens when the cached view is older than this. A doc edit therefore
// shows up within 15s; a branch change or a commit shows up immediately.
export const MAX_AGE_MS = 15_000;

/** Refresh when there is no usable cache, the branch/HEAD moved, or the view has gone stale. */
export function shouldRefresh(cached, key, now = Date.now()) {
  if (!key) return true;
  if (!cached || cached.key !== key || typeof cached.text !== 'string') return true;
  return !(Number.isFinite(cached.at) && now - cached.at < MAX_AGE_MS);
}

/**
 * The status text for one `build-state.mjs --json` run: its OWN `lines`, joined — never re-derived here
 * (D3). A non-zero exit, unparseable output or a missing `lines` array renders nothing at all: a build
 * view that invents a line is worse than no build view.
 */
export function statusTextFrom(stdout, exitCode = 0) {
  if (exitCode !== 0) return null;
  try {
    const state = JSON.parse(String(stdout));
    return Array.isArray(state.lines) && state.lines.length ? state.lines.join('\n') : null;
  } catch {
    return null;
  }
}
