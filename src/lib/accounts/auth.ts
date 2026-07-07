/**
 * Conjure Phase-3 auth scaffold -- signed-cookie session pattern.
 *
 * No third-party deps. Pure Node `node:crypto` HMAC-SHA256 keyed by
 * `CONJURE_SESSION_KEY` (defaults to the loud-named
 * `iik_dev_CONJURE_SESSION_NOT_FOR_PRODUCTION` placeholder).
 *
 * The session cookie body is:
 *
 *   base64url(canonical-payload) || '.' || base64url(hmac-signature)
 *
 * Where canonical-payload is NUL-separated UTF-8 fields:
 *
 *   account_id={id}\x00email={email}\x00kind={player|creator}\x00issued_at_unix_ms={ts}\x00expiry_unix_ms={ts}
 *
 * Verification re-derives the HMAC over the canonical payload and
 * compares timing-safely. Expired sessions reject with
 * `SessionExpired`; tampered cookies reject with
 * `SessionSignatureMismatch`.
 *
 * # Why signed cookies (not JWT, not OAuth, not third-party)
 *
 *  - Zero third-party deps -- stdlib only (`node:crypto`).
 *  - Same primitive as the cohort Mirror-Mark (`createHmac` /
 *    `timingSafeEqual`) -- a regulator with the cohort verifier can
 *    re-derive the session signature with no Conjure-specific tooling.
 *  - Stateless server -- no session table; the cookie carries the
 *    identity claim under the host's signature.
 *
 * # Honest-defaults
 *
 *  - CONJURE_ACCOUNTS_AUTH_NOT_LIVE_PLACEHOLDER fires on first
 *    `issueSession()` call (the route layer still does NOT enforce the
 *    cookie -- routes accept identity via form fields in Phase-3
 *    Phase-A).
 *  - Default key is a loud-named placeholder -- production deployments
 *    MUST override `CONJURE_SESSION_KEY`.
 *
 * # R150 IsStale
 *
 *  A session is stale if any of:
 *   - `nowUnixMs >= expiryUnixMs` (expiry path).
 *   - `nowUnixMs - issuedAtUnixMs > MAX_SESSION_LIFETIME_MS` (max-lifetime path).
 *
 * # R143 advisories
 *
 *  Fire once per process from the `loudOnce` accounts-advisory list (see
 *  `src/lib/server/accounts.ts`).
 *
 * # R145 / R145.B
 *
 *  This module is LIBRARY-ONLY (R176 LIBRARY-FIRST-WIRE-LATER). The
 *  SvelteKit route layer does NOT yet enforce the cookie on protected
 *  routes; wire-in is a future R145.B SIBLING-NOT-STACKED branch.
 *
 * # Mirror-Mark companion
 *
 *  `stampSessionWithMirrorMark(session, corpusSha, key)` -> Mirror-Mark
 *  string. Lets a regulator with the corpus + production key pin the
 *  session to a known lore-version.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

import type { AccountId, AccountKind } from '../../lib/types/account';
import { CORPUS_SHA_LEN, sign as mirrorMarkSign } from '../cohort/mirrormark/mirrormark';

/** Cookie name. Pinned for the cohort firewall. */
export const SESSION_COOKIE_NAME: string = 'conjure_session';

/** Session wire-format prefix. Distinct from L43 Mirror-Mark prefix. */
export const SESSION_WIRE_PREFIX: string = 'session@v1:';

/** Cohort-canonical env-flag name for the session-signing key. */
export const SESSION_KEY_ENV_FLAG: string = 'CONJURE_SESSION_KEY';

/**
 * Loud-by-name placeholder key. Production callers MUST override via
 * `CONJURE_SESSION_KEY` -- the `iik_dev_CONJURE_SESSION_` prefix makes
 * any leaked-to-prod use grep-loud across logs.
 */
export const DEV_SESSION_KEY_PLACEHOLDER: string =
  'iik_dev_CONJURE_SESSION_NOT_FOR_PRODUCTION';

/** Default session lifetime: 7 days. */
export const DEFAULT_SESSION_LIFETIME_MS: number = 7 * 24 * 60 * 60 * 1000;

/** Maximum acceptable session lifetime: 30 days. */
export const MAX_SESSION_LIFETIME_MS: number = 30 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Errors -- sentinel-shaped (each subclass distinct, name match used by callers).
// ---------------------------------------------------------------------------

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionError';
  }
}

export class MalformedSession extends SessionError {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedSession';
  }
}

export class UnknownSessionVersion extends SessionError {
  constructor(message: string) {
    super(message);
    this.name = 'UnknownSessionVersion';
  }
}

export class SessionExpired extends SessionError {
  constructor(message: string) {
    super(message);
    this.name = 'SessionExpired';
  }
}

export class SessionSignatureMismatch extends SessionError {
  constructor(message: string) {
    super(message);
    this.name = 'SessionSignatureMismatch';
  }
}

// ---------------------------------------------------------------------------
// Session shape + canonical payload.
// ---------------------------------------------------------------------------

/**
 * Resolved session claims after verifying a cookie body.
 */
export interface Session {
  readonly accountId: AccountId;
  readonly email: string;
  readonly kind: AccountKind;
  readonly issuedAtUnixMs: number;
  readonly expiryUnixMs: number;
}

export type IssueSessionInput = {
  readonly accountId: AccountId;
  readonly email: string;
  readonly kind: AccountKind;
  readonly issuedAtUnixMs: number;
  /** Optional explicit expiry. Defaults to issued + DEFAULT_SESSION_LIFETIME_MS. */
  readonly expiryUnixMs?: number;
};

/**
 * Canonical bytes for a Session. Five load-bearing fields, NUL-separated
 * UTF-8 (cohort shape). Field order is fixed -- reordering changes the
 * signature.
 */
export function canonicalSessionPayload(session: Session): Buffer {
  const fields: Array<[string, string]> = [
    ['account_id', session.accountId],
    ['email', session.email],
    ['kind', session.kind],
    ['issued_at_unix_ms', String(session.issuedAtUnixMs)],
    ['expiry_unix_ms', String(session.expiryUnixMs)],
  ];
  const parts = fields.map(([k, v]) => `${k}=${v}`);
  return Buffer.from(parts.join('\x00'), 'utf8');
}

// ---------------------------------------------------------------------------
// Issue + verify.
// ---------------------------------------------------------------------------

/**
 * Resolve the session-signing key. Reads `CONJURE_SESSION_KEY` from
 * `env`; falls back to the loud-named placeholder.
 */
export function resolveSessionKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  const raw = env[SESSION_KEY_ENV_FLAG] ?? '';
  const keyStr = raw === '' ? DEV_SESSION_KEY_PLACEHOLDER : raw;
  return Buffer.from(keyStr, 'utf8');
}

/** Returns true if `key` is the loud-named placeholder. */
export function isPlaceholderSessionKey(key: Buffer | Uint8Array): boolean {
  const expected = Buffer.from(DEV_SESSION_KEY_PLACEHOLDER, 'utf8');
  if (key.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(key), expected);
}

/**
 * Issue a signed-cookie body. Validates input + writes the
 * `base64url(payload) || '.' || base64url(signature)` wire format.
 *
 * The full cookie string is `SESSION_WIRE_PREFIX + body`.
 */
export function issueSession(
  input: IssueSessionInput,
  signingKey: Buffer | Uint8Array,
): string {
  if (!input.accountId || input.accountId.length === 0) {
    throw new MalformedSession('accountId must be non-empty');
  }
  if (!input.email || input.email.length === 0) {
    throw new MalformedSession('email must be non-empty');
  }
  if (input.kind !== 'player' && input.kind !== 'creator') {
    throw new MalformedSession(`unknown kind: ${String(input.kind)}`);
  }
  if (!Number.isFinite(input.issuedAtUnixMs) || input.issuedAtUnixMs <= 0) {
    throw new MalformedSession('issuedAtUnixMs must be a positive finite number');
  }
  const expiryUnixMs =
    input.expiryUnixMs ?? input.issuedAtUnixMs + DEFAULT_SESSION_LIFETIME_MS;
  if (!Number.isFinite(expiryUnixMs) || expiryUnixMs <= input.issuedAtUnixMs) {
    throw new MalformedSession('expiryUnixMs must be strictly after issuedAtUnixMs');
  }
  if (expiryUnixMs - input.issuedAtUnixMs > MAX_SESSION_LIFETIME_MS) {
    throw new MalformedSession(
      `session lifetime exceeds MAX_SESSION_LIFETIME_MS (${MAX_SESSION_LIFETIME_MS} ms)`,
    );
  }
  const session: Session = Object.freeze({
    accountId: input.accountId,
    email: input.email,
    kind: input.kind,
    issuedAtUnixMs: input.issuedAtUnixMs,
    expiryUnixMs,
  });
  const payload = canonicalSessionPayload(session);
  const hmac = createHmac('sha256', signingKey);
  hmac.update(payload);
  const sig = hmac.digest();
  return (
    SESSION_WIRE_PREFIX +
    Buffer.from(payload).toString('base64url') +
    '.' +
    sig.toString('base64url')
  );
}

/**
 * Verify a signed-cookie body. Throws sentinel-shaped errors on failure;
 * returns the resolved `Session` on success.
 */
export function verifySession(
  cookieValue: string,
  verifyingKey: Buffer | Uint8Array,
  nowUnixMs: number,
): Session {
  if (!cookieValue.startsWith(SESSION_WIRE_PREFIX)) {
    throw new UnknownSessionVersion(`cookie missing prefix ${SESSION_WIRE_PREFIX}`);
  }
  const body = cookieValue.slice(SESSION_WIRE_PREFIX.length);
  const dot = body.indexOf('.');
  if (dot === -1) {
    throw new MalformedSession('cookie body missing `.` separator');
  }
  const payloadEncoded = body.slice(0, dot);
  const sigEncoded = body.slice(dot + 1);
  let payload: Buffer;
  let sig: Buffer;
  try {
    payload = Buffer.from(payloadEncoded, 'base64url');
    sig = Buffer.from(sigEncoded, 'base64url');
  } catch (err) {
    throw new MalformedSession(`base64url decode failed: ${String(err)}`);
  }
  const session = decodeCanonicalSession(payload);
  // Re-derive signature
  const hmac = createHmac('sha256', verifyingKey);
  hmac.update(payload);
  const expected = hmac.digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) {
    throw new SessionSignatureMismatch('HMAC re-derivation does not match');
  }
  if (nowUnixMs >= session.expiryUnixMs) {
    throw new SessionExpired(
      `session expired at ${session.expiryUnixMs}, now ${nowUnixMs}`,
    );
  }
  return session;
}

function decodeCanonicalSession(payload: Buffer): Session {
  const text = payload.toString('utf8');
  const parts = text.split('\x00');
  if (parts.length !== 5) {
    throw new MalformedSession(`expected 5 NUL-separated fields, got ${parts.length}`);
  }
  const fields = new Map<string, string>();
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq === -1) {
      throw new MalformedSession(`malformed field: ${p}`);
    }
    fields.set(p.slice(0, eq), p.slice(eq + 1));
  }
  const accountId = fields.get('account_id');
  const email = fields.get('email');
  const kind = fields.get('kind');
  const issuedAtStr = fields.get('issued_at_unix_ms');
  const expiryStr = fields.get('expiry_unix_ms');
  if (
    accountId === undefined ||
    email === undefined ||
    kind === undefined ||
    issuedAtStr === undefined ||
    expiryStr === undefined
  ) {
    throw new MalformedSession('one or more required fields missing');
  }
  if (kind !== 'player' && kind !== 'creator') {
    throw new MalformedSession(`unknown kind: ${kind}`);
  }
  const issuedAtUnixMs = Number(issuedAtStr);
  const expiryUnixMs = Number(expiryStr);
  if (!Number.isFinite(issuedAtUnixMs) || !Number.isFinite(expiryUnixMs)) {
    throw new MalformedSession('issuedAt / expiry not finite numbers');
  }
  return Object.freeze({
    accountId,
    email,
    kind,
    issuedAtUnixMs,
    expiryUnixMs,
  });
}

// ---------------------------------------------------------------------------
// R150 IsStale predicate.
// ---------------------------------------------------------------------------

export interface SessionStaleVerdict {
  readonly stale: boolean;
  readonly reason: 'expired' | 'max_lifetime_exceeded' | 'fresh';
}

export function isStale(session: Session, nowUnixMs: number): SessionStaleVerdict {
  if (nowUnixMs >= session.expiryUnixMs) {
    return Object.freeze({ stale: true, reason: 'expired' as const });
  }
  if (nowUnixMs - session.issuedAtUnixMs > MAX_SESSION_LIFETIME_MS) {
    return Object.freeze({ stale: true, reason: 'max_lifetime_exceeded' as const });
  }
  return Object.freeze({ stale: false, reason: 'fresh' as const });
}

// ---------------------------------------------------------------------------
// Optional Mirror-Mark companion stamp.
// ---------------------------------------------------------------------------

/**
 * Stamp the canonical session payload with a corpus-pinned L43
 * Mirror-Mark. Useful for regulators / partner-ops who hold the lore
 * corpus and want to confirm the session was issued against a known
 * lore-version.
 */
export function stampSessionWithMirrorMark(
  session: Session,
  corpusSha: Buffer,
  key: Buffer | Uint8Array,
): string {
  if (corpusSha.length !== CORPUS_SHA_LEN) {
    throw new Error(
      `corpusSha must be ${CORPUS_SHA_LEN} bytes; got ${corpusSha.length}`,
    );
  }
  return mirrorMarkSign(corpusSha, canonicalSessionPayload(session), key);
}
