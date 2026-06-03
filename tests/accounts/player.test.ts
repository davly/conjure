/**
 * Conjure Phase-3 Player tests.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  canonicalPlayerIdentityPayload,
  createPlayer,
  findPlayerByEmail,
  findPlayerById,
  listPlayerIds,
  PLAYER_ID_PREFIX,
  resetPlayerStoreForTests,
} from '../../src/lib/accounts/player';

beforeEach(() => {
  resetPlayerStoreForTests();
});

describe('Conjure Player -- create', () => {
  it('createPlayer with valid input returns ok=true', () => {
    const r = createPlayer({ email: 'a@b.com', password: 'longenoughpw' });
    expect(r.ok).toBe(true);
  });

  it('createPlayer issues an acc_player_ prefixed id', () => {
    const r = createPlayer({ email: 'a@b.com', password: 'longenoughpw' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.account.id.startsWith(PLAYER_ID_PREFIX)).toBe(true);
  });

  it('createPlayer rejects invalid email (no @)', () => {
    const r = createPlayer({ email: 'notanemail', password: 'longenoughpw' });
    expect(r.ok).toBe(false);
  });

  it('createPlayer rejects invalid email (no domain dot)', () => {
    const r = createPlayer({ email: 'a@local', password: 'longenoughpw' });
    expect(r.ok).toBe(false);
  });

  it('createPlayer rejects short password', () => {
    const r = createPlayer({ email: 'a@b.com', password: 'short' });
    expect(r.ok).toBe(false);
  });

  it('createPlayer rejects overlong password', () => {
    const r = createPlayer({ email: 'a@b.com', password: 'x'.repeat(257) });
    expect(r.ok).toBe(false);
  });

  it('createPlayer rejects duplicate email', () => {
    createPlayer({ email: 'a@b.com', password: 'longenoughpw' });
    const r = createPlayer({ email: 'a@b.com', password: 'differentpw' });
    expect(r.ok).toBe(false);
  });

  it('createPlayer case-folds email on storage', () => {
    createPlayer({ email: 'Mixed@CaSe.Com', password: 'longenoughpw' });
    expect(findPlayerByEmail('mixed@case.com')).not.toBeNull();
    expect(findPlayerByEmail('Mixed@Case.com')).not.toBeNull();
  });

  it('createPlayer record is frozen', () => {
    const r = createPlayer({ email: 'a@b.com', password: 'longenoughpw' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Object.isFrozen(r.account)).toBe(true);
  });

  it('createPlayer respects nowUnixMs override', () => {
    const r = createPlayer({
      email: 'a@b.com',
      password: 'longenoughpw',
      nowUnixMs: 12345,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.account.joinedAtUnixMs).toBe(12345);
  });
});

describe('Conjure Player -- lookup', () => {
  it('findPlayerById returns null on unknown id', () => {
    expect(findPlayerById('acc_player_unknown')).toBeNull();
  });

  it('findPlayerById returns the player on known id', () => {
    const r = createPlayer({ email: 'a@b.com', password: 'longenoughpw' });
    if (r.ok) {
      expect(findPlayerById(r.account.id)?.email).toBe('a@b.com');
    }
  });

  it('findPlayerByEmail returns null on unknown email', () => {
    expect(findPlayerByEmail('nobody@nowhere.com')).toBeNull();
  });

  it('listPlayerIds returns frozen empty before any creates', () => {
    const ids = listPlayerIds();
    expect(ids).toHaveLength(0);
    expect(Object.isFrozen(ids)).toBe(true);
  });

  it('listPlayerIds returns one entry after one create', () => {
    createPlayer({ email: 'a@b.com', password: 'longenoughpw' });
    expect(listPlayerIds()).toHaveLength(1);
  });

  it('listPlayerIds is sorted by insertion order', () => {
    const r1 = createPlayer({ email: 'a@b.com', password: 'longenoughpw' });
    const r2 = createPlayer({ email: 'b@b.com', password: 'longenoughpw' });
    const ids = listPlayerIds();
    if (r1.ok && r2.ok) {
      expect(ids[0]).toBe(r1.account.id);
      expect(ids[1]).toBe(r2.account.id);
    }
  });
});

describe('Conjure Player -- canonicalPlayerIdentityPayload', () => {
  it('canonical payload is deterministic for same inputs', () => {
    const a = canonicalPlayerIdentityPayload({
      id: 'acc_player_x',
      email: 'a@b.com',
      issuedAtUnixMs: 1000,
    });
    const b = canonicalPlayerIdentityPayload({
      id: 'acc_player_x',
      email: 'a@b.com',
      issuedAtUnixMs: 1000,
    });
    expect(a.equals(b)).toBe(true);
  });

  it('canonical payload differs if id differs', () => {
    const a = canonicalPlayerIdentityPayload({
      id: 'acc_player_x',
      email: 'a@b.com',
      issuedAtUnixMs: 1000,
    });
    const b = canonicalPlayerIdentityPayload({
      id: 'acc_player_y',
      email: 'a@b.com',
      issuedAtUnixMs: 1000,
    });
    expect(a.equals(b)).toBe(false);
  });

  it('canonical payload uses NUL separator and key=value shape', () => {
    const buf = canonicalPlayerIdentityPayload({
      id: 'acc_player_x',
      email: 'a@b.com',
      issuedAtUnixMs: 1000,
    });
    const text = buf.toString('utf8');
    expect(text).toContain('\x00');
    expect(text).toContain('account_id=acc_player_x');
    expect(text).toContain('email=a@b.com');
    expect(text).toContain('issued_at_unix_ms=1000');
  });
});

describe('Conjure Player -- reset', () => {
  it('resetPlayerStoreForTests clears state', () => {
    createPlayer({ email: 'a@b.com', password: 'longenoughpw' });
    resetPlayerStoreForTests();
    expect(listPlayerIds()).toHaveLength(0);
    expect(findPlayerByEmail('a@b.com')).toBeNull();
  });
});
