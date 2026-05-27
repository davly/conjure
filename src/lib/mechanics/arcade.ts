/**
 * Phase 1 arcade mechanic template -- endless-runner archetype.
 *
 * Forge default parameters per the R150 manifest entry
 * `endless_runner_arcade`: jump / gravity / score loop with
 * procedurally-spawned obstacles.
 *
 * Phase 1 ships this as a typed template only -- the Pistachio runtime
 * binding lands in Phase 2.
 */

import type { Difficulty } from '../types/game';

export interface ArcadeTemplate {
  readonly kind: 'arcade';
  readonly archetype: 'endless_runner';
  readonly gravityPxPerSecPerSec: number;
  readonly jumpImpulsePxPerSec: number;
  readonly obstacleSpawnIntervalMs: number;
  readonly playerWidthPx: number;
  readonly playerHeightPx: number;
  readonly difficulty: Difficulty;
}

/** Forge default arcade template. */
export function buildArcadeTemplate(difficulty: Difficulty = 'medium'): ArcadeTemplate {
  // Difficulty-scaled obstacle spawn rate -- easier = wider spacing.
  const spawnMs =
    difficulty === 'easy' ? 1800 : difficulty === 'medium' ? 1200 : 800;
  return {
    kind: 'arcade',
    archetype: 'endless_runner',
    gravityPxPerSecPerSec: 2400,
    jumpImpulsePxPerSec: 920,
    obstacleSpawnIntervalMs: spawnMs,
    playerWidthPx: 32,
    playerHeightPx: 32,
    difficulty,
  };
}

/**
 * Pure-function jump physics step. Given current vertical position +
 * velocity + a frame time delta, returns the new position + velocity.
 * Newtonian projectile motion -- the forge default physics for arcade
 * jumps.
 */
export function jumpStep(
  yPx: number,
  vyPxPerSec: number,
  gravityPxPerSecPerSec: number,
  dtSec: number,
): { y: number; vy: number } {
  const vy = vyPxPerSec + gravityPxPerSecPerSec * dtSec;
  const y = yPx + vy * dtSec;
  return { y, vy };
}
