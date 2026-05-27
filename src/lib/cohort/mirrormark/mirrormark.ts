/**
 * L43 Mirror-Mark v1 -- substrate-baked attestation for Conjure.
 *
 * The SvelteKit / TypeScript port of L43 Mirror-Mark v1. Every generated
 * game / marketplace listing / creator-payout receipt that an opt-in caller
 * chooses to stamp now carries a `mirrorMark` string -- a header-value-shape
 * HMAC over `(corpusSHA || markVersion-prefixed payload)` keyed by an
 * `iik_...` HMAC key.
 *
 * A regulator, partner ops, or another LLM holding `(corpus, payload, key)`
 * can independently re-derive the mark and confirm two things in one pass:
 *
 *   1. The corpus SHA prefix in the mark matches a clean re-hash of the
 *      deployed `lore.tar.gz`, AND
 *   2. The HMAC over `(markVersion || corpusSHA || payload)` matches the
 *      value Conjure emitted.
 *
 * For Conjure this turns generated-game / marketplace-listing receipts into
 * tamper-evident attestation chains a client can verify offline --
 * regulator-grade AI-trust-boundary evidence over the wire.
 *
 * Why ported in-process rather than calling Nexus over HTTP:
 *
 *   * Zero runtime coupling -- Conjure's SvelteKit emit-paths must remain
 *     fast and free of inter-service dependencies.
 *   * Algorithm parity -- pure Node `node:crypto` HMAC-SHA256 is
 *     byte-identical to OpenSSL / Go `crypto/hmac` / Python
 *     `hmac.new(...)` / Rust `hmac` crate.
 *   * Same wire format -- `MARK_PREFIX = "lore@v1:"` + 8-byte corpus
 *     prefix || 32-byte HMAC body. `lore-mark-verify` verifies Conjure
 *     marks identically to every cohort sibling.
 *
 * Status when this file was first shipped (2026-05-27):
 *
 *   SHIPPED AS LIBRARY ONLY (additive). Per R176 LIBRARY-FIRST-WIRE-LATER
 *   the badge ("Conjured on Limitless") does NOT yet stamp generated games
 *   in this scaffold. Wire-in is behaviour-changing and per R145 / R145.B
 *   BEHAVIOR-CHANGING-WORK-GETS-ITS-OWN-BRANCH must not land in the same
 *   change as the library port.
 *
 * Configuration:
 *
 *   `CONJURE_LORE_CORPUS_SHA_PATH`  optional; path to a 32-byte file (raw
 *                                   or 64-char hex) holding the corpus SHA.
 *   `CONJURE_MIRRORMARK_KEY`        optional; the `iik_...` HMAC key.
 *                                   Defaults to
 *                                   `iik_dev_CONJURE_NOT_FOR_PRODUCTION`.
 *
 * Cross-substrate cohort after this port (counts per godfather memory
 * R151 + Phase B / Phase A close 2026-05-27):
 *
 *   Go (~10+):        nexus / folio / howler-ref / dipstick-ref /
 *                     pigeonhole-ref / casino / ledger / pulse /
 *                     baseline / oracle (canonical-literal site).
 *   Kotlin KMM (3):   howler / dipstick / pigeonhole.
 *   C# (1):           fleetworks-torque.
 *   Rust (1):         foundry B16.
 *   Python (4):       iris / forge-game / ghost / gleam-js.
 *   **TypeScript (3): forge-ide / graphql-forge / conjure (this module).**
 *   Plus 20+ more substrate languages across the L43 cohort.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Wire-format constants -- byte-identical to every cohort sibling.
// ---------------------------------------------------------------------------

/** 1-byte version tag prefixed to the HMAC input. Identical to every cohort sibling. */
export const MARK_VERSION: number = 0x01;

/** Public header-value prefix for v1 Mirror-Mark. Identical to every cohort sibling. */
export const MARK_PREFIX: string = 'lore@v1:';

/** Corpus-SHA prefix length embedded in the mark body. Identical to every cohort sibling. */
export const MARK_CORPUS_PREFIX_LEN: number = 8;

/** SHA-256 digest length in bytes. Identical to every cohort sibling. */
export const DIGEST_LEN: number = 32;

/** Unencoded mark body length (corpus prefix + HMAC digest). */
export const MARK_BODY_LEN: number = MARK_CORPUS_PREFIX_LEN + DIGEST_LEN;

/** Corpus SHA full length (32 bytes, SHA-256 output). */
export const CORPUS_SHA_LEN: number = DIGEST_LEN;

/**
 * Base64url-encoded mark body length. 40 raw bytes -> ceil(40 * 4 / 3) = 54
 * base64url chars (no padding). Pinned for the cohort firewall test.
 */
export const MARK_BODY_BASE64URL_LEN: number = 54;

/**
 * Loud-by-name placeholder key. Production callers MUST override via
 * `CONJURE_MIRRORMARK_KEY` -- the `iik_dev_CONJURE_` prefix makes any
 * leaked-to-prod use grep-loud across logs.
 */
export const DEV_KEY_PLACEHOLDER: string = 'iik_dev_CONJURE_NOT_FOR_PRODUCTION';

// ---------------------------------------------------------------------------
// Errors -- sentinel-shaped (each subclass distinct, name match used by callers).
// ---------------------------------------------------------------------------

/** Base class for Mirror-Mark verify errors. */
export class MirrorMarkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MirrorMarkError';
  }
}

export class MalformedMark extends MirrorMarkError {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedMark';
  }
}

export class UnknownMarkVersion extends MirrorMarkError {
  constructor(message: string) {
    super(message);
    this.name = 'UnknownMarkVersion';
  }
}

export class CorpusMismatch extends MirrorMarkError {
  constructor(message: string) {
    super(message);
    this.name = 'CorpusMismatch';
  }
}

export class SignatureMismatch extends MirrorMarkError {
  constructor(message: string) {
    super(message);
    this.name = 'SignatureMismatch';
  }
}

// ---------------------------------------------------------------------------
// MirrorMarker -- per-process signer holding (corpusSha, key).
// ---------------------------------------------------------------------------

/**
 * Per-process signer. Constructed once at boot via `MirrorMarker.fromEnv()`.
 * Emits exactly one R143 LOUD-ONCE WARN on first sign if either corpus or
 * key is the placeholder.
 */
export class MirrorMarker {
  readonly corpusSha: Buffer;
  readonly key: Buffer;
  readonly usingPlaceholderCorpus: boolean;
  readonly usingPlaceholderKey: boolean;

  /** R143 LOUD-ONCE class-level state -- one WARN per process. */
  static #warned: boolean = false;

  constructor(opts: {
    corpusSha: Buffer;
    key: Buffer;
    usingPlaceholderCorpus?: boolean;
    usingPlaceholderKey?: boolean;
  }) {
    if (opts.corpusSha.length !== CORPUS_SHA_LEN) {
      throw new Error(
        `corpusSha must be ${CORPUS_SHA_LEN} bytes; got ${opts.corpusSha.length}`,
      );
    }
    this.corpusSha = opts.corpusSha;
    this.key = opts.key;
    this.usingPlaceholderCorpus = opts.usingPlaceholderCorpus ?? false;
    this.usingPlaceholderKey = opts.usingPlaceholderKey ?? false;
  }

  /**
   * Read `CONJURE_LORE_CORPUS_SHA_PATH` + `CONJURE_MIRRORMARK_KEY`. Either
   * being absent triggers a one-shot WARN log on first sign -- emission
   * stays emit-able even when corpus/key are not wired.
   */
  static fromEnv(env: NodeJS.ProcessEnv = process.env): MirrorMarker {
    // Resolve corpus
    let usingPlaceholderCorpus = false;
    let corpusSha: Buffer = Buffer.alloc(CORPUS_SHA_LEN);
    const corpusPath = env.CONJURE_LORE_CORPUS_SHA_PATH ?? '';
    if (corpusPath === '') {
      usingPlaceholderCorpus = true;
    } else {
      try {
        const raw = readFileSync(corpusPath);
        if (raw.length === CORPUS_SHA_LEN) {
          corpusSha = raw;
        } else {
          const trimmed = raw.toString('ascii').trim();
          if (trimmed.length === 2 * CORPUS_SHA_LEN && /^[0-9a-fA-F]+$/.test(trimmed)) {
            corpusSha = Buffer.from(trimmed, 'hex');
          } else {
            usingPlaceholderCorpus = true;
          }
        }
      } catch {
        usingPlaceholderCorpus = true;
      }
    }

    // Resolve key
    let usingPlaceholderKey = false;
    let keyStr = env.CONJURE_MIRRORMARK_KEY ?? '';
    if (keyStr === '') {
      keyStr = DEV_KEY_PLACEHOLDER;
      usingPlaceholderKey = true;
    }

    return new MirrorMarker({
      corpusSha,
      key: Buffer.from(keyStr, 'utf8'),
      usingPlaceholderCorpus,
      usingPlaceholderKey,
    });
  }

  /** Reset the LOUD-ONCE state -- test-only entry point. */
  static _resetWarnedOnceForTests(): void {
    MirrorMarker.#warned = false;
  }

  /** R143 LOUD-ONCE-WARN-FLAG -- fire one WARN per process on placeholders. */
  _maybeWarnOnce(sink: (msg: string) => void = consoleWarn): void {
    if (!(this.usingPlaceholderCorpus || this.usingPlaceholderKey)) return;
    if (MirrorMarker.#warned) return;
    MirrorMarker.#warned = true;
    const descr: string[] = [];
    if (this.usingPlaceholderCorpus) descr.push('corpus');
    if (this.usingPlaceholderKey) descr.push('key');
    sink(
      `[LOUD-ONCE-WARNING] WARN CONJURE_MIRRORMARK_PLACEHOLDER: conjure mirrormark using placeholder ${descr.join(' ')}; emitted marks will NOT pass cold-verify against a real lore corpus / production key`,
    );
  }

  /** Return the canonical Mirror-Mark string for the given payload. */
  sign(payload: Buffer | Uint8Array, sink?: (msg: string) => void): string {
    this._maybeWarnOnce(sink);
    return signInternal(this.corpusSha, payload, this.key);
  }

  /** Reports whether boot fell back to placeholders. */
  usingPlaceholders(): { corpus: boolean; key: boolean } {
    return {
      corpus: this.usingPlaceholderCorpus,
      key: this.usingPlaceholderKey,
    };
  }
}

function consoleWarn(msg: string): void {
  // eslint-disable-next-line no-console
  console.warn(msg);
}

// ---------------------------------------------------------------------------
// Module-level sign + verify -- stateless, regulator-replayable.
// ---------------------------------------------------------------------------

function signInternal(
  corpusSha: Buffer,
  payload: Buffer | Uint8Array,
  key: Buffer | Uint8Array,
): string {
  if (corpusSha.length !== CORPUS_SHA_LEN) {
    throw new Error(
      `corpusSha must be ${CORPUS_SHA_LEN} bytes; got ${corpusSha.length}`,
    );
  }
  const hmac = createHmac('sha256', key);
  hmac.update(Buffer.from([MARK_VERSION]));
  hmac.update(corpusSha);
  hmac.update(payload);
  const digest = hmac.digest(); // 32 bytes
  const body = Buffer.concat([
    corpusSha.subarray(0, MARK_CORPUS_PREFIX_LEN),
    digest,
  ]);
  return MARK_PREFIX + body.toString('base64url');
}

/** Stdlib-only sign -- same algorithm a regulator can replay. */
export function sign(
  corpusSha: Buffer,
  payload: Buffer | Uint8Array,
  key: Buffer | Uint8Array,
): string {
  return signInternal(corpusSha, payload, key);
}

/**
 * Re-derive `mark` from `(corpusSha, payload, key)` and return true on
 * match. Throws `UnknownMarkVersion`, `MalformedMark`, `CorpusMismatch`, or
 * `SignatureMismatch` on failure -- caller can branch on the sentinel-shaped
 * error names without parsing the message.
 */
export function verify(
  mark: string,
  corpusSha: Buffer,
  payload: Buffer | Uint8Array,
  key: Buffer | Uint8Array,
): boolean {
  if (corpusSha.length !== CORPUS_SHA_LEN) {
    throw new Error(
      `corpusSha must be ${CORPUS_SHA_LEN} bytes; got ${corpusSha.length}`,
    );
  }
  if (!mark.startsWith(MARK_PREFIX)) {
    throw new UnknownMarkVersion(`mark missing prefix ${MARK_PREFIX}`);
  }
  const encoded = mark.slice(MARK_PREFIX.length);
  let body: Buffer;
  try {
    body = Buffer.from(encoded, 'base64url');
  } catch (err) {
    throw new MalformedMark(`base64 decode failed: ${String(err)}`);
  }
  if (body.length !== MARK_BODY_LEN) {
    throw new MalformedMark(
      `mark body length: got ${body.length} want ${MARK_BODY_LEN}`,
    );
  }

  const corpusPrefix = body.subarray(0, MARK_CORPUS_PREFIX_LEN);
  const digest = body.subarray(MARK_CORPUS_PREFIX_LEN);

  const expectedCorpusPrefix = corpusSha.subarray(0, MARK_CORPUS_PREFIX_LEN);
  if (!bufferEquals(corpusPrefix, expectedCorpusPrefix)) {
    throw new CorpusMismatch(
      `corpus prefix ${corpusPrefix.toString('hex')} != expected ${expectedCorpusPrefix.toString('hex')}`,
    );
  }

  const hmac = createHmac('sha256', key);
  hmac.update(Buffer.from([MARK_VERSION]));
  hmac.update(corpusSha);
  hmac.update(payload);
  const expected = hmac.digest();

  if (!bufferEquals(digest, expected)) {
    throw new SignatureMismatch(
      'HMAC re-derivation does not match embedded HMAC',
    );
  }
  return true;
}

function bufferEquals(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Canonical-payload helpers for Conjure surfaces (library-only -- wire-in
// deferred per R176 LIBRARY-FIRST-WIRE-LATER).
// ---------------------------------------------------------------------------

/**
 * Canonical bytes for a generated-game receipt. Six-field canonical surface,
 * NUL-separated UTF-8. Pins every observable surface of a `forge.generate()`
 * response so a cohort verifier with the same six fields can re-derive the
 * mark and cold-verify the verdict.
 *
 * Fields chosen for regulator cold-verify usefulness:
 *   game_id / creator_id / mechanic_kind / verdict / generated_at_unix_ms
 *   / forge_version
 */
export function canonicalGameReceiptPayload(opts: {
  gameId: string;
  creatorId: string;
  mechanicKind: string;
  verdict: string;
  generatedAtUnixMs: number;
  forgeVersion: string;
}): Buffer {
  const fields: Array<[string, string]> = [
    ['game_id', opts.gameId],
    ['creator_id', opts.creatorId],
    ['mechanic_kind', opts.mechanicKind],
    ['verdict', opts.verdict],
    ['generated_at_unix_ms', String(opts.generatedAtUnixMs)],
    ['forge_version', opts.forgeVersion],
  ];
  const parts = fields.map(([k, v]) => `${k}=${v}`);
  return Buffer.from(parts.join('\x00'), 'utf8');
}

/**
 * Canonical bytes for a marketplace-listing receipt. Five-field canonical
 * surface for the public marketplace-side view (no creator earnings exposed).
 */
export function canonicalListingReceiptPayload(opts: {
  gameId: string;
  title: string;
  category: string;
  pricePence: number;
  publishedAtUnixMs: number;
}): Buffer {
  const fields: Array<[string, string]> = [
    ['game_id', opts.gameId],
    ['title', opts.title],
    ['category', opts.category],
    ['price_pence', String(opts.pricePence)],
    ['published_at_unix_ms', String(opts.publishedAtUnixMs)],
  ];
  const parts = fields.map(([k, v]) => `${k}=${v}`);
  return Buffer.from(parts.join('\x00'), 'utf8');
}
