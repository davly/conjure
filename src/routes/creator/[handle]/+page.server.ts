/**
 * Conjure Phase-2 creator profile loader.
 *
 * Looks up a creator by handle (URL param) + returns the profile-render
 * envelope: name + games list + total plays placeholder + average rating
 * placeholder + earnings placeholder + R166 liability footer + follower
 * count.
 *
 * Returns 404 if the handle does not resolve.
 */

import { error, type ServerLoad } from '@sveltejs/kit';

import { findCreatorByHandle } from '$lib/server/accounts';
import { followerCount } from '$lib/server/follow';
import {
  LEGAL_LIABILITY_FOOTER,
  REVIEWED_BY_COUNSEL,
} from '$lib/cohort/legal/liability_footer';

export const load: ServerLoad = ({ params }) => {
  const handle = String(params.handle ?? '');
  const creator = findCreatorByHandle(handle);
  if (creator === null) {
    throw error(404, `Creator '${handle}' not found.`);
  }

  return {
    handle: creator.handle,
    displayName: creator.displayName,
    gameIds: creator.gameIds,
    totalPlays: creator.totalPlaysPlaceholder,
    averageRating: creator.averageRatingPlaceholder,
    earningsGbpMinor: creator.earningsGbpMinorPlaceholder,
    followers: followerCount(creator.id),
    creatorId: creator.id,
    liabilityFooter: LEGAL_LIABILITY_FOOTER,
    reviewedByCounsel: REVIEWED_BY_COUNSEL,
  };
};
