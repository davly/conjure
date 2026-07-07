/**
 * Conjure Phase-3 account types.
 *
 * Two account kinds:
 *
 *   - Player   -- end-user who plays games. Identified by `AccountId`,
 *                 keyed by email (case-folded) for lookup, and signed via
 *                 the cohort Mirror-Mark on session-cookie issue.
 *   - Creator  -- end-user who publishes games. Carries an additional
 *                 `handle` (URL-safe slug, unique) + `displayName` for
 *                 attribution receipts on the marketplace surface.
 *
 * R145 strict-additive: this file is NEW. Phase-1 types
 * (`MechanicKind` / `Category` / ...) in `game.ts` are UNCHANGED. The
 * marketplace types in `marketplace.ts` already declare a `Creator` shape
 * for the public marketplace surface; that surface (id / handle /
 * displayName / joinedAtUnixMs / followerCount) is the PUBLIC slice. The
 * `Creator` type here is the FULL accounts-store record (private fields
 * like email + earnings placeholder live here, never on the public
 * marketplace surface).
 *
 * Field-name discipline (R157 substrate-native):
 *
 *   - `id`             -- opaque `acc_...` string. Generated via
 *                         randomUUID() then `acc_` prefixed for grep.
 *   - `kind`           -- discriminator: 'player' | 'creator'.
 *   - `email`          -- lowercase case-folded; UNIQUE across the store.
 *   - `passwordPlaceholder` -- cleartext placeholder per Phase-2 advisory
 *                         `CONJURE_ACCOUNTS_PASSWORD_HASHING_PLACEHOLDER`.
 *                         Argon2id / scrypt is Phase-3+ wire-in.
 *   - `joinedAtUnixMs` -- account-creation timestamp.
 *
 * Creator-only fields:
 *
 *   - `handle`         -- URL-safe slug; lowercase letters / digits /
 *                         hyphens; first char must be a letter; 3-32
 *                         chars total; UNIQUE across creators.
 *   - `displayName`    -- human-readable name; 1-64 chars.
 *   - `gameIds`        -- frozen array of published game IDs.
 *   - `*Placeholder`   -- aggregate-statistics placeholders the Phase-3
 *                         persistent store will fill in. Phase-2 ships 0s.
 *
 * R143 LOUD-ONCE coupling: account-store mutations fire 3 R143
 * advisories on first call (auth-not-live / password-hashing-placeholder
 * / gdpr-article-6-not-documented) -- see `accounts_advisories.ts`.
 */

/**
 * Opaque account identifier. Prefix is `acc_` so a regulator grep finds
 * every reference site.
 */
export type AccountId = string;

/**
 * Account-kind discriminator. R145.B sibling event: adding a third kind
 * (e.g. 'operator') is behaviour-changing.
 */
export type AccountKind = 'player' | 'creator';

/** Account-kind canonical list, frozen at module load. */
export const ACCOUNT_KINDS: ReadonlyArray<AccountKind> = Object.freeze([
  'player',
  'creator',
]);

/**
 * Player record. The full accounts-store row -- private fields included.
 */
export interface Player {
  readonly id: AccountId;
  readonly kind: 'player';
  readonly email: string;
  readonly passwordPlaceholder: string;
  readonly joinedAtUnixMs: number;
}

/**
 * Creator record. The full accounts-store row -- private fields +
 * placeholder aggregates included.
 */
export interface Creator {
  readonly id: AccountId;
  readonly kind: 'creator';
  readonly email: string;
  readonly passwordPlaceholder: string;
  readonly joinedAtUnixMs: number;
  readonly handle: string;
  readonly displayName: string;
  readonly gameIds: ReadonlyArray<string>;
  /** Phase-3+ telemetry placeholder. Phase-2 returns 0. */
  readonly totalPlaysPlaceholder: number;
  /** Phase-3+ rating-aggregate placeholder. Phase-2 returns 0. */
  readonly averageRatingPlaceholder: number;
  /**
   * Phase-3+ creator-earnings placeholder in GBP minor units (pence).
   * Phase-2 returns 0; counsel review of revenue-share split is
   * NOT YET completed (see liability_footer.ts).
   */
  readonly earningsGbpMinorPlaceholder: number;
}

/** Union: either kind. */
export type Account = Player | Creator;

/**
 * Handle validation regex. Lowercase letters / digits / hyphens; first
 * char must be a letter; 3-32 chars total.
 */
export const HANDLE_REGEX: RegExp = /^[a-z][a-z0-9-]{2,31}$/;

/**
 * Email validation regex. Loose RFC-5321-ish; non-empty local-part + @ +
 * non-empty domain with at least one dot.
 */
export const EMAIL_REGEX: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Password placeholder min length (Phase-2). */
export const PASSWORD_MIN_LENGTH: number = 8;
/** Password placeholder max length (Phase-2). */
export const PASSWORD_MAX_LENGTH: number = 256;

/** Display-name max length. */
export const DISPLAY_NAME_MAX_LENGTH: number = 64;
