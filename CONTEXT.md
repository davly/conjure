# Conjure CONTEXT (planning + honesty surface)

This document is the load-bearing boundary doc for Limitless Conjure. It
distinguishes what is SHIPPED, STUBBED, and PLANNED across the four phases
named in the founder brief. R145.B sibling-not-stacked + R155 verdict-
requires-commit-SHA-AND-test-receipt + R166 LIBRARY-RECOMMENDS-HOST-ACTS all
land here.

---

## 1. Product summary

Conjure is a SaaS platform where anyone describes a game in natural language
and the platform's AI generates a playable prototype, polishes it for a
marketplace listing, and publishes it for other users to play and rate.
Creator earns 60% of ad revenue or sale price; platform retains 40%.

The verb is the product: **"I conjured a game."**

The badge **Conjured on Limitless** appears on every generated game's loading
screen and is the cohort signature surface where future waves will attach the
L43 Mirror-Mark v1 attestation.

## 2. Phase delivery (founder brief, abridged)

- **Phase 1 — MVP studio.** Natural-language description -> single-mechanic
  game (puzzle / arcade / idle). Basic visual themes. Creator can play-test +
  refine. Publish to marketplace skeleton. Ad monetisation only. **Web only.**
  **This phase is what this scaffold targets.**
- **Phase 2 — Marketplace.** Categories, discovery engine, player accounts +
  ratings, creator profiles + follower system, forge-personalised
  recommendations, paid games, premium subscription, mobile app (play-only).
- **Phase 3 — Engine.** Complex / multi-mechanic / multiplayer / narrative
  generation, custom art-style + procedural music, remix system, creator
  analytics, creator-pro tools (subscription), mobile creation support.
- **Phase 4 — Economy.** Creator payouts, remix revenue sharing, top-creator
  programme, embedding API, sponsorship marketplace, tournament system.

## 3. What is SHIPPED in this scaffold

| Surface | Status | Files |
|---|---|---|
| SvelteKit + TypeScript scaffold | SHIPPED | `package.json` / `svelte.config.js` / `vite.config.ts` / `tsconfig.json` |
| Landing + studio + browse routes | SHIPPED | `src/routes/+page.svelte` / `src/routes/studio/+page.svelte` + `+page.server.ts` / `src/routes/browse/+page.svelte` |
| 7-phase forge pipeline (stub) | SHIPPED | `src/lib/server/forge.ts` |
| 3 mechanic templates | SHIPPED | `src/lib/mechanics/{puzzle,arcade,idle}.ts` |
| L43 Mirror-Mark v1 (signer + verifier) | SHIPPED | `src/lib/cohort/mirrormark/mirrormark.ts` |
| R151 KAT-1 cohort anchor | SHIPPED | `src/lib/cohort/lore/kat1.ts` |
| R143 LoudOnce primitive | SHIPPED | `src/lib/cohort/honest/loudonce.ts` |
| 5 CONJURE_* advisories | SHIPPED | `src/lib/cohort/honest/advisories.ts` |
| R150 5-field manifest envelope | SHIPPED | `src/lib/cohort/manifest/manifest.ts` (10 entries) |
| R145.C firewall pins | SHIPPED | `src/lib/cohort/firewall/firewall.ts` + tests |
| R166 LIABILITY-FOOTER-CONST | SHIPPED | `src/lib/cohort/legal/liability_footer.ts` |
| Vitest cohort + integration tests | SHIPPED | `src/lib/cohort/**/*.test.ts` + `tests/integration/studio.test.ts` |
| CI workflow (build + test + firewall) | SHIPPED | `.github/workflows/ci.yml` |

## 4. What is STUBBED (honestly)

- **Pistachio client** (`src/lib/server/pistachio.ts`) returns a placeholder
  game-spec. No real Pistachio engine wired.
- **Nexus client** (`src/lib/server/nexus.ts`) returns a placeholder
  generation. No real Nexus AI call.
- **Forge pipeline** stages (IDENTIFY / ASSESS / ESCAPE / OBSERVE / FORGET /
  PERSIST / EXPLAIN) all return deterministic placeholder data based on simple
  keyword match in the prompt — no LLM call.
- **Marketplace browse** route is a static skeleton — no DB-backed game list.
- **Mirror-Mark wire-in** is library-only per R176 LIBRARY-FIRST-WIRE-LATER —
  the badge does NOT yet stamp generated games in this scaffold. Wire-in lands
  on its own R145.B sibling branch.

## 5. What is PLANNED (NOT in this scaffold)

- Phase 2 marketplace + ratings + Pistachio runtime.
- Phase 3 multi-mechanic / multiplayer / remix.
- Phase 4 creator payouts (Stripe integration + 60/40 split engine).
- Age gating (CONJURE_AGE_GATING_NOT_IMPLEMENTED advisory open).
- Content moderation AI (CONJURE_CONTENT_MODERATION_AI_ASSISTED_NOT_ENFORCED).
- IP-infringement detection (CONJURE_IP_INFRINGEMENT_DETECTION_PLACEHOLDER).
- Ad revenue integration (CONJURE_AD_REVENUE_INTEGRATION_NOT_LIVE).
- Revenue-share legal review (CONJURE_REVENUE_SHARE_60_40_NOT_LEGALLY_REVIEWED;
  see R166 liability footer + `legal/REVIEW.md`).

## 6. Cohort discipline (R174 5-of-5 from inception)

Conjure ships at R174 5-of-5 cohort maturity from the FIRST commit. Five
dedicated packages under `src/lib/cohort/`:

1. **firewall/** — R145.C distributed firewall pins (package layout + cohort
   literal anchors + Mirror-Mark wire prefix).
2. **lore/** — R151 KAT-1 cohort anchor + corpus-SHA loader.
3. **mirrormark/** — L43 Mirror-Mark v1 signer + verifier (`lore@v1:` + 54-char
   base64url body — byte-identical to every cohort sibling).
4. **manifest/** — R150 5-field schematised-knowledge envelope (10 entries
   covering game-design conventions).
5. **honest/** — R143 LoudOnce + R143.A severity ladder (5 CONJURE_*
   advisories).

Plus a sixth canonical surface (R166):

6. **legal/** — R166 LIABILITY-FOOTER-CONST + `ReviewedByCounsel = false`
   honest-default sentinel. The 60/40 revenue split + Phase-4 creator-payout
   surfaces are founder-drafted, NOT counsel-reviewed. See
   `src/lib/cohort/legal/REVIEW.md`.

### KAT-1 cohort canonical hex

`239a7d0d3f1bbe3a98aede01e2ad818c2db60b7177c02e2f015035b2b5b7dbca`

Byte-identical to every cohort sibling (oracle / iris / foundry / forge-game /
ghost / gleam-js / graphql-forge / forge-ide / casino / ledger / folio /
anchor / and ~30 more substrate languages per godfather memory).

Reproducible offline via:

```bash
echo -n "" > /tmp/empty.key
printf '\x01' > /tmp/canonical.in
dd if=/dev/zero bs=1 count=32 >> /tmp/canonical.in 2>/dev/null
openssl dgst -sha256 -mac hmac -macopt key: -binary /tmp/canonical.in | xxd -p -c 64
# expected: 239a7d0d3f1bbe3a98aede01e2ad818c2db60b7177c02e2f015035b2b5b7dbca
```

### Mirror-Mark wire-form

`lore@v1:` + 54-char base64url(corpusSha[:8] || HMAC-SHA256(0x01 || corpusSha
|| payload, key))

Identical to every cohort sibling. The `node:crypto` HMAC-SHA256 + Base64URL
primitives are byte-identical to OpenSSL / Go `crypto/hmac` / Python
`hmac.new(...)` / Rust `hmac` crate.

## 7. Cross-substrate sibling

This is the **first TypeScript SaaS-flagship** to join the L43 cohort. Prior
TypeScript cohort consumers are `forge-ide` + `graphql-forge` (both shipped
2026-05-26 / 2026-05-27). Cross-substrate cohort cardinality after this port:
TypeScript = 3 (forge-ide / graphql-forge / conjure).

## 8. Boundary disclosure (R166 LIBRARY-RECOMMENDS-HOST-ACTS)

The 60% creator / 40% platform revenue split + all Phase-4 economy surfaces
(creator payouts via Stripe Connect / Wise / equivalent) are founder-drafted
and NOT validated by qualified counsel. The host (Limitless / David Carson)
is responsible for counsel review before:

- Any go-live ad revenue or paid-game transaction lands.
- Any creator payout is initiated.
- The CONJURE_REVENUE_SHARE_60_40_NOT_LEGALLY_REVIEWED advisory is silenced.
- The `ReviewedByCounsel = false` sentinel in `liability_footer.ts` is flipped
  to `true`.

The sentinel flip lands on its own additive R145.B sibling-not-stacked branch
with a paired commit message naming the counsel + date.

## 9. R155 verdict trail

Every cohort commit cites its commit SHA + test receipt (Vitest pass count or
"deferred-to-CI" with the CI run URL). The impl log at
`reviews/IMPLEMENTATION_2026-05-27-LATE-NIGHT/NEW_FLAGSHIP_CONJURE.md` is the
canonical Verdict surface.
