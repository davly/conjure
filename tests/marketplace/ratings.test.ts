/**
 * Conjure Phase-2 ratings tests.
 *
 * Covers store-once + replace-on-repeat + 1-5 validation +
 * forge-weighted aggregate math + R143 advisory firing.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  findRating,
  getWeightedAverageRating,
  listRatingsForGame,
  PLAY_TIME_FLOOR_S,
  resetRatingsStoreForTests,
  storeRating,
} from '../../src/lib/marketplace/ratings';
import { resetLoudOnceForTests } from '../../src/lib/cohort/honest/loudonce';

beforeEach(() => {
  resetRatingsStoreForTests();
  resetLoudOnceForTests();
});

describe('Conjure ratings -- storeRating validation', () => {
  it('rejects empty gameId', () => {
    const r = storeRating({
      gameId: '',
      playerId: 'p1',
      stars: 5,
      review: 'good',
      playTimeSeconds: 60,
    });
    expect(r.ok).toBe(false);
  });

  it('rejects empty playerId', () => {
    const r = storeRating({
      gameId: 'g1',
      playerId: '',
      stars: 5,
      review: 'good',
      playTimeSeconds: 60,
    });
    expect(r.ok).toBe(false);
  });

  it('rejects stars=0', () => {
    const r = storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 0,
      review: '',
      playTimeSeconds: 60,
    });
    expect(r.ok).toBe(false);
  });

  it('rejects stars=6', () => {
    const r = storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 6,
      review: '',
      playTimeSeconds: 60,
    });
    expect(r.ok).toBe(false);
  });

  it('rejects non-integer stars', () => {
    const r = storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 3.5,
      review: '',
      playTimeSeconds: 60,
    });
    expect(r.ok).toBe(false);
  });

  it('rejects negative playTimeSeconds', () => {
    const r = storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 4,
      review: '',
      playTimeSeconds: -1,
    });
    expect(r.ok).toBe(false);
  });

  it('rejects review longer than max', () => {
    const longReview = 'x'.repeat(3000);
    const r = storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 4,
      review: longReview,
      playTimeSeconds: 60,
    });
    expect(r.ok).toBe(false);
  });

  it('accepts valid 1-star rating', () => {
    const r = storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 1,
      review: 'bad',
      playTimeSeconds: 30,
    });
    expect(r.ok).toBe(true);
  });

  it('accepts valid 5-star rating', () => {
    const r = storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 5,
      review: 'great',
      playTimeSeconds: 1200,
    });
    expect(r.ok).toBe(true);
  });

  it('stored rating is frozen', () => {
    const r = storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 4,
      review: 'ok',
      playTimeSeconds: 60,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Object.isFrozen(r.rating)).toBe(true);
  });

  it('stored rating carries an id with the canonical prefix', () => {
    const r = storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 4,
      review: 'ok',
      playTimeSeconds: 60,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rating.id.startsWith('rating_')).toBe(true);
  });
});

describe('Conjure ratings -- store-once + replace-on-repeat', () => {
  it('findRating returns null before any rating stored', () => {
    expect(findRating('g1', 'p1')).toBeNull();
  });

  it('findRating returns the stored rating', () => {
    storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 4,
      review: 'good',
      playTimeSeconds: 60,
    });
    const r = findRating('g1', 'p1');
    expect(r).not.toBeNull();
    expect(r?.stars).toBe(4);
  });

  it('second store from same (gameId, playerId) replaces the first', () => {
    storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 1,
      review: 'bad first',
      playTimeSeconds: 30,
    });
    storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 5,
      review: 'good now',
      playTimeSeconds: 1200,
    });
    const r = findRating('g1', 'p1');
    expect(r?.stars).toBe(5);
    expect(r?.review).toBe('good now');
  });

  it('different players store separate ratings', () => {
    storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 2,
      review: '',
      playTimeSeconds: 60,
    });
    storeRating({
      gameId: 'g1',
      playerId: 'p2',
      stars: 5,
      review: '',
      playTimeSeconds: 60,
    });
    expect(findRating('g1', 'p1')?.stars).toBe(2);
    expect(findRating('g1', 'p2')?.stars).toBe(5);
  });

  it('listRatingsForGame returns all ratings for a game', () => {
    storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 2,
      review: '',
      playTimeSeconds: 60,
    });
    storeRating({
      gameId: 'g1',
      playerId: 'p2',
      stars: 5,
      review: '',
      playTimeSeconds: 60,
    });
    expect(listRatingsForGame('g1')).toHaveLength(2);
  });

  it('listRatingsForGame returns empty for unknown game', () => {
    expect(listRatingsForGame('g_unknown')).toHaveLength(0);
  });

  it('listRatingsForGame is sorted by ratedAtUnixMs DESC', () => {
    storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 4,
      review: '',
      playTimeSeconds: 60,
      nowUnixMs: 1000,
    });
    storeRating({
      gameId: 'g1',
      playerId: 'p2',
      stars: 4,
      review: '',
      playTimeSeconds: 60,
      nowUnixMs: 3000,
    });
    storeRating({
      gameId: 'g1',
      playerId: 'p3',
      stars: 4,
      review: '',
      playTimeSeconds: 60,
      nowUnixMs: 2000,
    });
    const r = listRatingsForGame('g1');
    expect(r[0].ratedAtUnixMs).toBe(3000);
    expect(r[1].ratedAtUnixMs).toBe(2000);
    expect(r[2].ratedAtUnixMs).toBe(1000);
  });
});

describe('Conjure ratings -- forge-weighted aggregate', () => {
  it('aggregate is null when no ratings exist', () => {
    expect(getWeightedAverageRating('g_nothing')).toBeNull();
  });

  it('single 4-star rating yields simpleMean = forgeWeightedMean = 4', () => {
    storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 4,
      review: '',
      playTimeSeconds: 60,
    });
    const agg = getWeightedAverageRating('g1');
    expect(agg).not.toBeNull();
    expect(agg?.simpleMean).toBe(4);
    expect(agg?.forgeWeightedMean).toBe(4);
  });

  it('zero-play rating gets weighted at PLAY_TIME_FLOOR_S', () => {
    storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 1,
      review: '',
      playTimeSeconds: 0,
    });
    storeRating({
      gameId: 'g1',
      playerId: 'p2',
      stars: 5,
      review: '',
      playTimeSeconds: PLAY_TIME_FLOOR_S, // matches floor
    });
    const agg = getWeightedAverageRating('g1');
    // Both ratings now get equal weight = PLAY_TIME_FLOOR_S.
    expect(agg?.simpleMean).toBe(3);
    expect(agg?.forgeWeightedMean).toBe(3);
  });

  it('heavy-play 5-star up-weights vs zero-play 1-star', () => {
    storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 1,
      review: '',
      playTimeSeconds: 0, // -> floor 30
    });
    storeRating({
      gameId: 'g1',
      playerId: 'p2',
      stars: 5,
      review: '',
      playTimeSeconds: 1200, // -> weight 1200
    });
    const agg = getWeightedAverageRating('g1');
    expect(agg?.simpleMean).toBe(3);
    // Forge-weighted favours the heavy-play 5-star rater.
    expect(agg?.forgeWeightedMean ?? 0).toBeGreaterThan(4.8);
  });

  it('aggregate count is distinct-rater count, not raw insert count', () => {
    storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 1,
      review: '',
      playTimeSeconds: 60,
    });
    storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 5,
      review: '',
      playTimeSeconds: 60,
    });
    storeRating({
      gameId: 'g1',
      playerId: 'p2',
      stars: 3,
      review: '',
      playTimeSeconds: 60,
    });
    const agg = getWeightedAverageRating('g1');
    expect(agg?.count).toBe(2); // not 3
  });

  it('totalPlayTimeSeconds sums input play time (not floored)', () => {
    storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 4,
      review: '',
      playTimeSeconds: 0,
    });
    storeRating({
      gameId: 'g1',
      playerId: 'p2',
      stars: 4,
      review: '',
      playTimeSeconds: 600,
    });
    const agg = getWeightedAverageRating('g1');
    expect(agg?.totalPlayTimeSeconds).toBe(600);
  });

  it('aggregate is frozen', () => {
    storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 5,
      review: '',
      playTimeSeconds: 60,
    });
    const agg = getWeightedAverageRating('g1');
    expect(agg).not.toBeNull();
    if (agg !== null) expect(Object.isFrozen(agg)).toBe(true);
  });
});

describe('Conjure ratings -- reset', () => {
  it('resetRatingsStoreForTests clears all state', () => {
    storeRating({
      gameId: 'g1',
      playerId: 'p1',
      stars: 5,
      review: '',
      playTimeSeconds: 60,
    });
    resetRatingsStoreForTests();
    expect(findRating('g1', 'p1')).toBeNull();
    expect(getWeightedAverageRating('g1')).toBeNull();
  });
});
