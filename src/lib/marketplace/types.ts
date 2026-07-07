/**
 * Conjure Phase-2 marketplace re-exports.
 *
 * Per the I54 spec the marketplace types live alongside the marketplace
 * code in `src/lib/marketplace/types.ts`. The canonical type definitions
 * already exist in `src/lib/types/marketplace.ts` (committed earlier on
 * the marketplace branch); this file is the marketplace-folder-local
 * re-export so callers can `import from '$lib/marketplace/types'` with
 * the canonical shape, and the cohort firewall has a single grep-path
 * for marketplace type imports.
 *
 * R145 strict-additive: re-export only -- no new types declared here.
 */

export type {
  BrowseQuery,
  Creator,
  DiscoveryClass,
  Game,
  Rating,
  RatingAggregate,
} from '$lib/types/marketplace';

export {
  DISCOVERY_CLASSES,
  RATING_REVIEW_MAX_LENGTH,
  RATING_STARS_MAX,
  RATING_STARS_MIN,
} from '$lib/types/marketplace';
