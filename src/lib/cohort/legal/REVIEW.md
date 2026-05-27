# Conjure Legal Review Trail (R166 LIABILITY-FOOTER-CONST)

This file is the load-bearing R166 cohort surface for Conjure. It documents
the counsel review state of the founder-drafted legal text shipped in
`src/lib/cohort/legal/liability_footer.ts`.

## R166 cohort declaration

R166 R-LIABILITY-FOOTER-CONST + REVIEWED-BY-COUNSEL-FALSE was promoted to
ECOSYSTEM_QUALITY_STANDARD.md Part XII on 2026-05-27 at 10/3 saturation.
Conjure ships as the **11th cohort member** and the **first TypeScript
substrate** member of the R166 cohort. Sister cohort members: forgefit (Go)
+ tidepool (Go) + paradox (Go) + casino (Go) + ledger (Go) + haven (Python)
+ dreamcatcher (Python) + diagnosis (Prolog) + arbiter-legal (Go) +
catala-forge (Python).

## Founder-drafted surfaces (NOT YET counsel-reviewed)

| Surface | Source | Liability class |
|---|---|---|
| 60% creator / 40% platform revenue split | Founder brief | Liability-bearing (creator payout dispute risk + tax-treatment risk) |
| Phase-4 creator-payout flows (Stripe Connect / Wise / equivalent) | Founder brief | Liability-bearing (PSR 2017 / EMR 2011 / regulator scope) |
| £0.49 minimum paid-game price | Founder brief | Verify against Stripe fee floor + VAT thresholds per jurisdiction |
| £4.99/month premium subscription | Founder brief | Verify against consumer-protection auto-renewal rules per jurisdiction |
| £9.99/month creator-pro subscription | Founder brief | Same as above |
| Remix-credit-sharing percentages | Founder brief (Phase 3) | Liability-bearing (IP-share dispute risk; Sec 107 fair use / EU InfoSoc Directive 2001/29 scope) |
| 13+ default age rating | Founder brief | Liability-bearing (COPPA / GDPR-K Art-8 / equivalent) |
| IP-infringement detection placeholder | Phase 1 stub | Liability-bearing (DMCA / EU Digital Services Act notice-and-action) |
| Content moderation AI-assisted not enforced | Phase 1 stub | Liability-bearing (UGC platform attracts misuse; OSA 2023 UK / DSA 2024 EU) |

## R143 LOUD-ONCE advisories pairing

The five `CONJURE_*` advisories in `src/lib/cohort/honest/advisories.ts`
mirror this table 1:1 except for the £0.49 / £4.99 / £9.99 / remix-share /
age-rating sub-line items which roll up under
`CONJURE_REVENUE_SHARE_60_40_NOT_LEGALLY_REVIEWED` and
`CONJURE_AGE_GATING_NOT_IMPLEMENTED`.

## Current counsel-review state

**`REVIEWED_BY_COUNSEL = false`** (module-level constant in
`liability_footer.ts`).

This is the **honest-default** sentinel. The boolean defaults to false at
module load; the R143 LOUD-ONCE-WARN at boot fires once per process.

## Flip-to-true procedure (R145.B SIBLING-NOT-STACKED)

Flipping `REVIEWED_BY_COUNSEL` from `false` to `true` is a behaviour-
changing event that requires:

1. **Own R145.B branch** named `conjure-legal-counsel-signoff-YYYY-MM-DD`
   (or substrate-equivalent). MUST NOT be bundled into any feature commit.
2. **Commit message** naming:
   - Qualified counsel: full name + firm + bar admission jurisdiction.
   - Date of counsel signoff.
   - Scope of counsel review (enumerate the surfaces validated; partial
     reviews flip only the relevant sub-section if a granular sentinel
     migration ships).
3. **Updated R143 advisory** -- the
   `CONJURE_REVENUE_SHARE_60_40_NOT_LEGALLY_REVIEWED` advisory MUST be
   downgraded to Info-severity (or removed entirely if scope is full) on
   the same R145.B branch.
4. **CONTEXT.md + SECURITY.md update** -- the founder-drafted boundary
   disclosure section in both docs MUST be updated to reflect the
   counsel-validated state.

## Operator obligations (LIBRARY-RECOMMENDS-HOST-ACTS)

The Conjure library names the founder-drafted boundary explicitly. The
host (Limitless / David Carson) is responsible for the following acts
BEFORE any go-live transaction (ad revenue / paid-game sale / subscription /
creator payout) lands:

1. Engage qualified counsel for the founder-drafted surfaces above.
2. Update privacy notice / terms-of-use / library-disclaimer / age-gating
   language with counsel-validated text.
3. Confirm Stripe Connect / Wise / equivalent payout integration meets
   PSR 2017 / EMR 2011 / equivalent regulatory scope for the
   jurisdictions Conjure operates in.
4. Flip `REVIEWED_BY_COUNSEL` to `true` per the procedure above.

## Cohort cold-verify path

Any regulator / partner / DPA inspecting Conjure's legal posture can:

```bash
grep -rn 'REVIEWED_BY_COUNSEL' src/lib/cohort/legal/
grep -rn 'LEGAL_LIABILITY_FOOTER' src/lib/cohort/legal/
```

A `false` sentinel + un-flipped boolean is the **honest-default** state.
Inferring counsel-validation from any other surface (README claim / blog
post / brief assertion) is a R155.A INDEX-LIE class violation -- only the
typed constant in `liability_footer.ts` is the load-bearing source of
truth for counsel-review state.
