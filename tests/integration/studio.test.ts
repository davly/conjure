/**
 * Integration test for the Conjure studio forge pipeline.
 *
 * Drives the `generate()` function end-to-end against representative
 * prompts spanning the three Phase-1 mechanic kinds. Pins:
 *
 *  1. Puzzle keyword prompt -> mechanicKind=puzzle.
 *  2. Arcade keyword prompt -> mechanicKind=arcade.
 *  3. Idle keyword prompt -> mechanicKind=idle.
 *  4. No keyword prompt -> fallback to puzzle (R143 LEARN escape kind).
 *  5. Game-receipt canonical-payload + sign + verify round trip.
 *  6. R143 LOUD-ONCE for content-moderation + IP-infringement fires.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Buffer } from 'node:buffer';

import {
  CONJURE_ADVISORIES,
  findAdvisory,
} from '../../src/lib/cohort/honest/advisories';
import {
  hasFired,
  resetLoudOnceForTests,
} from '../../src/lib/cohort/honest/loudonce';
import {
  canonicalGameReceiptPayload,
  sign,
  verify,
} from '../../src/lib/cohort/mirrormark/mirrormark';
import { generate } from '../../src/lib/server/forge';

describe('Conjure studio integration -- forge.generate()', () => {
  beforeEach(() => {
    resetLoudOnceForTests();
  });

  it('puzzle keyword prompt classifies as puzzle', async () => {
    const r = await generate({
      prompt: 'A game where you stack blocks to clear rows',
      creatorId: 'creator_test_001',
    });
    expect(r.spec.mechanicKind).toBe('puzzle');
    expect(r.identify.confidence).toBeGreaterThan(0.5);
    expect(r.escape.kind).toMatch(/^(ROUTINE|INVESTIGATE)$/);
  });

  it('arcade keyword prompt classifies as arcade', async () => {
    const r = await generate({
      prompt: 'Endless runner where you jump over obstacles',
      creatorId: 'creator_test_002',
    });
    expect(r.spec.mechanicKind).toBe('arcade');
    expect(r.identify.confidence).toBeGreaterThan(0.5);
  });

  it('idle keyword prompt classifies as idle', async () => {
    const r = await generate({
      prompt: 'An idle incremental clicker game',
      creatorId: 'creator_test_003',
    });
    expect(r.spec.mechanicKind).toBe('idle');
    expect(r.identify.confidence).toBeGreaterThan(0.5);
  });

  it('no-keyword prompt falls back to puzzle with LEARN escape', async () => {
    const r = await generate({
      prompt: 'something completely unprecedented',
      creatorId: 'creator_test_004',
    });
    expect(r.spec.mechanicKind).toBe('puzzle');
    expect(r.identify.confidence).toBeLessThanOrEqual(0.4);
    expect(r.escape.kind).toBe('LEARN');
  });

  it('neon keyword influences visual style', async () => {
    const r = await generate({
      prompt: 'A neon stack puzzle',
      creatorId: 'creator_test_005',
    });
    expect(r.spec.visualStyle).toBe('neon');
  });

  it('hard difficulty keyword influences difficulty', async () => {
    const r = await generate({
      prompt: 'A hard puzzle game',
      creatorId: 'creator_test_006',
    });
    expect(r.spec.difficulty).toBe('hard');
  });

  it('generate() returns a frozen result', async () => {
    const r = await generate({
      prompt: 'puzzle game',
      creatorId: 'creator_test_007',
    });
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.spec)).toBe(true);
    expect(Object.isFrozen(r.identify)).toBe(true);
    expect(Object.isFrozen(r.escape)).toBe(true);
  });

  it('generate() fires R143 content-moderation + IP-infringement advisories', async () => {
    await generate({
      prompt: 'puzzle game',
      creatorId: 'creator_test_008',
    });
    expect(hasFired('CONJURE_IP_INFRINGEMENT_DETECTION_PLACEHOLDER')).toBe(true);
    expect(hasFired('CONJURE_CONTENT_MODERATION_AI_ASSISTED_NOT_ENFORCED')).toBe(true);
  });
});

describe('Conjure studio integration -- L43 Mirror-Mark on game receipt', () => {
  it('canonical game-receipt payload round-trips through sign+verify', async () => {
    const r = await generate({
      prompt: 'puzzle game',
      creatorId: 'creator_test_receipt_001',
    });
    const corpus = Buffer.from(Array.from({ length: 32 }, (_, i) => i));
    const key = Buffer.from('iik_test_CONJURE_studio_receipt_001', 'utf8');
    const payload = canonicalGameReceiptPayload({
      gameId: r.spec.gameId,
      creatorId: 'creator_test_receipt_001',
      mechanicKind: r.spec.mechanicKind,
      verdict: r.escape.kind,
      generatedAtUnixMs: r.spec.generatedAtUnixMs,
      forgeVersion: '0.1.0',
    });
    const mark = sign(corpus, payload, key);
    expect(verify(mark, corpus, payload, key)).toBe(true);
  });
});

describe('Conjure studio integration -- 5 R143 advisories shipped', () => {
  it('CONJURE_ADVISORIES has exactly 5 entries', () => {
    expect(CONJURE_ADVISORIES.length).toBe(5);
  });

  it('all 5 advisories are findable', () => {
    expect(findAdvisory('CONJURE_REVENUE_SHARE_60_40_NOT_LEGALLY_REVIEWED')).toBeDefined();
    expect(findAdvisory('CONJURE_AGE_GATING_NOT_IMPLEMENTED')).toBeDefined();
    expect(findAdvisory('CONJURE_IP_INFRINGEMENT_DETECTION_PLACEHOLDER')).toBeDefined();
    expect(findAdvisory('CONJURE_AD_REVENUE_INTEGRATION_NOT_LIVE')).toBeDefined();
    expect(findAdvisory('CONJURE_CONTENT_MODERATION_AI_ASSISTED_NOT_ENFORCED')).toBeDefined();
  });
});
