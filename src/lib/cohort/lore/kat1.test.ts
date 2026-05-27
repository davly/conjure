/**
 * R151 KAT-1 cohort anchor test. Byte-identical re-derivation against the
 * cohort canonical hex via `node:crypto`.
 *
 * Also pins the canonical input length + corpus SHA length constants.
 */

import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  CORPUS_SHA_LEN,
  DIGEST_LEN,
  KAT1_CANONICAL_HMAC_HEX,
  KAT1_CANONICAL_INPUT_LEN,
  deriveKat1Hex,
  resolveCorpusFromEnv,
  verifyKat1,
} from './kat1';

describe('R151 KAT-1 cohort anchor', () => {
  it('canonical hex literal matches the cohort canonical pin', () => {
    expect(KAT1_CANONICAL_HMAC_HEX).toBe(
      '239a7d0d3f1bbe3a98aede01e2ad818c2db60b7177c02e2f015035b2b5b7dbca',
    );
  });

  it('deriveKat1Hex re-derives byte-identical hex via node:crypto', () => {
    expect(deriveKat1Hex()).toBe(KAT1_CANONICAL_HMAC_HEX);
  });

  it('verifyKat1 returns true', () => {
    expect(verifyKat1()).toBe(true);
  });

  it('cohort canonical lengths pin 33 / 32 / 32', () => {
    expect(KAT1_CANONICAL_INPUT_LEN).toBe(33);
    expect(DIGEST_LEN).toBe(32);
    expect(CORPUS_SHA_LEN).toBe(32);
  });

  it('redrive from scratch matches via independent HMAC call', () => {
    const msg = Buffer.concat([Buffer.from([0x01]), Buffer.alloc(32)]);
    const expected = createHmac('sha256', Buffer.alloc(0)).update(msg).digest('hex');
    expect(expected).toBe(KAT1_CANONICAL_HMAC_HEX);
  });

  it('resolveCorpusFromEnv with empty env returns placeholder', () => {
    const r = resolveCorpusFromEnv({});
    expect(r.usingPlaceholder).toBe(true);
    expect(r.corpusSha.length).toBe(CORPUS_SHA_LEN);
    expect(r.corpusSha.equals(Buffer.alloc(CORPUS_SHA_LEN))).toBe(true);
  });

  it('resolveCorpusFromEnv with unreadable path returns placeholder', () => {
    const r = resolveCorpusFromEnv({
      CONJURE_LORE_CORPUS_SHA_PATH: '/nonexistent/path/to/corpus.bin',
    });
    expect(r.usingPlaceholder).toBe(true);
    expect(r.corpusSha.length).toBe(CORPUS_SHA_LEN);
  });
});
