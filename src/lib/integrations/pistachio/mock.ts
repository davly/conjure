/**
 * In-memory mock for the Pistachio Knowledge Bedrock + Lore graph
 * integration. Phase 1.5 ships this so the Conjure forge pipeline can
 * exercise the integration surface without a live Pistachio binding.
 *
 * The mock returns deterministic canned responses keyed off simple
 * lowercase substring matches against the prompt / mechanic kind /
 * theme inputs. NO real Pistachio engine is invoked.
 *
 * # Honest disclosure
 *
 * - Mock data is NOT counsel-reviewed and NOT representative of
 *   Pistachio's actual Knowledge Bedrock corpus (~873 entries across 8
 *   domains). It is a fixture suitable for forge-pipeline integration
 *   tests only.
 * - The `ReviewedByCounsel = false` sentinel from R166 LIABILITY-FOOTER
 *   applies -- any production use of Knowledge Bedrock data on a
 *   revenue / IP / liability surface requires counsel review.
 * - Phase 2 wire-in MUST surface the real Pistachio corpus version and
 *   verify byte-identity against `KAT-1` per the cohort firewall.
 */

import type { MechanicKind } from '$lib/types/game';

import type {
  DifficultyCurve,
  IPistachioKnowledgeClient,
  KnowledgeBedrockEntry,
  KnowledgeBedrockResponse,
  LoreContext,
  LoreEdge,
  MechanicPattern,
} from './types';

/** Mock corpus version pin. Production uses real Pistachio corpus version. */
export const PISTACHIO_MOCK_CORPUS_VERSION: string =
  'knowledge-bedrock@mock-v0.1.0';

export const PISTACHIO_MOCK_LORE_VERSION: string = 'lore-graph@mock-v0.1.0';

/** R166 LIBRARY-RECOMMENDS-HOST-ACTS sentinel for mock responses. */
export const MOCK_REVIEWED_BY_COUNSEL: boolean = false;

/**
 * Canned mechanic-pattern records for the 3 Phase-1 mechanic kinds.
 * Sourced from public game-design conventions (Tetris / Canabalt /
 * Cookie Clicker as anchor titles). NOT counsel-reviewed.
 */
const MOCK_MECHANIC_PATTERNS: Readonly<Record<MechanicKind, MechanicPattern>> =
  Object.freeze({
    puzzle: Object.freeze({
      mechanicKind: 'puzzle',
      canonicalName: 'Match-pattern stack',
      canonicalExamples: Object.freeze([
        'Tetris (1984)',
        'Threes (2014)',
        'Picross (1995)',
      ]),
      retentionScore: 0.78,
      targetCompletionPercent: 70,
      citation:
        'Pistachio Knowledge Bedrock mock entry K-PUZZLE-RETENTION-001 (mock-v0.1.0; not counsel-reviewed)',
    }),
    arcade: Object.freeze({
      mechanicKind: 'arcade',
      canonicalName: 'Endless-runner reflex',
      canonicalExamples: Object.freeze([
        'Canabalt (2009)',
        'Flappy Bird (2013)',
        'Crossy Road (2014)',
      ]),
      retentionScore: 0.62,
      targetCompletionPercent: 45,
      citation:
        'Pistachio Knowledge Bedrock mock entry K-ARCADE-RETENTION-001 (mock-v0.1.0; not counsel-reviewed)',
    }),
    idle: Object.freeze({
      mechanicKind: 'idle',
      canonicalName: 'Incremental clicker',
      canonicalExamples: Object.freeze([
        'Cookie Clicker (2013)',
        'AdVenture Capitalist (2014)',
      ]),
      retentionScore: 0.83,
      targetCompletionPercent: 25,
      citation:
        'Pistachio Knowledge Bedrock mock entry K-IDLE-RETENTION-001 (mock-v0.1.0; not counsel-reviewed)',
    }),
  });

/**
 * MockPistachioKnowledgeClient is the Phase 1.5 in-memory client. It
 * implements the same interface as the future live client so forge
 * pipeline code can be wire-form-identical across the mock + live
 * Phase-2 binding.
 *
 * Per R157 substrate-native idiom: TypeScript class with `#`-private
 * state, async methods, frozen result shapes. All methods are pure
 * functions of their inputs -- no I/O, no mutable internal state.
 */
export class MockPistachioKnowledgeClient implements IPistachioKnowledgeClient {
  // R157 substrate-native: #-private field. Pinned to the mock corpus.
  readonly #corpusVersion: string;
  readonly #loreVersion: string;

  constructor(opts?: {
    readonly corpusVersion?: string;
    readonly loreVersion?: string;
  }) {
    this.#corpusVersion = opts?.corpusVersion ?? PISTACHIO_MOCK_CORPUS_VERSION;
    this.#loreVersion = opts?.loreVersion ?? PISTACHIO_MOCK_LORE_VERSION;
  }

  /**
   * Return the active corpus version pin. Public read-only accessor for
   * test instrumentation + verdict provenance.
   */
  get corpusVersion(): string {
    return this.#corpusVersion;
  }

  get loreVersion(): string {
    return this.#loreVersion;
  }

  async queryClosestMechanics(
    prompt: string,
  ): Promise<KnowledgeBedrockResponse> {
    const lc = prompt.toLowerCase();
    const entries: KnowledgeBedrockEntry[] = [];

    // Deterministic per-keyword match against the canned mechanic kinds.
    if (
      lc.includes('puzzle') ||
      lc.includes('stack') ||
      lc.includes('block') ||
      lc.includes('match') ||
      lc.includes('grid')
    ) {
      entries.push(
        Object.freeze({
          entryId: 'K-PUZZLE-CLOSEST-001',
          domain: 'psych',
          normalisedKey: 'tetris-1984',
          body: Object.freeze({
            title: 'Tetris',
            year: 1984,
            mechanic: 'stack-and-clear',
            retentionScore: 0.78,
          }),
          fnv1aHashHex: 'cbf29ce484222325', // FNV-1a 64-bit empty seed (placeholder)
        }),
      );
    }
    if (
      lc.includes('arcade') ||
      lc.includes('runner') ||
      lc.includes('jump') ||
      lc.includes('dodge')
    ) {
      entries.push(
        Object.freeze({
          entryId: 'K-ARCADE-CLOSEST-001',
          domain: 'psych',
          normalisedKey: 'canabalt-2009',
          body: Object.freeze({
            title: 'Canabalt',
            year: 2009,
            mechanic: 'endless-runner',
            retentionScore: 0.62,
          }),
          fnv1aHashHex: 'cbf29ce484222325',
        }),
      );
    }
    if (
      lc.includes('idle') ||
      lc.includes('incremental') ||
      lc.includes('clicker') ||
      lc.includes('tap')
    ) {
      entries.push(
        Object.freeze({
          entryId: 'K-IDLE-CLOSEST-001',
          domain: 'psych',
          normalisedKey: 'cookie-clicker-2013',
          body: Object.freeze({
            title: 'Cookie Clicker',
            year: 2013,
            mechanic: 'incremental-tap',
            retentionScore: 0.83,
          }),
          fnv1aHashHex: 'cbf29ce484222325',
        }),
      );
    }

    const citation =
      entries.length > 0
        ? `Pistachio Knowledge Bedrock mock corpus ${this.#corpusVersion} (entries: ${entries.map((e) => e.entryId).join(', ')}; not counsel-reviewed)`
        : '';

    return Object.freeze({
      entries: Object.freeze(entries),
      corpusVersion: this.#corpusVersion,
      citation,
    });
  }

  async getRetentionPattern(
    mechanicKind: MechanicKind,
  ): Promise<MechanicPattern> {
    return MOCK_MECHANIC_PATTERNS[mechanicKind];
  }

  async getDifficultyCurve(
    targetCompletionPercent: number,
  ): Promise<DifficultyCurve> {
    // Deterministic curve generator -- linear ramp scaled by target.
    // Phase 2 live binding will return Pistachio's per-genre playtest
    // corpus-derived curve.
    const clampedTarget = Math.max(
      10,
      Math.min(95, Math.round(targetCompletionPercent)),
    );
    const numLevels = 8; // R150 manifest 8-levels-per-mechanic default
    const perLevel: number[] = [];
    for (let i = 0; i < numLevels; i++) {
      // Difficulty multiplier rises 1.0 -> 2.5 with adjustment for target
      // completion (higher target = gentler curve).
      const t = i / (numLevels - 1);
      const targetAdj = (100 - clampedTarget) / 100;
      perLevel.push(Number((1.0 + 1.5 * t * (1.0 - 0.4 * targetAdj)).toFixed(3)));
    }
    return Object.freeze({
      targetCompletionPercent: clampedTarget,
      perLevelMultiplier: Object.freeze(perLevel),
      citation: `Pistachio Knowledge Bedrock mock difficulty-curve K-CURVE-${clampedTarget}-PCT (${this.#corpusVersion}; not counsel-reviewed)`,
    });
  }

  async getLoreContext(theme: string): Promise<LoreContext> {
    const lc = theme.toLowerCase();
    const edges: LoreEdge[] = [];

    // Three canonical archetypes from Pistachio's LoreCharacter taxonomy.
    if (lc.includes('learn') || lc.includes('discover') || lc.includes('story')) {
      edges.push(
        Object.freeze({
          from: 'Scholar',
          to: 'Poet',
          relationship: 'productive-tension',
          tension: 'analytic precision vs. evocative meaning',
        }),
      );
    }
    if (lc.includes('hero') || lc.includes('quest') || lc.includes('adventure')) {
      edges.push(
        Object.freeze({
          from: 'Hero',
          to: 'Mentor',
          relationship: 'apprentice-master',
          tension: 'autonomy vs. inherited wisdom',
        }),
      );
    }
    if (lc.includes('puzzle') || lc.includes('solve') || lc.includes('logic')) {
      edges.push(
        Object.freeze({
          from: 'Detective',
          to: 'Scholar',
          relationship: 'shared-methodology',
          tension: 'real-world urgency vs. abstract correctness',
        }),
      );
    }

    const citation =
      edges.length > 0
        ? `Pistachio Lore graph mock ${this.#loreVersion} (${edges.length} edges; not counsel-reviewed)`
        : '';

    return Object.freeze({
      theme,
      edges: Object.freeze(edges),
      graphVersion: this.#loreVersion,
      citation,
    });
  }
}
