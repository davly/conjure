/**
 * Phase 1 puzzle mechanic template -- block-stacking archetype.
 *
 * Forge default parameters per the R150 manifest entry
 * `block_stacking_puzzle`: 10-row grid x 20-col playfield; fall speed
 * scales with row-clearance count.
 *
 * Phase 1 ships this as a typed template only -- the Pistachio runtime
 * binding lands in Phase 2.
 */

import type { Difficulty } from '../types/game';

export interface PuzzleTemplate {
  readonly kind: 'puzzle';
  readonly archetype: 'block_stacking';
  readonly gridRows: number;
  readonly gridCols: number;
  readonly fallSpeedMsPerCell: number;
  readonly clearRowOn: 'all_filled' | 'three_in_a_row';
  readonly difficulty: Difficulty;
}

/** Forge default puzzle template. */
export function buildPuzzleTemplate(difficulty: Difficulty = 'medium'): PuzzleTemplate {
  // Difficulty-scaled fall speed -- easier = slower fall.
  const speedMs = difficulty === 'easy' ? 800 : difficulty === 'medium' ? 500 : 280;
  return {
    kind: 'puzzle',
    archetype: 'block_stacking',
    gridRows: 20,
    gridCols: 10,
    fallSpeedMsPerCell: speedMs,
    clearRowOn: 'all_filled',
    difficulty,
  };
}

/**
 * Simulate one drop step. Returns the new row index after the step.
 * Pure function -- no state, no side effects. Forge default uses this for
 * preview rendering in Phase 2.
 */
export function dropStep(currentRow: number, gridRows: number): number {
  const next = currentRow + 1;
  if (next >= gridRows) return gridRows - 1;
  return next;
}
