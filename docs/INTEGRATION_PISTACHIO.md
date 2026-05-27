# Conjure <-> Pistachio integration architecture

**Status:** Phase 1.5 CONTRACT-ONLY scaffold shipped 2026-05-27.
Phase 2 live wire-in deferred until Pistachio ships an HTTP wrapper
around its in-process Knowledge Bedrock + Lore graph.

**Branch:** `conjure-integrations-pistachio-browser-2026-05-27`

---

## 1. One-line purpose

Pistachio's hand-curated Knowledge Bedrock (8 domains, ~873 entries) and
Lore graph (LoreCharacter + LorePrinciple archetypes) feed Conjure's
forge IDENTIFY / ASSESS / EXPLAIN stages -- giving the SaaS game-
generation pipeline access to canonical game-design knowledge curated
by the engine flagship.

## 2. The two flagships

| | Conjure | Pistachio |
|---|---|---|
| Layer | SaaS flagship | Engine flagship |
| Language | TypeScript / SvelteKit | C++20 |
| Build | vite + npm | CMake 3.21+ |
| Repo | `davly/conjure` | `davly/Pistachio` (private) |
| Knowledge Bedrock | Consumer | Producer (8 domains, ~873 entries) |
| Lore graph | Consumer | Producer (`engine/ai/LoreDatabase.{h,cpp}`) |
| Runtime | Browser (Phase 1) | Vulkan 1.3 desktop (Phase 2 native option) |

## 3. Phase milestones

### Phase 1.5 (this ship, 2026-05-27) -- contract scaffold

Delivered Conjure-side:

- `src/lib/integrations/pistachio/` -- 6 files, ~600 LoC.
  - `types.ts` -- KnowledgeBedrockQuery / Response, MechanicPattern,
    LoreEdge, LoreContext, DifficultyCurve + IPistachioKnowledgeClient.
  - `endpoints.ts` -- 4 canonical wire-form GET endpoints + URL builder.
  - `mock.ts` -- MockPistachioKnowledgeClient with deterministic canned
    responses for puzzle/arcade/idle + Scholar/Hero/Detective lore edges.
  - `client.ts` -- PistachioKnowledgeClient with env-flag-gated live
    binding (`CONJURE_PISTACHIO_LIVE=true` opt-in).
  - `client.test.ts` -- 28 tests covering all 3 layers (mock / client-
    mock-path / client-live-path via fetch shim).
  - `index.ts` -- barrel.
- `src/lib/server/forge.ts` -- additive `generateWithIntegrations()`
  variant consulting the client at IDENTIFY / ASSESS / EXPLAIN.

Deferred (Pistachio-side; not in this ship):

- `engine/forge_knowledge_service/` HTTP wrapper around Knowledge
  Bedrock + Lore graph. Estimated cost: ~3-5 founder-days (HTTP server
  crate + JSON serialisation for KnowledgeTypes.h structs + integration
  tests).

### Phase 2 (deferred) -- live binding

Pistachio ships:

1. `engine/forge_knowledge_service/` C++ HTTP wrapper exposing the 4
   canonical endpoints.
2. JSON serialisation for Pistachio's `KnowledgeTypes.h` plain-struct
   mirrors (cohort byte-identity preserved via FNV-1a 64-bit hash).
3. Corpus version pin alignment with the cohort firewall (e.g.
   `knowledge-bedrock@v1.2.0`).
4. Routing through Nexus per the godfather memory `feedback_nexus_is_
   fw_ai_provider.md` -- "Nexus is THE AI provider for the Limitless
   ecosystem".

Conjure flips `CONJURE_PISTACHIO_LIVE=true` + sets
`CONJURE_PISTACHIO_KNOWLEDGE_URL=<host>`; existing call sites are
behaviour-identical because the client is a stable interface.

### Phase 3 (further out) -- native runtime fork

Pistachio engine becomes the desktop deployment runtime for Conjure:

- Generated games run inside Pistachio's Vulkan 1.3 RenderGraph for
  AAA-quality runtime alongside the browser-runtime Phase-1 default.
- `engine/scripting/` Lua bindings load Conjure-generated mechanic
  templates as Lua scripts.
- `engine/ecs/` archetype system maps Conjure mechanics to Pistachio
  components.

Phase 3 is Phase 4 economy work + several founder-weeks; not yet
scheduled.

## 4. Wire contract

Phase 2 live endpoints, all under `<base_url>/forge/`:

### `GET /forge/knowledge/closest_mechanics?prompt=<text>`

Response: `KnowledgeBedrockResponse`

```json
{
  "entries": [
    {
      "entryId": "K-PUZZLE-CLOSEST-001",
      "domain": "psych",
      "normalisedKey": "tetris-1984",
      "body": {
        "title": "Tetris",
        "year": 1984,
        "mechanic": "stack-and-clear",
        "retentionScore": 0.78
      },
      "fnv1aHashHex": "<16-hex>"
    }
  ],
  "corpusVersion": "knowledge-bedrock@v1.2.0",
  "citation": "Pistachio Knowledge Bedrock entry K-PUZZLE-CLOSEST-001 ..."
}
```

### `GET /forge/knowledge/retention_pattern?mechanicKind=<puzzle|arcade|idle>`

Response: `MechanicPattern`

```json
{
  "mechanicKind": "puzzle",
  "canonicalName": "Match-pattern stack",
  "canonicalExamples": ["Tetris (1984)", "Threes (2014)", "Picross (1995)"],
  "retentionScore": 0.78,
  "targetCompletionPercent": 70,
  "citation": "Pistachio Knowledge Bedrock K-PUZZLE-RETENTION-001 ..."
}
```

### `GET /forge/knowledge/difficulty_curve?targetCompletionPercent=<int>`

Response: `DifficultyCurve`

```json
{
  "targetCompletionPercent": 70,
  "perLevelMultiplier": [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.5],
  "citation": "Pistachio Knowledge Bedrock K-CURVE-70-PCT ..."
}
```

### `GET /forge/lore/context?theme=<text>`

Response: `LoreContext`

```json
{
  "theme": "discovery",
  "edges": [
    {
      "from": "Scholar",
      "to": "Poet",
      "relationship": "productive-tension",
      "tension": "analytic precision vs. evocative meaning"
    }
  ],
  "graphVersion": "lore-graph@v1.0.0",
  "citation": "Pistachio Lore graph (1 edge) ..."
}
```

## 5. Sequence diagram (Phase 2 live)

```
Conjure SaaS (TS)               Nexus               Pistachio Engine (C++)
       |                          |                            |
       | forge.generateWithInt.() |                            |
       |---------+                |                            |
       |         |                |                            |
       | <-------+                |                            |
       |                          |                            |
       | GET /forge/knowledge/    |                            |
       |   closest_mechanics      |                            |
       |   ?prompt=<text>         |                            |
       |------------------------->|                            |
       |                          |  forward via nexus.ai      |
       |                          |--------------------------->|
       |                          |                            |
       |                          |   engine/forge_knowledge_  |
       |                          |   service/ handler:        |
       |                          |   1) lowercase-normalise   |
       |                          |      prompt                |
       |                          |   2) consult Knowledge     |
       |                          |      Bedrock indices       |
       |                          |   3) fnv1a hash entries    |
       |                          |   4) build response        |
       |                          |                            |
       |                          | <--------------------------|
       | <------------------------|                            |
       |                          |                            |
       | enrich IDENTIFY result   |                            |
       | with Pistachio entries   |                            |
       |                          |                            |
       | GET /forge/knowledge/    |                            |
       |   retention_pattern      |                            |
       |   ?mechanicKind=puzzle   |                            |
       |------------------------->|                            |
       |                          |--------------------------->|
       |                          | <--------------------------|
       | <------------------------|                            |
       |                          |                            |
       | blend ASSESS score with  |                            |
       | retention.retentionScore |                            |
       |                          |                            |
       | ...                      |                            |
```

## 6. Cohort discipline

### R145.B sibling-not-stacked

The integration is an ADDITIVE sibling package under `src/lib/
integrations/pistachio/`. No edits to the existing 6 cohort packages
under `src/lib/cohort/`. The forge wire-in adds a new `generateWith
Integrations()` SIBLING on the same parent module (forge.ts); existing
`generate()` is preserved untouched.

### R145.C firewall

The cohort firewall under `src/lib/cohort/firewall/` scans `src/lib/
cohort/` only -- integrations directory is excluded by design.
Phase-2 wire-in will add an analogous integration-firewall pin if any
cohort-canonical literal (e.g. corpus version) needs grep-discoverable
firewalling.

### R157 substrate-native idioms

- TypeScript classes with `#`-private fields.
- ES module imports (`$lib/...` SvelteKit aliases).
- `async`/`await` everywhere (no Promise chains, no callbacks).
- Frozen result shapes via `Object.freeze()` -- matches the cohort
  immutability discipline.

### R166 LIBRARY-RECOMMENDS-HOST-ACTS

All Pistachio responses -- mock AND future live -- carry the
`ReviewedByCounsel = false` sentinel implied by the
`MOCK_REVIEWED_BY_COUNSEL = false` export. The host (Limitless / David
Carson) is responsible for:

1. Counsel-reviewing Knowledge Bedrock entries used on revenue / IP /
   liability surfaces.
2. Verifying Pistachio's Knowledge Bedrock corpus version against the
   cohort firewall before flipping `CONJURE_PISTACHIO_LIVE=true`.
3. Routing Pistachio HTTP calls through Nexus (per the godfather memory)
   rather than direct-to-Pistachio.

### R155 verdict-requires-commit-SHA-AND-test-receipt

This integration ships with:

- 28 new Pistachio-side tests in `client.test.ts` (all GREEN).
- 13 new forge-side tests in `tests/integration/studio_integrations.
  test.ts` (all GREEN).
- 194 total tests GREEN (was 121 baseline).
- `npm run build` GREEN.

Commit SHAs recorded in `reviews/IMPLEMENTATION_2026-05-27-LATE-NIGHT/
CONJURE_INTEGRATIONS.md`.

## 7. Feature-flag matrix

| Phase | `CONJURE_PISTACHIO_LIVE` | `CONJURE_PISTACHIO_KNOWLEDGE_URL` | Behaviour |
|---|---|---|---|
| Phase 1 base | (unset) | (unset) | `generate()` -- no integrations |
| Phase 1.5 default | (unset) | (unset) | `generateWithIntegrations()` -- mock-routed |
| Phase 1.5 explicit | `true` | (unset / placeholder) | Still mock (live opt-in needs URL) |
| Phase 2 live | `true` | `https://nexus/pistachio` | Live HTTP via fetch |
| Phase 2 dev | `true` | `https://localhost:8080` | Local Pistachio instance |

## 8. Open questions (Phase 2 design)

These are deliberately deferred to Phase 2 design:

- **Caching strategy.** Pistachio's Knowledge Bedrock is hand-curated +
  changes infrequently. A read-through cache + ETag-based invalidation
  in the Conjure SaaS would reduce Pistachio load. (Phase 2 wire-in.)
- **Corpus version pinning.** The cohort firewall pins KAT-1 byte-
  identity but the Knowledge Bedrock corpus version is separate. Should
  a stale-corpus drift be a firewall failure? (Phase 2 design.)
- **Rate limiting.** Pistachio's HTTP wrapper needs a rate limit per
  Conjure-tenant. (Phase 2 design + Nexus integration.)
- **Multi-tenant scoping.** Conjure may eventually want per-creator
  fine-tuned Knowledge Bedrock fragments. Not in Phase 2 scope.

## 9. Related docs

- `flagships/pistachio/CONTEXT.md` -- Pistachio overall context.
- `flagships/conjure/CONTEXT.md` §5 -- Conjure integration summary.
- `feedback_nexus_is_fw_ai_provider.md` -- godfather memory pinning
  Nexus as canonical AI provider.
- `reference_pistachio_knowledge_bedrock.md` -- (Phase 2 will write)
  the canonical Knowledge Bedrock surface reference.
