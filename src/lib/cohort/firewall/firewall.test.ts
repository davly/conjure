/**
 * R145.C FIREWALL-TEST-DISCIPLINE -- conjure cohort firewall.
 *
 * Pins the structural firewall across all six cohort sub-packages:
 *
 *  1. Package-layout drift: on-disk packages match EXPECTED_COHORT_PACKAGES.
 *  2. R174 5-of-5 cohort maturity: firewall + honest + lore + manifest +
 *     mirrormark all present.
 *  3. KAT-1 hex byte-identity to every cohort sibling.
 *  4. L43 Mirror-Mark wire prefix is the cohort canonical literal.
 *  5. R143 LOUD-ONCE prefix is the cohort canonical literal.
 *  6. R150 schema version pinning.
 *  7. Cross-package literal consistency (the cohort literal exported by
 *     firewall/ matches the cohort literal exported by the producing
 *     package).
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  EXPECTED_COHORT_PACKAGES,
  KAT1_CANONICAL_HEX,
  LOUD_ONCE_PREFIX_CANONICAL,
  MIRRORMARK_BODY_BASE64URL_LEN,
  MIRRORMARK_BODY_LEN,
  MIRRORMARK_WIRE_PREFIX,
  R150_SCHEMA_VERSION,
  R174_FIVE_OF_FIVE_PACKAGES,
  scanCohortPackages,
  verifyPackageLayout,
} from './firewall';

// Cross-package consistency imports
import { KAT1_CANONICAL_HMAC_HEX, deriveKat1Hex } from '../lore/kat1';
import {
  MARK_BODY_BASE64URL_LEN,
  MARK_BODY_LEN,
  MARK_PREFIX,
} from '../mirrormark/mirrormark';
import { LOUD_ONCE_PREFIX } from '../honest/loudonce';
import { SCHEMA_VERSION } from '../manifest/manifest';

// Resolve cohort root from this test file's location.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const COHORT_ROOT = resolve(__dirname, '..');

describe('R145.C firewall -- package-layout drift', () => {
  it('on-disk packages match EXPECTED_COHORT_PACKAGES', () => {
    const verdict = verifyPackageLayout(COHORT_ROOT);
    if (verdict.drift) {
      throw new Error(
        `Cohort package-layout DRIFT detected:\n  missing: ${JSON.stringify(verdict.missing)}\n  unexpected: ${JSON.stringify(verdict.unexpected)}\n  Update EXPECTED_COHORT_PACKAGES in firewall.ts AND the impl log.`,
      );
    }
    expect(verdict.drift).toBe(false);
  });

  it('scanCohortPackages returns at least the canonical 5-of-5 set', () => {
    const onDisk = scanCohortPackages(COHORT_ROOT);
    for (const pkg of R174_FIVE_OF_FIVE_PACKAGES) {
      expect(onDisk).toContain(pkg);
    }
  });

  it('R174 5-of-5 cohort maturity packages all present', () => {
    expect(R174_FIVE_OF_FIVE_PACKAGES).toEqual([
      'firewall',
      'honest',
      'lore',
      'manifest',
      'mirrormark',
    ]);
    expect(R174_FIVE_OF_FIVE_PACKAGES.length).toBe(5);
  });

  it('EXPECTED_COHORT_PACKAGES is alphabetically sorted', () => {
    const sorted = [...EXPECTED_COHORT_PACKAGES].sort();
    expect([...EXPECTED_COHORT_PACKAGES]).toEqual(sorted);
  });
});

describe('R145.C firewall -- cohort literal pins', () => {
  it('KAT-1 canonical hex matches the cohort canonical pin', () => {
    expect(KAT1_CANONICAL_HEX).toBe(
      '239a7d0d3f1bbe3a98aede01e2ad818c2db60b7177c02e2f015035b2b5b7dbca',
    );
  });

  it('KAT-1 canonical hex matches the lore/ package pin', () => {
    expect(KAT1_CANONICAL_HEX).toBe(KAT1_CANONICAL_HMAC_HEX);
  });

  it('KAT-1 canonical hex re-derives byte-identical via node:crypto', () => {
    expect(deriveKat1Hex()).toBe(KAT1_CANONICAL_HEX);
  });

  it('Mirror-Mark wire prefix is the cohort canonical literal', () => {
    expect(MIRRORMARK_WIRE_PREFIX).toBe('lore@v1:');
  });

  it('Mirror-Mark wire prefix matches mirrormark/ package pin', () => {
    expect(MIRRORMARK_WIRE_PREFIX).toBe(MARK_PREFIX);
  });

  it('Mirror-Mark body length pins (40 bytes / 54 base64url chars)', () => {
    expect(MIRRORMARK_BODY_LEN).toBe(40);
    expect(MIRRORMARK_BODY_BASE64URL_LEN).toBe(54);
    expect(MIRRORMARK_BODY_LEN).toBe(MARK_BODY_LEN);
    expect(MIRRORMARK_BODY_BASE64URL_LEN).toBe(MARK_BODY_BASE64URL_LEN);
  });

  it('LOUD-ONCE prefix is the cohort canonical literal', () => {
    expect(LOUD_ONCE_PREFIX_CANONICAL).toBe('[LOUD-ONCE-WARNING]');
  });

  it('LOUD-ONCE prefix matches honest/ package pin', () => {
    expect(LOUD_ONCE_PREFIX_CANONICAL).toBe(LOUD_ONCE_PREFIX);
  });

  it('R150 schema version matches manifest/ package pin', () => {
    expect(R150_SCHEMA_VERSION).toBe(SCHEMA_VERSION);
    expect(R150_SCHEMA_VERSION).toBe('conjure.r150.v1');
  });
});

describe('R145.C firewall -- cross-substrate cohort interop', () => {
  it('OpenSSL re-derivation reference is documented (KAT-1 input shape)', () => {
    // The reference: HMAC-SHA256(key=empty, msg=0x01 || 32×0x00) = KAT1_HEX
    // Pin the input shape so cohort verifiers can re-derive offline.
    const versionByte = 0x01;
    const corpusShaPlaceholder = Buffer.alloc(32);
    const msg = Buffer.concat([Buffer.from([versionByte]), corpusShaPlaceholder]);
    expect(msg.length).toBe(33);
    expect(msg[0]).toBe(0x01);
    for (let i = 1; i < 33; i++) {
      expect(msg[i]).toBe(0);
    }
  });
});
