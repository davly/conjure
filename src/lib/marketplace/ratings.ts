/**
 * Conjure Phase-2 ratings + reviews.
 *
 * 5-star rating + free-text review. Phase-2 ships an in-memory mock
 * store (Postgres-backed persistence is Phase-3+). Each rating is
 * stored exactly once -- a player calling `storeRating()` twice for the
 * same (gameId, playerId) replaces the prior rating in-place (so the
 * aggregate count never double-counts a single rater).
 *
 * The forge-weighted rating aggregate weights each rating by the
 * player's play-time-seconds on the game (with a `PLAY_TIME_FLOOR_S`
 * floor so a zero-play rating gets non-zero weight). This is a domain
 * heuristic placeholder per the
 * `CONJURE_FORGE_WEIGHTED_RATING_PLACEHOLDER` R143 advisory; the
 * Phase-3+ implementation factors OCEAN-trait similarity / Bayesian
 * shrinkage / temporal decay / creator-history priors.
 *
 * R145 strict-additive: this file is NEW. Phase-1 surfaces UNCHANGED.
 */

import { randomUUID } from 'node:crypto';

import type { Rating, RatingAggregate } from '$lib/types/marketplace';
import {
  RATING_REVIEW_MAX_LENGTH,
  RATING_STARS_MAX,
  RATING_STARS_MIN,
} from '$lib/types/marketplace';
import { loudOnce } from '$lib/cohort/honest/loudonce';
import { CONJURE_MARKETPLACE_ADVISORIES } from '$lib/server/marketplace_advisories';

/** Canonical Rating-ID prefix. */
export const RATING_ID_PREFIX: string = 'rating_';

/**
 * Play-time floor in seconds. A rating submitted with playTimeSeconds=0
 * still gets weight = PLAY_TIME_FLOOR_S (30s) so the forge-weighted
 * mean is robust against a zero-play poison vote.
 */
export const PLAY_TIME_FLOOR_S: number = 30;

// ---------------------------------------------------------------------------
// Store -- keyed by (gameId, playerId) -> Rating.
// ---------------------------------------------------------------------------

/** Outer key: gameId. Inner key: playerId. Value: latest Rating. */
const _ratings: Map<string, Map<string, Rating>> = new Map();

function fireAdvisoriesOnce(sink?: (line: string) => void): void {
  for (const a of CONJURE_MARKETPLACE_ADVISORIES) loudOnce(a, sink);
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

export type StoreRatingInput = {
  readonly gameId: string;
  readonly playerId: string;
  readonly stars: number;
  readonly review: string;
  readonly playTimeSeconds: number;
  /** Optional clock override -- test-only. Defaults to Date.now(). */
  readonly nowUnixMs?: number;
};

export type StoreRatingResult =
  | { readonly ok: true; readonly rating: Rating }
  | { readonly ok: false; readonly error: string };

/**
 * Store a single rating. Validates 1-5 stars + review-length cap +
 * non-negative play-time. Returns the stored Rating (with id + ts
 * filled in).
 *
 * Idempotent on repeat (gameId, playerId): the second call REPLACES
 * the first; the rating count for the game does NOT double.
 */
export function storeRating(input: StoreRatingInput): StoreRatingResult {
  fireAdvisoriesOnce();
  if (!input.gameId || input.gameId.length === 0) {
    return { ok: false, error: 'gameId must be non-empty' };
  }
  if (!input.playerId || input.playerId.length === 0) {
    return { ok: false, error: 'playerId must be non-empty' };
  }
  if (!Number.isInteger(input.stars)) {
    return { ok: false, error: 'stars must be an integer' };
  }
  if (input.stars < RATING_STARS_MIN || input.stars > RATING_STARS_MAX) {
    return {
      ok: false,
      error: `stars must be between ${RATING_STARS_MIN} and ${RATING_STARS_MAX}`,
    };
  }
  if (input.review.length > RATING_REVIEW_MAX_LENGTH) {
    return {
      ok: false,
      error: `review must be at most ${RATING_REVIEW_MAX_LENGTH} chars`,
    };
  }
  if (!Number.isFinite(input.playTimeSeconds) || input.playTimeSeconds < 0) {
    return { ok: false, error: 'playTimeSeconds must be a non-negative finite number' };
  }
  let inner = _ratings.get(input.gameId);
  if (inner === undefined) {
    inner = new Map();
    _ratings.set(input.gameId, inner);
  }
  const rating: Rating = Object.freeze({
    id: RATING_ID_PREFIX + randomUUID(),
    gameId: input.gameId,
    playerId: input.playerId,
    stars: input.stars,
    review: input.review,
    playTimeSeconds: input.playTimeSeconds,
    ratedAtUnixMs: input.nowUnixMs ?? Date.now(),
  });
  inner.set(input.playerId, rating);
  return { ok: true, rating };
}

/** Look up the current rating for (gameId, playerId). */
export function findRating(gameId: string, playerId: string): Rating | null {
  const inner = _ratings.get(gameId);
  if (inner === undefined) return null;
  return inner.get(playerId) ?? null;
}

/** List every rating for a game, frozen + sorted by ratedAtUnixMs DESC. */
export function listRatingsForGame(gameId: string): ReadonlyArray<Rating> {
  const inner = _ratings.get(gameId);
  if (inner === undefined) return Object.freeze([]);
  const out = [...inner.values()];
  out.sort((a, b) => b.ratedAtUnixMs - a.ratedAtUnixMs);
  return Object.freeze(out);
}

/**
 * Compute the simple + forge-weighted mean for a game. Returns null if
 * the game has zero ratings.
 *
 * Algorithm:
 *
 *   simpleMean      = sum(stars) / count
 *   forgeWeightedMean = sum(stars * weight) / sum(weight)
 *   weight          = max(playTimeSeconds, PLAY_TIME_FLOOR_S)
 *
 * Both means are in `[RATING_STARS_MIN, RATING_STARS_MAX]`. The
 * forge-weighted mean is biased toward raters who played longer; a
 * zero-play rater is floored at PLAY_TIME_FLOOR_S so a single
 * brand-new player cannot drag the mean to 1.0.
 */
export function getWeightedAverageRating(gameId: string): RatingAggregate | null {
  const inner = _ratings.get(gameId);
  if (inner === undefined || inner.size === 0) return null;
  let totalStars = 0;
  let weightedSum = 0;
  let weightSum = 0;
  let totalPlay = 0;
  for (const r of inner.values()) {
    totalStars += r.stars;
    const weight = Math.max(r.playTimeSeconds, PLAY_TIME_FLOOR_S);
    weightedSum += r.stars * weight;
    weightSum += weight;
    totalPlay += r.playTimeSeconds;
  }
  return Object.freeze({
    gameId,
    count: inner.size,
    simpleMean: totalStars / inner.size,
    forgeWeightedMean: weightedSum / weightSum,
    totalPlayTimeSeconds: totalPlay,
  });
}

/** Reset the ratings store. Test-only. */
export function resetRatingsStoreForTests(): void {
  _ratings.clear();
}
