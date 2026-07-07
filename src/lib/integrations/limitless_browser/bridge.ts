/**
 * LimitlessBrowserBridge -- Conjure-side TypeScript bridge for the
 * limitless-browser Tauri 2 multi-webview shell.
 *
 * Phase 1.5 (this ship): the bridge defaults to the mock (browser-only
 * fallback). When the runtime detects `window.__LIMITLESS_BROWSER_VERSION__`
 * and the cohort-canonical Tauri 2 globals, the live methods route
 * through `getTauriInvoke()` to call the Rust-side `#[tauri::command]`
 * handlers per `TAURI_COMMANDS`.
 *
 * # Phase-2 deferral (honest)
 *
 * - limitless-browser does NOT yet:
 *   - Inject the `__LIMITLESS_BROWSER_VERSION__` global (Phase 2 wire-in
 *     in `src-tauri/src/lib.rs`).
 *   - Register the four canonical Tauri commands per `TAURI_COMMANDS`.
 *   - Expose `tauri-plugin-store` or `tauri-plugin-sql` for the native
 *     storage adapter.
 *   - Expose the multi-webview spawn command for Conjure game launches.
 *
 *   Estimated Phase-2 cost on the limitless-browser side: ~1-2
 *   founder-weeks (Tauri command + tauri-plugin-store integration +
 *   second webview wiring + phantom-content-moderation invoke handler).
 *
 * - Conjure-side Phase 1.5 ships:
 *   - Detection (`isRunningInLimitlessBrowser()` + capability probe).
 *   - The bridge surface so forge pipeline branches can be written today.
 *   - Fallback paths to IndexedDB / in-tab playback / requires-human-
 *     review moderation when not running inside limitless-browser.
 *
 * # R157 substrate-native idiom
 *
 * - TypeScript class with `#`-private state.
 * - `async`/`await` everywhere.
 * - Frozen result shapes.
 * - No global state -- detection delegated to `detect.ts` helpers.
 *
 * # R166 LIBRARY-RECOMMENDS-HOST-ACTS
 *
 * Content-moderation verdicts carry a `reviewedByCounsel` boolean. The
 * mock + live bridge both default to `false`. The host is responsible
 * for counsel review of:
 *   - Any moderation policy enforced via phantom-content-moderation.
 *   - The phantom-mint IP-infringement detection thresholds.
 *   - The R166 advisory text shown to creators when their game is
 *     flagged.
 */

import {
  getLimitlessBrowserVersion,
  getTauriInvoke,
  getTauriVersion,
  isRunningInLimitlessBrowser as detectIsRunningInLimitlessBrowser,
  isRunningInTauri2,
} from './detect';
import { BRIDGE_CAPABILITY_UNAVAILABLE, MockLimitlessBrowserBridge } from './mock';
import type {
  BridgeCapability,
  ContentModerationPayload,
  ContentModerationVerdict,
  GameRuntimeWebviewHandle,
  ILimitlessBrowserBridge,
  NativeStorageHandle,
  TauriCommand,
} from './types';

/** Construction options for LimitlessBrowserBridge. */
export interface LimitlessBrowserBridgeOptions {
  /**
   * Force-disable live-binding detection. When true, the bridge ALWAYS
   * delegates to the mock. Used by tests + by the Phase-1 forge pipeline
   * to suppress detection.
   */
  readonly forceMock?: boolean;
  /**
   * Optional override for the detection helper (test injection point).
   */
  readonly detectIsRunning?: () => boolean;
  /**
   * Optional override for the Tauri invoke function (test injection
   * point).
   */
  readonly invokeImpl?: (cmd: string, args?: unknown) => Promise<unknown>;
}

/**
 * LimitlessBrowserBridge is the Phase 1.5 + Phase 2 Conjure-side bridge
 * surface. It implements `ILimitlessBrowserBridge` so callers can
 * substitute the mock or live bridge freely.
 *
 * Defaults (Phase 1.5):
 *   - Detection: `isRunningInLimitlessBrowser()` from `detect.ts`.
 *   - When detected: route live via `getTauriInvoke()`.
 *   - When not detected: delegate to `MockLimitlessBrowserBridge`.
 */
export class LimitlessBrowserBridge implements ILimitlessBrowserBridge {
  readonly #forceMock: boolean;
  readonly #detectIsRunning: () => boolean;
  readonly #invokeImpl: (cmd: string, args?: unknown) => Promise<unknown>;
  readonly #mock: MockLimitlessBrowserBridge;

  constructor(opts: LimitlessBrowserBridgeOptions = {}) {
    this.#forceMock = opts.forceMock ?? false;
    this.#detectIsRunning =
      opts.detectIsRunning ?? detectIsRunningInLimitlessBrowser;
    // Default invoke: late-bound to getTauriInvoke() so the test
    // override works even when Tauri globals are absent.
    this.#invokeImpl =
      opts.invokeImpl ??
      (async (cmd: string, args?: unknown) => {
        const invoke = getTauriInvoke();
        if (!invoke) {
          throw new Error(
            `LimitlessBrowserBridge: Tauri invoke unavailable (cmd=${cmd}). Phase 1.5: live binding requires limitless-browser runtime + Phase-2 Tauri command registration.`,
          );
        }
        return invoke(cmd, args);
      });
    this.#mock = new MockLimitlessBrowserBridge();
  }

  /** Public read-only accessor: are we routing via mock right now? */
  get isMock(): boolean {
    if (this.#forceMock) return true;
    return !this.#detectIsRunning();
  }

  isRunningInLimitlessBrowser(): boolean {
    if (this.#forceMock) return false;
    return this.#detectIsRunning();
  }

  async detectCapability(): Promise<BridgeCapability> {
    if (this.#forceMock || !this.#detectIsRunning()) {
      return BRIDGE_CAPABILITY_UNAVAILABLE;
    }
    // Phase-2 live path: probe Rust-side capabilities via Tauri command.
    const cmd: TauriCommand = 'conjure_detect_capability';
    const result = (await this.#invokeImpl(cmd)) as BridgeCapability;
    return Object.freeze({
      available: Boolean(result.available),
      tauriVersion: result.tauriVersion ?? getTauriVersion(),
      multiWebview: Boolean(result.multiWebview) || isRunningInTauri2(),
      nativeStorage: Boolean(result.nativeStorage),
      contentModeration: Boolean(result.contentModeration),
    });
  }

  async getNativeStorage(scope: string): Promise<NativeStorageHandle> {
    if (this.#forceMock || !this.#detectIsRunning()) {
      return this.#mock.getNativeStorage(scope);
    }
    const cmd: TauriCommand = 'conjure_get_native_storage';
    const result = (await this.#invokeImpl(cmd, { scope })) as NativeStorageHandle;
    return Object.freeze({
      handleId: result.handleId,
      backend: result.backend,
      scope: result.scope,
    });
  }

  async requestMultiWebviewGameLaunch(
    gameId: string,
  ): Promise<GameRuntimeWebviewHandle> {
    if (this.#forceMock || !this.#detectIsRunning()) {
      return this.#mock.requestMultiWebviewGameLaunch(gameId);
    }
    const cmd: TauriCommand = 'conjure_request_multi_webview_game_launch';
    const result = (await this.#invokeImpl(cmd, {
      gameId,
    })) as GameRuntimeWebviewHandle;
    return Object.freeze({
      webviewLabel: result.webviewLabel,
      gameId: result.gameId,
      verdict: result.verdict,
      rationale: result.rationale,
    });
  }

  async getContentModerationVerdict(
    payload: ContentModerationPayload,
  ): Promise<ContentModerationVerdict> {
    if (this.#forceMock || !this.#detectIsRunning()) {
      return this.#mock.getContentModerationVerdict(payload);
    }
    const cmd: TauriCommand = 'conjure_get_content_moderation_verdict';
    const result = (await this.#invokeImpl(
      cmd,
      payload,
    )) as ContentModerationVerdict;
    return Object.freeze({
      verdict: result.verdict,
      rationale: result.rationale,
      confidenceBasisPoints: result.confidenceBasisPoints,
      // R166: even live verdicts default reviewedByCounsel=false unless the
      // Rust side explicitly opts in. The bridge does NOT silently flip the
      // sentinel.
      reviewedByCounsel: Boolean(result.reviewedByCounsel),
      provenance: result.provenance,
    });
  }
}

/**
 * Convenience export: a singleton bridge using runtime detection.
 *
 * Production code SHOULD construct an explicit `LimitlessBrowserBridge`
 * (so the test-injection points are visible at the call site). The
 * singleton is provided for forge pipeline ergonomics.
 */
export const limitlessBrowserBridge: ILimitlessBrowserBridge =
  new LimitlessBrowserBridge();

/**
 * Convenience export: synchronous detection helper. Re-exported from
 * `detect.ts` so callers can `import { isRunningInLimitlessBrowser }
 * from '$lib/integrations/limitless_browser';`
 */
export { detectIsRunningInLimitlessBrowser as isRunningInLimitlessBrowser };

/** Re-exports for ergonomics. */
export { getLimitlessBrowserVersion, getTauriVersion };
