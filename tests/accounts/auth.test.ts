/**
 * Conjure Phase-3 auth (signed-cookie) tests.
 */

import { describe, expect, it } from 'vitest';

import {
  canonicalSessionPayload,
  DEFAULT_SESSION_LIFETIME_MS,
  DEV_SESSION_KEY_PLACEHOLDER,
  isPlaceholderSessionKey,
  isStale,
  issueSession,
  MalformedSession,
  MAX_SESSION_LIFETIME_MS,
  resolveSessionKey,
  SESSION_COOKIE_NAME,
  SESSION_KEY_ENV_FLAG,
  SESSION_WIRE_PREFIX,
  SessionExpired,
  SessionSignatureMismatch,
  stampSessionWithMirrorMark,
  UnknownSessionVersion,
  verifySession,
} from '../../src/lib/accounts/auth';
import { CORPUS_SHA_LEN } from '../../src/lib/cohort/mirrormark/mirrormark';

const KEY = Buffer.from('test-key', 'utf8');
const NOW = 1_700_000_000_000;

const VALID_INPUT = {
  accountId: 'acc_player_x',
  email: 'a@b.com',
  kind: 'player' as const,
  issuedAtUnixMs: NOW,
};

describe('Conjure auth -- cohort firewall pins', () => {
  it('SESSION_COOKIE_NAME equals "conjure_session"', () => {
    expect(SESSION_COOKIE_NAME).toBe('conjure_session');
  });

  it('SESSION_WIRE_PREFIX equals "session@v1:"', () => {
    expect(SESSION_WIRE_PREFIX).toBe('session@v1:');
  });

  it('SESSION_KEY_ENV_FLAG equals "CONJURE_SESSION_KEY"', () => {
    expect(SESSION_KEY_ENV_FLAG).toBe('CONJURE_SESSION_KEY');
  });

  it('DEFAULT_SESSION_LIFETIME_MS equals 7 days', () => {
    expect(DEFAULT_SESSION_LIFETIME_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('MAX_SESSION_LIFETIME_MS equals 30 days', () => {
    expect(MAX_SESSION_LIFETIME_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('DEV_SESSION_KEY_PLACEHOLDER carries iik_dev_CONJURE_SESSION_ grep-loud prefix', () => {
    expect(DEV_SESSION_KEY_PLACEHOLDER.startsWith('iik_dev_CONJURE_SESSION_')).toBe(true);
  });
});

describe('Conjure auth -- key resolution', () => {
  it('resolveSessionKey returns placeholder when env unset', () => {
    const k = resolveSessionKey({} as NodeJS.ProcessEnv);
    expect(isPlaceholderSessionKey(k)).toBe(true);
  });

  it('resolveSessionKey returns override when env set', () => {
    const k = resolveSessionKey({ CONJURE_SESSION_KEY: 'real-key' } as unknown as NodeJS.ProcessEnv);
    expect(isPlaceholderSessionKey(k)).toBe(false);
  });

  it('isPlaceholderSessionKey is timing-safe (false on different length)', () => {
    const short = Buffer.from('x', 'utf8');
    expect(isPlaceholderSessionKey(short)).toBe(false);
  });
});

describe('Conjure auth -- issueSession validation', () => {
  it('rejects empty accountId', () => {
    expect(() =>
      issueSession({ ...VALID_INPUT, accountId: '' }, KEY),
    ).toThrow(MalformedSession);
  });

  it('rejects empty email', () => {
    expect(() => issueSession({ ...VALID_INPUT, email: '' }, KEY)).toThrow(
      MalformedSession,
    );
  });

  it('rejects unknown kind', () => {
    expect(() =>
      issueSession(
        { ...VALID_INPUT, kind: 'operator' as 'player' },
        KEY,
      ),
    ).toThrow(MalformedSession);
  });

  it('rejects non-positive issuedAt', () => {
    expect(() =>
      issueSession({ ...VALID_INPUT, issuedAtUnixMs: 0 }, KEY),
    ).toThrow(MalformedSession);
  });

  it('rejects expiry before issued', () => {
    expect(() =>
      issueSession(
        { ...VALID_INPUT, expiryUnixMs: NOW - 1 },
        KEY,
      ),
    ).toThrow(MalformedSession);
  });

  it('rejects lifetime exceeding MAX', () => {
    expect(() =>
      issueSession(
        { ...VALID_INPUT, expiryUnixMs: NOW + MAX_SESSION_LIFETIME_MS + 1 },
        KEY,
      ),
    ).toThrow(MalformedSession);
  });
});

describe('Conjure auth -- issue + verify round-trip', () => {
  it('issued cookie starts with wire prefix', () => {
    const cookie = issueSession(VALID_INPUT, KEY);
    expect(cookie.startsWith(SESSION_WIRE_PREFIX)).toBe(true);
  });

  it('issued cookie contains a dot separator', () => {
    const cookie = issueSession(VALID_INPUT, KEY);
    expect(cookie.slice(SESSION_WIRE_PREFIX.length)).toContain('.');
  });

  it('verifySession round-trips identity claims', () => {
    const cookie = issueSession(VALID_INPUT, KEY);
    const s = verifySession(cookie, KEY, NOW + 60_000);
    expect(s.accountId).toBe(VALID_INPUT.accountId);
    expect(s.email).toBe(VALID_INPUT.email);
    expect(s.kind).toBe('player');
  });

  it('verifySession sets expiry = issued + default-lifetime when not specified', () => {
    const cookie = issueSession(VALID_INPUT, KEY);
    const s = verifySession(cookie, KEY, NOW + 60_000);
    expect(s.expiryUnixMs).toBe(NOW + DEFAULT_SESSION_LIFETIME_MS);
  });

  it('verifySession throws UnknownSessionVersion on bad prefix', () => {
    expect(() => verifySession('bogus', KEY, NOW)).toThrow(UnknownSessionVersion);
  });

  it('verifySession throws MalformedSession on missing dot', () => {
    expect(() =>
      verifySession(SESSION_WIRE_PREFIX + 'no-dot', KEY, NOW),
    ).toThrow(MalformedSession);
  });

  it('verifySession throws SessionSignatureMismatch under different key', () => {
    const cookie = issueSession(VALID_INPUT, KEY);
    const otherKey = Buffer.from('other-key', 'utf8');
    expect(() => verifySession(cookie, otherKey, NOW + 60_000)).toThrow(
      SessionSignatureMismatch,
    );
  });

  it('verifySession throws SessionExpired past expiry', () => {
    const cookie = issueSession(VALID_INPUT, KEY);
    const farFuture = NOW + DEFAULT_SESSION_LIFETIME_MS + 1;
    expect(() => verifySession(cookie, KEY, farFuture)).toThrow(SessionExpired);
  });

  it('verifySession survives a creator-kind round-trip', () => {
    const creatorInput = { ...VALID_INPUT, kind: 'creator' as const, accountId: 'acc_creator_y' };
    const cookie = issueSession(creatorInput, KEY);
    const s = verifySession(cookie, KEY, NOW + 60_000);
    expect(s.kind).toBe('creator');
  });
});

describe('Conjure auth -- canonicalSessionPayload', () => {
  it('payload is deterministic for same inputs', () => {
    const session = {
      accountId: 'acc_player_x',
      email: 'a@b.com',
      kind: 'player' as const,
      issuedAtUnixMs: NOW,
      expiryUnixMs: NOW + 1000,
    };
    expect(canonicalSessionPayload(session).equals(canonicalSessionPayload(session))).toBe(true);
  });

  it('payload uses key=value with NUL separator', () => {
    const text = canonicalSessionPayload({
      accountId: 'acc_player_x',
      email: 'a@b.com',
      kind: 'player',
      issuedAtUnixMs: 1,
      expiryUnixMs: 2,
    }).toString('utf8');
    expect(text).toContain('\x00');
    expect(text).toContain('account_id=acc_player_x');
    expect(text).toContain('kind=player');
  });
});

describe('Conjure auth -- isStale', () => {
  it('isStale returns fresh inside expiry', () => {
    const session = {
      accountId: 'a',
      email: 'b',
      kind: 'player' as const,
      issuedAtUnixMs: NOW,
      expiryUnixMs: NOW + 60_000,
    };
    expect(isStale(session, NOW + 30_000)).toEqual(
      expect.objectContaining({ stale: false, reason: 'fresh' }),
    );
  });

  it('isStale returns expired past expiry', () => {
    const session = {
      accountId: 'a',
      email: 'b',
      kind: 'player' as const,
      issuedAtUnixMs: NOW,
      expiryUnixMs: NOW + 60_000,
    };
    expect(isStale(session, NOW + 70_000)).toEqual(
      expect.objectContaining({ stale: true, reason: 'expired' }),
    );
  });

  it('isStale returns max_lifetime_exceeded for old session inside expiry', () => {
    const session = {
      accountId: 'a',
      email: 'b',
      kind: 'player' as const,
      issuedAtUnixMs: NOW,
      expiryUnixMs: NOW + MAX_SESSION_LIFETIME_MS + 100_000,
    };
    expect(isStale(session, NOW + MAX_SESSION_LIFETIME_MS + 50_000)).toEqual(
      expect.objectContaining({ stale: true, reason: 'max_lifetime_exceeded' }),
    );
  });
});

describe('Conjure auth -- Mirror-Mark companion', () => {
  it('stampSessionWithMirrorMark emits a lore@v1: prefix mark', () => {
    const session = {
      accountId: 'a',
      email: 'b',
      kind: 'player' as const,
      issuedAtUnixMs: NOW,
      expiryUnixMs: NOW + 60_000,
    };
    const corpus = Buffer.alloc(CORPUS_SHA_LEN, 0xab);
    const mark = stampSessionWithMirrorMark(session, corpus, KEY);
    expect(mark.startsWith('lore@v1:')).toBe(true);
  });

  it('stampSessionWithMirrorMark rejects bad-length corpus', () => {
    const session = {
      accountId: 'a',
      email: 'b',
      kind: 'player' as const,
      issuedAtUnixMs: NOW,
      expiryUnixMs: NOW + 60_000,
    };
    const tooShort = Buffer.alloc(8, 0xab);
    expect(() => stampSessionWithMirrorMark(session, tooShort, KEY)).toThrow();
  });
});
