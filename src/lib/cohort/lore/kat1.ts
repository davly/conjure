/**
 * R151 KAT-1 cohort anchor for Conjure.
 *
 * R151 (R-KAT-AS-COHORT-INVARIANT-CROSS-SUBSTRATE-PIN, promoted 2026-05-22)
 * pins a single Known-Answer-Test (KAT-1) HMAC-SHA256 hex literal as the
 * cohort-canonical invariant across every substrate language in the L43
 * Mirror-Mark cohort. Any cohort consumer (Go / Rust / Python / TypeScript /
 * C# / Java / Swift / Kotlin / Solidity / Haskell / Elixir / Erlang / Idris /
 * Ada-SPARK / R / Racket / Fortran / PHP / Gleam / Zig / C++ / D / and more)
 * MUST produce the same 32-byte HMAC digest for the canonical 33-byte input
 * with the empty key.
 *
 * Canonical input (33 bytes): `0x01 || 32×0x00` -- MARK_VERSION byte followed
 * by 32 zero bytes (the cohort canonical corpus-SHA placeholder).
 * Canonical key: empty (0 bytes).
 * Canonical output (32 bytes / 64 hex):
 *   `239a7d0d3f1bbe3a98aede01e2ad818c2db60b7177c02e2f015035b2b5b7dbca`
 *
 * Re-derive offline with OpenSSL (any platform):
 *
 *   printf '\x01' > /tmp/canonical.in
 *   dd if=/dev/zero bs=1 count=32 >> /tmp/canonical.in 2>/dev/null
 *   openssl dgst -sha256 -mac hmac -macopt key: -binary /tmp/canonical.in | xxd -p -c 64
 *   # 239a7d0d3f1bbe3a98aede01e2ad818c2db60b7177c02e2f015035b2b5b7dbca
 *
 * The corpus-SHA loader reads `CONJURE_LORE_CORPUS_SHA_PATH` (an env-var
 * path to a 32-byte file in raw or 64-char hex form). Absent / unreadable
 * env defaults to 32 zero bytes (cohort placeholder posture); R143
 * LOUD-ONCE-WARN fires on first sign to surface the placeholder.
 *
 * Conjure is the FIRST SvelteKit-substrate flagship to join the L43 cohort.
 * Prior TypeScript cohort consumers are forge-ide + graphql-forge.
 */

import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * Cohort-canonical KAT-1 HMAC-SHA256 hex. Byte-identical to every cohort
 * sibling (oracle Go canonical at apps/lore-mark-verify/internal/kat/kat1.go
 * + iris Python + foundry Rust + forge-game / ghost / gleam-js / graphql-forge
 * / forge-ide + ~30 more substrate languages per godfather memory).
 *
 * DO NOT EDIT without paired bumps at every cohort pin site.
 */
export const KAT1_CANONICAL_HMAC_HEX: string =
  '239a7d0d3f1bbe3a98aede01e2ad818c2db60b7177c02e2f015035b2b5b7dbca';

/**
 * Cohort canonical input length: MARK_VERSION byte (1) + corpus-SHA
 * placeholder (32) = 33 bytes.
 */
export const KAT1_CANONICAL_INPUT_LEN: number = 33;

/** SHA-256 / HMAC digest length (32 bytes). */
export const DIGEST_LEN: number = 32;

/** Corpus-SHA length (32 bytes / 64 hex chars). */
export const CORPUS_SHA_LEN: number = 32;

/**
 * Compute the cohort canonical KAT-1 HMAC-SHA256 hex from first principles
 * using `node:crypto`. A regulator / partner / DPA holding the cohort
 * definition can run this function and compare against
 * `KAT1_CANONICAL_HMAC_HEX` -- if they match, the cohort invariance is
 * confirmed.
 *
 * This is a pure function -- no I/O, no side effects, deterministic.
 */
export function deriveKat1Hex(): string {
  const msg = Buffer.concat([
    Buffer.from([0x01]), // MARK_VERSION
    Buffer.alloc(32),    // corpus-SHA placeholder (32 zero bytes)
  ]);
  return createHmac('sha256', Buffer.alloc(0)).update(msg).digest('hex');
}

/**
 * Verify the KAT-1 cohort invariance at this site. Returns true if the
 * `node:crypto` re-derivation matches the pinned cohort canonical hex.
 *
 * Used by `firewall/firewall.ts` to mechanically pin the cohort
 * invariance at every test run.
 */
export function verifyKat1(): boolean {
  return deriveKat1Hex() === KAT1_CANONICAL_HMAC_HEX;
}

/**
 * Read the corpus-SHA from the env-var path. Returns a 32-byte Buffer.
 *
 * Accepts either raw 32-byte file or 64-char hex (with optional trailing
 * newline). Throws on malformed input.
 */
export function readCorpusShaFile(path: string): Buffer {
  const raw = readFileSync(path);
  if (raw.length === CORPUS_SHA_LEN) return raw;
  const trimmed = raw.toString('ascii').trim();
  if (trimmed.length === 2 * CORPUS_SHA_LEN) {
    if (!/^[0-9a-fA-F]+$/.test(trimmed)) {
      throw new Error('corpus SHA file: hex decode failed (non-hex chars)');
    }
    return Buffer.from(trimmed, 'hex');
  }
  throw new Error(
    `corpus SHA file: expected ${CORPUS_SHA_LEN} raw bytes or ${2 * CORPUS_SHA_LEN} hex chars; got ${raw.length} bytes`,
  );
}

/**
 * Result of resolving the corpus SHA from env. `usingPlaceholder=true`
 * means the env-var was absent or unreadable and we fell back to 32 zero
 * bytes; R143 LOUD-ONCE-WARN MUST fire on first sign.
 */
export interface ResolvedCorpus {
  readonly corpusSha: Buffer;
  readonly usingPlaceholder: boolean;
}

/**
 * Resolve the corpus SHA from `CONJURE_LORE_CORPUS_SHA_PATH`. Absent or
 * unreadable env returns a 32-zero-byte placeholder with
 * `usingPlaceholder=true` -- the marker constructor surfaces this via the
 * R143 LOUD-ONCE-WARN gate.
 */
export function resolveCorpusFromEnv(env: NodeJS.ProcessEnv = process.env): ResolvedCorpus {
  const path = env.CONJURE_LORE_CORPUS_SHA_PATH ?? '';
  if (path === '') {
    return { corpusSha: Buffer.alloc(CORPUS_SHA_LEN), usingPlaceholder: true };
  }
  try {
    const corpusSha = readCorpusShaFile(path);
    return { corpusSha, usingPlaceholder: false };
  } catch {
    return { corpusSha: Buffer.alloc(CORPUS_SHA_LEN), usingPlaceholder: true };
  }
}
