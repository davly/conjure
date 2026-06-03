/**
 * Conjure DRM -- Entitlement closed-enum + composition rules.
 *
 * Phase 3 ships an OPT-IN integrity layer (per R160 OPT-IN, defaulted OFF
 * via `VITE_CONJURE_DRM_ENABLED`). Entitlements describe what a holder of a
 * SignedLicense is permitted to do inside Conjure. They are NOT an
 * anti-piracy enforcement mechanism: signing only proves authenticity
 * (the bundle was issued by the named host with the named key), not
 * unforgeable-ness against a determined attacker with offline access.
 *
 * See `docs/drm-policy.md` for the full opt-in / not-anti-piracy disclosure.
 *
 * Closed-enum design choice (R166 / R143 / R157):
 *
 *   The Entitlement union is a closed enum -- a TypeScript discriminated
 *   string union. Adding a new value is a R145.B SIBLING-NOT-STACKED branch
 *   event: it MUST land on its own additive branch with a paired regression
 *   test. The 5-element baseline is:
 *
 *     DEMO       -- time-limited or feature-limited preview of a paid game.
 *     FULL       -- full play access to a paid game.
 *     SEASONAL   -- access for a named season (e.g. "winter-2026"); pairs
 *                   with a license `seasonId` field upstream.
 *     DLC_PACK_X -- a downloadable content pack; X is a wildcard suffix
 *                   describing the pack (e.g. DLC_PACK_NEONNIGHTS).
 *     MOD_TOOLS  -- access to creator mod tools (level editor / asset hooks).
 *
 * Composition rules:
 *
 *   - FULL implies DEMO (any holder of FULL has DEMO entitlements).
 *   - FULL does NOT imply SEASONAL (seasonal is orthogonal, not a strict
 *     superset).
 *   - FULL does NOT imply DLC_PACK_* (DLCs are explicit additive purchases).
 *   - FULL does NOT imply MOD_TOOLS (mod tools are a creator-tier surface
 *     gated by the £9.99/month creator-pro subscription -- see
 *     `src/lib/cohort/legal/liability_footer.ts`).
 *   - MOD_TOOLS implies FULL (mod tooling requires full play access to the
 *     base game).
 *   - SEASONAL implies DEMO (a seasonal pass at minimum unlocks demo
 *     surfaces).
 *
 * The `entitlementImplies()` function is the canonical composition predicate
 * called by the license verifier when checking a granted entitlement satisfies
 * a required entitlement.
 *
 * R143 LOUD-ONCE coupling:
 *
 *   When a license bundle includes MOD_TOOLS, the verifier SHOULD emit the
 *   advisory `CONJURE_DRM_MOD_TOOLS_GRANT_NOT_LEGALLY_REVIEWED` (Warn) --
 *   mod-tool grants intersect IP / DMCA / creator-payout surfaces that are
 *   founder-drafted per liability_footer.ts.
 */

/**
 * Closed-enum entitlement values. R145.B SIBLING-NOT-STACKED applies to
 * additions: a new entitlement is a behaviour-changing event requiring its
 * own additive branch.
 */
export type Entitlement =
  | 'DEMO'
  | 'FULL'
  | 'SEASONAL'
  | 'DLC_PACK_X'
  | 'MOD_TOOLS';

/**
 * Canonical entitlement list. Frozen at module load so callers cannot mutate
 * the cohort firewall surface at runtime.
 */
export const ENTITLEMENTS: ReadonlyArray<Entitlement> = Object.freeze([
  'DEMO',
  'FULL',
  'SEASONAL',
  'DLC_PACK_X',
  'MOD_TOOLS',
]);

/**
 * R150 IsStale pin -- the entitlement vocabulary version. Bumped only on
 * additive-non-breaking changes per R145 strict-additive. A holder whose
 * license declares an older version SHOULD be treated as stale by the
 * verifier (see `license_manager.ts` IsStale predicate).
 */
export const ENTITLEMENT_VOCAB_VERSION: string = 'conjure.entitlement.v1';

/**
 * Canonical entitlement count -- pinned for the cohort firewall.
 */
export const ENTITLEMENT_COUNT: number = 5;

/**
 * Composition rule: does `granted` imply `required`?
 *
 *  - Any entitlement implies itself (reflexive).
 *  - FULL implies DEMO.
 *  - MOD_TOOLS implies FULL (and transitively DEMO).
 *  - SEASONAL implies DEMO.
 *  - FULL does NOT imply SEASONAL / DLC_PACK_X / MOD_TOOLS.
 *  - DEMO does NOT imply anything except DEMO.
 *
 * Returns true if a holder granted `granted` satisfies a `required`
 * entitlement check.
 */
export function entitlementImplies(
  granted: Entitlement,
  required: Entitlement,
): boolean {
  if (granted === required) return true;
  if (granted === 'FULL' && required === 'DEMO') return true;
  if (granted === 'MOD_TOOLS' && required === 'FULL') return true;
  if (granted === 'MOD_TOOLS' && required === 'DEMO') return true;
  if (granted === 'SEASONAL' && required === 'DEMO') return true;
  return false;
}

/**
 * Returns true if any entitlement in `granted` implies `required`.
 *
 * A license bundle may carry multiple entitlements (e.g. FULL + DLC_PACK_X +
 * MOD_TOOLS). The verifier checks satisfaction across the bundle.
 */
export function anyEntitlementImplies(
  granted: ReadonlyArray<Entitlement>,
  required: Entitlement,
): boolean {
  for (const g of granted) {
    if (entitlementImplies(g, required)) return true;
  }
  return false;
}

/**
 * Returns true if every entitlement in `required` is satisfied by at least
 * one entitlement in `granted`. Used by the verifier when the surface
 * requires multiple entitlements (e.g. play-with-DLC requires FULL + a
 * specific DLC_PACK_X).
 */
export function allEntitlementsSatisfied(
  granted: ReadonlyArray<Entitlement>,
  required: ReadonlyArray<Entitlement>,
): boolean {
  for (const r of required) {
    if (!anyEntitlementImplies(granted, r)) return false;
  }
  return true;
}

/**
 * Normalise a list of entitlements by removing duplicates and sorting in
 * canonical order. Used by the canonical-payload builder so that two
 * licenses with the same effective entitlement set produce byte-identical
 * payloads regardless of declaration order.
 */
export function normaliseEntitlements(
  ents: ReadonlyArray<Entitlement>,
): ReadonlyArray<Entitlement> {
  const seen = new Set<Entitlement>();
  for (const e of ents) seen.add(e);
  const out: Entitlement[] = [];
  for (const canonical of ENTITLEMENTS) {
    if (seen.has(canonical)) out.push(canonical);
  }
  return Object.freeze(out);
}

/**
 * Returns true if `value` is a known canonical Entitlement string.
 *
 * Closed-enum guard used by the license-bundle decoder: a bundle declaring
 * an unknown entitlement string is rejected as MalformedLicense (not
 * silently coerced).
 */
export function isEntitlement(value: string): value is Entitlement {
  return (ENTITLEMENTS as ReadonlyArray<string>).includes(value);
}
