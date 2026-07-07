/**
 * Conjure DRM -- license issue/verify/stale + entitlement tests.
 */

import { describe, expect, it } from 'vitest';

import {
  allEntitlementsSatisfied,
  anyEntitlementImplies,
  ENTITLEMENT_COUNT,
  ENTITLEMENT_VOCAB_VERSION,
  ENTITLEMENTS,
  entitlementImplies,
  isEntitlement,
  normaliseEntitlements,
} from '../../src/lib/drm/entitlement';
import {
  canonicalLicensePayload,
  DRM_ENABLED_ENV_FLAG,
  isDrmEnabled,
  isStale,
  issueLicense,
  LICENSE_SCHEMA_VERSION,
  LICENSE_WIRE_PREFIX,
  LicenseExpired,
  LicenseSignatureMismatch,
  MAX_LICENSE_LIFETIME_MS,
  MalformedLicense,
  stampLicenseWithMirrorMark,
  UnknownLicenseVersion,
  verifyLicense,
} from '../../src/lib/drm/license';
import { CORPUS_SHA_LEN } from '../../src/lib/cohort/mirrormark/mirrormark';

const KEY = Buffer.from('test-license-key', 'utf8');
const NOW = 1_700_000_000_000;

const VALID_CLAIMS = {
  gameId: 'game_x',
  playerId: 'player_x',
  issueDateUnixMs: NOW,
  expiryUnixMs: NOW + 24 * 60 * 60 * 1000,
  entitlements: ['FULL' as const],
};

describe('Conjure DRM -- entitlement closed enum', () => {
  it('ENTITLEMENT_COUNT equals 5', () => {
    expect(ENTITLEMENT_COUNT).toBe(5);
    expect(ENTITLEMENTS).toHaveLength(5);
  });

  it('isEntitlement true for known', () => {
    expect(isEntitlement('FULL')).toBe(true);
    expect(isEntitlement('DEMO')).toBe(true);
  });

  it('isEntitlement false for unknown', () => {
    expect(isEntitlement('BOGUS')).toBe(false);
  });

  it('FULL implies DEMO', () => {
    expect(entitlementImplies('FULL', 'DEMO')).toBe(true);
  });

  it('FULL does NOT imply SEASONAL', () => {
    expect(entitlementImplies('FULL', 'SEASONAL')).toBe(false);
  });

  it('MOD_TOOLS implies FULL and DEMO', () => {
    expect(entitlementImplies('MOD_TOOLS', 'FULL')).toBe(true);
    expect(entitlementImplies('MOD_TOOLS', 'DEMO')).toBe(true);
  });

  it('SEASONAL implies DEMO', () => {
    expect(entitlementImplies('SEASONAL', 'DEMO')).toBe(true);
  });

  it('DEMO does NOT imply FULL', () => {
    expect(entitlementImplies('DEMO', 'FULL')).toBe(false);
  });

  it('reflexive', () => {
    for (const e of ENTITLEMENTS) expect(entitlementImplies(e, e)).toBe(true);
  });

  it('anyEntitlementImplies matches across the bundle', () => {
    expect(anyEntitlementImplies(['DEMO', 'MOD_TOOLS'], 'FULL')).toBe(true);
    expect(anyEntitlementImplies(['DEMO'], 'FULL')).toBe(false);
  });

  it('allEntitlementsSatisfied checks the full required set', () => {
    expect(allEntitlementsSatisfied(['FULL'], ['DEMO'])).toBe(true);
    expect(allEntitlementsSatisfied(['FULL', 'DLC_PACK_X'], ['DLC_PACK_X'])).toBe(true);
    expect(allEntitlementsSatisfied(['DEMO'], ['DLC_PACK_X'])).toBe(false);
  });

  it('normaliseEntitlements dedupes + canonical-orders', () => {
    const out = normaliseEntitlements(['FULL', 'DEMO', 'FULL'] as const);
    expect(out).toHaveLength(2);
    expect(out[0]).toBe('DEMO');
    expect(out[1]).toBe('FULL');
  });

  it('ENTITLEMENT_VOCAB_VERSION is pinned', () => {
    expect(ENTITLEMENT_VOCAB_VERSION).toBe('conjure.entitlement.v1');
  });
});

describe('Conjure DRM -- issue + verify license', () => {
  it('issueLicense issues a frozen bundle', () => {
    const lic = issueLicense(VALID_CLAIMS, KEY);
    expect(Object.isFrozen(lic)).toBe(true);
    expect(lic.schemaVersion).toBe(LICENSE_SCHEMA_VERSION);
  });

  it('issueLicense rejects empty gameId', () => {
    expect(() => issueLicense({ ...VALID_CLAIMS, gameId: '' }, KEY)).toThrow(
      MalformedLicense,
    );
  });

  it('issueLicense rejects empty playerId', () => {
    expect(() =>
      issueLicense({ ...VALID_CLAIMS, playerId: '' }, KEY),
    ).toThrow(MalformedLicense);
  });

  it('issueLicense rejects empty entitlements', () => {
    expect(() =>
      issueLicense({ ...VALID_CLAIMS, entitlements: [] }, KEY),
    ).toThrow(MalformedLicense);
  });

  it('issueLicense rejects unknown entitlement', () => {
    expect(() =>
      issueLicense(
        {
          ...VALID_CLAIMS,
          entitlements: ['BOGUS' as 'FULL'],
        },
        KEY,
      ),
    ).toThrow(MalformedLicense);
  });

  it('issueLicense rejects expiry <= issued', () => {
    expect(() =>
      issueLicense({ ...VALID_CLAIMS, expiryUnixMs: NOW - 1 }, KEY),
    ).toThrow(MalformedLicense);
  });

  it('issueLicense rejects lifetime > MAX', () => {
    expect(() =>
      issueLicense(
        { ...VALID_CLAIMS, expiryUnixMs: NOW + MAX_LICENSE_LIFETIME_MS + 1 },
        KEY,
      ),
    ).toThrow(MalformedLicense);
  });

  it('verifyLicense round-trips a valid bundle', () => {
    const lic = issueLicense(VALID_CLAIMS, KEY);
    expect(verifyLicense(lic, KEY, NOW + 1000)).toBe(true);
  });

  it('verifyLicense throws UnknownLicenseVersion on bad schema', () => {
    const lic = issueLicense(VALID_CLAIMS, KEY);
    const tampered = { ...lic, schemaVersion: 'conjure.license.bogus' };
    expect(() => verifyLicense(tampered, KEY, NOW + 1000)).toThrow(
      UnknownLicenseVersion,
    );
  });

  it('verifyLicense throws LicenseExpired past expiry', () => {
    const lic = issueLicense(VALID_CLAIMS, KEY);
    expect(() => verifyLicense(lic, KEY, NOW + 48 * 60 * 60 * 1000)).toThrow(
      LicenseExpired,
    );
  });

  it('verifyLicense throws LicenseSignatureMismatch under different key', () => {
    const lic = issueLicense(VALID_CLAIMS, KEY);
    const otherKey = Buffer.from('other-key', 'utf8');
    expect(() => verifyLicense(lic, otherKey, NOW + 1000)).toThrow(
      LicenseSignatureMismatch,
    );
  });

  it('verifyLicense throws on tampered entitlements', () => {
    const lic = issueLicense(VALID_CLAIMS, KEY);
    const tampered = { ...lic, entitlements: Object.freeze(['MOD_TOOLS'] as const) };
    expect(() => verifyLicense(tampered, KEY, NOW + 1000)).toThrow(
      LicenseSignatureMismatch,
    );
  });
});

describe('Conjure DRM -- canonical payload', () => {
  it('canonical payload is deterministic for same claims (ordering-stable)', () => {
    const claimsA = { ...VALID_CLAIMS, entitlements: ['DEMO', 'FULL'] as const };
    const claimsB = { ...VALID_CLAIMS, entitlements: ['FULL', 'DEMO'] as const };
    expect(
      canonicalLicensePayload(claimsA).equals(canonicalLicensePayload(claimsB)),
    ).toBe(true);
  });

  it('canonical payload differs if gameId differs', () => {
    const a = canonicalLicensePayload(VALID_CLAIMS);
    const b = canonicalLicensePayload({ ...VALID_CLAIMS, gameId: 'game_other' });
    expect(a.equals(b)).toBe(false);
  });
});

describe('Conjure DRM -- isStale', () => {
  it('returns fresh for valid license', () => {
    const lic = issueLicense(VALID_CLAIMS, KEY);
    expect(isStale(lic, NOW + 1000).reason).toBe('fresh');
  });

  it('returns expired past expiry', () => {
    const lic = issueLicense(VALID_CLAIMS, KEY);
    const stale = isStale(lic, NOW + 48 * 60 * 60 * 1000);
    expect(stale.stale).toBe(true);
    expect(stale.reason).toBe('expired');
  });

  it('returns vocab_drift if vocab version mismatches', () => {
    const lic = issueLicense(VALID_CLAIMS, KEY);
    const future = { ...lic, entitlementVocabVersion: 'conjure.entitlement.v0' };
    const stale = isStale(future, NOW + 1000);
    expect(stale.reason).toBe('vocab_drift');
  });
});

describe('Conjure DRM -- isDrmEnabled', () => {
  it('default is OFF', () => {
    expect(isDrmEnabled({} as NodeJS.ProcessEnv)).toBe(false);
  });

  it('"1" is ON', () => {
    expect(isDrmEnabled({ [DRM_ENABLED_ENV_FLAG]: '1' } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it('"true" is ON', () => {
    expect(isDrmEnabled({ [DRM_ENABLED_ENV_FLAG]: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it('"0" is OFF', () => {
    expect(isDrmEnabled({ [DRM_ENABLED_ENV_FLAG]: '0' } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('"false" is OFF', () => {
    expect(isDrmEnabled({ [DRM_ENABLED_ENV_FLAG]: 'false' } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('arbitrary string is OFF', () => {
    expect(isDrmEnabled({ [DRM_ENABLED_ENV_FLAG]: 'yes-please' } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('LICENSE_WIRE_PREFIX pin', () => {
    expect(LICENSE_WIRE_PREFIX).toBe('license@v1:');
  });
});

describe('Conjure DRM -- Mirror-Mark companion', () => {
  it('stampLicenseWithMirrorMark emits a lore@v1: prefix mark', () => {
    const lic = issueLicense(VALID_CLAIMS, KEY);
    const corpus = Buffer.alloc(CORPUS_SHA_LEN, 0xcd);
    const mark = stampLicenseWithMirrorMark(lic, corpus, KEY);
    expect(mark.startsWith('lore@v1:')).toBe(true);
  });
});
