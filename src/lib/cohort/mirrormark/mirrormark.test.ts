/**
 * L43 Mirror-Mark v1 cohort-parity + tampering + LOUD-ONCE battery for
 * Conjure.
 *
 * Pins:
 *
 * 1. Wire-form constants identical to every cohort sibling.
 * 2. KAT-1 cohort-shared hex offline re-derivation matches.
 * 3. Round-trip sign + verify.
 * 4. Four sentinel-shaped tampering errors.
 * 5. LOUD-ONCE-WARN fires exactly once per process on placeholders.
 * 6. Canonical-payload determinism + field-bump diff.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';

import {
  CORPUS_SHA_LEN,
  CorpusMismatch,
  DEV_KEY_PLACEHOLDER,
  DIGEST_LEN,
  MARK_BODY_BASE64URL_LEN,
  MARK_BODY_LEN,
  MARK_CORPUS_PREFIX_LEN,
  MARK_PREFIX,
  MARK_VERSION,
  MalformedMark,
  MirrorMarker,
  SignatureMismatch,
  UnknownMarkVersion,
  canonicalGameReceiptPayload,
  canonicalListingReceiptPayload,
  sign,
  verify,
} from './mirrormark';

const KAT1_CANONICAL_HMAC_HEX =
  '239a7d0d3f1bbe3a98aede01e2ad818c2db60b7177c02e2f015035b2b5b7dbca';

describe('L43 Mirror-Mark v1 -- constants pinned to cohort shape', () => {
  it('MARK_VERSION = 0x01', () => expect(MARK_VERSION).toBe(0x01));
  it('MARK_PREFIX = lore@v1:', () => expect(MARK_PREFIX).toBe('lore@v1:'));
  it('MARK_CORPUS_PREFIX_LEN = 8', () => expect(MARK_CORPUS_PREFIX_LEN).toBe(8));
  it('DIGEST_LEN = 32', () => expect(DIGEST_LEN).toBe(32));
  it('CORPUS_SHA_LEN = 32', () => expect(CORPUS_SHA_LEN).toBe(32));
  it('MARK_BODY_LEN = 40', () => expect(MARK_BODY_LEN).toBe(40));
  it('MARK_BODY_BASE64URL_LEN = 54', () => expect(MARK_BODY_BASE64URL_LEN).toBe(54));
  it('DEV_KEY_PLACEHOLDER matches', () =>
    expect(DEV_KEY_PLACEHOLDER).toBe('iik_dev_CONJURE_NOT_FOR_PRODUCTION'));
});

describe('L43 Mirror-Mark v1 -- KAT-1 cohort canonical hex', () => {
  it('offline re-derive matches cohort canonical hex', () => {
    const msg = Buffer.concat([Buffer.from([MARK_VERSION]), Buffer.alloc(32)]);
    const got = createHmac('sha256', Buffer.alloc(0)).update(msg).digest('hex');
    expect(got).toBe(KAT1_CANONICAL_HMAC_HEX);
  });

  it('sign() with cohort canonical inputs produces cohort canonical mark', () => {
    const mark = sign(Buffer.alloc(32), Buffer.alloc(0), Buffer.alloc(0));
    // Body is 8 corpus prefix bytes (all zero) + 32 digest bytes -> 40 bytes
    // -> 54 base64url chars (no padding).
    expect(mark.startsWith(MARK_PREFIX)).toBe(true);
    const encoded = mark.slice(MARK_PREFIX.length);
    expect(encoded.length).toBe(MARK_BODY_BASE64URL_LEN);
    const body = Buffer.from(encoded, 'base64url');
    expect(body.length).toBe(MARK_BODY_LEN);
    expect(body.subarray(MARK_CORPUS_PREFIX_LEN).toString('hex')).toBe(
      KAT1_CANONICAL_HMAC_HEX,
    );
  });

  it('sign() base64url body length is exactly 54 chars', () => {
    const corpus = Buffer.from(Array.from({ length: 32 }, (_, i) => i));
    const payload = Buffer.from('test payload', 'utf8');
    const key = Buffer.from('iik_test_CONJURE_001', 'utf8');
    const mark = sign(corpus, payload, key);
    const encoded = mark.slice(MARK_PREFIX.length);
    expect(encoded.length).toBe(MARK_BODY_BASE64URL_LEN);
  });
});

describe('L43 Mirror-Mark v1 -- round trip', () => {
  it('sign then verify round-trip succeeds', () => {
    const corpus = Buffer.from(Array.from({ length: 32 }, (_, i) => i));
    const payload = Buffer.from('the quick brown fox', 'utf8');
    const key = Buffer.from('iik_test_CONJURE_roundtrip_001', 'utf8');
    const mark = sign(corpus, payload, key);
    expect(mark.startsWith(MARK_PREFIX)).toBe(true);
    expect(verify(mark, corpus, payload, key)).toBe(true);
  });

  it('MirrorMarker.sign matches module-level sign', () => {
    const corpus = Buffer.from(Array.from({ length: 32 }, (_, i) => i + 1));
    const payload = Buffer.from('verdict canonical', 'utf8');
    const key = Buffer.from('iik_test_CONJURE_marker_002', 'utf8');
    const marker = new MirrorMarker({ corpusSha: corpus, key });
    expect(marker.sign(payload)).toBe(sign(corpus, payload, key));
  });

  it('signing is deterministic', () => {
    const corpus = Buffer.alloc(32);
    const key = Buffer.from('iik_test_CONJURE_determinism', 'utf8');
    const payload = Buffer.from('some payload', 'utf8');
    expect(sign(corpus, payload, key)).toBe(sign(corpus, payload, key));
  });
});

describe('L43 Mirror-Mark v1 -- four sentinel tampering errors', () => {
  it('verify rejects unknown prefix (UnknownMarkVersion)', () => {
    expect(() =>
      verify('lore@v2:AAAA', Buffer.alloc(32), Buffer.alloc(0), Buffer.alloc(0)),
    ).toThrow(UnknownMarkVersion);
  });

  it('verify rejects wrong body length (MalformedMark)', () => {
    expect(() =>
      verify('lore@v1:AAAA', Buffer.alloc(32), Buffer.alloc(0), Buffer.alloc(0)),
    ).toThrow(MalformedMark);
  });

  it('verify rejects corpus mismatch (CorpusMismatch)', () => {
    const signCorpus = Buffer.alloc(32);
    const verifyCorpus = Buffer.concat([Buffer.from([0xff]), Buffer.alloc(31)]);
    const key = Buffer.from('iik_test_CONJURE_corpus_drift', 'utf8');
    const mark = sign(signCorpus, Buffer.from('x', 'utf8'), key);
    expect(() =>
      verify(mark, verifyCorpus, Buffer.from('x', 'utf8'), key),
    ).toThrow(CorpusMismatch);
  });

  it('verify rejects payload tamper (SignatureMismatch)', () => {
    const corpus = Buffer.alloc(32);
    const key = Buffer.from('iik_test_CONJURE_payload_tamper', 'utf8');
    const mark = sign(corpus, Buffer.from('original', 'utf8'), key);
    expect(() =>
      verify(mark, corpus, Buffer.from('tampered', 'utf8'), key),
    ).toThrow(SignatureMismatch);
  });

  it('verify rejects key tamper (SignatureMismatch)', () => {
    const corpus = Buffer.alloc(32);
    const mark = sign(
      corpus,
      Buffer.from('payload', 'utf8'),
      Buffer.from('iik_test_CONJURE_one', 'utf8'),
    );
    expect(() =>
      verify(
        mark,
        corpus,
        Buffer.from('payload', 'utf8'),
        Buffer.from('iik_test_CONJURE_two', 'utf8'),
      ),
    ).toThrow(SignatureMismatch);
  });

  it('MirrorMarker constructor rejects wrong corpus length', () => {
    expect(
      () =>
        new MirrorMarker({
          corpusSha: Buffer.alloc(31),
          key: Buffer.alloc(0),
        }),
    ).toThrow();
  });
});

describe('L43 Mirror-Mark v1 -- LOUD-ONCE-WARN gate', () => {
  beforeEach(() => {
    MirrorMarker._resetWarnedOnceForTests();
  });

  it('fromEnv with empty env returns placeholder posture', () => {
    const marker = MirrorMarker.fromEnv({});
    expect(marker.usingPlaceholderCorpus).toBe(true);
    expect(marker.usingPlaceholderKey).toBe(true);
    expect(marker.key.toString('utf8')).toBe(DEV_KEY_PLACEHOLDER);
  });

  it('LOUD-ONCE fires exactly once on placeholders across multiple signs', () => {
    const sink: string[] = [];
    const marker = new MirrorMarker({
      corpusSha: Buffer.alloc(32),
      key: Buffer.from(DEV_KEY_PLACEHOLDER, 'utf8'),
      usingPlaceholderCorpus: true,
      usingPlaceholderKey: true,
    });
    marker.sign(Buffer.from('first', 'utf8'), (m) => sink.push(m));
    marker.sign(Buffer.from('second', 'utf8'), (m) => sink.push(m));
    marker.sign(Buffer.from('third', 'utf8'), (m) => sink.push(m));
    const warnings = sink.filter((m) => m.toLowerCase().includes('placeholder'));
    expect(warnings.length).toBe(1);
  });

  it('LOUD-ONCE prefix is the cohort canonical literal', () => {
    const sink: string[] = [];
    const marker = new MirrorMarker({
      corpusSha: Buffer.alloc(32),
      key: Buffer.from(DEV_KEY_PLACEHOLDER, 'utf8'),
      usingPlaceholderCorpus: true,
      usingPlaceholderKey: true,
    });
    marker.sign(Buffer.from('x', 'utf8'), (m) => sink.push(m));
    expect(sink[0].startsWith('[LOUD-ONCE-WARNING]')).toBe(true);
  });

  it('no LOUD-ONCE WARN when corpus + key are real', () => {
    const sink: string[] = [];
    const marker = new MirrorMarker({
      corpusSha: Buffer.from(Array.from({ length: 32 }, (_, i) => i)),
      key: Buffer.from('iik_prod_CONJURE_real', 'utf8'),
      usingPlaceholderCorpus: false,
      usingPlaceholderKey: false,
    });
    marker.sign(Buffer.from('prod', 'utf8'), (m) => sink.push(m));
    const warnings = sink.filter((m) => m.toLowerCase().includes('placeholder'));
    expect(warnings.length).toBe(0);
  });
});

describe('L43 Mirror-Mark v1 -- canonical payload helpers', () => {
  it('canonicalGameReceiptPayload is deterministic', () => {
    const base = {
      gameId: 'game_001',
      creatorId: 'creator_alice',
      mechanicKind: 'puzzle',
      verdict: 'ROUTINE',
      generatedAtUnixMs: 1716777000000,
      forgeVersion: '0.1.0',
    };
    const a = canonicalGameReceiptPayload(base);
    const b = canonicalGameReceiptPayload(base);
    expect(a.equals(b)).toBe(true);
    // 6 fields, 5 NULs.
    let nulCount = 0;
    for (const byte of a) if (byte === 0) nulCount++;
    expect(nulCount).toBe(5);
  });

  it('canonicalGameReceiptPayload changes on every field bump', () => {
    const baseOpts = {
      gameId: 'game_001',
      creatorId: 'creator_alice',
      mechanicKind: 'puzzle',
      verdict: 'ROUTINE',
      generatedAtUnixMs: 1716777000000,
      forgeVersion: '0.1.0',
    };
    const base = canonicalGameReceiptPayload(baseOpts);
    for (const k of Object.keys(baseOpts) as Array<keyof typeof baseOpts>) {
      const bumped: any = { ...baseOpts };
      if (typeof bumped[k] === 'number') bumped[k] = bumped[k] + 1;
      else bumped[k] = String(bumped[k]) + '_X';
      const next = canonicalGameReceiptPayload(bumped);
      expect(base.equals(next)).toBe(false);
    }
  });

  it('canonicalListingReceiptPayload is deterministic', () => {
    const opts = {
      gameId: 'game_001',
      title: 'Stacker',
      category: 'puzzle',
      pricePence: 49,
      publishedAtUnixMs: 1716777000000,
    };
    const a = canonicalListingReceiptPayload(opts);
    const b = canonicalListingReceiptPayload(opts);
    expect(a.equals(b)).toBe(true);
  });

  it('canonical payload round-trips through sign + verify', () => {
    const corpus = Buffer.from(Array.from({ length: 32 }, (_, i) => i));
    const key = Buffer.from('iik_test_CONJURE_payload_rt', 'utf8');
    const payload = canonicalGameReceiptPayload({
      gameId: 'game_002',
      creatorId: 'creator_bob',
      mechanicKind: 'arcade',
      verdict: 'INVESTIGATE',
      generatedAtUnixMs: 1716777000001,
      forgeVersion: '0.1.0',
    });
    const mark = sign(corpus, payload, key);
    expect(verify(mark, corpus, payload, key)).toBe(true);
  });
});
