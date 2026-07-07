/**
 * Pistachio HTTP wire-form contract for the Conjure integration.
 *
 * Phase 1.5 (this ship): contract-only -- the endpoints below DO NOT yet
 * exist in Pistachio. Pistachio's current state is `built-with-paired-sdk-
 * not-wired` per the Pistachio CONTEXT.md; the C++20 engine has Knowledge
 * Bedrock + Lore graph in-process but no HTTP wrapper.
 *
 * Phase 2 deliverable (Pistachio side): ship an `engine/
 * forge_knowledge_service/` HTTP wrapper exposing these four endpoints.
 * Estimated cost: ~3-5 founder-days (HTTP server crate + JSON
 * serialisation for KnowledgeTypes.h structs + integration tests).
 *
 * R166 LIBRARY-RECOMMENDS-HOST-ACTS applies: the host is responsible for
 * deciding whether the live binding routes through Nexus (per the
 * `feedback_nexus_is_fw_ai_provider.md` godfather memory -- "Nexus is THE
 * AI provider for Fleetworks") or directly to a Pistachio instance.
 *
 * # Wire contract design choices
 *
 * - All endpoints are GET with query-string params (idempotent, cacheable).
 * - Responses are JSON; numeric fields use integer basis-points where
 *   possible (avoids float drift across substrates).
 * - All responses carry `corpusVersion` (or `graphVersion`) for cohort
 *   byte-identity verification. Stale-corpus drift is a R145.C firewall
 *   concern -- the live integration MUST verify the version pin.
 * - All responses include a `citation` field suitable for embedding in
 *   Conjure EXPLAIN rationale.
 *
 * # Cohort byte-identity
 *
 * The Knowledge Bedrock entry IDs are FNV-1a 64-bit hashed (per
 * Pistachio's R74 canonical hash decision -- `engine/foundation/
 * knowledge/KnowledgeTypes.h`). The wire contract preserves the hex
 * representation so Conjure's verifier can re-derive byte-identity at
 * cache time.
 */

/**
 * Endpoint paths under the Pistachio Knowledge Service base URL. Phase 2
 * production hostname TBD; Phase 1.5 mock uses
 * `placeholder://pistachio-knowledge-service-not-wired/`.
 */
export const PISTACHIO_ENDPOINTS = Object.freeze({
  /**
   * GET /forge/knowledge/closest_mechanics?prompt=<url-encoded prompt>
   *
   * Response: KnowledgeBedrockResponse (JSON).
   *
   * Lookup the closest existing game mechanics by natural-language
   * prompt. Used by Conjure's IDENTIFY stage.
   */
  closestMechanics: '/forge/knowledge/closest_mechanics',

  /**
   * GET /forge/knowledge/retention_pattern?mechanicKind=<puzzle|arcade|idle>
   *
   * Response: MechanicPattern (JSON).
   *
   * Lookup the retention pattern for a mechanic kind. Used by Conjure's
   * ASSESS stage.
   */
  retentionPattern: '/forge/knowledge/retention_pattern',

  /**
   * GET /forge/knowledge/difficulty_curve?targetCompletionPercent=<int>
   *
   * Response: DifficultyCurve (JSON).
   *
   * Lookup the difficulty curve for a target completion percentage. Used
   * by Conjure's EXPLAIN stage.
   */
  difficultyCurve: '/forge/knowledge/difficulty_curve',

  /**
   * GET /forge/lore/context?theme=<url-encoded theme>
   *
   * Response: LoreContext (JSON).
   *
   * Lookup Lore graph context for a theme. Used by Conjure's
   * mechanic-generation stages (Phase 2+).
   */
  loreContext: '/forge/lore/context',
} as const);

/**
 * Construct the full URL for a Pistachio endpoint. The base URL is the
 * Conjure-side `CONJURE_PISTACHIO_KNOWLEDGE_URL` env var; Phase 1.5
 * defaults to `placeholder://pistachio-knowledge-service-not-wired/`.
 *
 * Query parameters are url-encoded via `URLSearchParams` -- safe for any
 * UTF-8 input including prompts containing `&` / `=` / quotes.
 *
 * # Example
 *
 * ```ts
 * const url = buildEndpointUrl(
 *   'https://pistachio.example.com',
 *   PISTACHIO_ENDPOINTS.closestMechanics,
 *   { prompt: 'A neon stack puzzle' },
 * );
 * // -> 'https://pistachio.example.com/forge/knowledge/closest_mechanics?prompt=A+neon+stack+puzzle'
 * ```
 */
export function buildEndpointUrl(
  baseUrl: string,
  endpoint: string,
  params: Readonly<Record<string, string | number>>,
): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    search.set(k, String(v));
  }
  const sep = baseUrl.endsWith('/') ? '' : '';
  const trimmedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${trimmedBase}${sep}${trimmedEndpoint}?${search.toString()}`;
}

/**
 * Placeholder base URL used by the Phase 1.5 mock client. Operators
 * MUST set `CONJURE_PISTACHIO_KNOWLEDGE_URL` env var before any Phase-2
 * live binding lands.
 */
export const PISTACHIO_PLACEHOLDER_BASE_URL: string =
  'placeholder://pistachio-knowledge-service-not-wired';
