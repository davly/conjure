/**
 * Conjure DRM -- per-session ephemeral tokens with 5-minute TTL refresh.
 *
 * R145 strict-additive: this file is NEW. The DRM `license.ts` +
 * `entitlement.ts` modules are UNCHANGED.
 *
 * # Why ephemeral tokens
 *
 *   A SignedLicense is long-lived (up to 365 days). At runtime the
 *   playing game-client should NOT carry the full license bundle on
 *   every game-step request; it carries an ephemeral session token
 *   derived from the license + a 5-minute TTL window.
 *
 *   The session token is:
 *
 *     base64url(canonical_session_payload) || '.' || base64url(hmac)
 *
 *   Where canonical_session_payload is NUL-separated UTF-8:
 *
 *     license_signature={license-sig}\x00player_id={player}\x00game_id={game}
 *     \x00window_start_unix_ms={ts}\x00window_end_unix_ms={ts}
 *
 *   The HMAC is computed over the canonical payload keyed by the
 *   per-server session-secret (`CONJURE_DRM_SESSION_KEY`).
 *
 * # Refresh
 *
 *   `refreshDrmSession()` is called by the playing client on each
 *   5-minute boundary. It validates the prior session token + the
 *   underlying license is still valid (delegated to
 *   `verifyLicense()`), then issues a fresh token with a new window.
 *
 * # R160 OPT-IN
 *
 *   This module is GATED by `VITE_CONJURE_DRM_ENABLED` (defaulted OFF
 *   via R160 OPT-IN-DEFAULT-OFF). Callers MUST check
 *   `isDrmEnabled(env)` before invoking session creation; the module
 *   exports the primitives but does NOT self-gate -- the gate is the
 *   caller's responsibility so test code can exercise primitives with
 *   the gate down.
 *
 * # Sentinel-shaped errors
 *
 *   - `MalformedDrmSession` -- input shape is invalid.
 *   - `UnknownDrmSessionVersion` -- wire-prefix not recognised.
 *   - `DrmSessionExpired` -- now >= window_end_unix_ms.
 *   - `DrmSessionSignatureMismatch` -- HMAC re-derivation does not match.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  isDrmEnabled,
  type SignedLicense,
  verifyLicense,
} from './license';

/** Session wire-format prefix. Distinct from L43 Mirror-Mark + accounts. */
export const DRM_SESSION_WIRE_PREFIX: string = 'drmsession@v1:';

/** Default session TTL: 5 minutes. */
export const DRM_SESSION_TTL_MS: number = 5 * 60 * 1000;

/** Maximum acceptable session TTL: 15 minutes. */
export const MAX_DRM_SESSION_TTL_MS: number = 15 * 60 * 1000;

/** Cohort-canonical env-flag name for the DRM session-signing key. */
export const DRM_SESSION_KEY_ENV_FLAG: string = 'CONJURE_DRM_SESSION_KEY';

/**
 * Loud-by-name placeholder key. Production callers MUST override via
 * `CONJURE_DRM_SESSION_KEY`.
 */
export const DEV_DRM_SESSION_KEY_PLACEHOLDER: string =
  'iik_dev_CONJURE_DRM_SESSION_NOT_FOR_PRODUCTION';

// ---------------------------------------------------------------------------
// Errors -- sentinel-shaped.
// ---------------------------------------------------------------------------

export class DrmSessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DrmSessionError';
  }
}

export class MalformedDrmSession extends DrmSessionError {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedDrmSession';
  }
}

export class UnknownDrmSessionVersion extends DrmSessionError {
  constructor(message: string) {
    super(message);
    this.name = 'UnknownDrmSessionVersion';
  }
}

export class DrmSessionExpired extends DrmSessionError {
  constructor(message: string) {
    super(message);
    this.name = 'DrmSessionExpired';
  }
}

export class DrmSessionSignatureMismatch extends DrmSessionError {
  constructor(message: string) {
    super(message);
    this.name = 'DrmSessionSignatureMismatch';
  }
}

// ---------------------------------------------------------------------------
// Session shape + canonical payload.
// ---------------------------------------------------------------------------

export interface DrmSession {
  readonly licenseSignature: string;
  readonly playerId: string;
  readonly gameId: string;
  readonly windowStartUnixMs: number;
  readonly windowEndUnixMs: number;
}

export type IssueDrmSessionInput = {
  readonly license: SignedLicense;
  readonly playerId: string;
  readonly nowUnixMs: number;
  /** Optional explicit window-end. Defaults to now + DRM_SESSION_TTL_MS. */
  readonly windowEndUnixMs?: number;
};

export function canonicalDrmSessionPayload(session: DrmSession): Buffer {
  const fields: Array<[string, string]> = [
    ['license_signature', session.licenseSignature],
    ['player_id', session.playerId],
    ['game_id', session.gameId],
    ['window_start_unix_ms', String(session.windowStartUnixMs)],
    ['window_end_unix_ms', String(session.windowEndUnixMs)],
  ];
  const parts = fields.map(([k, v]) => `${k}=${v}`);
  return Buffer.from(parts.join('\x00'), 'utf8');
}

// ---------------------------------------------------------------------------
// Issue + verify.
// ---------------------------------------------------------------------------

/** Resolve the DRM session signing key from env. */
export function resolveDrmSessionKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  const raw = env[DRM_SESSION_KEY_ENV_FLAG] ?? '';
  const keyStr = raw === '' ? DEV_DRM_SESSION_KEY_PLACEHOLDER : raw;
  return Buffer.from(keyStr, 'utf8');
}

/**
 * Issue an ephemeral DRM session token bound to (license, playerId).
 * Validates that the license is for the named player + still valid;
 * mints a 5-minute window keyed by the supplied session key.
 *
 * Returns the full wire-string `DRM_SESSION_WIRE_PREFIX + body`.
 */
export function issueDrmSession(
  input: IssueDrmSessionInput,
  licenseVerifyKey: Buffer | Uint8Array,
  sessionSigningKey: Buffer | Uint8Array,
): string {
  if (!input.playerId || input.playerId.length === 0) {
    throw new MalformedDrmSession('playerId must be non-empty');
  }
  if (input.playerId !== input.license.playerId) {
    throw new MalformedDrmSession(
      `playerId ${input.playerId} != license.playerId ${input.license.playerId}`,
    );
  }
  // Delegated license validity (throws on expired / bad signature / vocab drift).
  verifyLicense(input.license, licenseVerifyKey, input.nowUnixMs);

  const windowEndUnixMs =
    input.windowEndUnixMs ?? input.nowUnixMs + DRM_SESSION_TTL_MS;
  if (!Number.isFinite(windowEndUnixMs) || windowEndUnixMs <= input.nowUnixMs) {
    throw new MalformedDrmSession(
      'windowEndUnixMs must be strictly after nowUnixMs',
    );
  }
  if (windowEndUnixMs - input.nowUnixMs > MAX_DRM_SESSION_TTL_MS) {
    throw new MalformedDrmSession(
      `session TTL exceeds MAX_DRM_SESSION_TTL_MS (${MAX_DRM_SESSION_TTL_MS} ms)`,
    );
  }
  const session: DrmSession = Object.freeze({
    licenseSignature: input.license.signature,
    playerId: input.playerId,
    gameId: input.license.gameId,
    windowStartUnixMs: input.nowUnixMs,
    windowEndUnixMs,
  });
  const payload = canonicalDrmSessionPayload(session);
  const hmac = createHmac('sha256', sessionSigningKey);
  hmac.update(payload);
  const sig = hmac.digest();
  return (
    DRM_SESSION_WIRE_PREFIX +
    Buffer.from(payload).toString('base64url') +
    '.' +
    sig.toString('base64url')
  );
}

/**
 * Verify an ephemeral DRM session token. Sentinel-shaped throws on
 * failure; returns the resolved `DrmSession` on success.
 */
export function verifyDrmSession(
  token: string,
  sessionVerifyKey: Buffer | Uint8Array,
  nowUnixMs: number,
): DrmSession {
  if (!token.startsWith(DRM_SESSION_WIRE_PREFIX)) {
    throw new UnknownDrmSessionVersion(
      `token missing prefix ${DRM_SESSION_WIRE_PREFIX}`,
    );
  }
  const body = token.slice(DRM_SESSION_WIRE_PREFIX.length);
  const dot = body.indexOf('.');
  if (dot === -1) {
    throw new MalformedDrmSession('token missing `.` separator');
  }
  const payloadEnc = body.slice(0, dot);
  const sigEnc = body.slice(dot + 1);
  let payload: Buffer;
  let sig: Buffer;
  try {
    payload = Buffer.from(payloadEnc, 'base64url');
    sig = Buffer.from(sigEnc, 'base64url');
  } catch (err) {
    throw new MalformedDrmSession(`base64url decode failed: ${String(err)}`);
  }
  const session = decodeCanonicalDrmSession(payload);
  const hmac = createHmac('sha256', sessionVerifyKey);
  hmac.update(payload);
  const expected = hmac.digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) {
    throw new DrmSessionSignatureMismatch('HMAC re-derivation does not match');
  }
  if (nowUnixMs >= session.windowEndUnixMs) {
    throw new DrmSessionExpired(
      `window ended ${session.windowEndUnixMs}, now ${nowUnixMs}`,
    );
  }
  return session;
}

function decodeCanonicalDrmSession(payload: Buffer): DrmSession {
  const text = payload.toString('utf8');
  const parts = text.split('\x00');
  if (parts.length !== 5) {
    throw new MalformedDrmSession(
      `expected 5 NUL-separated fields, got ${parts.length}`,
    );
  }
  const fields = new Map<string, string>();
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq === -1) {
      throw new MalformedDrmSession(`malformed field: ${p}`);
    }
    fields.set(p.slice(0, eq), p.slice(eq + 1));
  }
  const sig = fields.get('license_signature');
  const playerId = fields.get('player_id');
  const gameId = fields.get('game_id');
  const startStr = fields.get('window_start_unix_ms');
  const endStr = fields.get('window_end_unix_ms');
  if (
    sig === undefined ||
    playerId === undefined ||
    gameId === undefined ||
    startStr === undefined ||
    endStr === undefined
  ) {
    throw new MalformedDrmSession('one or more required fields missing');
  }
  const start = Number(startStr);
  const end = Number(endStr);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new MalformedDrmSession('window timestamps not finite numbers');
  }
  return Object.freeze({
    licenseSignature: sig,
    playerId,
    gameId,
    windowStartUnixMs: start,
    windowEndUnixMs: end,
  });
}

// ---------------------------------------------------------------------------
// Refresh.
// ---------------------------------------------------------------------------

/**
 * Refresh an expired-or-near-expiry session. Validates the prior token
 * + the underlying license is still valid, then mints a fresh token.
 *
 * The prior token MAY be either still-valid (caller is refreshing
 * early) or just-expired (within `staleWindowMs`, default 60s, of
 * window_end_unix_ms). A token expired beyond `staleWindowMs` is
 * REJECTED -- the caller must re-issue from the original license.
 */
export type RefreshDrmSessionInput = {
  readonly priorToken: string;
  readonly license: SignedLicense;
  readonly nowUnixMs: number;
  /** Max staleness past window-end allowed for refresh. Default 60s. */
  readonly staleWindowMs?: number;
};

export const DEFAULT_REFRESH_STALE_WINDOW_MS: number = 60 * 1000;

export function refreshDrmSession(
  input: RefreshDrmSessionInput,
  licenseVerifyKey: Buffer | Uint8Array,
  sessionKey: Buffer | Uint8Array,
): string {
  // Decode prior without expiry-check (refresh tolerates near-expiry).
  let prior: DrmSession;
  try {
    prior = verifyDrmSession(input.priorToken, sessionKey, input.nowUnixMs);
  } catch (err) {
    if (err instanceof DrmSessionExpired) {
      // Tolerate up to staleWindowMs past expiry.
      const stale = input.staleWindowMs ?? DEFAULT_REFRESH_STALE_WINDOW_MS;
      // Re-decode the prior to extract the session shape -- skip
      // expiry-check by parsing canonically.
      prior = parseDrmSessionNoExpiryCheck(input.priorToken, sessionKey);
      if (input.nowUnixMs - prior.windowEndUnixMs > stale) {
        throw new DrmSessionExpired(
          `prior session window ended too long ago (>${stale} ms)`,
        );
      }
    } else {
      throw err;
    }
  }
  if (prior.licenseSignature !== input.license.signature) {
    throw new MalformedDrmSession(
      'prior session license-signature does not match supplied license',
    );
  }
  return issueDrmSession(
    {
      license: input.license,
      playerId: prior.playerId,
      nowUnixMs: input.nowUnixMs,
    },
    licenseVerifyKey,
    sessionKey,
  );
}

/** Decode a session token without throwing on expired window. */
function parseDrmSessionNoExpiryCheck(
  token: string,
  sessionVerifyKey: Buffer | Uint8Array,
): DrmSession {
  if (!token.startsWith(DRM_SESSION_WIRE_PREFIX)) {
    throw new UnknownDrmSessionVersion(
      `token missing prefix ${DRM_SESSION_WIRE_PREFIX}`,
    );
  }
  const body = token.slice(DRM_SESSION_WIRE_PREFIX.length);
  const dot = body.indexOf('.');
  if (dot === -1) throw new MalformedDrmSession('token missing `.` separator');
  const payloadEnc = body.slice(0, dot);
  const sigEnc = body.slice(dot + 1);
  let payload: Buffer;
  let sig: Buffer;
  try {
    payload = Buffer.from(payloadEnc, 'base64url');
    sig = Buffer.from(sigEnc, 'base64url');
  } catch (err) {
    throw new MalformedDrmSession(`base64url decode failed: ${String(err)}`);
  }
  const session = decodeCanonicalDrmSession(payload);
  const hmac = createHmac('sha256', sessionVerifyKey);
  hmac.update(payload);
  const expected = hmac.digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) {
    throw new DrmSessionSignatureMismatch('HMAC re-derivation does not match');
  }
  return session;
}

// ---------------------------------------------------------------------------
// R160 OPT-IN re-export -- callers can `import { isDrmEnabled }` from
// `session.ts` and `license.ts` interchangeably.
// ---------------------------------------------------------------------------

export { isDrmEnabled };
