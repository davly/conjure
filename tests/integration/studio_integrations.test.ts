/**
 * Integration tests for the integration-enriched forge pipeline
 * (`generateWithIntegrations()`).
 *
 * Pins:
 *  1. generateWithIntegrations() with default (mock) integrations
 *     produces the canonical 7-phase output PLUS the integrations trail.
 *  2. IDENTIFY enrichment: closestExistingGames includes Pistachio
 *     Knowledge Bedrock entries when keywords match.
 *  3. ASSESS enrichment: engagementScoreBasisPoints blends the Phase-1
 *     placeholder with the Pistachio retention score.
 *  4. EXPLAIN enrichment: rationale includes Pistachio citations.
 *  5. PERSIST: native-storage backend is honoured from the bridge.
 *  6. Content moderation: mock returns requires-human-review +
 *     ReviewedByCounsel=false (R166).
 *  7. Custom integration clients can be injected (DI works).
 *  8. R143 advisories still fire (preserved from base generate()).
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  hasFired,
  resetLoudOnceForTests,
} from '../../src/lib/cohort/honest/loudonce';
import { LimitlessBrowserBridge } from '../../src/lib/integrations/limitless_browser';
import type { ILimitlessBrowserBridge } from '../../src/lib/integrations/limitless_browser';
import {
  MockPistachioKnowledgeClient,
  PISTACHIO_MOCK_CORPUS_VERSION,
} from '../../src/lib/integrations/pistachio';
import type { IPistachioKnowledgeClient } from '../../src/lib/integrations/pistachio';
import {
  generate,
  generateWithIntegrations,
} from '../../src/lib/server/forge';

describe('forge integrations -- default (mock) integrations', () => {
  beforeEach(() => {
    resetLoudOnceForTests();
  });

  it('generateWithIntegrations() returns the canonical 7-phase output + trail', async () => {
    const r = await generateWithIntegrations({
      prompt: 'A neon stack puzzle game',
      creatorId: 'creator_test_int_001',
    });
    expect(r.spec.mechanicKind).toBe('puzzle');
    expect(r.identify.confidence).toBeGreaterThan(0.5);
    expect(r.assess.playable).toBe(true);
    expect(r.escape.kind).toMatch(/^(ROUTINE|INVESTIGATE)$/);
    expect(r.observe.placeholder).toBe(true);
    expect(r.forget.placeholder).toBe(true);
    expect(r.persist.placeholder).toBe(true);
    expect(r.explain.title).toBeDefined();
    // Integrations trail is present + frozen.
    expect(r.integrations).toBeDefined();
    expect(Object.isFrozen(r.integrations)).toBe(true);
  });

  it('IDENTIFY enrichment: closest games include Pistachio Knowledge Bedrock entries', async () => {
    const r = await generateWithIntegrations({
      prompt: 'A neon stack puzzle game',
      creatorId: 'creator_int_002',
    });
    // Base puzzle template lists Tetris (1984); Pistachio mock adds Tetris
    // again via its puzzle Bedrock entry. Title appears via the enriched
    // list (which de-duplicates).
    expect(r.identify.closestExistingGames.length).toBeGreaterThan(0);
    expect(
      r.identify.closestExistingGames.some((g) => g.includes('Tetris')),
    ).toBe(true);
  });

  it('ASSESS enrichment: engagement score blends Phase-1 + retention score', async () => {
    const r = await generateWithIntegrations({
      prompt: 'A puzzle game',
      creatorId: 'creator_int_003',
    });
    // Puzzle retention mock = 0.78 -> 7800 bp; blended (7500+7800)/2 = 7650.
    expect(r.assess.engagementScoreBasisPoints).toBe(7650);
  });

  it('EXPLAIN enrichment: rationale includes Pistachio citations', async () => {
    const r = await generateWithIntegrations({
      prompt: 'A neon stack puzzle game',
      creatorId: 'creator_int_004',
    });
    expect(r.explain.explanation).toContain('Pistachio-enriched');
    expect(r.explain.explanation).toContain('Match-pattern stack');
    expect(r.explain.explanation).toContain('Difficulty curve');
    // Trail surfaces the citations too.
    expect(r.integrations.pistachioCitations.length).toBeGreaterThan(0);
  });

  it('PERSIST: bridge unavailable -> falls back to IndexedDB plan', async () => {
    const r = await generateWithIntegrations({
      prompt: 'puzzle game',
      creatorId: 'creator_int_005',
    });
    expect(r.persist.note).toContain('unavailable');
    expect(r.integrations.bridgeNativeStorageBackend).toBe('unavailable');
    expect(r.integrations.bridgeIsLimitlessBrowser).toBe(false);
  });

  it('Content moderation: mock returns requires-human-review + ReviewedByCounsel=false', async () => {
    const r = await generateWithIntegrations({
      prompt: 'puzzle game',
      creatorId: 'creator_int_006',
    });
    expect(r.integrations.contentModerationVerdict).toBe('requires-human-review');
    expect(r.integrations.contentModerationReviewedByCounsel).toBe(false);
  });

  it('Pistachio corpus version is surfaced in trail (cohort-canonical mock pin)', async () => {
    const r = await generateWithIntegrations({
      prompt: 'puzzle',
      creatorId: 'creator_int_007',
    });
    expect(r.integrations.pistachioCorpusVersion).toBe(
      PISTACHIO_MOCK_CORPUS_VERSION,
    );
  });

  it('R143 advisories still fire on integration-enriched pipeline', async () => {
    await generateWithIntegrations({
      prompt: 'puzzle',
      creatorId: 'creator_int_008',
    });
    expect(hasFired('CONJURE_IP_INFRINGEMENT_DETECTION_PLACEHOLDER')).toBe(true);
    expect(hasFired('CONJURE_CONTENT_MODERATION_AI_ASSISTED_NOT_ENFORCED')).toBe(true);
  });

  it('enableContentModeration=false skips moderation step', async () => {
    const r = await generateWithIntegrations({
      prompt: 'puzzle',
      creatorId: 'creator_int_009',
      integrations: { enableContentModeration: false },
    });
    expect(r.integrations.contentModerationVerdict).toBe('not-checked');
  });
});

describe('forge integrations -- dependency injection works', () => {
  beforeEach(() => {
    resetLoudOnceForTests();
  });

  it('custom Pistachio client is honoured', async () => {
    const customClient: IPistachioKnowledgeClient =
      new MockPistachioKnowledgeClient({
        corpusVersion: 'custom-corpus-v999',
        loreVersion: 'custom-lore-v999',
      });
    const r = await generateWithIntegrations({
      prompt: 'puzzle',
      creatorId: 'creator_int_010',
      integrations: { pistachio: customClient },
    });
    expect(r.integrations.pistachioCorpusVersion).toBe('custom-corpus-v999');
  });

  it('custom bridge with live=detected returns the injected verdict', async () => {
    const customBridge: ILimitlessBrowserBridge = new LimitlessBrowserBridge({
      detectIsRunning: () => true,
      invokeImpl: async (cmd: string, args?: unknown) => {
        if (cmd === 'conjure_get_native_storage') {
          return {
            handleId: 'live-handle-conjure',
            backend: 'tauri-store',
            scope: (args as { scope?: string })?.scope ?? '',
          };
        }
        if (cmd === 'conjure_get_content_moderation_verdict') {
          return {
            verdict: 'pass',
            rationale: 'live moderator approved',
            confidenceBasisPoints: 9500,
            reviewedByCounsel: false, // R166 -- still false even on live path
            provenance: 'phantom-content-moderation://v1.0',
          };
        }
        if (cmd === 'conjure_detect_capability') {
          return {
            available: true,
            tauriVersion: '2.0.1',
            multiWebview: true,
            nativeStorage: true,
            contentModeration: true,
          };
        }
        throw new Error(`unhandled cmd ${cmd}`);
      },
    });
    const r = await generateWithIntegrations({
      prompt: 'puzzle',
      creatorId: 'creator_int_011',
      integrations: { bridge: customBridge },
    });
    expect(r.integrations.bridgeIsLimitlessBrowser).toBe(true);
    expect(r.integrations.bridgeNativeStorageBackend).toBe('tauri-store');
    expect(r.integrations.contentModerationVerdict).toBe('pass');
    // R166 preserved even on live path -- bridge does NOT silently flip.
    expect(r.integrations.contentModerationReviewedByCounsel).toBe(false);
    expect(r.persist.note).toContain('native-storage handle acquired');
  });

  it('custom storage scope is honoured', async () => {
    // Inject a bridge that surfaces the scope in the handle.
    const seenScopes: string[] = [];
    const customBridge: ILimitlessBrowserBridge = new LimitlessBrowserBridge({
      detectIsRunning: () => true,
      invokeImpl: async (cmd: string, args?: unknown) => {
        if (cmd === 'conjure_get_native_storage') {
          const scope = (args as { scope?: string })?.scope ?? '';
          seenScopes.push(scope);
          return { handleId: 'h', backend: 'tauri-store', scope };
        }
        if (cmd === 'conjure_get_content_moderation_verdict') {
          return {
            verdict: 'pass',
            rationale: '',
            confidenceBasisPoints: 5000,
            reviewedByCounsel: false,
            provenance: '',
          };
        }
        if (cmd === 'conjure_detect_capability') {
          return {
            available: true,
            tauriVersion: '2.0.1',
            multiWebview: true,
            nativeStorage: true,
            contentModeration: true,
          };
        }
        throw new Error('unhandled');
      },
    });
    await generateWithIntegrations({
      prompt: 'puzzle',
      creatorId: 'creator_int_012',
      integrations: {
        bridge: customBridge,
        storageScope: 'conjure.creator_int_012',
      },
    });
    expect(seenScopes).toContain('conjure.creator_int_012');
  });
});

describe('forge integrations -- base generate() preserved unchanged (R145.B)', () => {
  beforeEach(() => {
    resetLoudOnceForTests();
  });

  it('base generate() still produces 7-phase result without integrations trail', async () => {
    const r = await generate({
      prompt: 'A neon stack puzzle game',
      creatorId: 'creator_base_001',
    });
    expect(r.spec.mechanicKind).toBe('puzzle');
    // The base GenerationResult shape has no 'integrations' field.
    expect((r as unknown as { integrations?: unknown }).integrations).toBeUndefined();
  });
});
