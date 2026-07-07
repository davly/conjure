/**
 * limitless-browser integration barrel. See
 * `docs/INTEGRATION_LIMITLESS_BROWSER.md` for the full architecture +
 * Tauri command contract + sequence diagrams.
 *
 * # Quick reference
 *
 *   - `LimitlessBrowserBridge` -- Phase 1.5 + Phase 2 bridge surface.
 *     Auto-detects limitless-browser at runtime; falls back to mock
 *     when not detected.
 *   - `MockLimitlessBrowserBridge` -- in-memory mock for Phase 1.5
 *     browser-only fallback paths.
 *   - `limitlessBrowserBridge` -- singleton bridge convenience export.
 *   - Detection helpers: `isRunningInLimitlessBrowser`,
 *     `isRunningInTauri`, `isRunningInTauri2`,
 *     `getLimitlessBrowserVersion`, `getTauriVersion`,
 *     `getTauriInvoke`.
 *
 * R166 LIBRARY-RECOMMENDS-HOST-ACTS applies to ALL bridge responses --
 * mock + live. Content moderation in particular defaults to
 * `reviewedByCounsel = false`.
 */

export {
  LimitlessBrowserBridge,
  limitlessBrowserBridge,
  isRunningInLimitlessBrowser,
  getLimitlessBrowserVersion,
  getTauriVersion,
  type LimitlessBrowserBridgeOptions,
} from './bridge';
export {
  MockLimitlessBrowserBridge,
  MOCK_BRIDGE_REVIEWED_BY_COUNSEL,
  BRIDGE_CAPABILITY_UNAVAILABLE,
} from './mock';
export {
  isRunningInTauri,
  isRunningInTauri2,
  getTauriInvoke,
} from './detect';
export type {
  BridgeCapability,
  ContentModerationKind,
  ContentModerationPayload,
  ContentModerationVerdict,
  GameRuntimeLaunchVerdict,
  GameRuntimeWebviewHandle,
  ILimitlessBrowserBridge,
  NativeStorageBackend,
  NativeStorageHandle,
  TauriCommand,
} from './types';
export {
  CONTENT_MODERATION_KINDS,
  NATIVE_STORAGE_BACKENDS,
  TAURI_COMMANDS,
} from './types';
