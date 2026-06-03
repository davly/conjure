/**
 * Conjure DRM -- session token tests.
 */

import { describe, expect, it } from 'vitest';

import { issueLicense } from '../../src/lib/drm/license';
import {
  canonicalDrmSessionPayload,
  DEFAULT_REFRESH_STALE_WINDOW_MS,
  DEV_DRM_SESSION_KEY_PLACEHOLDER,
  DRM_SESSION_KEY_ENV_FLAG,
  DRM_SESSION_TTL_MS,
  DRM_SESSION_WIRE_PREFIX,
  DrmSessionExpired,
  DrmSessionSignatureMismatch,
  issueDrmSession,
  MalformedDrmSession,
  MAX_DRM_SESSION_TTL_MS,
  refreshDrmSession,
  resolveDrmSessionKey,
  UnknownDrmSessionVersion,
  verifyDrmSession,
} from '../../src/lib/drm/session';

const LICENSE_KEY = Buffer.from('test-license-key', 'utf8');
const SESSION_KEY = Buffer.from('test-session-key', 'utf8');
const NOW = 1_700_000_000_000;

function makeLicense(playerId = 'player_x', gameId = 'game_x') {
  return issueLicense(
    {
      gameId,
      playerId,
      issueDateUnixMs: NOW,
      expiryUnixMs: NOW + 24 * 60 * 60 * 1000,
      entitlements: ['FULL'],
    },
    LICENSE_KEY,
  );
}

describe('Conjure DRM session -- cohort firewall pins', () => {
  it('DRM_SESSION_WIRE_PREFIX equals "drmsession@v1:"', () => {
    expect(DRM_SESSION_WIRE_PREFIX).toBe('drmsession@v1:');
  });

  it('DRM_SESSION_TTL_MS equals 5 minutes', () => {
    expect(DRM_SESSION_TTL_MS).toBe(5 * 60 * 1000);
  });

  it('MAX_DRM_SESSION_TTL_MS equals 15 minutes', () => {
    expect(MAX_DRM_SESSION_TTL_MS).toBe(15 * 60 * 1000);
  });

  it('DRM_SESSION_KEY_ENV_FLAG equals "CONJURE_DRM_SESSION_KEY"', () => {
    expect(DRM_SESSION_KEY_ENV_FLAG).toBe('CONJURE_DRM_SESSION_KEY');
  });

  it('DEV_DRM_SESSION_KEY_PLACEHOLDER carries grep-loud prefix', () => {
    expect(DEV_DRM_SESSION_KEY_PLACEHOLDER.startsWith('iik_dev_CONJURE_DRM_SESSION_')).toBe(true);
  });

  it('DEFAULT_REFRESH_STALE_WINDOW_MS equals 60s', () => {
    expect(DEFAULT_REFRESH_STALE_WINDOW_MS).toBe(60 * 1000);
  });
});

describe('Conjure DRM session -- resolveDrmSessionKey', () => {
  it('returns placeholder when env unset', () => {
    const k = resolveDrmSessionKey({} as NodeJS.ProcessEnv);
    expect(k.toString('utf8')).toBe(DEV_DRM_SESSION_KEY_PLACEHOLDER);
  });

  it('returns override when env set', () => {
    const k = resolveDrmSessionKey({
      [DRM_SESSION_KEY_ENV_FLAG]: 'real-key',
    } as unknown as NodeJS.ProcessEnv);
    expect(k.toString('utf8')).toBe('real-key');
  });
});

describe('Conjure DRM session -- issue + verify', () => {
  it('issueDrmSession returns a prefixed token', () => {
    const lic = makeLicense();
    const t = issueDrmSession(
      { license: lic, playerId: 'player_x', nowUnixMs: NOW },
      LICENSE_KEY,
      SESSION_KEY,
    );
    expect(t.startsWith(DRM_SESSION_WIRE_PREFIX)).toBe(true);
  });

  it('issueDrmSession rejects mismatched playerId', () => {
    const lic = makeLicense('player_x');
    expect(() =>
      issueDrmSession(
        { license: lic, playerId: 'player_y', nowUnixMs: NOW },
        LICENSE_KEY,
        SESSION_KEY,
      ),
    ).toThrow(MalformedDrmSession);
  });

  it('issueDrmSession rejects ttl > MAX', () => {
    const lic = makeLicense();
    expect(() =>
      issueDrmSession(
        {
          license: lic,
          playerId: 'player_x',
          nowUnixMs: NOW,
          windowEndUnixMs: NOW + MAX_DRM_SESSION_TTL_MS + 1,
        },
        LICENSE_KEY,
        SESSION_KEY,
      ),
    ).toThrow(MalformedDrmSession);
  });

  it('issueDrmSession rejects empty playerId', () => {
    const lic = makeLicense();
    expect(() =>
      issueDrmSession(
        { license: lic, playerId: '', nowUnixMs: NOW },
        LICENSE_KEY,
        SESSION_KEY,
      ),
    ).toThrow(MalformedDrmSession);
  });

  it('verifyDrmSession round-trips', () => {
    const lic = makeLicense();
    const t = issueDrmSession(
      { license: lic, playerId: 'player_x', nowUnixMs: NOW },
      LICENSE_KEY,
      SESSION_KEY,
    );
    const session = verifyDrmSession(t, SESSION_KEY, NOW + 60_000);
    expect(session.playerId).toBe('player_x');
    expect(session.gameId).toBe('game_x');
    expect(session.licenseSignature).toBe(lic.signature);
  });

  it('verifyDrmSession throws UnknownDrmSessionVersion on bad prefix', () => {
    expect(() => verifyDrmSession('bogus', SESSION_KEY, NOW)).toThrow(
      UnknownDrmSessionVersion,
    );
  });

  it('verifyDrmSession throws MalformedDrmSession on missing dot', () => {
    expect(() =>
      verifyDrmSession(DRM_SESSION_WIRE_PREFIX + 'no-dot', SESSION_KEY, NOW),
    ).toThrow(MalformedDrmSession);
  });

  it('verifyDrmSession throws DrmSessionSignatureMismatch under different key', () => {
    const lic = makeLicense();
    const t = issueDrmSession(
      { license: lic, playerId: 'player_x', nowUnixMs: NOW },
      LICENSE_KEY,
      SESSION_KEY,
    );
    const otherKey = Buffer.from('other-key', 'utf8');
    expect(() => verifyDrmSession(t, otherKey, NOW + 60_000)).toThrow(
      DrmSessionSignatureMismatch,
    );
  });

  it('verifyDrmSession throws DrmSessionExpired past window end', () => {
    const lic = makeLicense();
    const t = issueDrmSession(
      { license: lic, playerId: 'player_x', nowUnixMs: NOW },
      LICENSE_KEY,
      SESSION_KEY,
    );
    const farFuture = NOW + DRM_SESSION_TTL_MS + 1;
    expect(() => verifyDrmSession(t, SESSION_KEY, farFuture)).toThrow(
      DrmSessionExpired,
    );
  });
});

describe('Conjure DRM session -- canonical payload', () => {
  it('payload uses key=value with NUL separator', () => {
    const buf = canonicalDrmSessionPayload({
      licenseSignature: 'sigxx',
      playerId: 'p',
      gameId: 'g',
      windowStartUnixMs: 1,
      windowEndUnixMs: 2,
    });
    const text = buf.toString('utf8');
    expect(text).toContain('\x00');
    expect(text).toContain('license_signature=sigxx');
    expect(text).toContain('player_id=p');
    expect(text).toContain('game_id=g');
  });

  it('payload is deterministic for same inputs', () => {
    const a = canonicalDrmSessionPayload({
      licenseSignature: 's',
      playerId: 'p',
      gameId: 'g',
      windowStartUnixMs: 1,
      windowEndUnixMs: 2,
    });
    const b = canonicalDrmSessionPayload({
      licenseSignature: 's',
      playerId: 'p',
      gameId: 'g',
      windowStartUnixMs: 1,
      windowEndUnixMs: 2,
    });
    expect(a.equals(b)).toBe(true);
  });
});

describe('Conjure DRM session -- refresh', () => {
  it('refresh mints a fresh window from a valid prior token', () => {
    const lic = makeLicense();
    const t1 = issueDrmSession(
      { license: lic, playerId: 'player_x', nowUnixMs: NOW },
      LICENSE_KEY,
      SESSION_KEY,
    );
    const t2 = refreshDrmSession(
      { priorToken: t1, license: lic, nowUnixMs: NOW + 60_000 },
      LICENSE_KEY,
      SESSION_KEY,
    );
    expect(t2).not.toBe(t1);
    expect(t2.startsWith(DRM_SESSION_WIRE_PREFIX)).toBe(true);
  });

  it('refresh succeeds within staleWindow past expiry', () => {
    const lic = makeLicense();
    const t1 = issueDrmSession(
      { license: lic, playerId: 'player_x', nowUnixMs: NOW },
      LICENSE_KEY,
      SESSION_KEY,
    );
    // Window ends at NOW + 5min; refresh 10 seconds past end (within 60s stale window).
    const t2 = refreshDrmSession(
      {
        priorToken: t1,
        license: lic,
        nowUnixMs: NOW + DRM_SESSION_TTL_MS + 10_000,
      },
      LICENSE_KEY,
      SESSION_KEY,
    );
    expect(t2).not.toBe(t1);
  });

  it('refresh fails past staleWindow', () => {
    const lic = makeLicense();
    const t1 = issueDrmSession(
      { license: lic, playerId: 'player_x', nowUnixMs: NOW },
      LICENSE_KEY,
      SESSION_KEY,
    );
    expect(() =>
      refreshDrmSession(
        {
          priorToken: t1,
          license: lic,
          nowUnixMs: NOW + DRM_SESSION_TTL_MS + 120_000,
        },
        LICENSE_KEY,
        SESSION_KEY,
      ),
    ).toThrow(DrmSessionExpired);
  });

  it('refresh fails if license-signature does not match', () => {
    const lic1 = makeLicense('player_x', 'game_x');
    const lic2 = issueLicense(
      {
        gameId: 'game_y',
        playerId: 'player_x',
        issueDateUnixMs: NOW,
        expiryUnixMs: NOW + 24 * 60 * 60 * 1000,
        entitlements: ['FULL'],
      },
      LICENSE_KEY,
    );
    const t1 = issueDrmSession(
      { license: lic1, playerId: 'player_x', nowUnixMs: NOW },
      LICENSE_KEY,
      SESSION_KEY,
    );
    expect(() =>
      refreshDrmSession(
        { priorToken: t1, license: lic2, nowUnixMs: NOW + 60_000 },
        LICENSE_KEY,
        SESSION_KEY,
      ),
    ).toThrow(MalformedDrmSession);
  });
});
