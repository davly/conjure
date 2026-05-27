# Limitless Conjure

*Describe a game. AI builds it. Players buy it. Everyone earns. Conjured on Limitless.*

A platform where anyone creates a game in natural language. No coding, no
engine, no design skills. Describe what you want — Pistachio and Nexus build
it. The game appears on a marketplace. Other users play it. The creator earns
from every download.

> **Status (2026-05-27):** Phase 1 MVP scaffold. The studio is a working stub
> backed by a 7-phase forge pipeline (IDENTIFY -> EXPLAIN). Most pipeline
> stages return placeholder data. See `CONTEXT.md` for the full honesty map of
> what is shipped, stubbed, and pending.

## Conjured on Limitless

Every generated game's loading screen displays the `Conjured on Limitless`
badge. The badge is the proof that the game was spoken into existence — and
the cohort signature surface where the L43 Mirror-Mark v1 will attach a
regulator-grade attestation in a future wave.

## How it works

1. **Describe.** Natural-language prompt of any complexity. Simple ("stack
   blocks as high as you can") or detailed (hexagonal grid, neon palette, chill
   electronic music, three difficulty modes).
2. **Generate.** Pistachio interprets the prompt; Nexus provides the AI
   intelligence; the forge draws on every previously generated game to fill in
   defaults the user didn't specify.
3. **Polish.** Title screen, icon, description, screenshots, difficulty curve,
   sound effects, music — every marketplace listing artefact generated and
   presented for approval.
4. **Publish.** The game goes live on the marketplace.
5. **Earn.** Free games earn from ads (creator 60% / platform 40%). Paid games
   priced by the creator (min £0.49). Same split.

## Repo layout

```
conjure/
  src/lib/cohort/   <- L43 Mirror-Mark + R143 LoudOnce + R150 manifest
                       + R145.C firewall + R166 liability footer + R151 KAT-1.
  src/lib/mechanics/<- Game-mechanic templates (Phase 1: puzzle / arcade / idle).
  src/lib/server/   <- Pistachio / Nexus / forge stubs.
  src/routes/       <- SvelteKit routes (landing / studio / browse).
  tests/            <- Vitest cohort firewall + integration tests.
```

## Cohort discipline

Conjure ships at **R174 5-of-5 cohort maturity from inception**:

- **R143** LOUD-ONCE-WARNING-FLAG: per-process dedup of every advisory.
- **R145.C** FIREWALL-TEST-DISCIPLINE: package-layout + cohort-literal pins.
- **R150** PARALLEL-MAP review-metadata envelope on every manifest entry.
- **R151** KAT-AS-COHORT-INVARIANT pin (HMAC-SHA256 hex
  `239a7d0d3f1bbe3a98aede01e2ad818c2db60b7177c02e2f015035b2b5b7dbca`).
- **R166** LIABILITY-FOOTER-CONST with `ReviewedByCounsel = false` honest
  default — the platform takes 40% / creators 60%, NOT counsel-reviewed.

See `CONTEXT.md` + `SECURITY.md` for the full honesty surface.

## Run locally

```bash
npm install
npm test       # cohort firewall + integration tests (Vitest)
npm run dev    # SvelteKit dev server on localhost:5173
npm run build  # production bundle
```

> **Node availability:** if `node` is not on PATH locally, tests defer to CI
> (`.github/workflows/ci.yml`).

## License

Apache-2.0. See `LICENSE`.

## Status

Phase 1 MVP scaffold. Phase 2 (marketplace + ratings + Pistachio runtime),
Phase 3 (complex generation + remix system), Phase 4 (creator payouts +
tournaments) are planning-stage per the founder brief.
