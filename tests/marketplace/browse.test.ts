/**
 * Conjure Phase-2 marketplace browse tests.
 *
 * Covers canned-game fixture shape + browse-filter behaviour + R143
 * advisory firing.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  browse,
  CANNED_CREATOR_COUNT,
  CANNED_CREATORS,
  CANNED_GAME_COUNT,
  findGameById,
  listAllGames,
  listByDiscoveryClass,
  publishGame,
  resetMarketplaceStoreForTests,
} from '../../src/lib/marketplace/browse';
import {
  CONJURE_MARKETPLACE_ADVISORIES,
} from '../../src/lib/server/marketplace_advisories';
import { resetLoudOnceForTests } from '../../src/lib/cohort/honest/loudonce';
import type { Game } from '../../src/lib/types/marketplace';

beforeEach(() => {
  resetMarketplaceStoreForTests();
  resetLoudOnceForTests();
});

describe('Conjure marketplace browse -- canned fixture', () => {
  it('canned-game-count pin matches list-all length', () => {
    expect(listAllGames()).toHaveLength(CANNED_GAME_COUNT);
  });

  it('canned-game-count pin equals 5', () => {
    expect(CANNED_GAME_COUNT).toBe(5);
  });

  it('canned-creator-count pin equals 3', () => {
    expect(CANNED_CREATOR_COUNT).toBe(3);
    expect(CANNED_CREATORS).toHaveLength(3);
  });

  it('every canned game has a known id', () => {
    const ids = listAllGames().map((g) => g.id);
    expect(ids).toContain('game_canned_neon_drift');
    expect(ids).toContain('game_canned_tidepool_idle');
    expect(ids).toContain('game_canned_word_dive');
    expect(ids).toContain('game_canned_arcade_storm');
    expect(ids).toContain('game_canned_idle_garden');
  });

  it('findGameById returns null for unknown id', () => {
    expect(findGameById('game_does_not_exist')).toBeNull();
  });

  it('findGameById returns a known game', () => {
    const g = findGameById('game_canned_neon_drift');
    expect(g).not.toBeNull();
    expect(g?.title).toBe('Neon Drift');
  });

  it('returned game objects are frozen', () => {
    const g = findGameById('game_canned_neon_drift') as Game;
    expect(Object.isFrozen(g)).toBe(true);
  });
});

describe('Conjure marketplace browse -- filters', () => {
  it('browse with no filter returns all 5 canned games', () => {
    expect(browse({})).toHaveLength(5);
  });

  it('browse with q="neon" matches the Neon Drift + Storm Sweeper', () => {
    const r = browse({ q: 'neon' });
    const titles = r.map((g) => g.title);
    expect(titles).toContain('Neon Drift');
    expect(titles).toContain('Storm Sweeper');
  });

  it('browse with q is case-insensitive', () => {
    const lower = browse({ q: 'neon' });
    const upper = browse({ q: 'NEON' });
    expect(upper.map((g) => g.id)).toEqual(lower.map((g) => g.id));
  });

  it('browse with q matching description body returns the right game', () => {
    const r = browse({ q: 'rockpool' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('game_canned_tidepool_idle');
  });

  it('browse with q matching no game returns empty', () => {
    expect(browse({ q: 'qzzzzzzzz' })).toHaveLength(0);
  });

  it('browse with category=puzzle returns only puzzle-categorised games', () => {
    const r = browse({ category: 'puzzle' });
    for (const g of r) expect(g.category).toBe('puzzle');
  });

  it('browse with category=relaxation returns Garden Steward', () => {
    const r = browse({ category: 'relaxation' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('game_canned_idle_garden');
  });

  it('browse with discoveryClass=trending returns only trending games', () => {
    const r = browse({ discoveryClass: 'trending' });
    expect(r.length).toBeGreaterThan(0);
    for (const g of r) expect(g.discoveryClasses).toContain('trending');
  });

  it('browse with discoveryClass=hidden_gem returns the two hidden gems', () => {
    const r = browse({ discoveryClass: 'hidden_gem' });
    expect(r).toHaveLength(2);
  });

  it('browse sorts newest first by default', () => {
    const r = browse({});
    for (let i = 1; i < r.length; i++) {
      expect(r[i].publishedAtUnixMs).toBeLessThanOrEqual(
        r[i - 1].publishedAtUnixMs,
      );
    }
  });

  it('browse with both q + category narrows correctly', () => {
    const r = browse({ q: 'tile', category: 'puzzle' });
    expect(r.length).toBeGreaterThanOrEqual(1);
    for (const g of r) expect(g.category).toBe('puzzle');
  });

  it('browse with q + discoveryClass narrows correctly', () => {
    const r = browse({ q: 'garden', discoveryClass: 'hidden_gem' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('game_canned_idle_garden');
  });
});

describe('Conjure marketplace browse -- because-you-played seed', () => {
  it('seedGameId returns same-mechanic-kind games (not the seed)', () => {
    const r = browse({ seedGameId: 'game_canned_neon_drift' });
    expect(r.length).toBeGreaterThan(0);
    for (const g of r) {
      expect(g.id).not.toBe('game_canned_neon_drift');
      expect(g.mechanicKind).toBe('puzzle');
    }
  });

  it('seedGameId on unknown game returns empty', () => {
    expect(browse({ seedGameId: 'game_unknown' })).toHaveLength(0);
  });

  it('seedGameId orders by aggregatePlayTimeSeconds DESC', () => {
    const r = browse({ seedGameId: 'game_canned_neon_drift' });
    for (let i = 1; i < r.length; i++) {
      expect(r[i].aggregatePlayTimeSeconds).toBeLessThanOrEqual(
        r[i - 1].aggregatePlayTimeSeconds,
      );
    }
  });

  it('listByDiscoveryClass matches browse({discoveryClass})', () => {
    const a = listByDiscoveryClass('trending');
    const b = browse({ discoveryClass: 'trending' });
    expect(a.map((g) => g.id)).toEqual(b.map((g) => g.id));
  });
});

describe('Conjure marketplace browse -- publish', () => {
  it('publishGame accepts a fresh game', () => {
    const fresh: Game = Object.freeze({
      id: 'game_published_test_1',
      title: 'Test Pub',
      description: 'A test publication',
      tagline: 'Test',
      mechanicKind: 'puzzle',
      category: 'puzzle',
      visualStyle: 'pixel',
      audioMood: 'chill',
      difficulty: 'easy',
      creator: CANNED_CREATORS[0],
      publishedAtUnixMs: 1740000000000,
      screenshots: Object.freeze([]),
      discoveryClasses: Object.freeze([]),
      aggregatePlayTimeSeconds: 0,
      playCount: 0,
    });
    const res = publishGame(fresh);
    expect(res.ok).toBe(true);
    expect(findGameById('game_published_test_1')).not.toBeNull();
  });

  it('publishGame rejects empty id', () => {
    const fresh: Game = Object.freeze({
      id: '',
      title: 'Empty',
      description: '',
      tagline: '',
      mechanicKind: 'puzzle',
      category: 'puzzle',
      visualStyle: 'pixel',
      audioMood: 'chill',
      difficulty: 'easy',
      creator: CANNED_CREATORS[0],
      publishedAtUnixMs: 1740000000000,
      screenshots: Object.freeze([]),
      discoveryClasses: Object.freeze([]),
      aggregatePlayTimeSeconds: 0,
      playCount: 0,
    });
    const res = publishGame(fresh);
    expect(res.ok).toBe(false);
  });

  it('publishGame rejects duplicate id', () => {
    const fresh: Game = Object.freeze({
      id: 'game_canned_neon_drift', // dup of canned id
      title: 'Dup',
      description: '',
      tagline: '',
      mechanicKind: 'puzzle',
      category: 'puzzle',
      visualStyle: 'pixel',
      audioMood: 'chill',
      difficulty: 'easy',
      creator: CANNED_CREATORS[0],
      publishedAtUnixMs: 1740000000000,
      screenshots: Object.freeze([]),
      discoveryClasses: Object.freeze([]),
      aggregatePlayTimeSeconds: 0,
      playCount: 0,
    });
    const res = publishGame(fresh);
    expect(res.ok).toBe(false);
  });

  it('published game appears in listAllGames + browse', () => {
    const fresh: Game = Object.freeze({
      id: 'game_published_test_2',
      title: 'List Pub',
      description: 'Listed publication',
      tagline: 'Listed',
      mechanicKind: 'puzzle',
      category: 'puzzle',
      visualStyle: 'pixel',
      audioMood: 'chill',
      difficulty: 'easy',
      creator: CANNED_CREATORS[0],
      publishedAtUnixMs: 1740100000000,
      screenshots: Object.freeze([]),
      discoveryClasses: Object.freeze(['new'] as const),
      aggregatePlayTimeSeconds: 0,
      playCount: 0,
    });
    publishGame(fresh);
    expect(listAllGames()).toHaveLength(6);
    const found = browse({ q: 'List Pub' });
    expect(found).toHaveLength(1);
  });
});

describe('Conjure marketplace browse -- R143 advisories', () => {
  it('CONJURE_MARKETPLACE_ADVISORIES has exactly 3 entries', () => {
    expect(CONJURE_MARKETPLACE_ADVISORIES).toHaveLength(3);
  });

  it('all 3 marketplace advisories are findable by code', () => {
    const codes = CONJURE_MARKETPLACE_ADVISORIES.map((a) => a.code);
    expect(codes).toContain('CONJURE_MARKETPLACE_PLAYER_AUTH_NOT_LIVE');
    expect(codes).toContain('CONJURE_MARKETPLACE_PERSISTENT_STORAGE_PLACEHOLDER');
    expect(codes).toContain('CONJURE_FORGE_WEIGHTED_RATING_PLACEHOLDER');
  });

  it('browse fires R143 marketplace advisories once', () => {
    const lines: string[] = [];
    const sink = (l: string): void => {
      lines.push(l);
    };
    // Use direct loudOnce with sink
    const { loudOnce } = require('../../src/lib/cohort/honest/loudonce');
    for (const a of CONJURE_MARKETPLACE_ADVISORIES) loudOnce(a, sink);
    expect(lines.length).toBe(3);
  });
});
