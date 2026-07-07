/**
 * Tests for the LimitlessBrowserBridge + the mock + the detection
 * helpers.
 *
 * Three layers:
 *   1. Detection layer -- detect.ts helpers correctly identify Tauri /
 *      Tauri 2 / limitless-browser via the canonical window globals.
 *   2. Mock layer -- the browser-only fallback returns canned
 *      "unavailable" sentinel responses + R166 ReviewedByCounsel=false.
 *   3. Bridge layer -- the bridge routes to the mock when not detected
 *      + routes through an injected invoke shim when detected.
 *
 * All tests are hermetic -- the detection helpers are injected via
 * constructor options so the test does NOT need to mutate `window`
 * globals.
 */

import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

import {
  LimitlessBrowserBridge,
  limitlessBrowserBridge,
} from './bridge';
import {
  getLimitlessBrowserVersion,
  getTauriInvoke,
  getTauriVersion,
  isRunningInLimitlessBrowser,
  isRunningInTauri,
  isRunningInTauri2,
} from './detect';
import {
  BRIDGE_CAPABILITY_UNAVAILABLE,
  MOCK_BRIDGE_REVIEWED_BY_COUNSEL,
  MockLimitlessBrowserBridge,
} from './mock';
import {
  CONTENT_MODERATION_KINDS,
  NATIVE_STORAGE_BACKENDS,
  TAURI_COMMANDS,
} from './types';

describe('limitless-browser integration -- type pins', () => {
  it('TAURI_COMMANDS pins exactly the 4 canonical commands', () => {
    expect(TAURI_COMMANDS).toEqual([
      'conjure_detect_capability',
      'conjure_get_native_storage',
      'conjure_request_multi_webview_game_launch',
      'conjure_get_content_moderation_verdict',
    ]);
    expect(TAURI_COMMANDS.length).toBe(4);
  });

  it('NATIVE_STORAGE_BACKENDS pins the 3 canonical backends', () => {
    expect(NATIVE_STORAGE_BACKENDS).toEqual([
      'tauri-store',
      'tauri-sqlite',
      'unavailable',
    ]);
  });

  it('CONTENT_MODERATION_KINDS pins the canonical 4-way verdict', () => {
    expect(CONTENT_MODERATION_KINDS).toEqual([
      'pass',
      'flag-with-warning',
      'requires-human-review',
      'reject',
    ]);
  });

  it('R166 mock-bridge ReviewedByCounsel sentinel defaults to false', () => {
    expect(MOCK_BRIDGE_REVIEWED_BY_COUNSEL).toBe(false);
  });

  it('BRIDGE_CAPABILITY_UNAVAILABLE pins the canonical unavailable record', () => {
    expect(BRIDGE_CAPABILITY_UNAVAILABLE.available).toBe(false);
    expect(BRIDGE_CAPABILITY_UNAVAILABLE.tauriVersion).toBe('');
    expect(BRIDGE_CAPABILITY_UNAVAILABLE.multiWebview).toBe(false);
    expect(BRIDGE_CAPABILITY_UNAVAILABLE.nativeStorage).toBe(false);
    expect(BRIDGE_CAPABILITY_UNAVAILABLE.contentModeration).toBe(false);
  });
});

describe('limitless-browser integration -- detection (no window globals)', () => {
  // Vitest 'node' environment -- window may or may not be defined.
  // Test that detection returns false when window is undefined or
  // when window has no Tauri globals.

  beforeEach(() => {
    // Ensure no Tauri globals leaked from previous tests.
    if (typeof globalThis.window !== 'undefined') {
      const w = globalThis.window as Record<string, unknown>;
      delete w.__TAURI__;
      delete w.__TAURI_INTERNALS__;
      delete w.__TAURI_METADATA__;
      delete w.__LIMITLESS_BROWSER_VERSION__;
    }
  });

  it('isRunningInTauri() returns false in node environment', () => {
    expect(isRunningInTauri()).toBe(false);
  });

  it('isRunningInTauri2() returns false in node environment', () => {
    expect(isRunningInTauri2()).toBe(false);
  });

  it('isRunningInLimitlessBrowser() returns false in node environment', () => {
    expect(isRunningInLimitlessBrowser()).toBe(false);
  });

  it('getLimitlessBrowserVersion() returns empty string when not detected', () => {
    expect(getLimitlessBrowserVersion()).toBe('');
  });

  it('getTauriVersion() returns empty string when not detected', () => {
    expect(getTauriVersion()).toBe('');
  });

  it('getTauriInvoke() returns undefined when not detected', () => {
    expect(getTauriInvoke()).toBeUndefined();
  });
});

describe('limitless-browser integration -- detection (window shims)', () => {
  let originalWindow: unknown;

  beforeEach(() => {
    originalWindow = globalThis.window;
    // Shim a window for the detection tests.
    (globalThis as Record<string, unknown>).window = {};
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as Record<string, unknown>).window;
    } else {
      (globalThis as Record<string, unknown>).window = originalWindow;
    }
  });

  it('detects Tauri 1 via window.__TAURI__', () => {
    (globalThis.window as Record<string, unknown>).__TAURI__ = {
      invoke: async () => undefined,
    };
    expect(isRunningInTauri()).toBe(true);
    expect(isRunningInTauri2()).toBe(false);
  });

  it('detects Tauri 2 via window.__TAURI_INTERNALS__', () => {
    (globalThis.window as Record<string, unknown>).__TAURI_INTERNALS__ = {
      invoke: async () => undefined,
    };
    expect(isRunningInTauri()).toBe(true);
    expect(isRunningInTauri2()).toBe(true);
  });

  it('detects Tauri 2 via __TAURI_METADATA__.tauriVersion=2.x', () => {
    (globalThis.window as Record<string, unknown>).__TAURI_METADATA__ = {
      tauriVersion: '2.0.1',
    };
    (globalThis.window as Record<string, unknown>).__TAURI__ = {
      invoke: async () => undefined,
    };
    expect(isRunningInTauri2()).toBe(true);
    expect(getTauriVersion()).toBe('2.0.1');
  });

  it('detects limitless-browser only when both Tauri 2 AND version marker are present', () => {
    // Tauri 2 alone is not enough.
    (globalThis.window as Record<string, unknown>).__TAURI_INTERNALS__ = {
      invoke: async () => undefined,
    };
    expect(isRunningInLimitlessBrowser()).toBe(false);

    // Add the marker.
    (globalThis.window as Record<string, unknown>).__LIMITLESS_BROWSER_VERSION__ =
      '0.1.0';
    expect(isRunningInLimitlessBrowser()).toBe(true);
    expect(getLimitlessBrowserVersion()).toBe('0.1.0');
  });

  it('does NOT detect limitless-browser when only marker is present (no Tauri 2)', () => {
    (globalThis.window as Record<string, unknown>).__LIMITLESS_BROWSER_VERSION__ =
      '0.1.0';
    // No Tauri 2 globals -> detection still returns false (defense in
    // depth: marker without Tauri runtime is malformed).
    expect(isRunningInLimitlessBrowser()).toBe(false);
  });

  it('getTauriInvoke() returns the function from __TAURI_INTERNALS__ first', () => {
    const internalsInvoke = vi.fn(async () => 'internals-invoke');
    const legacyInvoke = vi.fn(async () => 'legacy-invoke');
    (globalThis.window as Record<string, unknown>).__TAURI_INTERNALS__ = {
      invoke: internalsInvoke,
    };
    (globalThis.window as Record<string, unknown>).__TAURI__ = {
      invoke: legacyInvoke,
    };
    const invoke = getTauriInvoke();
    expect(invoke).toBe(internalsInvoke);
  });
});

describe('limitless-browser integration -- mock bridge', () => {
  const mock = new MockLimitlessBrowserBridge();

  it('isRunningInLimitlessBrowser returns false', () => {
    expect(mock.isRunningInLimitlessBrowser()).toBe(false);
  });

  it('detectCapability returns the unavailable record', async () => {
    const c = await mock.detectCapability();
    expect(c.available).toBe(false);
    expect(c.multiWebview).toBe(false);
    expect(c.nativeStorage).toBe(false);
  });

  it('getNativeStorage returns unavailable backend', async () => {
    const h = await mock.getNativeStorage('conjure.games');
    expect(h.backend).toBe('unavailable');
    expect(h.scope).toBe('conjure.games');
  });

  it('requestMultiWebviewGameLaunch returns unavailable verdict', async () => {
    const h = await mock.requestMultiWebviewGameLaunch('game_001');
    expect(h.verdict).toBe('unavailable');
    expect(h.gameId).toBe('game_001');
    expect(h.rationale).toContain('multi-webview not available');
  });

  it('getContentModerationVerdict returns requires-human-review + 0% confidence', async () => {
    const v = await mock.getContentModerationVerdict({
      gameId: 'game_001',
      title: 'Test',
      description: 'A test',
      creatorId: 'creator_001',
    });
    expect(v.verdict).toBe('requires-human-review');
    expect(v.confidenceBasisPoints).toBe(0);
    expect(v.reviewedByCounsel).toBe(false);
    expect(v.provenance).toContain('mock-bridge');
  });

  it('all mock results are frozen', async () => {
    const c = await mock.detectCapability();
    expect(Object.isFrozen(c)).toBe(true);
    const h = await mock.getNativeStorage('s');
    expect(Object.isFrozen(h)).toBe(true);
    const g = await mock.requestMultiWebviewGameLaunch('g');
    expect(Object.isFrozen(g)).toBe(true);
    const v = await mock.getContentModerationVerdict({
      gameId: 'g',
      title: 't',
      description: 'd',
      creatorId: 'c',
    });
    expect(Object.isFrozen(v)).toBe(true);
  });
});

describe('limitless-browser integration -- bridge (mock-path default)', () => {
  it('bridge defaults to mock when not detected', () => {
    const bridge = new LimitlessBrowserBridge({
      detectIsRunning: () => false,
    });
    expect(bridge.isMock).toBe(true);
    expect(bridge.isRunningInLimitlessBrowser()).toBe(false);
  });

  it('bridge routes to mock when forceMock=true', () => {
    const bridge = new LimitlessBrowserBridge({
      forceMock: true,
      detectIsRunning: () => true, // even if detected, forced mock
    });
    expect(bridge.isMock).toBe(true);
    expect(bridge.isRunningInLimitlessBrowser()).toBe(false);
  });

  it('bridge falls back to mock for all methods when not detected', async () => {
    const bridge = new LimitlessBrowserBridge({
      detectIsRunning: () => false,
    });
    const c = await bridge.detectCapability();
    expect(c.available).toBe(false);
    const h = await bridge.getNativeStorage('s');
    expect(h.backend).toBe('unavailable');
    const g = await bridge.requestMultiWebviewGameLaunch('g');
    expect(g.verdict).toBe('unavailable');
    const v = await bridge.getContentModerationVerdict({
      gameId: 'g',
      title: 't',
      description: 'd',
      creatorId: 'c',
    });
    expect(v.verdict).toBe('requires-human-review');
  });

  it('singleton limitlessBrowserBridge routes to mock in node environment', async () => {
    const c = await limitlessBrowserBridge.detectCapability();
    expect(c.available).toBe(false);
  });
});

describe('limitless-browser integration -- bridge (live-path via invoke shim)', () => {
  it('live bridge calls invoke with the canonical detect-capability cmd', async () => {
    let capturedCmd = '';
    const invokeShim = async (cmd: string) => {
      capturedCmd = cmd;
      return {
        available: true,
        tauriVersion: '2.0.1',
        multiWebview: true,
        nativeStorage: true,
        contentModeration: true,
      };
    };
    const bridge = new LimitlessBrowserBridge({
      detectIsRunning: () => true,
      invokeImpl: invokeShim,
    });
    const c = await bridge.detectCapability();
    expect(capturedCmd).toBe('conjure_detect_capability');
    expect(c.available).toBe(true);
    expect(c.multiWebview).toBe(true);
    expect(c.nativeStorage).toBe(true);
  });

  it('live bridge calls invoke with native-storage cmd + scope arg', async () => {
    let capturedCmd = '';
    let capturedArgs: unknown;
    const invokeShim = async (cmd: string, args?: unknown) => {
      capturedCmd = cmd;
      capturedArgs = args;
      return {
        handleId: 'live-handle-001',
        backend: 'tauri-store',
        scope: 'conjure.games',
      };
    };
    const bridge = new LimitlessBrowserBridge({
      detectIsRunning: () => true,
      invokeImpl: invokeShim,
    });
    const h = await bridge.getNativeStorage('conjure.games');
    expect(capturedCmd).toBe('conjure_get_native_storage');
    expect(capturedArgs).toEqual({ scope: 'conjure.games' });
    expect(h.backend).toBe('tauri-store');
  });

  it('live bridge calls invoke with multi-webview launch cmd + gameId arg', async () => {
    const invokeShim = async (cmd: string, args?: unknown) => {
      expect(cmd).toBe('conjure_request_multi_webview_game_launch');
      expect(args).toEqual({ gameId: 'game_001' });
      return {
        webviewLabel: 'webview-game-001',
        gameId: 'game_001',
        verdict: 'launched',
        rationale: 'Spawned in webview 2',
      };
    };
    const bridge = new LimitlessBrowserBridge({
      detectIsRunning: () => true,
      invokeImpl: invokeShim,
    });
    const g = await bridge.requestMultiWebviewGameLaunch('game_001');
    expect(g.verdict).toBe('launched');
    expect(g.webviewLabel).toBe('webview-game-001');
  });

  it('live bridge calls invoke with content-moderation cmd + full payload', async () => {
    const invokeShim = async (cmd: string, args?: unknown) => {
      expect(cmd).toBe('conjure_get_content_moderation_verdict');
      const a = args as { gameId: string; title: string; creatorId: string };
      expect(a.gameId).toBe('game_001');
      return {
        verdict: 'pass',
        rationale: 'OK',
        confidenceBasisPoints: 9500,
        reviewedByCounsel: false, // R166: live still defaults false
        provenance: 'phantom-content-moderation://v1.0',
      };
    };
    const bridge = new LimitlessBrowserBridge({
      detectIsRunning: () => true,
      invokeImpl: invokeShim,
    });
    const v = await bridge.getContentModerationVerdict({
      gameId: 'game_001',
      title: 'A test game',
      description: 'desc',
      creatorId: 'creator_001',
    });
    expect(v.verdict).toBe('pass');
    expect(v.confidenceBasisPoints).toBe(9500);
    expect(v.reviewedByCounsel).toBe(false); // R166 preserved
    expect(v.provenance).toContain('phantom-content-moderation');
  });

  it('live bridge throws if Tauri invoke is unavailable AND no shim is injected', async () => {
    const bridge = new LimitlessBrowserBridge({
      detectIsRunning: () => true,
      // No invokeImpl override -- falls through to getTauriInvoke() which is
      // undefined in the node test env.
    });
    await expect(bridge.detectCapability()).rejects.toThrow(/Tauri invoke unavailable/);
  });
});
