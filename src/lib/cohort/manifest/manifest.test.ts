/**
 * R150 PARALLEL-MAP review-metadata envelope tests.
 *
 * Pins:
 *  1. Schema version literal.
 *  2. 10+ canonical entries.
 *  3. 5-field envelope shape on every entry.
 *  4. Source constants are referenced (no orphan SOURCE_* exports).
 *  5. IsStale sentinel correctly flags honest-TODO entries.
 *  6. Subject uniqueness within category.
 *  7. Confidence values are in the closed set.
 */

import { describe, it, expect } from 'vitest';

import {
  CONJURE_MANIFEST,
  CONJURE_MANIFEST_COUNT,
  SCHEMA_VERSION,
  SOURCE_COMMUNITY_BEST_PRACTICE,
  SOURCE_FORGE_HEURISTIC,
  SOURCE_FOUNDER_BRIEF,
  SOURCE_GAME_DESIGN_LITERATURE,
  SOURCE_INDUSTRY_STATS,
  SOURCE_PHASE_PENDING,
  SOURCE_PLATFORM_TERMS,
  STALE_FRESH_AT,
  entriesByCategory,
  findEntry,
  isStale,
  staleEntries,
} from './manifest';

describe('R150 manifest envelope -- schema pinning', () => {
  it('schema version literal', () => {
    expect(SCHEMA_VERSION).toBe('conjure.r150.v1');
  });

  it('stale-fresh-at sentinel literal', () => {
    expect(STALE_FRESH_AT).toBe('1970-01-01');
  });
});

describe('R150 manifest -- canonical entries', () => {
  it('canonical count is at least 10', () => {
    expect(CONJURE_MANIFEST_COUNT).toBe(10);
    expect(CONJURE_MANIFEST.length).toBeGreaterThanOrEqual(10);
  });

  it('every entry has all 5 R150 fields non-empty', () => {
    for (const e of CONJURE_MANIFEST) {
      expect(e.subject.length).toBeGreaterThan(0);
      expect(e.category.length).toBeGreaterThan(0);
      expect(e.source.length).toBeGreaterThan(0);
      expect(e.freshAt.length).toBeGreaterThan(0);
      expect(e.note.length).toBeGreaterThan(0);
    }
  });

  it('every confidence value is in the closed ladder', () => {
    const closed = new Set(['high', 'medium', 'low', 'unknown']);
    for (const e of CONJURE_MANIFEST) {
      expect(closed.has(e.confidence)).toBe(true);
    }
  });

  it('every freshAt is ISO-8601 date format', () => {
    for (const e of CONJURE_MANIFEST) {
      expect(e.freshAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('subjects are unique within their category', () => {
    const seen = new Set<string>();
    for (const e of CONJURE_MANIFEST) {
      const key = `${e.category}::${e.subject}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('every source constant points to a defined value', () => {
    const known = new Set([
      SOURCE_FOUNDER_BRIEF,
      SOURCE_GAME_DESIGN_LITERATURE,
      SOURCE_PLATFORM_TERMS,
      SOURCE_COMMUNITY_BEST_PRACTICE,
      SOURCE_INDUSTRY_STATS,
      SOURCE_PHASE_PENDING,
      SOURCE_FORGE_HEURISTIC,
    ]);
    for (const e of CONJURE_MANIFEST) {
      expect(known.has(e.source)).toBe(true);
    }
  });

  it('manifest is frozen (R145 byte-identity contract)', () => {
    expect(Object.isFrozen(CONJURE_MANIFEST)).toBe(true);
    for (const e of CONJURE_MANIFEST) {
      expect(Object.isFrozen(e)).toBe(true);
    }
  });
});

describe('R150 manifest -- IsStale honest-TODO sentinel', () => {
  it('isStale returns true for entries with sentinel freshAt', () => {
    const stale = staleEntries();
    expect(stale.length).toBeGreaterThanOrEqual(1);
    for (const e of stale) {
      expect(isStale(e)).toBe(true);
      expect(e.freshAt).toBe(STALE_FRESH_AT);
    }
  });

  it('stale entries have confidence=unknown', () => {
    for (const e of staleEntries()) {
      expect(e.confidence).toBe('unknown');
    }
  });

  it('non-stale entries have non-unknown confidence', () => {
    for (const e of CONJURE_MANIFEST) {
      if (!isStale(e)) {
        expect(e.confidence).not.toBe('unknown');
      }
    }
  });
});

describe('R150 manifest -- category coverage', () => {
  it('covers mechanic_archetype with at least 3 entries (Phase 1 templates)', () => {
    const mechs = entriesByCategory('mechanic_archetype');
    expect(mechs.length).toBeGreaterThanOrEqual(3);
  });

  it('covers difficulty_curve', () => {
    expect(entriesByCategory('difficulty_curve').length).toBeGreaterThanOrEqual(1);
  });

  it('covers visual_style_template', () => {
    expect(entriesByCategory('visual_style_template').length).toBeGreaterThanOrEqual(1);
  });

  it('covers audio_mood_library', () => {
    expect(entriesByCategory('audio_mood_library').length).toBeGreaterThanOrEqual(1);
  });

  it('covers ux_pattern', () => {
    expect(entriesByCategory('ux_pattern').length).toBeGreaterThanOrEqual(1);
  });

  it('covers platform_term', () => {
    expect(entriesByCategory('platform_term').length).toBeGreaterThanOrEqual(1);
  });

  it('findEntry returns the entry for a known subject + category', () => {
    const e = findEntry('block_stacking_puzzle', 'mechanic_archetype');
    expect(e).toBeDefined();
    expect(e!.confidence).toBe('high');
  });

  it('findEntry returns undefined for unknown entries', () => {
    expect(findEntry('nonexistent', 'mechanic_archetype')).toBeUndefined();
  });
});
