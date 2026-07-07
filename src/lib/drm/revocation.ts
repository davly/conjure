/**
 * Conjure DRM -- append-only revocation ledger.
 *
 * R145 strict-additive: this file is NEW. The DRM `license.ts` +
 * `entitlement.ts` + `session.ts` modules are UNCHANGED.
 *
 * # Append-only semantics
 *
 *   The revocation ledger is an APPEND-ONLY immutable log. Every entry
 *   is a signed `RevocationRecord` carrying:
 *
 *     - licenseSignature (the load-bearing license identifier)
 *     - reason (closed-enum)
 *     - revokedAtUnixMs (event time)
 *     - revokedBy (operator id; non-empty)
 *
 *   Each record is signed via HMAC-SHA256 over the canonical payload
 *   (NUL-separated UTF-8). The signature is included in the record so
 *   a regulator with the verify key can re-derive each entry and
 *   confirm the ledger has not been retroactively edited.
 *
 *   Chain integrity: each record carries `prevSignature` -- the
 *   signature of the prior record (or the genesis tag for the first
 *   entry). A cohort verifier walking the chain can confirm the order
 *   + the absence of insertions / deletions.
 *
 * # Closed-enum reasons
 *
 *   - 'chargeback'           -- payment-processor chargeback received.
 *   - 'fraud_detection'      -- platform fraud-detection signal.
 *   - 'creator_takedown'     -- creator-initiated DMCA / takedown.
 *   - 'gdpr_erasure_request' -- GDPR Article 17 erasure obligation.
 *   - 'platform_violation'   -- terms-of-use violation by the player.
 *   - 'key_compromise'       -- issuer-key compromise; bulk re-issue.
 *
 * # R160 OPT-IN
 *
 *   This module is GATED by `VITE_CONJURE_DRM_ENABLED` (defaulted
 *   OFF). The module exports the primitives but does NOT self-gate;
 *   the caller checks `isDrmEnabled(env)` before invoking.
 *
 * # No mutation surface
 *
 *   There is NO `unrevoke()` function. A revoked license stays
 *   revoked; restoring access requires issuing a fresh license. This
 *   is a deliberate audit-trail discipline aligned with R155
 *   VERDICT-REQUIRES-COMMIT-SHA + R166 LIABILITY-FOOTER-CONST.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

import { isDrmEnabled } from './license';

/** Wire-format prefix for a signed revocation record. */
export const REVOCATION_WIRE_PREFIX: string = 'revocation@v1:';

/** Genesis "previous signature" -- pinned for the first record in the chain. */
export const GENESIS_PREV_SIGNATURE: string = 'GENESIS@v1';

/** Cohort-canonical env-flag for the revocation-signing key. */
export const REVOCATION_KEY_ENV_FLAG: string = 'CONJURE_DRM_REVOCATION_KEY';

/**
 * Loud-by-name placeholder key.
 */
export const DEV_REVOCATION_KEY_PLACEHOLDER: string =
  'iik_dev_CONJURE_DRM_REVOCATION_NOT_FOR_PRODUCTION';

// ---------------------------------------------------------------------------
// Closed-enum revocation reasons.
// ---------------------------------------------------------------------------

export type RevocationReason =
  | 'chargeback'
  | 'fraud_detection'
  | 'creator_takedown'
  | 'gdpr_erasure_request'
  | 'platform_violation'
  | 'key_compromise';

export const REVOCATION_REASONS: ReadonlyArray<RevocationReason> = Object.freeze([
  'chargeback',
  'fraud_detection',
  'creator_takedown',
  'gdpr_erasure_request',
  'platform_violation',
  'key_compromise',
]);

export const REVOCATION_REASON_COUNT: number = 6;

export function isRevocationReason(value: string): value is RevocationReason {
  return (REVOCATION_REASONS as ReadonlyArray<string>).includes(value);
}

// ---------------------------------------------------------------------------
// Errors -- sentinel-shaped.
// ---------------------------------------------------------------------------

export class RevocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RevocationError';
  }
}

export class MalformedRevocationRecord extends RevocationError {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedRevocationRecord';
  }
}

export class RevocationChainBroken extends RevocationError {
  constructor(message: string) {
    super(message);
    this.name = 'RevocationChainBroken';
  }
}

export class RevocationSignatureMismatch extends RevocationError {
  constructor(message: string) {
    super(message);
    this.name = 'RevocationSignatureMismatch';
  }
}

// ---------------------------------------------------------------------------
// Record shape + canonical payload.
// ---------------------------------------------------------------------------

export interface RevocationRecord {
  readonly licenseSignature: string;
  readonly reason: RevocationReason;
  readonly revokedAtUnixMs: number;
  readonly revokedBy: string;
  readonly prevSignature: string;
  /** Base64url-encoded HMAC over the canonical payload. */
  readonly signature: string;
}

/**
 * Canonical bytes for a revocation record. Five load-bearing fields,
 * NUL-separated UTF-8.
 */
export function canonicalRevocationPayload(record: {
  licenseSignature: string;
  reason: RevocationReason;
  revokedAtUnixMs: number;
  revokedBy: string;
  prevSignature: string;
}): Buffer {
  const fields: Array<[string, string]> = [
    ['license_signature', record.licenseSignature],
    ['reason', record.reason],
    ['revoked_at_unix_ms', String(record.revokedAtUnixMs)],
    ['revoked_by', record.revokedBy],
    ['prev_signature', record.prevSignature],
  ];
  const parts = fields.map(([k, v]) => `${k}=${v}`);
  return Buffer.from(parts.join('\x00'), 'utf8');
}

// ---------------------------------------------------------------------------
// Ledger state.
// ---------------------------------------------------------------------------

/** Append-only list of records. */
const _ledger: RevocationRecord[] = [];

/** Lookup index: licenseSignature -> RevocationRecord (most recent wins). */
const _byLicenseSig: Map<string, RevocationRecord> = new Map();

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

export function resolveRevocationKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  const raw = env[REVOCATION_KEY_ENV_FLAG] ?? '';
  const keyStr = raw === '' ? DEV_REVOCATION_KEY_PLACEHOLDER : raw;
  return Buffer.from(keyStr, 'utf8');
}

export type AppendRevocationInput = {
  readonly licenseSignature: string;
  readonly reason: RevocationReason;
  readonly revokedAtUnixMs: number;
  readonly revokedBy: string;
};

/**
 * Append a new revocation record to the ledger. The record is signed
 * with the supplied key; its prevSignature is bound to the most-recent
 * record's signature (or GENESIS_PREV_SIGNATURE if the ledger is
 * empty).
 *
 * Idempotent on duplicate (licenseSignature, reason) pairs in the
 * SAME tick: the first record sticks; subsequent appends for the same
 * (sig, reason) are rejected as `MalformedRevocationRecord`. A
 * deliberate re-revocation under a DIFFERENT reason IS allowed and
 * appends a fresh chain link.
 */
export function appendRevocation(
  input: AppendRevocationInput,
  signingKey: Buffer | Uint8Array,
): RevocationRecord {
  if (!input.licenseSignature || input.licenseSignature.length === 0) {
    throw new MalformedRevocationRecord('licenseSignature must be non-empty');
  }
  if (!isRevocationReason(input.reason)) {
    throw new MalformedRevocationRecord(`unknown reason: ${String(input.reason)}`);
  }
  if (!Number.isFinite(input.revokedAtUnixMs) || input.revokedAtUnixMs <= 0) {
    throw new MalformedRevocationRecord('revokedAtUnixMs must be positive finite');
  }
  if (!input.revokedBy || input.revokedBy.length === 0) {
    throw new MalformedRevocationRecord('revokedBy must be non-empty');
  }
  // Reject exact-duplicate (licenseSig, reason) pairs.
  const existing = _byLicenseSig.get(input.licenseSignature);
  if (existing !== undefined && existing.reason === input.reason) {
    throw new MalformedRevocationRecord(
      `license already revoked with reason '${input.reason}'`,
    );
  }
  const prevSignature =
    _ledger.length === 0 ? GENESIS_PREV_SIGNATURE : _ledger[_ledger.length - 1].signature;
  const payload = canonicalRevocationPayload({
    licenseSignature: input.licenseSignature,
    reason: input.reason,
    revokedAtUnixMs: input.revokedAtUnixMs,
    revokedBy: input.revokedBy,
    prevSignature,
  });
  const hmac = createHmac('sha256', signingKey);
  hmac.update(payload);
  const sig = hmac.digest().toString('base64url');
  const record: RevocationRecord = Object.freeze({
    licenseSignature: input.licenseSignature,
    reason: input.reason,
    revokedAtUnixMs: input.revokedAtUnixMs,
    revokedBy: input.revokedBy,
    prevSignature,
    signature: sig,
  });
  _ledger.push(record);
  _byLicenseSig.set(input.licenseSignature, record);
  return record;
}

/** Returns true if `licenseSignature` has been revoked. */
export function isRevoked(licenseSignature: string): boolean {
  return _byLicenseSig.has(licenseSignature);
}

/** Lookup the revocation record for a license, or null if not revoked. */
export function findRevocation(licenseSignature: string): RevocationRecord | null {
  return _byLicenseSig.get(licenseSignature) ?? null;
}

/** Snapshot of the full ledger -- frozen. */
export function listLedger(): ReadonlyArray<RevocationRecord> {
  return Object.freeze([..._ledger]);
}

/** Ledger size -- O(1). */
export function ledgerSize(): number {
  return _ledger.length;
}

/**
 * Verify the integrity of the full ledger -- every record's signature
 * re-derives + every record's prevSignature matches the prior record's
 * signature (or GENESIS_PREV_SIGNATURE for the first record).
 *
 * Returns true on success; throws `RevocationChainBroken` or
 * `RevocationSignatureMismatch` on first failure.
 */
export function verifyChain(verifyingKey: Buffer | Uint8Array): boolean {
  let expectedPrev: string = GENESIS_PREV_SIGNATURE;
  for (let i = 0; i < _ledger.length; i++) {
    const record = _ledger[i];
    if (record.prevSignature !== expectedPrev) {
      throw new RevocationChainBroken(
        `record ${i}: prevSignature ${record.prevSignature} != expected ${expectedPrev}`,
      );
    }
    const payload = canonicalRevocationPayload({
      licenseSignature: record.licenseSignature,
      reason: record.reason,
      revokedAtUnixMs: record.revokedAtUnixMs,
      revokedBy: record.revokedBy,
      prevSignature: record.prevSignature,
    });
    const hmac = createHmac('sha256', verifyingKey);
    hmac.update(payload);
    const expected = hmac.digest();
    let actual: Buffer;
    try {
      actual = Buffer.from(record.signature, 'base64url');
    } catch (err) {
      throw new MalformedRevocationRecord(
        `record ${i}: signature base64 decode failed: ${String(err)}`,
      );
    }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new RevocationSignatureMismatch(
        `record ${i}: HMAC re-derivation does not match`,
      );
    }
    expectedPrev = record.signature;
  }
  return true;
}

/** Clear the ledger. Test-only. Production code MUST NOT call this. */
export function resetRevocationLedgerForTests(): void {
  _ledger.length = 0;
  _byLicenseSig.clear();
}

/** Re-export the R160 OPT-IN gate so the cohort firewall has one grep path. */
export { isDrmEnabled };
