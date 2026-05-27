/**
 * R143 LOUD-ONCE-WARNING-FLAG primitive for Conjure.
 *
 * R143 (LOUD-ONCE-WARNING-FLAG, promoted 4/3 from Session 2026-05-11) pins
 * a canonical literal prefix `[LOUD-ONCE-WARNING]` that fires exactly once
 * per process per Code. The cohort-wide grep-discovery property: a single
 * grep across the ecosystem for the literal `[LOUD-ONCE-WARNING]` finds
 * every R143 honesty-defaults warning surface.
 *
 * Per-process dedup is implemented via a module-level `Map<string, true>`
 * keyed on Advisory.Code. A second invocation with the same Code is a
 * no-op. Test code may invoke `resetLoudOnceForTests()` to clear the gate.
 */

/**
 * Cohort-canonical literal prefix. A single grep across the ecosystem for
 * this literal finds every R143 surface. DO NOT EDIT.
 */
export const LOUD_ONCE_PREFIX: string = '[LOUD-ONCE-WARNING]';

/**
 * R143.A severity ladder. The cohort vocabulary is exactly three levels:
 *
 *  - `INFO`  -- the honest-default is benign in production; surfaced so an
 *    audit can enumerate every stub.
 *  - `WARN`  -- the honest-default is degraded; downstream consumers may
 *    observe partial output.
 *  - `ERROR` -- the honest-default is broken; downstream consumers MUST
 *    treat output as unreliable (liability-bearing).
 */
export type Severity = 'INFO' | 'WARN' | 'ERROR';

export const SEVERITY_INFO: Severity = 'INFO';
export const SEVERITY_WARN: Severity = 'WARN';
export const SEVERITY_ERROR: Severity = 'ERROR';

/**
 * Advisory describes a single honest-defaults surface in Conjure.
 *
 * Each field is load-bearing:
 *   - `code` is the dot-or-underscore-separated identifier; non-empty,
 *     unique across the canonical advisory set; grep-discoverable.
 *   - `severity` is one of INFO / WARN / ERROR per R143.A.
 *   - `message` is the human-readable body; non-empty.
 *   - `docLink` is a relative-path pointer to docs (CONTEXT.md / README.md
 *     section / SECURITY.md surface); non-empty.
 */
export interface Advisory {
  readonly code: string;
  readonly severity: Severity;
  readonly message: string;
  readonly docLink: string;
}

/**
 * Per-process dedup gate. Keyed on Advisory.code. Module-level state --
 * survives across multiple loudOnce() calls but is cleared on module
 * re-import (test-framework re-init) so loud-once-per-process matches the
 * cohort R143 behaviour.
 */
const _firedCodes: Map<string, true> = new Map();

/** Default sink -- writes to console.warn. */
function defaultSink(line: string): void {
  // eslint-disable-next-line no-console
  console.warn(line);
}

/**
 * Emit the advisory exactly once per code per process. Canonical shape:
 *
 *   [LOUD-ONCE-WARNING] {SEVERITY} {CODE}: {MESSAGE} (see {DOC_LINK})
 *
 * Grep-discoverable: the literal `[LOUD-ONCE-WARNING]` is at the start of
 * every emit; a single grep across the ecosystem finds every R143 surface.
 *
 * The `sink` parameter lets tests intercept the output. Production callers
 * leave it unset (defaults to console.warn).
 */
export function loudOnce(adv: Advisory, sink: (line: string) => void = defaultSink): void {
  if (_firedCodes.has(adv.code)) return;
  _firedCodes.set(adv.code, true);
  const line = `${LOUD_ONCE_PREFIX} ${adv.severity} ${adv.code}: ${adv.message} (see ${adv.docLink})`;
  sink(line);
}

/**
 * Clear the per-process dedup gate. Test-only entry point. Production code
 * MUST NOT call this. Exported for the cohort firewall + per-package tests
 * to verify once-per-process gating across multiple loudOnce calls without
 * process restart.
 */
export function resetLoudOnceForTests(): void {
  _firedCodes.clear();
}

/**
 * Returns whether the given code has already fired. Test-only inspection
 * helper.
 */
export function hasFired(code: string): boolean {
  return _firedCodes.has(code);
}
