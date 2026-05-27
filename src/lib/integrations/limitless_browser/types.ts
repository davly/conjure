/**
 * limitless-browser integration contract types for Conjure.
 *
 * limitless-browser is the AI-native Tauri 2 Rust desktop browser
 * (`davly/phantom-rust`) -- 39 crates + 1 Tauri app, ~86k lines of Rust,
 * shipping multi-webview (Tauri 2) + WebView2 on Windows + an extensive
 * suite of phantom-* peer-service crates (phantom-content-moderation,
 * phantom-mint, phantom-membrane-service, etc.).
 *
 * Phase 2 vision: limitless-browser becomes the canonical desktop
 * deployment shell for Conjure.
 *
 *  - Studio in webview 1 (the Conjure SvelteKit UI).
 *  - Generated game runtime in webview 2 (Tauri 2 multi-webview is the
 *    load-bearing capability -- isolates the game runtime from the
 *    studio).
 *  - Native file system access for game export (.zip + asset bundles).
 *  - Persistent storage beyond IndexedDB (Tauri Store plugin / native
 *    SQLite via tauri-plugin-sql).
 *  - Native ad SDK integration (Phase 4 economy).
 *  - phantom-content-moderation + phantom-mint + phantom-membrane-service
 *    reused for IP-infringement + content moderation.
 *
 * Phase 1.5 (this ship): CONTRACT-ONLY scaffold. The Tauri command
 * surface is documented + a detection stub ships so the forge pipeline
 * can branch on `isRunningInLimitlessBrowser()` without a live Tauri
 * binding.
 *
 * R157 substrate-native idiom: all types are `readonly` + immutable.
 */

/**
 * TauriCommand is the canonical name used in `tauri::command` handlers
 * on the Rust side. limitless-browser MUST register each of these as a
 * `#[tauri::command]` invocable from JavaScript via `invoke('<name>',
 * <args>)`.
 *
 * Phase 1.5 ships the contract; the live binding lands in Phase 2 once
 * limitless-browser ships the corresponding Tauri handlers under
 * `src-tauri/src/conjure_handlers.rs` (or equivalent).
 */
export type TauriCommand =
  | 'conjure_detect_capability'
  | 'conjure_get_native_storage'
  | 'conjure_request_multi_webview_game_launch'
  | 'conjure_get_content_moderation_verdict';

export const TAURI_COMMANDS: ReadonlyArray<TauriCommand> = Object.freeze([
  'conjure_detect_capability',
  'conjure_get_native_storage',
  'conjure_request_multi_webview_game_launch',
  'conjure_get_content_moderation_verdict',
]);

/**
 * BridgeCapability describes the Tauri-side capabilities the bridge
 * detects on startup. Used by the forge PERSIST stage to decide whether
 * to use native storage or fall back to IndexedDB.
 */
export interface BridgeCapability {
  readonly available: boolean;
  /**
   * Tauri version string (e.g. "2.0.1"). Empty string when no Tauri
   * runtime is present (i.e. running in a plain browser tab).
   */
  readonly tauriVersion: string;
  /** Multi-webview support flag (Tauri 2.x only). */
  readonly multiWebview: boolean;
  /** Native storage support flag (tauri-plugin-store or tauri-plugin-sql). */
  readonly nativeStorage: boolean;
  /** phantom-content-moderation crate availability. */
  readonly contentModeration: boolean;
}

/**
 * NativeStorageHandle is the Phase-2 contract for the Tauri native
 * storage adapter. limitless-browser MUST expose a `tauri-plugin-store`
 * or equivalent SQLite-backed store so Conjure can persist generated
 * game-spec records, creator profiles, and forge receipts beyond the
 * IndexedDB scope.
 *
 * Phase 1.5: the handle type is declared; the live binding lands in
 * Phase 2 once `tauri-plugin-store` is added to limitless-browser
 * `src-tauri/Cargo.toml`.
 */
export interface NativeStorageHandle {
  /** Stable handle identifier (uuid). */
  readonly handleId: string;
  /** Storage backend kind: 'tauri-store' | 'tauri-sqlite' | 'unavailable'. */
  readonly backend: NativeStorageBackend;
  /** Tauri scope key (e.g. "conjure.games") -- isolates Conjure data. */
  readonly scope: string;
}

export type NativeStorageBackend =
  | 'tauri-store'
  | 'tauri-sqlite'
  | 'unavailable';

export const NATIVE_STORAGE_BACKENDS: ReadonlyArray<NativeStorageBackend> =
  Object.freeze(['tauri-store', 'tauri-sqlite', 'unavailable']);

/**
 * GameRuntimeWebviewHandle is the Phase-2 contract for the multi-webview
 * game launcher. limitless-browser MUST expose a Tauri command that
 * spawns a second webview hosting the generated game runtime (isolated
 * from the studio webview).
 *
 * Phase 1.5: the handle type is declared; the live binding lands in
 * Phase 2 once limitless-browser's `src-tauri/` exposes the multi-webview
 * spawn command for Conjure.
 */
export interface GameRuntimeWebviewHandle {
  /** Generated webview label (Tauri 2 webview identifier). */
  readonly webviewLabel: string;
  /** The game ID being launched. */
  readonly gameId: string;
  /** Launch verdict: 'launched' | 'pending' | 'unavailable'. */
  readonly verdict: GameRuntimeLaunchVerdict;
  /** Honest rationale when verdict !== 'launched'. */
  readonly rationale: string;
}

export type GameRuntimeLaunchVerdict = 'launched' | 'pending' | 'unavailable';

/**
 * ContentModerationPayload is the request shape for the phantom-content-
 * moderation crate query. limitless-browser's Rust side wraps the
 * Conjure-generated game-spec into a phantom-membrane-service call and
 * returns the verdict.
 *
 * Phase 1.5: the wire shape is declared; the live binding lands in
 * Phase 2 once limitless-browser's `phantom-content-moderation` crate
 * exposes the `forge_content_check` Tauri command.
 */
export interface ContentModerationPayload {
  readonly gameId: string;
  readonly title: string;
  readonly description: string;
  readonly creatorId: string;
  /** Optional generated-asset hashes (sprite SHA-256, audio SHA-256, etc). */
  readonly assetHashes?: ReadonlyArray<string>;
}

/**
 * ContentModerationVerdict is the response from phantom-content-
 * moderation. Cohort-canonical 4-way verdict per R74 routing
 * conventions (passes / flags-with-warning / requires-human-review /
 * rejects).
 */
export interface ContentModerationVerdict {
  readonly verdict: ContentModerationKind;
  /** Free-form rationale string for the EXPLAIN stage. */
  readonly rationale: string;
  /** Confidence in basis-points (0..10000). */
  readonly confidenceBasisPoints: number;
  /** R166 LIBRARY-RECOMMENDS-HOST-ACTS sentinel. */
  readonly reviewedByCounsel: boolean;
  /** Provenance string for verdict trail. */
  readonly provenance: string;
}

export type ContentModerationKind =
  | 'pass'
  | 'flag-with-warning'
  | 'requires-human-review'
  | 'reject';

export const CONTENT_MODERATION_KINDS: ReadonlyArray<ContentModerationKind> =
  Object.freeze(['pass', 'flag-with-warning', 'requires-human-review', 'reject']);

/**
 * ILimitlessBrowserBridge is the contract surface for the Phase-2
 * limitless-browser integration. Phase 1.5 ships a mock + the live-binding
 * interface; the production wiring lands in Phase 2 once limitless-browser
 * exposes the corresponding Tauri commands.
 *
 * All methods are async + return `readonly` result shapes. R166 LIBRARY-
 * RECOMMENDS-HOST-ACTS applies: phantom-content-moderation is AI-assisted
 * and NOT a counsel-reviewed final verdict.
 */
export interface ILimitlessBrowserBridge {
  /**
   * Synchronous detection: returns true when running inside a Tauri 2
   * webview that exposes the Conjure capability.
   */
  isRunningInLimitlessBrowser(): boolean;

  /**
   * Async capability detection -- returns the full BridgeCapability
   * record. When not running in limitless-browser, returns the unavailable
   * sentinel.
   */
  detectCapability(): Promise<BridgeCapability>;

  /**
   * Acquire a native storage handle. Used by the forge PERSIST stage when
   * running inside limitless-browser; falls back to IndexedDB when
   * unavailable.
   */
  getNativeStorage(scope: string): Promise<NativeStorageHandle>;

  /**
   * Request multi-webview game launch. limitless-browser's Tauri side
   * spawns a second webview hosting the generated game runtime.
   */
  requestMultiWebviewGameLaunch(gameId: string): Promise<GameRuntimeWebviewHandle>;

  /**
   * Submit a content-moderation payload to phantom-content-moderation
   * via limitless-browser's Tauri bridge. Returns the verdict +
   * confidence + rationale.
   */
  getContentModerationVerdict(
    payload: ContentModerationPayload,
  ): Promise<ContentModerationVerdict>;
}
