/**
 * Conjure Phase-3 Creator tests.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  canonicalAttributionReceiptPayload,
  createCreator,
  CREATOR_ID_PREFIX,
  findCreatorByEmail,
  findCreatorByHandle,
  findCreatorById,
  listCreatorHandles,
  resetCreatorStoreForTests,
} from '../../src/lib/accounts/creator';

const VALID_INPUT = {
  email: 'c@b.com',
  password: 'longenoughpw',
  handle: 'my-handle',
  displayName: 'My Creator',
};

beforeEach(() => {
  resetCreatorStoreForTests();
});

describe('Conjure Creator -- create', () => {
  it('createCreator with valid input returns ok=true', () => {
    const r = createCreator(VALID_INPUT);
    expect(r.ok).toBe(true);
  });

  it('createCreator issues an acc_creator_ prefixed id', () => {
    const r = createCreator(VALID_INPUT);
    if (r.ok) expect(r.account.id.startsWith(CREATOR_ID_PREFIX)).toBe(true);
  });

  it('createCreator rejects invalid handle (uppercase)', () => {
    const r = createCreator({ ...VALID_INPUT, handle: 'My-Handle' });
    expect(r.ok).toBe(false);
  });

  it('createCreator rejects handle starting with digit', () => {
    const r = createCreator({ ...VALID_INPUT, handle: '1handle' });
    expect(r.ok).toBe(false);
  });

  it('createCreator rejects handle starting with hyphen', () => {
    const r = createCreator({ ...VALID_INPUT, handle: '-handle' });
    expect(r.ok).toBe(false);
  });

  it('createCreator rejects too-short handle (2 chars)', () => {
    const r = createCreator({ ...VALID_INPUT, handle: 'ab' });
    expect(r.ok).toBe(false);
  });

  it('createCreator accepts 3-char handle', () => {
    const r = createCreator({ ...VALID_INPUT, handle: 'abc' });
    expect(r.ok).toBe(true);
  });

  it('createCreator rejects 33-char handle', () => {
    const r = createCreator({ ...VALID_INPUT, handle: 'a' + 'b'.repeat(32) });
    expect(r.ok).toBe(false);
  });

  it('createCreator rejects empty displayName', () => {
    const r = createCreator({ ...VALID_INPUT, displayName: '' });
    expect(r.ok).toBe(false);
  });

  it('createCreator rejects overlong displayName', () => {
    const r = createCreator({ ...VALID_INPUT, displayName: 'x'.repeat(65) });
    expect(r.ok).toBe(false);
  });

  it('createCreator rejects invalid email', () => {
    const r = createCreator({ ...VALID_INPUT, email: 'invalid' });
    expect(r.ok).toBe(false);
  });

  it('createCreator rejects short password', () => {
    const r = createCreator({ ...VALID_INPUT, password: 'short' });
    expect(r.ok).toBe(false);
  });

  it('createCreator rejects duplicate email', () => {
    createCreator(VALID_INPUT);
    const r = createCreator({ ...VALID_INPUT, handle: 'different-handle' });
    expect(r.ok).toBe(false);
  });

  it('createCreator rejects duplicate handle', () => {
    createCreator(VALID_INPUT);
    const r = createCreator({ ...VALID_INPUT, email: 'other@b.com' });
    expect(r.ok).toBe(false);
  });

  it('createCreator initialises gameIds = empty frozen array', () => {
    const r = createCreator(VALID_INPUT);
    if (r.ok) {
      expect(r.account.gameIds).toHaveLength(0);
      expect(Object.isFrozen(r.account.gameIds)).toBe(true);
    }
  });

  it('createCreator initialises placeholders to 0', () => {
    const r = createCreator(VALID_INPUT);
    if (r.ok) {
      expect(r.account.totalPlaysPlaceholder).toBe(0);
      expect(r.account.averageRatingPlaceholder).toBe(0);
      expect(r.account.earningsGbpMinorPlaceholder).toBe(0);
    }
  });

  it('createCreator record is frozen', () => {
    const r = createCreator(VALID_INPUT);
    if (r.ok) expect(Object.isFrozen(r.account)).toBe(true);
  });
});

describe('Conjure Creator -- lookup', () => {
  it('findCreatorByHandle returns null on unknown handle', () => {
    expect(findCreatorByHandle('unknown')).toBeNull();
  });

  it('findCreatorByHandle returns the creator on known handle', () => {
    createCreator(VALID_INPUT);
    expect(findCreatorByHandle('my-handle')?.displayName).toBe('My Creator');
  });

  it('findCreatorByHandle case-folds input', () => {
    createCreator(VALID_INPUT);
    expect(findCreatorByHandle('My-Handle')).not.toBeNull();
  });

  it('findCreatorById returns null on unknown id', () => {
    expect(findCreatorById('acc_creator_unknown')).toBeNull();
  });

  it('findCreatorByEmail finds the creator', () => {
    createCreator(VALID_INPUT);
    expect(findCreatorByEmail('c@b.com')?.handle).toBe('my-handle');
  });

  it('listCreatorHandles is empty before any creates', () => {
    expect(listCreatorHandles()).toHaveLength(0);
  });

  it('listCreatorHandles returns one entry after one create', () => {
    createCreator(VALID_INPUT);
    expect(listCreatorHandles()).toContain('my-handle');
  });
});

describe('Conjure Creator -- canonicalAttributionReceiptPayload', () => {
  it('payload is deterministic for same inputs', () => {
    const a = canonicalAttributionReceiptPayload({
      gameId: 'game_x',
      creatorId: 'acc_creator_y',
      handle: 'my-handle',
      publishedAtUnixMs: 1000,
    });
    const b = canonicalAttributionReceiptPayload({
      gameId: 'game_x',
      creatorId: 'acc_creator_y',
      handle: 'my-handle',
      publishedAtUnixMs: 1000,
    });
    expect(a.equals(b)).toBe(true);
  });

  it('payload differs if gameId differs', () => {
    const a = canonicalAttributionReceiptPayload({
      gameId: 'game_x',
      creatorId: 'acc_creator_y',
      handle: 'my-handle',
      publishedAtUnixMs: 1000,
    });
    const b = canonicalAttributionReceiptPayload({
      gameId: 'game_z',
      creatorId: 'acc_creator_y',
      handle: 'my-handle',
      publishedAtUnixMs: 1000,
    });
    expect(a.equals(b)).toBe(false);
  });

  it('payload uses NUL separator and key=value shape', () => {
    const buf = canonicalAttributionReceiptPayload({
      gameId: 'game_x',
      creatorId: 'acc_creator_y',
      handle: 'my-handle',
      publishedAtUnixMs: 1000,
    });
    const text = buf.toString('utf8');
    expect(text).toContain('\x00');
    expect(text).toContain('game_id=game_x');
    expect(text).toContain('creator_id=acc_creator_y');
    expect(text).toContain('handle=my-handle');
    expect(text).toContain('published_at_unix_ms=1000');
  });
});

describe('Conjure Creator -- reset', () => {
  it('resetCreatorStoreForTests clears state', () => {
    createCreator(VALID_INPUT);
    resetCreatorStoreForTests();
    expect(findCreatorByHandle('my-handle')).toBeNull();
    expect(listCreatorHandles()).toHaveLength(0);
  });
});
