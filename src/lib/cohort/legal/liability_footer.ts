/**
 * R166 R-LIABILITY-FOOTER-CONST + REVIEWED-BY-COUNSEL-FALSE for Conjure.
 *
 * R166 (promoted 2026-05-27) requires every flagship shipping founder-
 * authored legal text (terms-of-use / privacy-notice / library-disclaimer
 * / counsel-disclaimer / not-medical-device / not-legal-advice) on a
 * domain-bearing surface to satisfy a 3-element discipline:
 *
 *   1. The liability footer is a TYPED CONSTANT in domain code, NEVER a
 *      string literal inlined at the call site. The named constant is
 *      grep-discoverable and version-controlled.
 *
 *   2. The flagship ships a paired `REVIEWED_BY_COUNSEL: boolean = false`
 *      module-level / dataclass-level honest-default sentinel. The
 *      boolean defaults to false; flipping to true is a behaviour-
 *      changing event requiring its own additive branch per R145.B and a
 *      named-counsel signoff commit message.
 *
 *   3. The constant + sentinel pair is documented in CONTEXT.md /
 *      SECURITY.md as an honest-disclosure scope contract -- operators
 *      reading the source see the founder-authored boundary explicitly.
 *
 * Cross-substrate cohort post-2026-05-27 (R166 saturation 10/3 strict):
 *   forgefit (Go FORGEFIT_NOT_MEDICAL_DEVICE) + tidepool (Go) + paradox
 *   (Go) + casino (Go ReviewedByCounsel sentinel) + ledger (Go) + haven
 *   (Python DEFAULT_REVIEWED_BY_COUNSEL) + dreamcatcher (Python
 *   REVIEWED_BY_COUNSEL) + diagnosis (Prolog legal_document/3 facts) +
 *   arbiter-legal (Go NOT_LEGAL_ADVICE) + catala-forge (Python
 *   NOT_LEGAL_ADVICE) + conjure (THIS MODULE -- 11th cohort member).
 *
 * Conjure is the first TypeScript cohort member. The substrate-native
 * idiom: `const LEGAL_LIABILITY_FOOTER: string` + `const
 * REVIEWED_BY_COUNSEL: boolean = false` module-level constants. R157
 * substrate-native (no Python @dataclass / no Go struct field -- pure
 * TypeScript const).
 */

/**
 * Founder-drafted liability footer. The 60% creator / 40% platform
 * revenue model + Phase-4 creator-payout surfaces + the £0.49 minimum
 * paid-game price + £4.99/month premium subscription + £9.99/month
 * creator-pro subscription are all founder brief specifications. Counsel
 * review has NOT YET completed.
 *
 * GREP-DISCOVERABLE: `grep -rn 'LEGAL_LIABILITY_FOOTER' src/` finds this
 * constant + every call site. NEVER inline a string literal of this text
 * at a call site.
 */
export const LEGAL_LIABILITY_FOOTER: string =
  'Conjure is a Limitless flagship. The 60% creator / 40% platform revenue split, ' +
  'Phase-4 creator-payout flows (Stripe Connect / Wise / equivalent), the £0.49 ' +
  'minimum paid-game price, the £4.99/month premium subscription, the £9.99/month ' +
  'creator-pro subscription, and the remix-credit-sharing percentages are all ' +
  'founder-drafted. Counsel review has NOT YET been completed. This library ' +
  'recommends host acts: the host (Limitless / David Carson) is responsible for ' +
  'qualified counsel review of all financial / IP / age-rating / content-moderation ' +
  'surfaces BEFORE any go-live transaction lands. Conjure does NOT constitute ' +
  'legal advice. Operators reading this footer should consult counsel admitted ' +
  'to the relevant jurisdictional bar.';

/**
 * R166 honest-default sentinel. MUST default to false at module load.
 *
 * Flipping this to `true` is a behaviour-changing event per R145.B
 * SIBLING-NOT-STACKED -- it MUST land on its own additive branch with a
 * commit message naming:
 *   - The qualified counsel (full name + bar admission jurisdiction).
 *   - The date of counsel signoff.
 *   - The scope of counsel review (which surfaces are validated).
 *
 * Reading `REVIEWED_BY_COUNSEL === false` SHOULD trigger the R143
 * `CONJURE_REVENUE_SHARE_60_40_NOT_LEGALLY_REVIEWED` LOUD-ONCE-WARN at
 * boot.
 */
export const REVIEWED_BY_COUNSEL: boolean = false;

/**
 * R166 LIBRARY-RECOMMENDS-HOST-ACTS expression. The library scope ends
 * at "name the boundary"; the host MUST act on the boundary before any
 * go-live transaction lands.
 *
 * Three named host acts:
 *
 *   1. Engage qualified counsel for review of the 60/40 revenue model
 *      + Phase-4 payout surfaces.
 *   2. Update the privacy notice / terms-of-use / library-disclaimer
 *      with counsel-validated language.
 *   3. Flip `REVIEWED_BY_COUNSEL` to `true` on its own R145.B branch
 *      with a commit message naming the counsel + date + scope.
 */
export const LIBRARY_RECOMMENDS_HOST_ACTS: string =
  'LIBRARY-RECOMMENDS-HOST-ACTS: ' +
  '(1) Engage qualified counsel for review of the 60/40 revenue model + ' +
  'Phase-4 creator-payout surfaces (Stripe Connect / Wise / equivalent). ' +
  '(2) Update privacy notice / terms-of-use / library-disclaimer / age-gating ' +
  'language with counsel-validated text. ' +
  '(3) Flip REVIEWED_BY_COUNSEL to true on its own R145.B SIBLING-NOT-STACKED ' +
  'branch with a commit message naming the counsel + date + scope.';

/**
 * Compose the canonical liability disclosure shown to any operator
 * inspecting the flagship's legal posture. Used by `legal/REVIEW.md` and
 * by any future Phase-2 admin-surface that needs the disclosure verbatim.
 */
export function getLegalLiabilityDisclosure(): {
  readonly footer: string;
  readonly reviewedByCounsel: boolean;
  readonly hostActs: string;
} {
  return Object.freeze({
    footer: LEGAL_LIABILITY_FOOTER,
    reviewedByCounsel: REVIEWED_BY_COUNSEL,
    hostActs: LIBRARY_RECOMMENDS_HOST_ACTS,
  });
}
