/**
 * Marketplace types for Conjure Phase-2.
 *
 * Phase-2 ships an in-memory mock marketplace (no DB-backed storage yet --
 * see CONJURE_MARKETPLACE_PERSISTENT_STORAGE_PLACEHOLDER R143 advisory).
 * These types describe the public shape of the marketplace surface so that
 * Phase-3 + Phase-4 DB-backed implementations can drop in behind the same
 * interface.
 *
 * R145-strict additive: NEW types in a NEW file. The Phase-1
 * `MechanicKind` / `Category` / `VisualStyle` / `AudioMood` / `Difficulty`
 * / `GameSpec` types in `game.ts` are UNCHANGED.
 *
 * R166: revenue-share + creator-payout fields below are founder-drafted
 * and refer to the `LEGAL_LIABILITY_FOOTER` in
 * `src/lib/cohort/legal/liability_footer.ts`. Counsel review has NOT YET
 * been completed.
 */

import type {
  AudioMood,
  Category,
  Difficulty,
  MechanicKind,
  VisualStyle,
} from './game';

/**
 * Creator profile for the marketplace. Phase-2 mock has 3 canned creators;
 * Phase-3 ships full creator-profile + follower-system surfaces.
 *
 * `playerAuthRef` is the opaque reference into the player-auth subsystem;
 * Phase-2 mock uses string IDs. Player-auth is NOT LIVE in Phase-2 -- see
 * CONJURE_MARKETPLACE_PLAYER_AUTH_NOT_LIVE R143 advisory.
 */
export interface Creator {
  readonly id: string;
  readonly handle: string;
  readonly displayName: string;
  readonly joinedAtUnixMs: number;
  /** Phase-3+ follower count. Phase-2 mock returns 0 for unknown. */
  readonly followerCount: number;
}

/**
 * Discovery class for a marketplace listing.
 *
 *  - `trending`     -- high recent play count
 *  - `rising`       -- positive momentum (Phase-2 mock uses recency proxy)
 *  - `hidden_gem`   -- high rating-per-play ratio
 *  - `recommended`  -- "because you played X" forge-personalisation (Phase-2
 *                      mock returns top-rated mechanic-kind matches)
 *  - `new`          -- recently published
 */
export type DiscoveryClass =
  | 'trending'
  | 'rising'
  | 'hidden_gem'
  | 'recommended'
  | 'new';

export const DISCOVERY_CLASSES: ReadonlyArray<DiscoveryClass> = Object.freeze([
  'trending',
  'rising',
  'hidden_gem',
  'recommended',
  'new',
]);

/**
 * Marketplace listing for a published game. Phase-2 ships 5+ canned
 * listings in `src/lib/server/marketplace.ts`; Phase-3+ replaces the mock
 * store with a Postgres-backed implementation.
 */
export interface Game {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Public-facing tagline -- shown on browse cards. */
  readonly tagline: string;
  readonly mechanicKind: MechanicKind;
  readonly category: Category;
  readonly visualStyle: VisualStyle;
  readonly audioMood: AudioMood;
  readonly difficulty: Difficulty;
  readonly creator: Creator;
  readonly publishedAtUnixMs: number;
  /** Mock screenshot URLs -- Phase-2 uses placeholder palette swatches. */
  readonly screenshots: ReadonlyArray<string>;
  /** Discovery classes this game qualifies for. May be empty. */
  readonly discoveryClasses: ReadonlyArray<DiscoveryClass>;
  /**
   * Aggregated play time across all players in seconds. Phase-2 mock
   * uses canned values; Phase-3 will compute from telemetry.
   */
  readonly aggregatePlayTimeSeconds: number;
  /** Total number of distinct play sessions recorded. */
  readonly playCount: number;
}

/**
 * Rating shape for a single player's review of a game.
 *
 * The forge-weighted rating algorithm (see `src/lib/server/ratings.ts`)
 * weights each rating by the player's play time on the game -- the
 * intuition is that a player who has played for 10 minutes has a more
 * load-bearing opinion than one who quit after 5 seconds.
 *
 * `playTimeSeconds` is captured at rating-submission time; later play
 * sessions do NOT retroactively up-weight the rating (R145-strict
 * additive: store-once, never mutate).
 *
 * Phase-2 caveat: the forge-weighted rating algorithm is a
 * domain-heuristic placeholder per
 * CONJURE_FORGE_WEIGHTED_RATING_PLACEHOLDER R143 advisory. The true
 * forge-personalised rating (factoring OCEAN-trait similarity to other
 * raters / Bayesian shrinkage to genre mean / temporal decay) is Phase-3+.
 */
export interface Rating {
  readonly id: string;
  readonly gameId: string;
  readonly playerId: string;
  /** 1-5 star scale. Validated at submission time. */
  readonly stars: number;
  readonly review: string;
  /** Play time on this game when the rating was submitted (seconds). */
  readonly playTimeSeconds: number;
  readonly ratedAtUnixMs: number;
}

/** Star-rating bounds. Validated by `storeRating()`. */
export const RATING_STARS_MIN: number = 1;
export const RATING_STARS_MAX: number = 5;

/** Maximum allowed review body length in characters. */
export const RATING_REVIEW_MAX_LENGTH: number = 2000;

/**
 * Aggregate rating summary for a game. Computed by
 * `getWeightedAverageRating()`.
 */
export interface RatingAggregate {
  readonly gameId: string;
  readonly count: number;
  /** Simple (unweighted) arithmetic mean of stars. */
  readonly simpleMean: number;
  /**
   * Forge-weighted mean of stars. Each rating is weighted by its
   * play-time-seconds (with a configurable floor so a 0-second rating
   * does not get zero weight).
   */
  readonly forgeWeightedMean: number;
  /** Sum of all play-time-seconds across raters. */
  readonly totalPlayTimeSeconds: number;
}

/**
 * Player-side query input for the browse route. Phase-2 supports a
 * subset of the eventual Phase-3 discovery-engine query surface.
 */
export interface BrowseQuery {
  /** Optional substring filter on title + tagline + description. */
  readonly q?: string;
  /** Optional category filter (closed-enum). */
  readonly category?: Category;
  /** Optional discovery-class filter. */
  readonly discoveryClass?: DiscoveryClass;
  /** Optional "because you played X" seed game id. */
  readonly seedGameId?: string;
}
