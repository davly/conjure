/**
 * R150 PARALLEL-MAP review-metadata envelope for Conjure.
 *
 * R150 (R-PARALLEL-MAP-R144-REVIEW-METADATA-SIBLING, promoted 2026-05-22)
 * requires every flagship's static curated content (game-design conventions,
 * difficulty curves, visual style templates, audio mood libraries, mechanic
 * archetypes) to ship the canonical 5-field schematised-knowledge envelope:
 *
 *   1. source        -- citation / provenance string
 *   2. freshAt       -- ISO-8601 date the source was last verified
 *   3. schemaVersion -- pinned schema-version literal
 *   4. confidence    -- degree-of-justification (low/medium/high/unknown)
 *   5. note          -- free-text citation specifics + any IsStale sentinel
 *
 * Conjure's curated game-design knowledge passes the universal-fact test
 * (block-stacking mechanics are a 40-year-old documented pattern; difficulty
 * curve theory is decades-old game-design literature; Roblox / Steam /
 * mobile-store distribution conventions are publicly-documented platform
 * terms) so entries can live as hardcoded TypeScript literals per
 * feedback_knowledge_bedrock_must_be_db_for_domain_rules.md. What's added
 * here is the freshness-discipline that the 2026-05-22 R150 promotion
 * mandated even for universal-fact content: every entry declares Source +
 * FreshAt + Confidence so a regulator running grep across the ecosystem
 * sees uniform coverage.
 */

/**
 * SchemaVersion pins the canonical R150 schematised-knowledge schema
 * version. Bumped only on additive-and-non-breaking schema changes. Any
 * breaking change forces a new constant + parallel surface during migration
 * (R145-strict additive discipline).
 */
export const SCHEMA_VERSION: string = 'conjure.r150.v1';

/** R150 confidence ladder. Aligned with the ecosystem cohort. */
export type Confidence = 'high' | 'medium' | 'low' | 'unknown';

/** Source enumeration -- canonical citation kinds. */
export const SOURCE_FOUNDER_BRIEF = 'conjure_founder_brief';
export const SOURCE_GAME_DESIGN_LITERATURE = 'game_design_literature';
export const SOURCE_PLATFORM_TERMS = 'platform_distribution_terms';
export const SOURCE_COMMUNITY_BEST_PRACTICE = 'community_best_practice';
export const SOURCE_INDUSTRY_STATS = 'industry_published_statistics';
export const SOURCE_PHASE_PENDING = 'phase_2_or_later_pending';
export const SOURCE_FORGE_HEURISTIC = 'forge_heuristic_placeholder';

/**
 * R150 5-field schematised-knowledge envelope. Every element of Conjure's
 * curated game-design knowledge surface ships as an Entry.
 *
 * Adding a field bumps SCHEMA_VERSION; renaming or removing a field
 * triggers a parallel-surface migration per R145 strict-additive.
 */
export interface Entry {
  /** Canonical subject name. Non-empty, unique within Category. */
  readonly subject: string;

  /**
   * Knowledge-surface category. One of:
   *   - "mechanic_archetype"      -- core gameplay loops
   *   - "difficulty_curve"        -- difficulty-progression conventions
   *   - "visual_style_template"   -- art-style references
   *   - "audio_mood_library"      -- music + SFX conventions
   *   - "ux_pattern"              -- menu / control / feedback conventions
   *   - "platform_term"           -- store / marketplace policy reference
   *   - "phase_milestone"         -- Phase-2+ planned surface
   */
  readonly category: string;

  /** Source constant. One of the SOURCE_* exports. */
  readonly source: string;

  /**
   * ISO-8601 date (YYYY-MM-DD) the source was last verified. Use the
   * sentinel `STALE_FRESH_AT` for honest-TODO entries whose freshness has
   * not yet been verified.
   */
  readonly freshAt: string;

  /** Confidence label. */
  readonly confidence: Confidence;

  /** Free-text citation specifics + IsStale rationale where applicable. */
  readonly note: string;
}

/**
 * Sentinel value for the FreshAt field on honest-TODO entries. Reading
 * back this value MUST trigger a per-entry IsStale check.
 */
export const STALE_FRESH_AT: string = '1970-01-01';

/**
 * Returns true if the entry's freshAt is the sentinel value. Test pin
 * uses this to flag honest-TODO entries explicitly.
 */
export function isStale(e: Entry): boolean {
  return e.freshAt === STALE_FRESH_AT;
}

/**
 * Canonical 10-entry manifest. Covers the Phase-1 + Phase-2-pending game-
 * design knowledge surface that the forge defaults consult.
 *
 * Frozen at module load so callers cannot mutate the cohort firewall
 * surface at runtime.
 */
export const CONJURE_MANIFEST: ReadonlyArray<Entry> = Object.freeze([
  // ------- Mechanic archetypes (Phase 1 ships 3 templates) -------
  Object.freeze({
    subject: 'block_stacking_puzzle',
    category: 'mechanic_archetype',
    source: SOURCE_GAME_DESIGN_LITERATURE,
    freshAt: '2026-05-27',
    confidence: 'high',
    note: 'Block-stacking mechanic (Tetris archetype, 1984). 40+ years of community attestation. Forge default: 10-row grid x 20-col playfield; fall speed scales with row clearance count. Phase 1 puzzle template.',
  }),
  Object.freeze({
    subject: 'endless_runner_arcade',
    category: 'mechanic_archetype',
    source: SOURCE_GAME_DESIGN_LITERATURE,
    freshAt: '2026-05-27',
    confidence: 'high',
    note: 'Endless-runner mechanic (Canabalt archetype, 2009). Phase 1 arcade template -- jump/gravity/score loop with procedurally-spawned obstacles. Mobile-store best-seller class.',
  }),
  Object.freeze({
    subject: 'idle_incremental',
    category: 'mechanic_archetype',
    source: SOURCE_GAME_DESIGN_LITERATURE,
    freshAt: '2026-05-27',
    confidence: 'high',
    note: 'Idle / incremental mechanic (Cookie Clicker archetype, 2013). Phase 1 idle template -- resource + rate + multiplier loop. Strong retention class per industry stats.',
  }),

  // ------- Difficulty curves -------
  Object.freeze({
    subject: 'puzzle_70pct_completion_target',
    category: 'difficulty_curve',
    source: SOURCE_INDUSTRY_STATS,
    freshAt: '2026-05-27',
    confidence: 'medium',
    note: 'Forge default for puzzle games: ramp difficulty so per-level completion rate trends to 70% (industry rule-of-thumb -- retention drops sharply below 50% completion). Cited as forge baseline when user prompt does not specify difficulty.',
  }),
  Object.freeze({
    subject: 'one_mechanic_per_8_levels',
    category: 'difficulty_curve',
    source: SOURCE_GAME_DESIGN_LITERATURE,
    freshAt: '2026-05-27',
    confidence: 'medium',
    note: 'Forge default for puzzle games: introduce one new mechanic every ~8 levels (Picross / Threes / Monument Valley pattern). Avoids cognitive overload; sustains engagement curve.',
  }),

  // ------- Visual style templates -------
  Object.freeze({
    subject: 'neon_aesthetic_template',
    category: 'visual_style_template',
    source: SOURCE_COMMUNITY_BEST_PRACTICE,
    freshAt: '2026-05-27',
    confidence: 'medium',
    note: 'Forge default neon aesthetic: cyan + magenta + black palette, glow shaders, vector silhouettes. Cited when prompt mentions "neon" / "synthwave" / "cyberpunk" without further specification.',
  }),
  Object.freeze({
    subject: 'minimalist_template',
    category: 'visual_style_template',
    source: SOURCE_COMMUNITY_BEST_PRACTICE,
    freshAt: '2026-05-27',
    confidence: 'medium',
    note: 'Forge default minimalist aesthetic: 3-colour palette, flat shapes, no shading. Cited when prompt mentions "minimal" / "clean" / "simple" without further specification.',
  }),

  // ------- Audio mood -------
  Object.freeze({
    subject: 'chill_electronic_mood',
    category: 'audio_mood_library',
    source: SOURCE_COMMUNITY_BEST_PRACTICE,
    freshAt: '2026-05-27',
    confidence: 'low',
    note: 'Forge default chill-electronic audio: 80-100 BPM, minor-key arpeggios, ambient pads. Procedural-audio generator NOT YET shipped Phase 1 -- this entry pins the convention for the Phase-2 audio forge.',
  }),

  // ------- UX patterns -------
  Object.freeze({
    subject: 'tap_to_play_landing',
    category: 'ux_pattern',
    source: SOURCE_COMMUNITY_BEST_PRACTICE,
    freshAt: '2026-05-27',
    confidence: 'high',
    note: 'Forge default landing UX: tap-anywhere-to-start, no menu screens between landing and play. Cited for Phase-1 web runtime + Phase-2 mobile runtime.',
  }),

  // ------- Platform terms (R165 distribution-platform-mediated reference) -------
  Object.freeze({
    subject: 'apple_app_store_distribution_terms',
    category: 'platform_term',
    source: SOURCE_PLATFORM_TERMS,
    freshAt: STALE_FRESH_AT,
    confidence: 'unknown',
    note: 'Apple App Store Distribution Agreement + App Review Guidelines. PHASE-2 mobile-app distribution depends on these. Founder-drafted reference -- counsel review pending. R166 LIABILITY-FOOTER + R150 IsStale honest-TODO sentinel.',
  }),
]);

/**
 * Canonical entry count for the cohort firewall pin. R150 saturation
 * requires at minimum 10 entries per cohort consumer.
 */
export const CONJURE_MANIFEST_COUNT: number = 10;

/**
 * Lookup helper -- returns entries matching a category.
 */
export function entriesByCategory(category: string): ReadonlyArray<Entry> {
  return CONJURE_MANIFEST.filter((e) => e.category === category);
}

/**
 * Lookup helper -- returns the entry with the given subject + category.
 */
export function findEntry(subject: string, category: string): Entry | undefined {
  return CONJURE_MANIFEST.find((e) => e.subject === subject && e.category === category);
}

/**
 * Returns all entries flagged as stale. Useful for the cohort firewall
 * test that pins the count of honest-TODO entries.
 */
export function staleEntries(): ReadonlyArray<Entry> {
  return CONJURE_MANIFEST.filter(isStale);
}
