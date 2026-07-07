/**
 * Conjure DRM -- SignedLicense issuance + verification.
 *
 * THIS IS AN OPT-IN INTEGRITY LAYER (R160 OPT-IN, defaulted OFF via
 * `VITE_CONJURE_DRM_ENABLED`). It is NOT an anti-piracy enforcement layer.
 * Signing only proves authenticity (the bundle was issued by the holder of
 * the named HMAC key), it does NOT prevent piracy in any adversarial sense:
 *
 *   - An attacker who extracts the verification key from the runtime can
 *     forge bundles indistinguishable from authentic ones.
 *   - An attacker who patches the runtime to skip verification will see the
 *     unprotected game payload.
 *   - HMAC is a symmetric primitive -- shipping the verification key on the
 *     client is fundamentally a trust-the-client model.
 *
 * This module exists to give honest creators + honest players a tamper-
 * evident receipt-grade integrity surface (analogous to a signed JWT for an
 * issued license), NOT to thwart determined attackers. See
 * `docs/drm-policy.md` for the full disclosure.
 *
 * Cross-substrate cohort design choice:
 *
 *   Conjure shares the cohort-canonical L43 Mirror-Mark v1 wire format via
 *   the existing `src/lib/cohort/mirrormark/mirrormark.ts` module. The
 *   SignedLicense bundle is canonicalised via NUL-separated UTF-8 (cohort
 *   shape) and signed with the same `sign()` primitive. KAT-1 byte-identity
 *   is preserved -- the offline-verifiable test fixture in
 *   `mirrormark.test.ts` continues to round-trip.
 *
 * R150 IsStale predicate:
 *
 *   Two staleness axes:
 *
 *     1. License expiry -- `nowUnixMs >= expiryUnixMs` is stale.
 *     2. Entitlement-vocabulary version drift -- a license declared at an
 *        older `ENTITLEMENT_VOCAB_VERSION` than the current runtime is
 *        stale (additive-non-breaking schema bumps SHOULD remain compatible,
 *        but the verifier MAY treat older bundles as stale for re-issue).
 *
 * R145 / R145.B compliance:
 *
 *   - This file ships as LIBRARY ONLY. No SvelteKit route consumes the
 *     verifier yet; wire-in is a future R145.B SIBLING-NOT-STACKED branch.
 *   - Default OFF via `VITE_CONJURE_DRM_ENABLED` env-flag (R160 OPT-IN).
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  ENTITLEMENT_VOCAB_VERSION,
  isEntitlement,
  normaliseEntitlements,
  type Entitlement,
} from './entitlement';
import { CORPUS_SHA_LEN, sign as mirrorMarkSign } from '../cohort/mirrormark/mirrormark';

/**
 * License bundle schema version. Pinned for the cohort firewall.
 * R145 strict-additive -- bumps are additive-non-breaking only.
 */
export const LICENSE_SCHEMA_VERSION: string = 'conjure.license.v1';

/**
 * License-bundle wire prefix. Distinct from the L43 Mirror-Mark wire prefix
 * (`lore@v1:`) so a grep across the ecosystem can find every license-bundle
 * site without false positives.
 */
export const LICENSE_WIRE_PREFIX: string = 'license@v1:';

/**
 * Maximum acceptable license lifetime in milliseconds. 365 days. A license
 * declared with an expiry beyond this is rejected as `MalformedLicense`.
 * Pinned for the cohort firewall.
 */
export const MAX_LICENSE_LIFETIME_MS: number = 365 * 24 * 60 * 60 * 1000;

/**
 * Cohort-canonical R160 OPT-IN env-flag name. Reading-only -- the actual
 * "is DRM enabled" check is performed by callers via
 * `isDrmEnabled(env)`.
 */
export const DRM_ENABLED_ENV_FLAG: string = 'VITE_CONJURE_DRM_ENABLED';

// ---------------------------------------------------------------------------
// Errors -- sentinel-shaped (each subclass distinct, name match used by callers).
// ---------------------------------------------------------------------------

export class LicenseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LicenseError';
  }
}

export class MalformedLicense extends LicenseError {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedLicense';
  }
}

export class UnknownLicenseVersion extends LicenseError {
  constructor(message: string) {
    super(message);
    this.name = 'UnknownLicenseVersion';
  }
}

export class LicenseExpired extends LicenseError {
  constructor(message: string) {
    super(message);
    this.name = 'LicenseExpired';
  }
}

export class LicenseSignatureMismatch extends LicenseError {
  constructor(message: string) {
    super(message);
    this.name = 'LicenseSignatureMismatch';
  }
}

// ---------------------------------------------------------------------------
// SignedLicense -- the bundle shape.
// ---------------------------------------------------------------------------

/**
 * SignedLicense data class. A Mirror-Mark-signed bundle that names the
 * (gameId, playerId, issueDate, expiry, entitlements) tuple under a single
 * HMAC signature.
 *
 * The shape is INTENTIONALLY minimal -- five load-bearing fields plus the
 * vocab version + signature. Phase 4+ may add optional fields on a R145.B
 * SIBLING-NOT-STACKED branch (e.g. seasonId, dlcPackId), each with a paired
 * regression test.
 */
export interface SignedLicense {
  readonly schemaVersion: string;
  readonly gameId: string;
  readonly playerId: string;
  readonly issueDateUnixMs: number;
  readonly expiryUnixMs: number;
  readonly entitlements: ReadonlyArray<Entitlement>;
  readonly entitlementVocabVersion: string;
  /** Base64url-encoded HMAC-SHA256 digest over the canonical payload. */
  readonly signature: string;
}

/**
 * The unsigned subset of SignedLicense -- the data the issuer feeds in.
 */
export interface UnsignedLicenseClaims {
  readonly gameId: string;
  readonly playerId: string;
  readonly issueDateUnixMs: number;
  readonly expiryUnixMs: number;
  readonly entitlements: ReadonlyArray<Entitlement>;
}

// ---------------------------------------------------------------------------
// Canonical payload + sign + verify.
// ---------------------------------------------------------------------------

/**
 * Canonical bytes for a SignedLicense payload. NUL-separated UTF-8 (cohort
 * shape -- same as `canonicalGameReceiptPayload` in mirrormark.ts).
 *
 * Field order is fixed and load-bearing; reordering changes the signature.
 * Two licenses with identical claims produce byte-identical payloads
 * regardless of input entitlement declaration order (entitlements are
 * normalised to canonical order via `normaliseEntitlements`).
 *
 * Fields:
 *   schema_version / game_id / player_id / issue_date_unix_ms /
 *   expiry_unix_ms / entitlements (comma-joined normalised) /
 *   entitlement_vocab_version
 */
export function canonicalLicensePayload(claims: UnsignedLicenseClaims): Buffer {
  const ents = normaliseEntitlements(claims.entitlements);
  const fields: Array<[string, string]> = [
    ['schema_version', LICENSE_SCHEMA_VERSION],
    ['game_id', claims.gameId],
    ['player_id', claims.playerId],
    ['issue_date_unix_ms', String(claims.issueDateUnixMs)],
    ['expiry_unix_ms', String(claims.expiryUnixMs)],
    ['entitlements', ents.join(',')],
    ['entitlement_vocab_version', ENTITLEMENT_VOCAB_VERSION],
  ];
  const parts = fields.map(([k, v]) => `${k}=${v}`);
  return Buffer.from(parts.join('\x00'), 'utf8');
}

/**
 * Issue a SignedLicense -- HMAC-SHA256 over the canonical payload keyed by
 * the supplied issuer key.
 *
 * The signature is NOT a full L43 Mirror-Mark (which embeds the corpus
 * prefix in the wire body); it is a bare base64url-encoded HMAC over the
 * canonical payload. Callers who need a corpus-pinned Mirror-Mark over the
 * same claims should additionally call `mirrorMarkSign()` from the cohort
 * module with the canonical payload as the message body.
 *
 * Throws `MalformedLicense` if the claims fail validation.
 */
export function issueLicense(
  claims: UnsignedLicenseClaims,
  issuerKey: Buffer | Uint8Array,
): SignedLicense {
  validateClaims(claims);
  const payload = canonicalLicensePayload(claims);
  const hmac = createHmac('sha256', issuerKey);
  hmac.update(payload);
  const sig = hmac.digest();
  return Object.freeze({
    schemaVersion: LICENSE_SCHEMA_VERSION,
    gameId: claims.gameId,
    playerId: claims.playerId,
    issueDateUnixMs: claims.issueDateUnixMs,
    expiryUnixMs: claims.expiryUnixMs,
    entitlements: normaliseEntitlements(claims.entitlements),
    entitlementVocabVersion: ENTITLEMENT_VOCAB_VERSION,
    signature: sig.toString('base64url'),
  });
}

function validateClaims(claims: UnsignedLicenseClaims): void {
  if (!claims.gameId || claims.gameId.length === 0) {
    throw new MalformedLicense('gameId must be non-empty');
  }
  if (!claims.playerId || claims.playerId.length === 0) {
    throw new MalformedLicense('playerId must be non-empty');
  }
  if (!Number.isFinite(claims.issueDateUnixMs) || claims.issueDateUnixMs <= 0) {
    throw new MalformedLicense('issueDateUnixMs must be a positive finite number');
  }
  if (!Number.isFinite(claims.expiryUnixMs) || claims.expiryUnixMs <= 0) {
    throw new MalformedLicense('expiryUnixMs must be a positive finite number');
  }
  if (claims.expiryUnixMs <= claims.issueDateUnixMs) {
    throw new MalformedLicense('expiryUnixMs must be strictly after issueDateUnixMs');
  }
  if (claims.expiryUnixMs - claims.issueDateUnixMs > MAX_LICENSE_LIFETIME_MS) {
    throw new MalformedLicense(
      `license lifetime exceeds MAX_LICENSE_LIFETIME_MS (${MAX_LICENSE_LIFETIME_MS} ms)`,
    );
  }
  if (claims.entitlements.length === 0) {
    throw new MalformedLicense('entitlements must be non-empty');
  }
  for (const e of claims.entitlements) {
    if (!isEntitlement(e)) {
      throw new MalformedLicense(`unknown entitlement: ${String(e)}`);
    }
  }
}

/**
 * Re-derive the signature for `license` using `verifierKey` and compare
 * timing-safely with the embedded signature.
 *
 * Throws:
 *   - `UnknownLicenseVersion` if the schema version is not recognised.
 *   - `MalformedLicense` if the bundle shape is invalid.
 *   - `LicenseExpired` if `nowUnixMs >= license.expiryUnixMs`.
 *   - `LicenseSignatureMismatch` if the embedded signature does not re-derive.
 *
 * Returns true on success.
 */
export function verifyLicense(
  license: SignedLicense,
  verifierKey: Buffer | Uint8Array,
  nowUnixMs: number,
): boolean {
  if (license.schemaVersion !== LICENSE_SCHEMA_VERSION) {
    throw new UnknownLicenseVersion(
      `unknown schema version: ${license.schemaVersion}`,
    );
  }
  // Re-validate claims (rejects bundles with bad shapes the issuer should
  // have caught -- defends against malformed-on-wire).
  validateClaims({
    gameId: license.gameId,
    playerId: license.playerId,
    issueDateUnixMs: license.issueDateUnixMs,
    expiryUnixMs: license.expiryUnixMs,
    entitlements: license.entitlements,
  });
  if (nowUnixMs >= license.expiryUnixMs) {
    throw new LicenseExpired(
      `license expired at ${license.expiryUnixMs}, now ${nowUnixMs}`,
    );
  }
  const payload = canonicalLicensePayload({
    gameId: license.gameId,
    playerId: license.playerId,
    issueDateUnixMs: license.issueDateUnixMs,
    expiryUnixMs: license.expiryUnixMs,
    entitlements: license.entitlements,
  });
  const hmac = createHmac('sha256', verifierKey);
  hmac.update(payload);
  const expected = hmac.digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(license.signature, 'base64url');
  } catch (err) {
    throw new MalformedLicense(`signature base64 decode failed: ${String(err)}`);
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new LicenseSignatureMismatch('HMAC re-derivation does not match');
  }
  return true;
}

/**
 * R150 IsStale predicate. A license is stale if any of:
 *
 *   - `nowUnixMs >= license.expiryUnixMs` (expiry path).
 *   - `license.entitlementVocabVersion !== ENTITLEMENT_VOCAB_VERSION`
 *     (vocab-drift path).
 *
 * Returns a 2-tuple {stale, reason} so callers can branch on the reason
 * for re-issue UX. The reason is one of:
 *
 *   - 'expired' -- license has passed its expiry.
 *   - 'vocab_drift' -- entitlement vocab version drift.
 *   - 'fresh'   -- not stale.
 */
export interface StaleVerdict {
  readonly stale: boolean;
  readonly reason: 'expired' | 'vocab_drift' | 'fresh';
}

export function isStale(license: SignedLicense, nowUnixMs: number): StaleVerdict {
  if (nowUnixMs >= license.expiryUnixMs) {
    return Object.freeze({ stale: true, reason: 'expired' as const });
  }
  if (license.entitlementVocabVersion !== ENTITLEMENT_VOCAB_VERSION) {
    return Object.freeze({ stale: true, reason: 'vocab_drift' as const });
  }
  return Object.freeze({ stale: false, reason: 'fresh' as const });
}

// ---------------------------------------------------------------------------
// Optional Mirror-Mark companion stamp.
// ---------------------------------------------------------------------------

/**
 * Optionally stamp the canonical license payload with a corpus-pinned L43
 * Mirror-Mark. Returns the full Mirror-Mark string (`lore@v1:...`).
 *
 * Useful for regulators / partner-ops who hold the lore corpus and want to
 * confirm the license was issued against a known lore-version (the corpus
 * SHA prefix in the Mirror-Mark must match a clean re-hash of the deployed
 * `lore.tar.gz`).
 */
export function stampLicenseWithMirrorMark(
  license: SignedLicense,
  corpusSha: Buffer,
  key: Buffer | Uint8Array,
): string {
  if (corpusSha.length !== CORPUS_SHA_LEN) {
    throw new Error(
      `corpusSha must be ${CORPUS_SHA_LEN} bytes; got ${corpusSha.length}`,
    );
  }
  const payload = canonicalLicensePayload({
    gameId: license.gameId,
    playerId: license.playerId,
    issueDateUnixMs: license.issueDateUnixMs,
    expiryUnixMs: license.expiryUnixMs,
    entitlements: license.entitlements,
  });
  return mirrorMarkSign(corpusSha, payload, key);
}

// ---------------------------------------------------------------------------
// R160 OPT-IN gate.
// ---------------------------------------------------------------------------

/**
 * Returns true if DRM is explicitly opted-in via the
 * `VITE_CONJURE_DRM_ENABLED` env flag. Defaulted OFF.
 *
 * Accepted truthy values: '1', 'true', 'TRUE', 'yes', 'YES'.
 * All other values (including unset, empty, '0', 'false') are OFF.
 *
 * The env-flag name (`VITE_CONJURE_DRM_ENABLED`) is exported as
 * `DRM_ENABLED_ENV_FLAG` for grep-discoverability.
 */
export function isDrmEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env[DRM_ENABLED_ENV_FLAG] ?? '';
  return ['1', 'true', 'TRUE', 'yes', 'YES'].includes(raw);
}
