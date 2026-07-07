/**
 * Conjure Phase-2 follower system.
 *
 * Phase 2 lets a Player follow a Creator. Following is a one-way edge
 * (Player -> Creator); no mutual handshake. This module ships an
 * in-memory adjacency set so the Phase-2 route layer can render follow /
 * unfollow + a creator's follower count without yet wiring a database.
 *
 * # Edge semantics
 *
 *   - `follow(playerId, creatorId)`   -- add the edge; idempotent.
 *   - `unfollow(playerId, creatorId)` -- remove the edge; idempotent.
 *   - `isFollowing(playerId, creatorId)` -- check the edge.
 *   - `listFollowing(playerId)`       -- creators the player follows.
 *   - `listFollowers(creatorId)`      -- players following the creator.
 *   - `followerCount(creatorId)`      -- count of distinct followers.
 *
 * # R145 strict additive
 *
 * This module is NEW. It does NOT alter the accounts store, the forge,
 * the studio action, or any cohort firewall. The follow surface is a
 * SIBLING to the accounts surface.
 *
 * # R143 + R166 disclosure
 *
 * The follower count + creator-profile follow button render under the
 * R166 LIABILITY-FOOTER `reviewed_by_counsel=false` boundary. The host
 * MUST NOT promote follower counts to marketing material until counsel
 * has reviewed (a) the lawful basis for storing follow edges and (b)
 * any inducement-implication for creator earnings tied to follower
 * tier.
 */

import { findAccountById } from './accounts';
import type { AccountId, Creator, Player } from '$lib/types/account';

// ---------------------------------------------------------------------------
// Module-level state.
// ---------------------------------------------------------------------------

/**
 * Adjacency: playerId -> Set<creatorId>. Lazy-init: a player has no entry
 * here until their first follow call.
 */
const _playerFollowing: Map<AccountId, Set<AccountId>> = new Map();

/**
 * Reverse adjacency: creatorId -> Set<playerId>. Maintained synchronously
 * with `_playerFollowing` so `listFollowers` + `followerCount` are O(1).
 */
const _creatorFollowers: Map<AccountId, Set<AccountId>> = new Map();

// ---------------------------------------------------------------------------
// Validators.
// ---------------------------------------------------------------------------

/**
 * Confirm the player + creator references both resolve to the correct
 * Account.kind. Returns the resolved pair on success, an error string on
 * failure.
 */
function resolvePlayerAndCreator(
  playerId: AccountId,
  creatorId: AccountId,
): { player: Player; creator: Creator } | string {
  const player = findAccountById(playerId);
  if (player === null) return `Player not found: ${playerId}`;
  if (player.kind !== 'player') return `Account is not a Player: ${playerId}`;

  const creator = findAccountById(creatorId);
  if (creator === null) return `Creator not found: ${creatorId}`;
  if (creator.kind !== 'creator') return `Account is not a Creator: ${creatorId}`;

  return { player, creator };
}

// ---------------------------------------------------------------------------
// Edge mutators.
// ---------------------------------------------------------------------------

export type FollowResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

/**
 * Player follows Creator. Idempotent: a second call with the same pair
 * returns `{ ok: true }` and does not duplicate the edge.
 */
export function follow(playerId: AccountId, creatorId: AccountId): FollowResult {
  const resolved = resolvePlayerAndCreator(playerId, creatorId);
  if (typeof resolved === 'string') return { ok: false, error: resolved };

  let following = _playerFollowing.get(playerId);
  if (following === undefined) {
    following = new Set();
    _playerFollowing.set(playerId, following);
  }
  following.add(creatorId);

  let followers = _creatorFollowers.get(creatorId);
  if (followers === undefined) {
    followers = new Set();
    _creatorFollowers.set(creatorId, followers);
  }
  followers.add(playerId);

  return { ok: true };
}

/**
 * Player unfollows Creator. Idempotent: a second call with the same pair
 * returns `{ ok: true }` and removes nothing further.
 */
export function unfollow(playerId: AccountId, creatorId: AccountId): FollowResult {
  const resolved = resolvePlayerAndCreator(playerId, creatorId);
  if (typeof resolved === 'string') return { ok: false, error: resolved };

  const following = _playerFollowing.get(playerId);
  if (following !== undefined) following.delete(creatorId);

  const followers = _creatorFollowers.get(creatorId);
  if (followers !== undefined) followers.delete(playerId);

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Edge reads.
// ---------------------------------------------------------------------------

export function isFollowing(playerId: AccountId, creatorId: AccountId): boolean {
  const following = _playerFollowing.get(playerId);
  if (following === undefined) return false;
  return following.has(creatorId);
}

/** Creators the given player follows. Returns a frozen array of ids. */
export function listFollowing(playerId: AccountId): ReadonlyArray<AccountId> {
  const following = _playerFollowing.get(playerId);
  if (following === undefined) return Object.freeze([]);
  return Object.freeze([...following]);
}

/** Players following the given creator. Returns a frozen array of ids. */
export function listFollowers(creatorId: AccountId): ReadonlyArray<AccountId> {
  const followers = _creatorFollowers.get(creatorId);
  if (followers === undefined) return Object.freeze([]);
  return Object.freeze([...followers]);
}

/** Followers-count for the given creator. */
export function followerCount(creatorId: AccountId): number {
  const followers = _creatorFollowers.get(creatorId);
  if (followers === undefined) return 0;
  return followers.size;
}

// ---------------------------------------------------------------------------
// Test-only entrypoint.
// ---------------------------------------------------------------------------

/** Clear the follow adjacency. Production code MUST NOT call this. */
export function resetFollowStoreForTests(): void {
  _playerFollowing.clear();
  _creatorFollowers.clear();
}
