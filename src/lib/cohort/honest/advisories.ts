/**
 * Conjure canonical R143 advisories. Five honest-default surfaces from the
 * Phase 1 MVP scaffold, spanning R143.A's three-tier severity ladder
 * (Error + Warn; Info reserved for Phase 2+).
 *
 * Adding a new advisory here is a contract change -- the firewall test
 * confirms every advisory has non-empty code/message/docLink and that the
 * canonical 5-advisory count is preserved. The cohort firewall + the
 * `internal/firewall/firewall.test.ts` mechanical pin guards against drift.
 *
 * Three are Error-severity (liability-bearing):
 *
 *  - CONJURE_REVENUE_SHARE_60_40_NOT_LEGALLY_REVIEWED -- the 60% creator
 *    / 40% platform split + Phase-4 creator-payout surfaces are
 *    founder-drafted, NOT counsel-reviewed. R166 pairs.
 *  - CONJURE_AGE_GATING_NOT_IMPLEMENTED -- 13+ default per founder brief;
 *    age-rating + parental restrict UI not yet shipped.
 *  - CONJURE_CONTENT_MODERATION_AI_ASSISTED_NOT_ENFORCED -- UGC platforms
 *    attract misuse; generation-level filter + post-publication moderation
 *    pipeline are planned but not enforced today.
 *
 * Two are Warn-severity (degraded but not liability-bearing):
 *
 *  - CONJURE_IP_INFRINGEMENT_DETECTION_PLACEHOLDER -- "make me a Mario
 *    game" detection is a placeholder; full IP-protection ML pipeline
 *    Phase 2+.
 *  - CONJURE_AD_REVENUE_INTEGRATION_NOT_LIVE -- ad network integration
 *    Phase 2+; current ad-share UI is a placeholder.
 */

import type { Advisory } from './loudonce';
import { SEVERITY_ERROR, SEVERITY_WARN } from './loudonce';

/**
 * Canonical 5-advisory list. Frozen at module load so callers cannot mutate
 * the cohort firewall surface at runtime.
 */
export const CONJURE_ADVISORIES: ReadonlyArray<Advisory> = Object.freeze([
  Object.freeze({
    code: 'CONJURE_REVENUE_SHARE_60_40_NOT_LEGALLY_REVIEWED',
    severity: SEVERITY_ERROR,
    message:
      'Conjure ships the 60% creator / 40% platform revenue split + Phase-4 creator-payout surfaces founder-drafted. Counsel review NOT YET completed. R166 LIABILITY-FOOTER-CONST + ReviewedByCounsel=false sentinel pair. The host (Limitless / David Carson) is responsible for counsel review before any go-live ad revenue or paid-game transaction lands.',
    docLink: 'src/lib/cohort/legal/REVIEW.md',
  }),
  Object.freeze({
    code: 'CONJURE_AGE_GATING_NOT_IMPLEMENTED',
    severity: SEVERITY_ERROR,
    message:
      'Conjure is 13+ by default per founder brief. Age-rating classifier + parental-restrict UI + age-gate enforcement on play surfaces are PLANNED Phase 2+. Phase-1 scaffold ships without age gating; deployments MUST NOT serve under-13 audiences without counsel + age-verification provider integration.',
    docLink: 'SECURITY.md',
  }),
  Object.freeze({
    code: 'CONJURE_IP_INFRINGEMENT_DETECTION_PLACEHOLDER',
    severity: SEVERITY_WARN,
    message:
      'Conjure forge-gate IP-infringement detection ("make me a Mario game" -> blocked) is a placeholder keyword match in Phase 1. Full IP-protection ML pipeline (sprite-hash similarity / mechanic-fingerprint similarity / trademark detection) is PLANNED Phase 2+. Generated games MAY infringe commercial IP today; creator + platform liability surface is open.',
    docLink: 'CONTEXT.md',
  }),
  Object.freeze({
    code: 'CONJURE_AD_REVENUE_INTEGRATION_NOT_LIVE',
    severity: SEVERITY_WARN,
    message:
      'Conjure ad-revenue integration is NOT LIVE in Phase 1. The 60/40 ad-share UI displays placeholder data. Live ad-network integration (Google AdSense / Unity Ads / Chartboost / equivalent) + creator ad-revenue dashboards + payout scheduling are PLANNED Phase 2+. No real ad revenue accrues today.',
    docLink: 'CONTEXT.md',
  }),
  Object.freeze({
    code: 'CONJURE_CONTENT_MODERATION_AI_ASSISTED_NOT_ENFORCED',
    severity: SEVERITY_ERROR,
    message:
      'Conjure content moderation (generation-level filter for explicit sexual content / graphic violence / hate speech / illegal-activity simulation / gambling-with-real-money / IP infringement) is NOT ENFORCED in Phase 1 scaffold. AI-assisted moderation scanning of published games + community reporting + strike system are PLANNED Phase 2+. UGC platforms attract misuse; deployments MUST NOT accept public submissions without moderation pipeline.',
    docLink: 'SECURITY.md',
  }),
]);

/**
 * Lookup helper. Returns the advisory with the given code, or undefined if
 * the code is not in the canonical 5-advisory set.
 */
export function findAdvisory(code: string): Advisory | undefined {
  return CONJURE_ADVISORIES.find((a) => a.code === code);
}

/**
 * Canonical count for the cohort firewall pin. R143.B-DOMAIN-CUSTOMISATION-
 * TEMPLATE pins exactly 5 advisories per cohort consumer; deviation is a
 * R143.B violation.
 */
export const CONJURE_ADVISORY_COUNT: number = 5;
