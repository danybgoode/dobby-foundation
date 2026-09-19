// flags.mjs — the ONE flag seam. Golden Frijoles, already wired.
//
// TEMPLATE FILL-IN: keep this file when you delete the rest of `example-app`. It is the seam every
// kill-switch story in this project gates on, and the whole point of shipping it in the template is
// that your first high-risk epic starts at "create the flag" rather than at "integrate an SDK".
// If you move it, fix the one relative import below — the env var NAMES are defined once, in
// `scripts/lib/golden-onboarding.mjs`, because `gf init` writes that same set into `.env.local`.
//
// ── The three rules this file exists to enforce ────────────────────────────────────────────────
//
//   1. **Every read carries its own default, and reads never throw.** `isEnabled(key, fallback)`
//      takes the fallback as a required argument — there is no default-default. That argument is
//      the flag's fail-open position: `true` for a kill-switch, `false` for an enablement. A Golden
//      outage, a missing `.env.local`, an SDK that is not even installed — all of them resolve to
//      it, silently and synchronously. See `references/flags-runtime.md` §1.
//
//   2. **`flagReadKey` is server-side only.** It is a revocable credential that can read every flag
//      in its environment. Never import this module into client code, never prefix the variable
//      with a public prefix (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`), and send *resolved values* to the
//      browser, never the key.
//
//   3. **No parallel flag store.** Not a `DEFAULTS` map in this file, not a table, not a JSON file.
//      The fallback argument at each call site is not a store: it is what that one call does when
//      it has no answer. See AGENTS.md's cannot-be-violated rules.
//
// ── Why the SDK is imported dynamically ────────────────────────────────────────────────────────
// So that this file — and anything that imports it — loads in a checkout with no `node_modules`.
// That is not a convenience: `npm run build`, a unit test run, and a fresh clone all have to work
// when the flag provider is unavailable for ANY reason, and "the package is not installed" is the
// most complete outage there is. It falls back like every other failure instead of exploding at
// import time. `flags.test.mjs` runs entirely in that state.
//
// Zero deps beyond the optional `@golden-frijoles/sdk` — Node 18+.

import { ENV_KEYS, SDK_PACKAGE } from '../../scripts/lib/golden-onboarding.mjs';

/**
 * Pull the provider config out of an environment, or say exactly what is missing.
 *
 * Pure, so the "which variables does a spawned project need" question has a testable answer rather
 * than a paragraph. `scripts/preflight.mjs` answers the same question at the repo level with the
 * same names, from the same module.
 */
export function flagConfigFromEnv(env = process.env) {
  const baseUrl = env[ENV_KEYS.url]?.trim() || '';
  const flagReadKey = env[ENV_KEYS.flagRead]?.trim() || '';
  const environment = env[ENV_KEYS.environment]?.trim() || 'development';
  const missing = [];
  if (!baseUrl) missing.push(ENV_KEYS.url);
  if (!flagReadKey) missing.push(ENV_KEYS.flagRead);
  if (missing.length) return { ok: false, missing };
  return { ok: true, config: { baseUrl, flagReadKey, environment } };
}

/**
 * The seam.
 *
 * @param {object} [options]
 * @param {NodeJS.ProcessEnv} [options.env]
 * @param {() => Promise<any>} [options.loadSdk]  test seam; defaults to importing the real package
 * @param {(line: string) => void} [options.log]  where the one-line degraded notice goes
 */
export function createFlags({ env = process.env, loadSdk = () => import(SDK_PACKAGE), log = console.warn } = {}) {
  let provider = null;
  /** Why there is no provider, when there is none. Reported, never thrown. */
  let degraded = 'not initialized yet';

  async function initialize() {
    const resolved = flagConfigFromEnv(env);
    if (!resolved.ok) {
      // NOT an error. A project that has not run `gf init` yet still has to boot, build and test.
      // `node scripts/preflight.mjs` is the place that says this loudly; here it is one line.
      degraded = `no flag provider configured (missing ${resolved.missing.join(', ')}) — every flag resolves to its call-site default`;
      log(`[flags] ${degraded}`);
      return { ready: false, reason: degraded };
    }
    try {
      const { createFlagProvider } = await loadSdk();
      provider = createFlagProvider(resolved.config);
      const refresh = await provider.initialize();
      if (!refresh.ok) {
        // The provider is KEPT. It refreshes on its own timer, so a snapshot that was unavailable
        // at boot arrives later without anything being re-created — and until it does, every read
        // falls back. Throwing here, or nulling the provider, would turn a recoverable cold start
        // into a permanent one.
        degraded = `flag snapshot unavailable at startup (${refresh.errorCode}) — defaults until it refreshes`;
        log(`[flags] ${degraded}`);
        return { ready: false, reason: degraded };
      }
      degraded = null;
      return { ready: true, reason: null, snapshotVersion: refresh.snapshotVersion };
    } catch (err) {
      // The SDK is not installed, or failed to load. Same answer as any other outage.
      provider = null;
      degraded = `flag provider unavailable (${err?.message ?? String(err)}) — every flag resolves to its call-site default`;
      log(`[flags] ${degraded}`);
      return { ready: false, reason: degraded };
    }
  }

  /**
   * Resolve a boolean flag. `fallback` is REQUIRED and is the answer whenever there is no answer.
   *
   * Wrapped in try/catch even though the SDK resolves synchronously and does not throw: this
   * function is called on request paths, and the cost of being wrong about that is an outage in
   * the caller. The cost of the try/catch is nothing.
   */
  function isEnabled(key, fallback) {
    if (typeof fallback !== 'boolean') {
      // A missing fallback is a programming error in the CALLER, and the one case worth being loud
      // about — silently defaulting to `false` here would invent a policy for someone else's flag.
      throw new TypeError(`isEnabled('${key}', fallback) requires an explicit boolean fallback — it is the flag's fail-open position.`);
    }
    if (!provider) return fallback;
    try {
      return provider.resolveBooleanEvaluation(key, fallback).value;
    } catch {
      return fallback;
    }
  }

  /** The same contract for the non-boolean types, so nobody reaches around this module for them. */
  function value(key, fallback, context) {
    if (!provider) return fallback;
    try {
      if (typeof fallback === 'string') return provider.resolveStringEvaluation(key, fallback, context).value;
      if (typeof fallback === 'number') return provider.resolveNumberEvaluation(key, fallback, context).value;
      if (typeof fallback === 'boolean') return provider.resolveBooleanEvaluation(key, fallback, context).value;
      return provider.resolveObjectEvaluation(key, fallback, context).value;
    } catch {
      return fallback;
    }
  }

  /** For a health endpoint. Never includes credential material — the SDK's status never carries it. */
  function status() {
    if (!provider) return { provider: 'golden-frijoles', ready: false, degraded };
    try {
      return { provider: 'golden-frijoles', ready: true, degraded, ...provider.getStatus() };
    } catch {
      return { provider: 'golden-frijoles', ready: false, degraded: 'status unavailable' };
    }
  }

  function shutdown() {
    try {
      provider?.shutdown();
    } catch {
      /* a provider that cannot be shut down must not stop a process from exiting */
    }
    provider = null;
  }

  return { initialize, isEnabled, value, status, shutdown };
}

/**
 * The process-wide instance the example app uses. One provider per process, not one per request:
 * each one keeps its own refresh timer and its own snapshot.
 *
 * TEMPLATE FILL-IN: in a framework app, create this in your server-only module graph (a Next.js
 * `lib/flags.server.ts`, a Nest provider, an Express app-level singleton) — and read
 * `references/flags-runtime.md` §2 BEFORE putting it in middleware.
 */
export const flags = createFlags();
