/**
 * Conjure Phase-3 Player accounts.
 *
 * Player records are created via signup; identity is signed via the
 * cohort Mirror-Mark on session-cookie issue (see `auth.ts`). Lookup is
 * keyed by case-folded email.
 *
 * R145 strict-additive: this file is NEW. The Phase-1 mechanics + studio
 * surfaces are UNCHANGED.
 *
 * R143 LOUD-ONCE coupling (fired by `accounts_store.ts`):
 *
 *   - CONJURE_ACCOUNTS_AUTH_NOT_LIVE_PLACEHOLDER -- session cookies are
 *     not yet enforced on protected routes. Phase-3+ wires the cookie
 *     check at the route-load layer.
 *   - CONJURE_ACCOUNTS_PASSWORD_HASHING_PLACEHOLDER -- passwords are
 *     stored as the literal cleartext string per
 *     `passwordPlaceholder`. Argon2id / scrypt is Phase-3+.
 *   - CONJURE_ACCOUNTS_GDPR_ARTICLE_6_LAWFUL_BASIS_NOT_DOCUMENTED --
 *     the lawful basis for processing email + handle + earnings is
 *     founder-drafted and counsel review has NOT YET completed.
 *
 * Mirror-Mark signing of Player identity:
 *
 *   When `auth.ts` issues a session cookie it stamps a canonical
 *   PlayerIdentity payload (id / email / kind / issuedAtUnixMs) with
 *   the cohort `mirrorMarkSign()`. The cookie body is the
 *   base64url(canonical) + `.` + mark; a regulator with the deployed
 *   lore corpus + production key can re-derive both halves and
 *   confirm the session is authentic.
 *
 * Closed-set API (Phase-3 Phase-A surface):
 *
 *   - createPlayer({email, password}) -> {ok, account} | {ok: false, error}
 *   - findPlayerById(id) -> Player | null
 *   - findPlayerByEmail(email) -> Player | null
 *   - listPlayerIds() -> readonly array
 *   - resetPlayerStoreForTests() -> void
 *
 * The full mixed-kind accounts store lives in
 * `src/lib/server/accounts.ts`; this module is the typed Phase-3 Player
 * shape + canonical-payload helper used by `auth.ts`. The two stay
 * synchronised via the shared `Player` type in `src/lib/types/account.ts`.
 */

import { randomUUID } from 'node:crypto';

import type { AccountId, Player } from '../../lib/types/account';
import {
  EMAIL_REGEX,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../lib/types/account';

/** Canonical Player ID prefix. */
export const PLAYER_ID_PREFIX: string = 'acc_player_';

/** Module-level Player store. Lookup-by-id and lookup-by-email both O(1). */
const _byId: Map<AccountId, Player> = new Map();
const _byEmail: Map<string, Player> = new Map();

export type CreatePlayerInput = {
  readonly email: string;
  readonly password: string;
  /** Optional clock override -- test-only. Defaults to Date.now(). */
  readonly nowUnixMs?: number;
};

export type CreatePlayerResult =
  | { readonly ok: true; readonly account: Player }
  | { readonly ok: false; readonly error: string };

/**
 * Create a Player. Idempotent failure on duplicate email -- caller may
 * retry signup with a different email or call `findPlayerByEmail`.
 *
 * R157 substrate-native: pure TypeScript object. R143 advisories fire
 * via `src/lib/server/accounts.ts` on first call.
 */
export function createPlayer(input: CreatePlayerInput): CreatePlayerResult {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, error: 'Invalid email shape.' };
  }
  if (
    input.password.length < PASSWORD_MIN_LENGTH ||
    input.password.length > PASSWORD_MAX_LENGTH
  ) {
    return { ok: false, error: `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} chars.` };
  }
  if (_byEmail.has(email)) {
    return { ok: false, error: 'Email already in use.' };
  }
  const id: AccountId = PLAYER_ID_PREFIX + randomUUID();
  const player: Player = Object.freeze({
    id,
    kind: 'player' as const,
    email,
    passwordPlaceholder: input.password,
    joinedAtUnixMs: input.nowUnixMs ?? Date.now(),
  });
  _byId.set(id, player);
  _byEmail.set(email, player);
  return { ok: true, account: player };
}

/** Lookup a player by id. Returns null if not found. */
export function findPlayerById(id: AccountId): Player | null {
  return _byId.get(id) ?? null;
}

/**
 * Lookup a player by email. Email is case-folded before lookup. Returns
 * null if not found.
 */
export function findPlayerByEmail(email: string): Player | null {
  return _byEmail.get(email.trim().toLowerCase()) ?? null;
}

/** Snapshot of player ids -- frozen at call time. */
export function listPlayerIds(): ReadonlyArray<AccountId> {
  return Object.freeze([..._byId.keys()]);
}

/**
 * Canonical bytes for a Player session identity. Three load-bearing
 * fields, NUL-separated UTF-8 (cohort shape). Used by `auth.ts` when
 * stamping the session cookie with the Mirror-Mark.
 */
export function canonicalPlayerIdentityPayload(opts: {
  id: AccountId;
  email: string;
  issuedAtUnixMs: number;
}): Buffer {
  const fields: Array<[string, string]> = [
    ['account_id', opts.id],
    ['email', opts.email],
    ['issued_at_unix_ms', String(opts.issuedAtUnixMs)],
  ];
  const parts = fields.map(([k, v]) => `${k}=${v}`);
  return Buffer.from(parts.join('\x00'), 'utf8');
}

/** Clear the store. Test-only. */
export function resetPlayerStoreForTests(): void {
  _byId.clear();
  _byEmail.clear();
}
