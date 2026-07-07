/**
 * Conjure Phase-3 Creator profiles + attribution receipts.
 *
 * Creator records carry the public attribution surface for the
 * marketplace (handle / displayName / earnings placeholder) plus a
 * private accounts-store row (email + password placeholder).
 *
 * Attribution receipts: when a creator publishes a game, the marketplace
 * emits a SIGNED ATTRIBUTION RECEIPT pinning (gameId / creatorId /
 * handle / publishedAtUnixMs) under the cohort Mirror-Mark. A regulator
 * with the deployed lore corpus + production key can re-derive the mark
 * and confirm the game was published by the named creator.
 *
 * R145 strict-additive: this file is NEW.
 *
 * R143 + R166 disclosure:
 *
 *   - CONJURE_ACCOUNTS_AUTH_NOT_LIVE_PLACEHOLDER fires on first creator
 *     creation (shared with Player surface).
 *   - The earnings placeholder + revenue-share text in
 *     `liability_footer.ts` is founder-drafted; counsel review NOT YET
 *     completed.
 *
 * Closed-set API:
 *
 *   - createCreator({email, password, handle, displayName})
 *   - findCreatorById(id) -> Creator | null
 *   - findCreatorByHandle(handle) -> Creator | null
 *   - findCreatorByEmail(email) -> Creator | null
 *   - listCreatorHandles() -> readonly array
 *   - canonicalAttributionReceiptPayload(opts) -> Buffer
 *   - resetCreatorStoreForTests() -> void
 */

import { randomUUID } from 'node:crypto';

import type { AccountId, Creator } from '../../lib/types/account';
import {
  DISPLAY_NAME_MAX_LENGTH,
  EMAIL_REGEX,
  HANDLE_REGEX,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../lib/types/account';

/** Canonical Creator ID prefix. */
export const CREATOR_ID_PREFIX: string = 'acc_creator_';

const _byId: Map<AccountId, Creator> = new Map();
const _byHandle: Map<string, Creator> = new Map();
const _byEmail: Map<string, Creator> = new Map();

export type CreateCreatorInput = {
  readonly email: string;
  readonly password: string;
  readonly handle: string;
  readonly displayName: string;
  readonly nowUnixMs?: number;
};

export type CreateCreatorResult =
  | { readonly ok: true; readonly account: Creator }
  | { readonly ok: false; readonly error: string };

/**
 * Create a Creator. Validates email + password + handle + displayName.
 * Idempotent failure on duplicate email OR duplicate handle.
 */
export function createCreator(input: CreateCreatorInput): CreateCreatorResult {
  const email = input.email.trim().toLowerCase();
  const handleRaw = input.handle.trim();
  const displayName = input.displayName.trim();
  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, error: 'Invalid email shape.' };
  }
  if (
    input.password.length < PASSWORD_MIN_LENGTH ||
    input.password.length > PASSWORD_MAX_LENGTH
  ) {
    return { ok: false, error: `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} chars.` };
  }
  // Validate handle BEFORE case-folding so uppercase / leading-digit /
  // leading-hyphen are rejected at signup time (not silently coerced).
  if (!HANDLE_REGEX.test(handleRaw)) {
    return { ok: false, error: 'Handle must be 3-32 lowercase letters/digits/hyphens, starting with a letter.' };
  }
  const handle = handleRaw; // Already lowercase per HANDLE_REGEX.
  if (displayName.length === 0 || displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return { ok: false, error: `Display name must be 1-${DISPLAY_NAME_MAX_LENGTH} chars.` };
  }
  if (_byEmail.has(email)) {
    return { ok: false, error: 'Email already in use.' };
  }
  if (_byHandle.has(handle)) {
    return { ok: false, error: 'Handle already in use.' };
  }
  const id: AccountId = CREATOR_ID_PREFIX + randomUUID();
  const creator: Creator = Object.freeze({
    id,
    kind: 'creator' as const,
    email,
    passwordPlaceholder: input.password,
    joinedAtUnixMs: input.nowUnixMs ?? Date.now(),
    handle,
    displayName,
    gameIds: Object.freeze([]),
    totalPlaysPlaceholder: 0,
    averageRatingPlaceholder: 0,
    earningsGbpMinorPlaceholder: 0,
  });
  _byId.set(id, creator);
  _byHandle.set(handle, creator);
  _byEmail.set(email, creator);
  return { ok: true, account: creator };
}

export function findCreatorById(id: AccountId): Creator | null {
  return _byId.get(id) ?? null;
}

export function findCreatorByHandle(handle: string): Creator | null {
  return _byHandle.get(handle.trim().toLowerCase()) ?? null;
}

export function findCreatorByEmail(email: string): Creator | null {
  return _byEmail.get(email.trim().toLowerCase()) ?? null;
}

export function listCreatorHandles(): ReadonlyArray<string> {
  return Object.freeze([..._byHandle.keys()]);
}

/**
 * Canonical bytes for an attribution receipt -- four fields,
 * NUL-separated UTF-8 (cohort shape). Used by the marketplace publish
 * surface (Phase 3.1+) when stamping a game with the creator's
 * attribution under the cohort Mirror-Mark. A regulator with the corpus
 * + key can re-derive the mark and confirm the game's creator binding.
 */
export function canonicalAttributionReceiptPayload(opts: {
  gameId: string;
  creatorId: AccountId;
  handle: string;
  publishedAtUnixMs: number;
}): Buffer {
  const fields: Array<[string, string]> = [
    ['game_id', opts.gameId],
    ['creator_id', opts.creatorId],
    ['handle', opts.handle],
    ['published_at_unix_ms', String(opts.publishedAtUnixMs)],
  ];
  const parts = fields.map(([k, v]) => `${k}=${v}`);
  return Buffer.from(parts.join('\x00'), 'utf8');
}

/** Clear the store. Test-only. */
export function resetCreatorStoreForTests(): void {
  _byId.clear();
  _byHandle.clear();
  _byEmail.clear();
}
