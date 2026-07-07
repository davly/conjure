/**
 * Conjure Phase-2 marketplace browse.
 *
 * Phase-2 ships an in-memory mock catalogue of 5 canned games plus any
 * runtime-published games. The browse surface supports:
 *
 *   - Substring filter on `q` (matches title + tagline + description)
 *   - Category filter (closed-enum)
 *   - DiscoveryClass filter (closed-enum)
 *   - Seed-game-id `because you played X` recommendation
 *   - `listByDiscoveryClass(class)` shortcut
 *
 * Phase-3+ replaces the in-memory store with a Postgres-backed
 * implementation behind the same `browse()` interface; the
 * `CONJURE_MARKETPLACE_PERSISTENT_STORAGE_PLACEHOLDER` R143 advisory
 * (see `marketplace_advisories.ts`) fires on first browse to surface
 * the boundary.
 *
 * R145 strict-additive: this file is NEW. Phase-1 surfaces UNCHANGED.
 *
 * R157 substrate-native: pure TypeScript object store. No DB clients,
 * no third-party libs.
 */

import type {
  BrowseQuery,
  Creator,
  DiscoveryClass,
  Game,
} from '$lib/types/marketplace';
import { loudOnce } from '$lib/cohort/honest/loudonce';
import { CONJURE_MARKETPLACE_ADVISORIES } from '$lib/server/marketplace_advisories';

// ---------------------------------------------------------------------------
// Canned creators -- Phase-2 fixture.
// ---------------------------------------------------------------------------

const CANNED_CREATOR_NEONNIGHT: Creator = Object.freeze({
  id: 'creator_canned_neonnight',
  handle: 'neonnight',
  displayName: 'Neon Night Studios',
  joinedAtUnixMs: 1714521600000, // 2024-05-01
  followerCount: 0,
});

const CANNED_CREATOR_TIDEPOOL: Creator = Object.freeze({
  id: 'creator_canned_tidepool',
  handle: 'tidepool',
  displayName: 'Tidepool Workshop',
  joinedAtUnixMs: 1717200000000, // 2024-06-01
  followerCount: 0,
});

const CANNED_CREATOR_LORE: Creator = Object.freeze({
  id: 'creator_canned_lorelab',
  handle: 'lorelab',
  displayName: 'Lore Lab',
  joinedAtUnixMs: 1719878400000, // 2024-07-02
  followerCount: 0,
});

/** Canonical canned-creator list. Frozen. */
export const CANNED_CREATORS: ReadonlyArray<Creator> = Object.freeze([
  CANNED_CREATOR_NEONNIGHT,
  CANNED_CREATOR_TIDEPOOL,
  CANNED_CREATOR_LORE,
]);

// ---------------------------------------------------------------------------
// Canned games -- Phase-2 fixture (5 listings).
// ---------------------------------------------------------------------------

function makeCannedGame(
  id: string,
  title: string,
  tagline: string,
  description: string,
  mechanicKind: Game['mechanicKind'],
  category: Game['category'],
  visualStyle: Game['visualStyle'],
  audioMood: Game['audioMood'],
  difficulty: Game['difficulty'],
  creator: Creator,
  publishedAtUnixMs: number,
  discoveryClasses: ReadonlyArray<DiscoveryClass>,
  aggregatePlayTimeSeconds: number,
  playCount: number,
): Game {
  return Object.freeze({
    id,
    title,
    description,
    tagline,
    mechanicKind,
    category,
    visualStyle,
    audioMood,
    difficulty,
    creator,
    publishedAtUnixMs,
    screenshots: Object.freeze([]),
    discoveryClasses: Object.freeze([...discoveryClasses]),
    aggregatePlayTimeSeconds,
    playCount,
  });
}

const CANNED_GAMES: ReadonlyArray<Game> = Object.freeze([
  makeCannedGame(
    'game_canned_neon_drift',
    'Neon Drift',
    'Slide tiles to chase the perfect lap line.',
    'A puzzle racer where every track is a sliding-tile maze. Move the road into place a beat before your car gets there. Hard, satisfying, fast.',
    'puzzle',
    'puzzle',
    'neon',
    'intense',
    'hard',
    CANNED_CREATOR_NEONNIGHT,
    1733616000000, // 2024-12-08
    ['trending', 'rising'],
    18000,
    420,
  ),
  makeCannedGame(
    'game_canned_tidepool_idle',
    'Tidepool Tycoon',
    'Run a bioluminescent rockpool empire.',
    'Idle-incremental game where every tap grows a deeper tidepool. Unlock 22 species, run the chum auction, weather the spring storms.',
    'idle',
    'idle',
    'pixel',
    'chill',
    'easy',
    CANNED_CREATOR_TIDEPOOL,
    1735603200000, // 2024-12-31
    ['hidden_gem'],
    9000,
    180,
  ),
  makeCannedGame(
    'game_canned_word_dive',
    'Word Dive',
    'Find lost words in a sinking library.',
    'A word-finder where the grid pulses with rising water. Slow, contemplative, lethal at level 9.',
    'puzzle',
    'word',
    'handdrawn',
    'ambient',
    'medium',
    CANNED_CREATOR_LORE,
    1736812800000, // 2025-01-14
    ['new', 'recommended'],
    6000,
    140,
  ),
  makeCannedGame(
    'game_canned_arcade_storm',
    'Storm Sweeper',
    'Pilot a sweeper through neon-soaked rain.',
    'A bullet-arcade where every dodge fills the storm meter and every cleared screen calms the rain. Big, fast, kind.',
    'arcade',
    'arcade',
    'neon',
    'intense',
    'medium',
    CANNED_CREATOR_NEONNIGHT,
    1738022400000, // 2025-01-28
    ['trending', 'new'],
    14400,
    310,
  ),
  makeCannedGame(
    'game_canned_idle_garden',
    'Garden Steward',
    'Tend a quiet courtyard of patient plants.',
    'Idle gardening with seasonal cycles, gentle weather, and a tiny robot bee. No timers, no microtransactions, no anxiety.',
    'idle',
    'relaxation',
    'pixel',
    'chill',
    'easy',
    CANNED_CREATOR_TIDEPOOL,
    1739232000000, // 2025-02-11
    ['hidden_gem', 'recommended'],
    21600,
    540,
  ),
]);

// ---------------------------------------------------------------------------
// Runtime store -- canned + user-published.
// ---------------------------------------------------------------------------

const _store: Map<string, Game> = new Map();
let _seeded = false;

function ensureSeeded(): void {
  if (_seeded) return;
  _seeded = true;
  for (const g of CANNED_GAMES) _store.set(g.id, g);
}

function fireAdvisoriesOnce(sink?: (line: string) => void): void {
  for (const a of CONJURE_MARKETPLACE_ADVISORIES) loudOnce(a, sink);
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

/** Return every game in the catalogue (canned + published). Frozen. */
export function listAllGames(): ReadonlyArray<Game> {
  ensureSeeded();
  fireAdvisoriesOnce();
  return Object.freeze([..._store.values()]);
}

/** Look up a single game by id. Returns null if not found. */
export function findGameById(id: string): Game | null {
  ensureSeeded();
  return _store.get(id) ?? null;
}

/**
 * Filter the catalogue by query. Empty query returns all games (canned
 * + published). All fields on `BrowseQuery` are optional.
 *
 * Result is frozen + sorted by publishedAtUnixMs DESC (newest first).
 *
 * `seedGameId` triggers a `because you played X` filter: returns up to
 * 6 same-mechanic-kind games sorted by aggregatePlayTimeSeconds DESC
 * (excluding the seed itself).
 */
export function browse(query: BrowseQuery): ReadonlyArray<Game> {
  ensureSeeded();
  fireAdvisoriesOnce();
  let pool: Game[] = [..._store.values()];

  if (typeof query.seedGameId === 'string' && query.seedGameId.length > 0) {
    const seed = _store.get(query.seedGameId);
    if (seed === undefined) return Object.freeze([]);
    const sameKind = pool.filter(
      (g) => g.id !== seed.id && g.mechanicKind === seed.mechanicKind,
    );
    sameKind.sort(
      (a, b) => b.aggregatePlayTimeSeconds - a.aggregatePlayTimeSeconds,
    );
    return Object.freeze(sameKind.slice(0, 6));
  }

  if (typeof query.q === 'string' && query.q.length > 0) {
    const needle = query.q.toLowerCase();
    pool = pool.filter((g) => {
      return (
        g.title.toLowerCase().includes(needle) ||
        g.tagline.toLowerCase().includes(needle) ||
        g.description.toLowerCase().includes(needle)
      );
    });
  }
  if (typeof query.category === 'string') {
    const wantedCategory = query.category;
    pool = pool.filter((g) => g.category === wantedCategory);
  }
  if (typeof query.discoveryClass === 'string') {
    const wantedClass = query.discoveryClass;
    pool = pool.filter((g) => g.discoveryClasses.includes(wantedClass));
  }
  pool.sort((a, b) => b.publishedAtUnixMs - a.publishedAtUnixMs);
  return Object.freeze(pool);
}

/** Convenience: same as `browse({discoveryClass: cls})`. */
export function listByDiscoveryClass(cls: DiscoveryClass): ReadonlyArray<Game> {
  return browse({ discoveryClass: cls });
}

/**
 * Publish a runtime-generated Game (Phase-3 wire-in pathway). Validates
 * that the id is non-empty and not already taken; returns ok/error.
 */
export type PublishGameResult =
  | { readonly ok: true; readonly game: Game }
  | { readonly ok: false; readonly error: string };

export function publishGame(game: Game): PublishGameResult {
  ensureSeeded();
  fireAdvisoriesOnce();
  if (!game.id || game.id.length === 0) {
    return { ok: false, error: 'game.id must be non-empty' };
  }
  if (_store.has(game.id)) {
    return { ok: false, error: `game.id already published: ${game.id}` };
  }
  _store.set(game.id, Object.freeze(game));
  return { ok: true, game };
}

/** Snapshot of the canned-fixture count -- pinned for the firewall test. */
export const CANNED_GAME_COUNT: number = 5;

/** Pin: canned creators count. */
export const CANNED_CREATOR_COUNT: number = 3;

/** Reset the runtime store. Test-only. */
export function resetMarketplaceStoreForTests(): void {
  _store.clear();
  _seeded = false;
}
