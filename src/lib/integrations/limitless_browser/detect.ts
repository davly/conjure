/**
 * Tauri runtime detection utilities for the limitless-browser
 * integration.
 *
 * Detection strategy: Tauri injects a `window.__TAURI__` global into
 * every webview at startup. Tauri 2 specifically exposes
 * `window.__TAURI_INTERNALS__` + `window.__TAURI_METADATA__` -- we test
 * for both to discriminate Tauri 1 (legacy) vs Tauri 2 (multi-webview).
 *
 * limitless-browser additionally sets a `__LIMITLESS_BROWSER_VERSION__`
 * marker on the window in its Tauri pre-init hook so Conjure can detect
 * "running inside limitless-browser specifically" (not just "any Tauri
 * shell").
 *
 * # SSR safety
 *
 * All detection helpers check `typeof window !== 'undefined'` before
 * touching globals -- safe to import from server-side code paths.
 */

/**
 * Tauri global handles. Tauri 2 exposes both __TAURI__ + __TAURI_INTERNALS__.
 * Tauri 1 exposes only __TAURI__.
 *
 * R157 substrate-native idiom: declare the shape exactly as Tauri does
 * (object with `invoke` + optional version).
 */
interface TauriWindowGlobals {
  readonly __TAURI__?: {
    readonly invoke?: (cmd: string, args?: unknown) => Promise<unknown>;
  };
  readonly __TAURI_INTERNALS__?: {
    readonly invoke?: (cmd: string, args?: unknown) => Promise<unknown>;
  };
  readonly __TAURI_METADATA__?: {
    readonly tauriVersion?: string;
  };
  readonly __LIMITLESS_BROWSER_VERSION__?: string;
}

/**
 * Safe accessor for the Tauri-augmented window. Returns `undefined` in
 * SSR or non-Tauri contexts.
 */
function tauriWindow(): TauriWindowGlobals | undefined {
  if (typeof window === 'undefined') return undefined;
  return window as unknown as TauriWindowGlobals;
}

/**
 * Returns true when running inside any Tauri shell (Tauri 1 or 2).
 *
 * Detection: `window.__TAURI__` OR `window.__TAURI_INTERNALS__` is
 * present.
 */
export function isRunningInTauri(): boolean {
  const w = tauriWindow();
  if (!w) return false;
  return Boolean(w.__TAURI__ ?? w.__TAURI_INTERNALS__);
}

/**
 * Returns true when running inside Tauri 2 specifically. Tauri 2 is the
 * version that supports multi-webview -- the load-bearing capability for
 * Conjure's Phase-2 studio + game-runtime split.
 *
 * Detection: `__TAURI_INTERNALS__` is set (Tauri 2 only) OR
 * `__TAURI_METADATA__.tauriVersion` starts with "2.".
 */
export function isRunningInTauri2(): boolean {
  const w = tauriWindow();
  if (!w) return false;
  if (w.__TAURI_INTERNALS__) return true;
  const v = w.__TAURI_METADATA__?.tauriVersion;
  if (typeof v === 'string' && v.startsWith('2.')) return true;
  return false;
}

/**
 * Returns true when running inside limitless-browser specifically. This
 * is a stricter check than `isRunningInTauri2()` -- it requires the
 * `__LIMITLESS_BROWSER_VERSION__` marker that limitless-browser's
 * pre-init hook injects.
 *
 * Phase 1.5: limitless-browser does NOT yet inject this marker -- the
 * detection always returns false in production today. Phase 2 wire-in
 * on the limitless-browser side adds the marker injection (estimated
 * cost: ~1 hour of Rust work in `src-tauri/src/lib.rs`).
 */
export function isRunningInLimitlessBrowser(): boolean {
  if (!isRunningInTauri2()) return false;
  const w = tauriWindow();
  if (!w) return false;
  return typeof w.__LIMITLESS_BROWSER_VERSION__ === 'string';
}

/**
 * Read the limitless-browser version string. Returns empty string when
 * not running in limitless-browser.
 */
export function getLimitlessBrowserVersion(): string {
  const w = tauriWindow();
  if (!w) return '';
  return w.__LIMITLESS_BROWSER_VERSION__ ?? '';
}

/**
 * Read the Tauri version string. Returns empty string when not running
 * in Tauri.
 */
export function getTauriVersion(): string {
  const w = tauriWindow();
  if (!w) return '';
  return w.__TAURI_METADATA__?.tauriVersion ?? '';
}

/**
 * Acquire the Tauri `invoke` function. Returns `undefined` in SSR or
 * non-Tauri contexts.
 *
 * The invoke function is the JS-side entry point for calling Rust
 * `#[tauri::command]` handlers. limitless-browser MUST register the
 * canonical Tauri commands per `types.ts::TAURI_COMMANDS`.
 */
export function getTauriInvoke():
  | ((cmd: string, args?: unknown) => Promise<unknown>)
  | undefined {
  const w = tauriWindow();
  if (!w) return undefined;
  return w.__TAURI_INTERNALS__?.invoke ?? w.__TAURI__?.invoke ?? undefined;
}
