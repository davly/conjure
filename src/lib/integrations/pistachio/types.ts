/**
 * Shared types + interface for the Pistachio Knowledge HTTP client.
 *
 * Pistachio (the game-runtime cohort sibling) ships a Phase-2 HTTP wrapper at
 * `engine/forge_knowledge_service/` (Pistachio repo) exposing the C++
 * `ConjureKnowledgeExporter` as four `GET /forge/knowledge/...` endpoints,
 * each returning the cohort-canonical envelope
 * `{schema, data, "lore@v1", kat1}` per R150 PARALLEL-MAP.
 *
 * This module owns the Conjure-side consumer contract:
 *
 *   - `PistachioKnowledgeClient`     -- the interface every concrete client
 *                                       implementation (mock + live) honours.
 *   - `KnowledgeEnvelope<T>`         -- generic shape of every response, with
 *                                       a concrete data payload type parameter.
 *   - Four payload types             -- closest-mechanics / retention-pattern
 *                                       / difficulty-curve / lore-context.
 *
 * Why a stand-alone interface module (rather than declaring the interface on
 * the mock + extending it on the live):
 *
 *   1. R145 strict-additive composes cleaner when the contract is co-equal
 *      with both implementations -- swapping mock for live is then a one-line
 *      `createKnowledgeClient(env)` call site change in callers.
 *   2. R150 PARALLEL-MAP review-metadata: every response carries the
 *      `schema` + `lore@v1` + `kat1` cohort tail, regardless of which
 *      implementation served it. The shared `KnowledgeEnvelope<T>` type
 *      pins that invariant in the type system.
 *   3. R155 verdict + receipt: the envelope shape is the canonical-bytes
 *      surface the live client verifies HMAC against. Mock + live share the
 *      same shape so a mock-backed test can sign + verify the same envelope
 *      a regulator would see in production.
 */

/**
 * The cohort-canonical envelope shape per R150 PARALLEL-MAP. Every response
 * from any cohort-sibling knowledge HTTP service carries these four fields
 * in this order.
 *
 * Generic over `T` = the endpoint-specific data payload.
 */
export interface KnowledgeEnvelope<T> {
  /** Cohort schema discriminator, e.g. `conjure.knowledge.closest_mechanics.v1`. */
  readonly schema: string;
  /** Endpoint-specific payload. Typed via the generic parameter. */
  readonly data: T;
  /**
   * Mirror-Mark v1 wire field. Carries HMAC-SHA256(data-canonical-bytes, key).
   * Phase-2 LIVE: real HMAC hex (64 chars).
   * Phase-2 MOCK: empty string (mock does NOT sign).
   *
   * The live client verifies that for `live`, this is a 64-char lowercase
   * hex string AND that an offline re-HMAC over the canonical data substring
   * matches it (R175 LOAD-BEARING).
   */
  readonly 'lore@v1': string;
  /**
   * R151 KAT-1 cohort anchor. Every envelope from every cohort-sibling
   * service carries this byte-identical hex. The live client verifies
   * byte-identity (R145.C FIREWALL-TEST-DISCIPLINE) before trusting `data`.
   */
  readonly kat1: string;
}

/**
 * `closest_mechanics` payload -- nearest existing-game references for a
 * user prompt. Music-cluster source domain (scales + chords).
 */
export interface ClosestMechanicsData {
  readonly prompt: string;
  readonly matches: ReadonlyArray<{
    readonly title: string;
    readonly year: number;
    readonly similarityBasisPoints: number;
  }>;
}

/**
 * `retention_pattern` payload -- mechanic-kind -> psychology-bias mapping for
 * the ASSESS stage. Psychology-cluster source domain (cognitive biases).
 */
export interface RetentionPatternData {
  readonly mechanicKind: string;
  readonly bias: string;
  readonly description: string;
}

/**
 * `difficulty_curve` payload -- room-dimension-derived difficulty curve points
 * for the EXPLAIN stage. Architecture-cluster source domain.
 */
export interface DifficultyCurveData {
  readonly targetCompletion: number;
  readonly curve: ReadonlyArray<{
    readonly level: number;
    readonly difficulty: number;
  }>;
}

/**
 * `lore_context` payload -- theme-anchored historical figures + events for
 * the EXPLAIN-stage rationale. History-cluster source domain.
 */
export interface LoreContextData {
  readonly theme: string;
  readonly figures: ReadonlyArray<string>;
  readonly events: ReadonlyArray<string>;
}

/**
 * Interface every Pistachio Knowledge client (mock + live) implements.
 *
 * Methods are async to keep mock + live shape-identical (live is HTTP-bound;
 * mock returns Promise.resolve(...) for the same call site).
 */
export interface PistachioKnowledgeClient {
  closestMechanics(prompt: string): Promise<KnowledgeEnvelope<ClosestMechanicsData>>;
  retentionPattern(mechanicKind: string): Promise<KnowledgeEnvelope<RetentionPatternData>>;
  difficultyCurve(targetCompletion: number): Promise<KnowledgeEnvelope<DifficultyCurveData>>;
  loreContext(theme: string): Promise<KnowledgeEnvelope<LoreContextData>>;
}

/**
 * Cohort-canonical envelope-tail field name. Pinned here so a single grep
 * for the literal `lore@v1` finds every cohort-tail site in this package.
 */
export const ENVELOPE_LORE_FIELD: string = 'lore@v1';

/**
 * Cohort-canonical schema discriminators -- byte-identical to the Pistachio
 * side's C++ `kSchema*` constants AND the Python sidecar's `SCHEMA_*`
 * constants in `engine/forge_knowledge_service/server.py`.
 */
export const SCHEMA_CLOSEST_MECHANICS: string = 'conjure.knowledge.closest_mechanics.v1';
export const SCHEMA_RETENTION_PATTERN: string = 'conjure.knowledge.retention_pattern.v1';
export const SCHEMA_DIFFICULTY_CURVE: string = 'conjure.knowledge.difficulty_curve.v1';
export const SCHEMA_LORE_CONTEXT: string = 'conjure.knowledge.lore_context.v1';
