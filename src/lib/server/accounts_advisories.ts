/**
 * Conjure Phase-3 accounts R143 advisories.
 *
 * Three honest-default surfaces fire on first accounts-store mutation:
 *
 *   - CONJURE_ACCOUNTS_AUTH_NOT_LIVE_PLACEHOLDER (Error) -- routes do
 *     not enforce session cookies on protected endpoints. Phase-3+
 *     wires the cookie check at the route-load layer.
 *
 *   - CONJURE_ACCOUNTS_PASSWORD_HASHING_PLACEHOLDER (Error) --
 *     passwords are stored as the literal cleartext string per
 *     `Account.passwordPlaceholder`. Argon2id / scrypt is Phase-3+.
 *
 *   - CONJURE_ACCOUNTS_GDPR_ARTICLE_6_LAWFUL_BASIS_NOT_DOCUMENTED
 *     (Warn) -- the lawful basis for processing email + handle +
 *     earnings is founder-drafted; counsel review NOT YET completed.
 *
 * All three surface via `loudOnce()` once per process. A regulator
 * grep for `[LOUD-ONCE-WARNING]` across the ecosystem finds every
 * Phase-3 honest-default.
 *
 * The advisory codes + count are FROZEN -- the cohort firewall test
 * pins `CONJURE_ACCOUNTS_ADVISORY_COUNT === 3`. Adding a fourth
 * advisory is a R145.B SIBLING-NOT-STACKED branch event.
 */

import type { Advisory } from '$lib/cohort/honest/loudonce';
import { loudOnce, SEVERITY_ERROR, SEVERITY_WARN } from '$lib/cohort/honest/loudonce';

/**
 * Canonical Phase-3 accounts advisory list. Frozen at module load.
 */
export const CONJURE_ACCOUNTS_ADVISORIES: ReadonlyArray<Advisory> = Object.freeze([
  Object.freeze({
    code: 'CONJURE_ACCOUNTS_AUTH_NOT_LIVE_PLACEHOLDER',
    severity: SEVERITY_ERROR,
    message:
      'Conjure Phase-3 accounts route accepts signup + login form data but does NOT enforce session cookies on protected route endpoints. The auth.ts module ships the signed-cookie issue + verify primitives, but the route-load layer does NOT yet re-check the cookie before serving protected surfaces. Phase-3+ wires the session-cookie middleware at the route-load layer; deployments MUST NOT serve untrusted public traffic to protected routes until that wave lands.',
    docLink: 'SECURITY.md',
  }),
  Object.freeze({
    code: 'CONJURE_ACCOUNTS_PASSWORD_HASHING_PLACEHOLDER',
    severity: SEVERITY_ERROR,
    message:
      'Conjure Phase-3 accounts store stores passwords as the literal cleartext string submitted to signup (per Account.passwordPlaceholder). Argon2id / scrypt key-derivation is NOT YET wired -- this is a Phase-3+ behaviour-changing event on its own R145.B SIBLING-NOT-STACKED branch. Production deployments MUST NOT accept production traffic until that wave lands.',
    docLink: 'SECURITY.md',
  }),
  Object.freeze({
    code: 'CONJURE_ACCOUNTS_GDPR_ARTICLE_6_LAWFUL_BASIS_NOT_DOCUMENTED',
    severity: SEVERITY_WARN,
    message:
      'Conjure Phase-3 accounts store processes email + creator-handle + earnings-placeholder + session-identity payloads. The lawful basis (GDPR Article 6) for each processing surface is founder-drafted and counsel review has NOT YET completed. See src/lib/cohort/legal/liability_footer.ts for the founder-drafted scope contract; the wire-in of a counsel-reviewed lawful-basis register is Phase-4+.',
    docLink: 'src/lib/cohort/legal/liability_footer.ts',
  }),
]);

/** Pin for the cohort firewall test. */
export const CONJURE_ACCOUNTS_ADVISORY_COUNT: number = 3;

/**
 * Fire all three advisories once-per-process. Each `loudOnce()` call
 * dedups internally by `code` so repeat calls are no-ops.
 */
export function fireAccountsAdvisoriesOnce(
  sink?: (line: string) => void,
): void {
  for (const a of CONJURE_ACCOUNTS_ADVISORIES) {
    loudOnce(a, sink);
  }
}

/** Lookup helper. */
export function findAccountsAdvisory(code: string): Advisory | undefined {
  return CONJURE_ACCOUNTS_ADVISORIES.find((a) => a.code === code);
}
