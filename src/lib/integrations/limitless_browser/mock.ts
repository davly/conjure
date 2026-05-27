/**
 * Browser-only fallback mock for the limitless-browser integration.
 *
 * When Conjure is loaded in a plain browser tab (the Phase-1 default),
 * the bridge returns "no native bridge available" sentinel responses
 * so the forge pipeline can fall back to IndexedDB / web-only paths.
 *
 * # Honest disclosure
 *
 * - The mock NEVER returns `available=true` -- detection always falls
 *   back to "not running in limitless-browser".
 * - Content moderation in the mock returns a `requires-human-review`
 *   verdict + R166 ReviewedByCounsel=false sentinel. Production must
 *   route to phantom-content-moderation for any actual moderation
 *   decision; the mock MUST NOT be used to gate user-submitted content
 *   in any go-live scenario.
 * - Native storage in the mock returns `backend = 'unavailable'` -- the
 *   forge PERSIST stage falls back to IndexedDB.
 * - Multi-webview game launch in the mock returns `verdict =
 *   'unavailable'` -- the studio handles in-tab playback only.
 */

import type {
  BridgeCapability,
  ContentModerationPayload,
  ContentModerationVerdict,
  GameRuntimeWebviewHandle,
  ILimitlessBrowserBridge,
  NativeStorageHandle,
} from './types';

/** R166 LIBRARY-RECOMMENDS-HOST-ACTS sentinel for mock responses. */
export const MOCK_BRIDGE_REVIEWED_BY_COUNSEL: boolean = false;

/**
 * Canonical "unavailable" capability record returned by the browser-only
 * mock. Phase-1 default; flips to a real record when running inside
 * limitless-browser.
 */
export const BRIDGE_CAPABILITY_UNAVAILABLE: BridgeCapability = Object.freeze({
  available: false,
  tauriVersion: '',
  multiWebview: false,
  nativeStorage: false,
  contentModeration: false,
});

/**
 * MockLimitlessBrowserBridge is the Phase 1.5 browser-only fallback.
 * Implements the same interface as the future live bridge so forge
 * pipeline code is wire-form-identical across mock + live Phase-2
 * binding.
 *
 * Per R157 substrate-native idiom: TypeScript class with `#`-private
 * state, async methods, frozen result shapes.
 */
export class MockLimitlessBrowserBridge implements ILimitlessBrowserBridge {
  readonly #reviewedByCounsel: boolean;

  constructor(opts?: { readonly reviewedByCounsel?: boolean }) {
    this.#reviewedByCounsel =
      opts?.reviewedByCounsel ?? MOCK_BRIDGE_REVIEWED_BY_COUNSEL;
  }

  isRunningInLimitlessBrowser(): boolean {
    return false;
  }

  async detectCapability(): Promise<BridgeCapability> {
    return BRIDGE_CAPABILITY_UNAVAILABLE;
  }

  async getNativeStorage(scope: string): Promise<NativeStorageHandle> {
    return Object.freeze({
      handleId: `mock-storage-${scope}`,
      backend: 'unavailable',
      scope,
    });
  }

  async requestMultiWebviewGameLaunch(
    gameId: string,
  ): Promise<GameRuntimeWebviewHandle> {
    return Object.freeze({
      webviewLabel: `mock-webview-${gameId}`,
      gameId,
      verdict: 'unavailable',
      rationale:
        'Mock bridge -- multi-webview not available outside limitless-browser. Phase 1.5 default: studio falls back to in-tab game playback.',
    });
  }

  async getContentModerationVerdict(
    payload: ContentModerationPayload,
  ): Promise<ContentModerationVerdict> {
    // The mock cannot moderate -- return requires-human-review +
    // ReviewedByCounsel=false sentinel. R166 LIABILITY-FOOTER applies.
    return Object.freeze({
      verdict: 'requires-human-review',
      rationale: `Mock bridge -- phantom-content-moderation not available outside limitless-browser. Submitted game ${payload.gameId} ("${payload.title}") MUST be reviewed by a human moderator before publication.`,
      confidenceBasisPoints: 0, // 0% confidence -- mock is not a moderator
      reviewedByCounsel: this.#reviewedByCounsel,
      provenance: 'mock-bridge://phase-1.5-browser-fallback',
    });
  }
}
