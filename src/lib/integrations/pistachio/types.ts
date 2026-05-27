/**
 * Pistachio integration contract types for Conjure.
 *
 * Pistachio is the C++20 Vulkan 1.3 "glass-box" game engine flagship
 * shipping a hand-curated Knowledge Bedrock (8 domains, ~873 entries
 * spanning arch/astro/chem/colors/geo/history/music/psych) + Lore graph
 * (`engine/ai/LoreDatabase.{h,cpp}` -- LoreCharacter / LorePrinciple)
 * + Wave 8.1 delve embed.
 *
 * Phase 2 vision: Pistachio's Knowledge Bedrock feeds Conjure's
 * `forge.identify()` and `forge.assess()` for game-pattern lookup; the
 * Lore graph feeds Conjure's mechanic generation; eventual native-runtime
 * fork lets desktop Conjure deployments use Pistachio for AAA-quality
 * runtime alongside the browser-runtime Phase-1 default.
 *
 * Phase 1.5 (this ship): CONTRACT-ONLY scaffold. Pistachio does NOT yet
 * expose an HTTP / IPC endpoint -- the live binding lands in Phase 2 once
 * Pistachio ships an `engine/forge_knowledge_service/` HTTP wrapper (per
 * the architecture doc at `docs/INTEGRATION_PISTACHIO.md`).
 *
 * All types here are `readonly` + immutable per R157 substrate-native
 * idiom (TypeScript classes with #-private state, frozen result objects).
 */

import type { MechanicKind } from '$lib/types/game';

/** Knowledge Bedrock domain enum. Mirrors Pistachio's 8 JSON data dirs. */
export type KnowledgeBedrockDomain =
  | 'arch'
  | 'astro'
  | 'chem'
  | 'colors'
  | 'geo'
  | 'history'
  | 'music'
  | 'psych';

export const KNOWLEDGE_BEDROCK_DOMAINS: ReadonlyArray<KnowledgeBedrockDomain> =
  Object.freeze([
    'arch',
    'astro',
    'chem',
    'colors',
    'geo',
    'history',
    'music',
    'psych',
  ]);

/**
 * KnowledgeBedrockQuery is the request shape for any Pistachio Knowledge
 * Bedrock lookup. The query targets a single domain + a normalised lookup
 * key. The wire contract uses lowercase-normalised keys per Pistachio's
 * `HashMap<String, u32>` primary index convention.
 */
export interface KnowledgeBedrockQuery {
  readonly domain: KnowledgeBedrockDomain;
  readonly normalisedKey: string;
  /** Optional fuzzy-match threshold (0..1). Defaults to exact-match. */
  readonly fuzzyThreshold?: number;
}

/** A single Knowledge Bedrock entry. */
export interface KnowledgeBedrockEntry {
  readonly entryId: string;
  readonly domain: KnowledgeBedrockDomain;
  readonly normalisedKey: string;
  /** Free-form JSON body shape -- Pistachio's `KnowledgeTypes.h` mirrors. */
  readonly body: Readonly<Record<string, unknown>>;
  /** Hash for cohort byte-identity verification (FNV-1a 64-bit). */
  readonly fnv1aHashHex: string;
}

/**
 * KnowledgeBedrockResponse is the response shape for any Knowledge
 * Bedrock lookup. Returns 0..N entries, the source corpus version, and a
 * provenance citation suitable for the Conjure EXPLAIN stage rationale.
 */
export interface KnowledgeBedrockResponse {
  readonly entries: ReadonlyArray<KnowledgeBedrockEntry>;
  /** Pistachio corpus version (e.g. "knowledge-bedrock@v1.2.0"). */
  readonly corpusVersion: string;
  /**
   * Citation token suitable for embedding in EXPLAIN rationale. Shape:
   *   "Pistachio Knowledge Bedrock entry {entryId} ({domain}/{normalisedKey})".
   * Empty string if no entries returned.
   */
  readonly citation: string;
}

/**
 * MechanicPattern is the Pistachio-canonical pattern record for a
 * single game mechanic kind. Phase 2 wires this to Pistachio's
 * `engine/ecosystem/` + `engine/gameplay/` pattern registry.
 */
export interface MechanicPattern {
  readonly mechanicKind: MechanicKind;
  readonly canonicalName: string;
  /** Pistachio reference-game canonical examples. */
  readonly canonicalExamples: ReadonlyArray<string>;
  /** Retention-pattern signature (0..1, higher = stickier). */
  readonly retentionScore: number;
  /** Target completion percentage from Pistachio playtest corpus. */
  readonly targetCompletionPercent: number;
  /** Citation for EXPLAIN-stage provenance. */
  readonly citation: string;
}

/**
 * LoreEdge is a single edge in Pistachio's Lore graph. Phase 2 wires
 * this to `LoreDatabase`. Phase 1.5 ships the contract only.
 *
 * From + to are Lore node identifiers (Scholar / Poet / etc per Pistachio's
 * `LoreCharacter` archetypes).
 */
export interface LoreEdge {
  readonly from: string;
  readonly to: string;
  readonly relationship: string;
  readonly tension: string;
}

/**
 * LoreContext is the response shape for a Conjure theme -> Lore graph
 * lookup. Returns 0..N edges + a thematic citation token.
 */
export interface LoreContext {
  readonly theme: string;
  readonly edges: ReadonlyArray<LoreEdge>;
  /** Pistachio Lore graph version (e.g. "lore-graph@v1.0.0"). */
  readonly graphVersion: string;
  /** Citation token suitable for embedding in EXPLAIN rationale. */
  readonly citation: string;
}

/**
 * DifficultyCurve is the Pistachio-canonical curve record for a target
 * completion percentage. Phase 2 wires this to Pistachio's `engine/
 * gameplay/` playtest corpus.
 */
export interface DifficultyCurve {
  readonly targetCompletionPercent: number;
  /** Per-level difficulty multipliers (length = num levels). */
  readonly perLevelMultiplier: ReadonlyArray<number>;
  /** Citation for EXPLAIN-stage provenance. */
  readonly citation: string;
}

/**
 * PistachioKnowledgeClient is the contract surface for the Phase-2
 * Pistachio Knowledge Bedrock + Lore graph integration. Phase 1.5 ships
 * a mock + the live-binding interface; the production wiring lands in
 * Phase 2 once Pistachio exposes `engine/forge_knowledge_service/`.
 *
 * All methods are async + return `readonly` result shapes. R166 LIBRARY-
 * RECOMMENDS-HOST-ACTS applies: the host (Limitless / David Carson) is
 * responsible for keeping Pistachio's Knowledge Bedrock counsel-reviewed
 * if any entry is used in revenue / IP / liability surfaces.
 */
export interface IPistachioKnowledgeClient {
  /**
   * Look up the closest existing game mechanics for a natural-language
   * prompt. Used by Conjure's IDENTIFY stage to enrich the `closest
   * existing games` rationale.
   */
  queryClosestMechanics(prompt: string): Promise<KnowledgeBedrockResponse>;

  /**
   * Look up the retention pattern for a given mechanic kind. Used by
   * Conjure's ASSESS stage to set the quality scoring threshold.
   */
  getRetentionPattern(mechanicKind: MechanicKind): Promise<MechanicPattern>;

  /**
   * Look up the difficulty curve for a target completion percentage.
   * Used by Conjure's EXPLAIN stage to cite the per-level difficulty
   * shape.
   */
  getDifficultyCurve(targetCompletionPercent: number): Promise<DifficultyCurve>;

  /**
   * Look up Lore graph context for a theme. Used by Conjure's
   * mechanic-generation stages (Phase 2+) to weave Pistachio's
   * `LoreCharacter` archetypes into the generated narrative.
   */
  getLoreContext(theme: string): Promise<LoreContext>;
}
