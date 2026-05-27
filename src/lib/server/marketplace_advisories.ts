/**
 * Conjure Phase-2 marketplace R143 advisories.
 *
 * R145-strict additive: the canonical Phase-1 5-advisory set in
 * `src/lib/cohort/honest/advisories.ts` is UNCHANGED. This module ships a
 * SEPARATE Phase-2 advisory list scoped to the marketplace + ratings
 * surfaces. The cohort firewall pins
 * `CONJURE_ADVISORY_COUNT = 5` for the Phase-1 cohort list -- this
 * Phase-2 list lives independently.
 *
 * Three Phase-2 advisories:
 *
 *  - CONJURE_MARKETPLACE_PLAYER_AUTH_NOT_LIVE (Error) -- the marketplace
 *    ratings flow accepts player-id strings, but no actual player-auth
 *    middleware enforces identity. Phase-3+ ships full OAuth /
 *    passkey-based auth. Today any caller can submit ratings as any
 *    player id.
 *  - CONJURE_MARKETPLACE_PERSISTENT_STORAGE_PLACEHOLDER (Error) -- the
 *    marketplace + ratings live in-process in a Map. Restart wipes
 *    every published game + every rating. Phase-3+ wires Postgres.
 *  - CONJURE_FORGE_WEIGHTED_RATING_PLACEHOLDER (Warn) -- the
 *    play-time-weighted rating algorithm is a domain-heuristic
 *    placeholder. Full forge-personalised rating (OCEAN-trait
 *    similarity + Bayesian shrinkage + temporal decay) is Phase-3+.
 *
 * All three surface via `loudOnce()` on first marketplace / rating
 * access -- a regulator grep for `[LOUD-ONCE-WARNING]` across the
 * ecosystem finds every Phase-2 honest-default.
 */

import type { Advisory } from '$lib/cohort/honest/loudonce';
import { SEVERITY_ERROR, SEVERITY_WARN } from '$lib/cohort/honest/loudonce';

/**
 * Canonical Phase-2 marketplace advisory list. Frozen at module load so
 * callers cannot mutate the cohort firewall surface at runtime.
 */
export const CONJURE_MARKETPLACE_ADVISORIES: ReadonlyArray<Advisory> = Object.freeze([
  Object.freeze({
    code: 'CONJURE_MARKETPLACE_PLAYER_AUTH_NOT_LIVE',
    severity: SEVERITY_ERROR,
    message:
      'Conjure Phase-2 marketplace accepts player-id strings via form fields but does NOT enforce identity via OAuth / passkey / session middleware. Today any caller can submit ratings or queries as any player id. Phase-3+ ships full player-auth (NextAuth-style providers + passkey + session cookies); deployments MUST NOT serve untrusted public traffic to the ratings endpoint until that wave lands.',
    docLink: 'CONTEXT.md',
  }),
  Object.freeze({
    code: 'CONJURE_MARKETPLACE_PERSISTENT_STORAGE_PLACEHOLDER',
    severity: SEVERITY_ERROR,
    message:
      'Conjure Phase-2 marketplace + ratings live in-process in a JavaScript Map. Server restart wipes every published game and every rating. The 5 canned games re-hydrate on boot from a hardcoded fixture; user-submitted ratings are LOST on restart. Phase-3+ wires Postgres-backed persistence with the same Phase-2 interface; deployments MUST NOT accept production traffic until that wave lands.',
    docLink: 'CONTEXT.md',
  }),
  Object.freeze({
    code: 'CONJURE_FORGE_WEIGHTED_RATING_PLACEHOLDER',
    severity: SEVERITY_WARN,
    message:
      'Conjure Phase-2 forge-weighted rating algorithm is a domain heuristic placeholder. Each rating is weighted by the player\'s play-time-seconds on the game (with a 30-second floor so a zero-play rating does not get zero weight). The intended Phase-3+ implementation factors OCEAN-trait similarity to other raters, Bayesian shrinkage to the genre mean, temporal decay, and creator-history priors -- none of those are computed today. Operators reading the forge-weighted mean should treat it as a stub.',
    docLink: 'CONTEXT.md',
  }),
]);

/**
 * Canonical count for the Phase-2 marketplace advisory list.
 */
export const CONJURE_MARKETPLACE_ADVISORY_COUNT: number = 3;

/**
 * Lookup helper. Returns the Phase-2 marketplace advisory with the given
 * code, or undefined if the code is not in the canonical Phase-2 set.
 */
export function findMarketplaceAdvisory(code: string): Advisory | undefined {
  return CONJURE_MARKETPLACE_ADVISORIES.find((a) => a.code === code);
}
