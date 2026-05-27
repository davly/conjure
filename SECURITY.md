# Conjure SECURITY

This document is the load-bearing R145.C firewall posture + GDPR Article-6 /
13 / 14 / 17 / 22 surface map + cohort cold-verify path for Limitless Conjure.

## R145.C firewall posture

Conjure ships a dedicated `src/lib/cohort/firewall/` package with the cohort
firewall pin tests. The firewall verifies:

1. **Package layout drift detection** — `ls src/lib/cohort/` returns the
   canonical 6 sub-packages: `firewall / honest / legal / lore / manifest /
   mirrormark`. Adding a new sub-package requires updating the expected list
   in `firewall.ts` AND the impl log.
2. **KAT-1 hex byte-equality** — the canonical hex literal
   `239a7d0d3f1bbe3a98aede01e2ad818c2db60b7177c02e2f015035b2b5b7dbca` is pinned
   in `lore/kat1.ts` AND re-derived offline by the test (`node:crypto`
   HMAC-SHA256 of the cohort canonical 33-byte input `0x01 || 32×0x00` with
   empty key).
3. **Mirror-Mark wire prefix pin** — the wire-form `lore@v1:` MUST be the
   constant `MARK_PREFIX` in `mirrormark/mirrormark.ts`; any drift breaks
   cohort interop.
4. **5-advisory R143.A severity ladder** — five CONJURE_* advisories spanning
   Error + Warn severities; Info reserved for future Phase-2+ surfaces.
5. **R150 5-field envelope** — every entry in `manifest/manifest.ts` ships
   Source + FreshAt + SchemaVersion + Confidence + Note fields.

## Cohort cold-verify path

Any regulator / partner / DPA / external auditor with `openssl` available can
re-derive the KAT-1 canonical hex from the cohort definition WITHOUT trusting
the Conjure host filesystem:

```bash
printf '\x01' > /tmp/canonical.in
dd if=/dev/zero bs=1 count=32 >> /tmp/canonical.in 2>/dev/null
openssl dgst -sha256 -mac hmac -macopt key: -binary /tmp/canonical.in | xxd -p -c 64
# 239a7d0d3f1bbe3a98aede01e2ad818c2db60b7177c02e2f015035b2b5b7dbca
```

Identical to every cohort sibling.

## GDPR surface map (Phase-1 SaaS)

Conjure is a SaaS platform with EU/UK users likely. The following
Article-by-Article surface is honestly disclosed:

| Article | Surface | Status |
|---|---|---|
| **Art-6** (lawful basis) | Creators consent to platform terms on account creation; players consent on play. | PLANNED (Phase 2 account system). |
| **Art-13/14** (notice) | Privacy notice + terms-of-use + library-disclaimer. Founder-drafted. | PLANNED. Disclosure honest-disclosed via R166 liability footer in this scaffold. |
| **Art-17** (erasure / right to be forgotten) | Creator account deletion erases creator's published games + their revenue history. Player account deletion erases play history. | PLANNED (Phase 2 account system + Phase 4 payout backend). |
| **Art-22** (automated decision-making) | Forge quality-gating decisions (block publication on quality threshold failure) MAY trigger Art-22 — creator has right to human review. | PLANNED — explicit human-review opt-in path on every forge-gate rejection per R143.A Error advisory CONJURE_CONTENT_MODERATION_AI_ASSISTED_NOT_ENFORCED. |
| **Art-9** (special-category data) | Conjure does NOT process Article-9 data by default. Player-generated game content MAY contain Article-9 surfaces (health-themed games, religious-themed games) — flagged in CONJURE_CONTENT_MODERATION advisory + Phase 2 moderation pipeline. | OUT OF SCOPE Phase 1; Phase 2 moderation surface flagged. |

## Founder-drafted boundary (R166)

Per R166 R-LIABILITY-FOOTER-CONST + REVIEWED-BY-COUNSEL-FALSE (promoted
2026-05-27), the following surfaces are founder-drafted and NOT counsel-
reviewed:

- The 60% creator / 40% platform revenue split (founder brief).
- Phase-4 creator payouts (Stripe Connect / Wise / equivalent).
- The remix-credit-sharing percentages (Phase 3).
- The minimum paid-game price (£0.49 — founder brief; see whether this clears
  Stripe minimum + VAT thresholds in operating jurisdictions).
- The premium subscription pricing (£4.99/month per founder brief).
- The creator-pro tools subscription pricing (£9.99/month per founder brief).

The host (Limitless / David Carson) is responsible for counsel review BEFORE
any go-live transaction lands. Counsel review trail:
`src/lib/cohort/legal/REVIEW.md`.

## R143 LOUD-ONCE advisories shipped

| Code | Severity | Class |
|---|---|---|
| `CONJURE_REVENUE_SHARE_60_40_NOT_LEGALLY_REVIEWED` | Error | Liability-bearing — founder-drafted revenue model |
| `CONJURE_AGE_GATING_NOT_IMPLEMENTED` | Error | Liability-bearing — 13+ default per founder brief |
| `CONJURE_IP_INFRINGEMENT_DETECTION_PLACEHOLDER` | Warn | Phase-1 stub; full detection Phase 2+ |
| `CONJURE_AD_REVENUE_INTEGRATION_NOT_LIVE` | Warn | Phase-1 placeholder; ad network integration Phase 2+ |
| `CONJURE_CONTENT_MODERATION_AI_ASSISTED_NOT_ENFORCED` | Error | Liability-bearing — UGC platform attracts misuse |

All advisories surface via `[LOUD-ONCE-WARNING]` prefix exactly once per
process. Grep-discoverable across the ecosystem.

## Env-var namespace

Conjure reads the following env vars at boot (all optional in Phase 1):

- `CONJURE_LORE_CORPUS_SHA_PATH` — path to a 32-byte file (raw or 64-char hex)
  holding the canonical corpus SHA. Defaults to 32 zero bytes (placeholder
  posture, LOUD-ONCE-WARN fires on first sign).
- `CONJURE_MIRRORMARK_KEY` — the `iik_...` HMAC key. Defaults to
  `iik_dev_CONJURE_NOT_FOR_PRODUCTION` (placeholder posture, LOUD-ONCE-WARN
  fires).
- `CONJURE_NEXUS_BASE_URL` — Nexus API base URL. Defaults to placeholder; the
  Nexus client stub does NOT call out in Phase 1.
- `CONJURE_PISTACHIO_BASE_URL` — Pistachio engine base URL. Defaults to
  placeholder; the Pistachio client stub does NOT call out in Phase 1.

## CI firewall

The `.github/workflows/ci.yml` workflow runs:

1. `npm ci` — install deps.
2. `npm run build` — SvelteKit + TypeScript compile.
3. `npm test` — Vitest cohort firewall + integration tests.

Any drift in the cohort firewall fails CI. Same shape as graphql-forge +
forge-ide CI surfaces.
