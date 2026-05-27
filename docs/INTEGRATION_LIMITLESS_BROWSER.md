# Conjure <-> limitless-browser integration architecture

**Status:** Phase 1.5 CONTRACT-ONLY scaffold shipped 2026-05-27.
Phase 2 live wire-in deferred until limitless-browser registers the
canonical Tauri commands + injects the `__LIMITLESS_BROWSER_VERSION__`
window global.

**Branch:** `conjure-integrations-pistachio-browser-2026-05-27`

---

## 1. One-line purpose

limitless-browser is the AI-native Tauri 2 Rust desktop browser
(`davly/phantom-rust`) that becomes Conjure's canonical desktop
deployment shell -- using Tauri 2 multi-webview to isolate the studio
from the generated game runtime, native storage beyond IndexedDB, and
the phantom-content-moderation / phantom-mint / phantom-membrane-service
crates for content moderation + IP-infringement detection.

## 2. The two flagships

| | Conjure | limitless-browser |
|---|---|---|
| Layer | SaaS flagship | Browser flagship |
| Language | TypeScript / SvelteKit | Rust 2021 + Tauri 2 |
| Build | vite + npm | Cargo workspace (39 crates + 1 Tauri app) |
| Repo | `davly/conjure` | `davly/phantom-rust` (private) |
| Runtime shell | Browser tab (Phase 1) | Native desktop (Phase 2 default) |
| Multi-webview | Single tab | Studio + game-runtime split (Phase 2) |
| Storage | IndexedDB (Phase 1) | tauri-plugin-store / tauri-plugin-sql (Phase 2) |
| Content moderation | R143 advisory only | phantom-content-moderation crate (Phase 2) |

## 3. Phase milestones

### Phase 1.5 (this ship, 2026-05-27) -- contract scaffold

Delivered Conjure-side:

- `src/lib/integrations/limitless_browser/` -- 6 files, ~700 LoC.
  - `types.ts` -- TauriCommand union (4 canonical commands),
    BridgeCapability, NativeStorageHandle, GameRuntimeWebviewHandle,
    ContentModerationPayload/Verdict + ILimitlessBrowserBridge.
  - `detect.ts` -- `window.__TAURI__` / `__TAURI_INTERNALS__` /
    `__TAURI_METADATA__` + `__LIMITLESS_BROWSER_VERSION__` marker
    detection. SSR-safe (`typeof window !== 'undefined'`).
  - `mock.ts` -- MockLimitlessBrowserBridge -- browser-only fallback
    returning unavailable sentinel responses + R166 ReviewedByCounsel=
    false.
  - `bridge.ts` -- LimitlessBrowserBridge with auto-detection +
    Tauri invoke routing. Injectable `detectIsRunning` + `invokeImpl`
    for hermetic tests.
  - `bridge.test.ts` -- 32 tests covering detection (no-window /
    window-shim variants) + mock + live invoke-shim paths.
  - `index.ts` -- barrel.
- `src/lib/server/forge.ts` -- additive `generateWithIntegrations()`
  variant consulting the bridge at PERSIST + optional content
  moderation.

Deferred (limitless-browser-side; not in this ship):

- `src-tauri/src/lib.rs` -- inject `__LIMITLESS_BROWSER_VERSION__` into
  every webview via Tauri's pre-init hook. Estimated cost: ~1 hour
  Rust work.
- 4 canonical `#[tauri::command]` handlers under
  `src-tauri/src/conjure_handlers.rs` (or equivalent). Estimated cost:
  ~1-2 founder-weeks total including phantom-content-moderation
  integration + tauri-plugin-store wire-in.

### Phase 2 (deferred) -- live binding

limitless-browser ships:

1. `__LIMITLESS_BROWSER_VERSION__` window-global injection at webview
   init (pre-init Tauri hook).
2. Four canonical `#[tauri::command]` handlers:
   - `conjure_detect_capability` -- returns full BridgeCapability.
   - `conjure_get_native_storage` -- acquires tauri-plugin-store
     handle scoped to a Conjure-supplied scope key.
   - `conjure_request_multi_webview_game_launch` -- spawns a second
     webview hosting the game runtime, isolated from the studio.
   - `conjure_get_content_moderation_verdict` -- routes the
     ContentModerationPayload through phantom-content-moderation +
     returns the verdict + provenance.
3. `tauri-plugin-store` (or `tauri-plugin-sql`) added to
   `src-tauri/Cargo.toml`.
4. phantom-content-moderation Tauri-invoke wrapper.

Conjure-side: the bridge auto-detects via `isRunningInLimitlessBrowser()`;
no configuration change required when running inside limitless-browser.

### Phase 3 (further out) -- full Phase-4 economy integration

- Native ad SDK integration in `src-tauri/` (Phase 4 economy).
- phantom-mint integration for paid-game purchase + receipt signing.
- phantom-membrane-service for per-creator scope isolation.

Phase 3 is Phase 4 economy work + several founder-weeks; not yet
scheduled.

## 4. Tauri command contract

Phase 2 live commands, all invoked via `invoke('<cmd>', <args>)`:

### `conjure_detect_capability`

Request: `{}`

Response: `BridgeCapability`

```json
{
  "available": true,
  "tauriVersion": "2.0.1",
  "multiWebview": true,
  "nativeStorage": true,
  "contentModeration": true
}
```

### `conjure_get_native_storage`

Request: `{ "scope": "conjure.games" }`

Response: `NativeStorageHandle`

```json
{
  "handleId": "<uuid>",
  "backend": "tauri-store",
  "scope": "conjure.games"
}
```

The handle is opaque; subsequent storage operations go through the
Tauri side via additional commands TBD in Phase 2.

### `conjure_request_multi_webview_game_launch`

Request: `{ "gameId": "<game-id>" }`

Response: `GameRuntimeWebviewHandle`

```json
{
  "webviewLabel": "webview-game-001",
  "gameId": "<game-id>",
  "verdict": "launched",
  "rationale": "Spawned in webview 2 with scope=game-runtime"
}
```

### `conjure_get_content_moderation_verdict`

Request: `ContentModerationPayload`

```json
{
  "gameId": "<game-id>",
  "title": "<title>",
  "description": "<text>",
  "creatorId": "<creator-id>",
  "assetHashes": ["<sha256>", "<sha256>"]
}
```

Response: `ContentModerationVerdict`

```json
{
  "verdict": "pass",
  "rationale": "<text>",
  "confidenceBasisPoints": 9500,
  "reviewedByCounsel": false,
  "provenance": "phantom-content-moderation://v1.0"
}
```

Note: `reviewedByCounsel` is **per-verdict**. Even when phantom-content-
moderation passes a payload, the host (Limitless) is still responsible
for the underlying moderation policy + counsel review of the rule set.
The bridge does NOT silently flip the sentinel.

## 5. Sequence diagram (Phase 2 live)

```
Conjure studio (TS, webview 1)         limitless-browser (Rust, Tauri 2)
       |                                              |
       | isRunningInLimitlessBrowser()                |
       | -> reads window.__LIMITLESS_BROWSER_VERSION__|
       |   = "0.1.0" (set by Tauri pre-init hook)     |
       |                                              |
       | invoke('conjure_detect_capability')          |
       |---------------------------------------------->|
       |                                              | <handler runs>
       | <----------------------------------------------|
       |                                              |
       | invoke('conjure_get_native_storage',         |
       |        { scope: 'conjure.games' })           |
       |---------------------------------------------->|
       |                                              | tauri-plugin-store
       |                                              | -> get or create scope
       | <----------------------------------------------|
       |                                              |
       | invoke('conjure_get_content_moderation_      |
       |        verdict', <payload>)                  |
       |---------------------------------------------->|
       |                                              | phantom-content-
       |                                              | moderation crate
       |                                              | -> verdict + score
       | <----------------------------------------------|
       |                                              |
       | (game generation complete)                   |
       |                                              |
       | invoke('conjure_request_multi_webview_       |
       |        game_launch', { gameId })             |
       |---------------------------------------------->|
       |                                              | Tauri 2 multi-webview
       |                                              | -> spawn webview 2
       |                                              |    isolated scope
       | <----------------------------------------------|
       |                                              |
       |                                              |
                                              ┌──────────────────────────┐
                                              │  webview 2 (game runtime)│
                                              │  rendered isolated from  │
                                              │  webview 1 (studio)      │
                                              └──────────────────────────┘
```

## 6. Cohort discipline

### R145.B sibling-not-stacked

The integration is an ADDITIVE sibling package under `src/lib/
integrations/limitless_browser/`. No edits to the existing 6 cohort
packages under `src/lib/cohort/`. The forge wire-in adds a new
`generateWithIntegrations()` SIBLING on the same parent module
(forge.ts); existing `generate()` is preserved untouched.

### R145.C firewall

The cohort firewall under `src/lib/cohort/firewall/` scans `src/lib/
cohort/` only -- integrations directory is excluded by design.

### R157 substrate-native idioms

- TypeScript classes with `#`-private fields.
- ES module imports (`$lib/...` SvelteKit aliases).
- `async`/`await` everywhere.
- Frozen result shapes via `Object.freeze()`.
- SSR safety: every `window` access is guarded by
  `typeof window !== 'undefined'`.

### R166 LIBRARY-RECOMMENDS-HOST-ACTS

The bridge surface is the SHARPEST R166 surface in Conjure:
content-moderation is exactly the kind of capability where library-
side defaults MUST surface a counsel-review boundary, NOT silently
green-light moderation decisions.

The library scope:
- Provides the bridge + the mock + the detection helpers.
- Surfaces `reviewedByCounsel: boolean` on every moderation verdict.
- Defaults the sentinel to `false` on both mock + live paths.

The host scope (Limitless / David Carson responsibility):
- Counsel-review the phantom-content-moderation policy + threshold
  configuration in limitless-browser.
- Counsel-review the moderation rule set, in particular the
  CONJURE_AGE_GATING_NOT_IMPLEMENTED advisory text.
- Flip `reviewedByCounsel` to `true` on a counsel-signed branch.

### R155 verdict-requires-commit-SHA-AND-test-receipt

This integration ships with:

- 32 new browser-bridge tests in `bridge.test.ts` (all GREEN).
- 13 new forge-side tests in `studio_integrations.test.ts` (all GREEN).
- 194 total tests GREEN (was 121 baseline).
- `npm run build` GREEN.

Commit SHAs recorded in `reviews/IMPLEMENTATION_2026-05-27-LATE-NIGHT/
CONJURE_INTEGRATIONS.md`.

## 7. Detection feature-flag matrix

| Phase | `window.__TAURI__` | `__TAURI_INTERNALS__` | `__LIMITLESS_BROWSER_VERSION__` | Behaviour |
|---|---|---|---|---|
| Plain browser tab | absent | absent | absent | mock-routed |
| Tauri 1 shell | present | absent | absent | mock-routed (Tauri 1 lacks multi-webview) |
| Tauri 2 shell (not limitless-browser) | maybe | present | absent | mock-routed (cohort scope check) |
| limitless-browser Tauri 2 | present | present | present | live-routed |

## 8. Open questions (Phase 2 design)

These are deliberately deferred to Phase 2 design:

- **Webview message bus.** Generated game (webview 2) needs to
  communicate with studio (webview 1) for save/load/end-game events.
  Tauri 2 inter-webview events are the canonical channel. (Phase 2.)
- **Storage scope isolation.** Per-creator scope keys vs single-tenant
  scope. (Phase 2 design.)
- **Phantom-mint integration.** Paid-game receipt signing on a native
  shell. Currently in R166-flagged `CONJURE_AD_REVENUE_INTEGRATION_NOT_
  LIVE` Phase 2+ deferral.
- **Auto-update channel.** Tauri-side updater plugin for the desktop
  shell. (Phase 2 wire-in.)

## 9. Related docs

- `flagships/limitless-browser/CONTEXT.md` -- limitless-browser overall
  context (39 crates + 1 Tauri app).
- `flagships/conjure/CONTEXT.md` §5 -- Conjure integration summary.
- `docs/INTEGRATION_PISTACHIO.md` -- companion Pistachio integration
  architecture.
- godfather memory `feedback_nexus_is_fw_ai_provider.md` -- if
  limitless-browser proxies any AI call, it MUST route via Nexus.
