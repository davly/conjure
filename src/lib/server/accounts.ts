/**
 * Conjure Phase-3 accounts store -- mixed Player + Creator surface.
 *
 * Thin facade over `src/lib/accounts/player.ts` + `creator.ts` so the
 * route layer can resolve accounts without branching on kind. The route
 * surface in `src/routes/auth/+page.server.ts` calls into this module;
 * the underlying typed Player + Creator stores live in
 * `src/lib/accounts/`.
 *
 * Three R143 advisories fire on first store-mutation call:
 *
 *   - CONJURE_ACCOUNTS_AUTH_NOT_LIVE_PLACEHOLDER (Error)
 *   - CONJURE_ACCOUNTS_PASSWORD_HASHING_PLACEHOLDER (Error)
 *   - CONJURE_ACCOUNTS_GDPR_ARTICLE_6_LAWFUL_BASIS_NOT_DOCUMENTED (Warn)
 *
 * R145 strict-additive: this file is NEW. Phase-1 surfaces UNCHANGED.
 */

import type { Account, AccountId } from '$lib/types/account';
import {
  CONJURE_ACCOUNTS_ADVISORIES,
  fireAccountsAdvisoriesOnce,
} from './accounts_advisories';
import * as creatorStore from '$lib/accounts/creator';
import * as playerStore from '$lib/accounts/player';
import type { CreateCreatorInput, CreateCreatorResult } from '$lib/accounts/creator';
import type { CreatePlayerInput, CreatePlayerResult } from '$lib/accounts/player';

/**
 * Re-export the advisories list so the cohort firewall test can pin its
 * count without crossing the lib/server boundary.
 */
export { CONJURE_ACCOUNTS_ADVISORIES };

/**
 * Loose email validator -- shared with the underlying stores.
 */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Phase-2 placeholder password-shape check. Argon2id / scrypt is
 * Phase-3+ wire-in.
 */
export function isAcceptablePasswordPlaceholder(password: string): boolean {
  return password.length >= 8 && password.length <= 256;
}

/** Adapter shape used by the auth route. */
export type CreatePlayerArgs = {
  readonly email: string;
  readonly passwordPlaceholder: string;
  readonly nowUnixMs?: number;
};

/** Wrap the underlying player store + fire R143 advisories. */
export function createPlayer(args: CreatePlayerArgs): CreatePlayerResult {
  fireAccountsAdvisoriesOnce();
  const input: CreatePlayerInput = {
    email: args.email,
    password: args.passwordPlaceholder,
    nowUnixMs: args.nowUnixMs,
  };
  return playerStore.createPlayer(input);
}

/** Adapter shape used by the auth route. */
export type CreateCreatorArgs = {
  readonly email: string;
  readonly passwordPlaceholder: string;
  readonly handle: string;
  readonly displayName: string;
  readonly nowUnixMs?: number;
};

/** Wrap the underlying creator store + fire R143 advisories. */
export function createCreator(args: CreateCreatorArgs): CreateCreatorResult {
  fireAccountsAdvisoriesOnce();
  const input: CreateCreatorInput = {
    email: args.email,
    password: args.passwordPlaceholder,
    handle: args.handle,
    displayName: args.displayName,
    nowUnixMs: args.nowUnixMs,
  };
  return creatorStore.createCreator(input);
}

/** Find any account (Player or Creator) by id. */
export function findAccountById(id: AccountId): Account | null {
  return playerStore.findPlayerById(id) ?? creatorStore.findCreatorById(id);
}

/** Find any account (Player or Creator) by email. */
export function findAccountByEmail(email: string): Account | null {
  return playerStore.findPlayerByEmail(email) ?? creatorStore.findCreatorByEmail(email);
}

/** Find a creator by URL handle. */
export function findCreatorByHandle(handle: string) {
  return creatorStore.findCreatorByHandle(handle);
}

/** Reset both underlying stores. Test-only. */
export function resetAccountsStoreForTests(): void {
  playerStore.resetPlayerStoreForTests();
  creatorStore.resetCreatorStoreForTests();
}
