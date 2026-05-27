/**
 * Game types for Conjure.
 *
 * Phase 1 ships three mechanic kinds (puzzle / arcade / idle). The
 * `MechanicKind` union is the closed-enum classification axis -- the forge
 * IDENTIFY stage assigns one of these kinds based on the user's prompt;
 * downstream stages branch on it.
 */

/** Closed-enum classification for Phase-1 mechanic kinds. */
export type MechanicKind = 'puzzle' | 'arcade' | 'idle';

export const MECHANIC_KINDS: ReadonlyArray<MechanicKind> = Object.freeze([
  'puzzle',
  'arcade',
  'idle',
]);

/** Phase-2 categories (declared but not yet used in Phase 1). */
export type Category =
  | 'puzzle'
  | 'action'
  | 'strategy'
  | 'arcade'
  | 'simulation'
  | 'word'
  | 'card'
  | 'trivia'
  | 'idle'
  | 'relaxation'
  | 'educational'
  | 'multiplayer'
  | 'narrative';

/** Visual style template. */
export type VisualStyle = 'neon' | 'minimalist' | 'pixel' | 'handdrawn';

/** Audio mood. */
export type AudioMood = 'chill' | 'intense' | 'retro' | 'ambient' | 'comedic';

/** Difficulty label. */
export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * Generated game spec returned by the forge. Phase 1 ships a placeholder
 * spec -- the runtime / Pistachio integration lands in Phase 2.
 */
export interface GameSpec {
  readonly gameId: string;
  readonly title: string;
  readonly mechanicKind: MechanicKind;
  readonly visualStyle: VisualStyle;
  readonly audioMood: AudioMood;
  readonly difficulty: Difficulty;
  readonly description: string;
  readonly generatedAtUnixMs: number;
}
