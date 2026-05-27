/**
 * Phase 1 idle mechanic template -- incremental archetype.
 *
 * Forge default parameters per the R150 manifest entry `idle_incremental`:
 * resource + rate + multiplier loop. Strong retention class per industry
 * statistics.
 *
 * Phase 1 ships this as a typed template only -- the Pistachio runtime
 * binding lands in Phase 2.
 */

import type { Difficulty } from '../types/game';

export interface IdleTemplate {
  readonly kind: 'idle';
  readonly archetype: 'incremental';
  readonly startingResource: number;
  readonly baseRatePerSec: number;
  readonly multiplierCostBase: number;
  readonly multiplierCostScalar: number;
  readonly multiplierStep: number;
  readonly difficulty: Difficulty;
}

/** Forge default idle template. */
export function buildIdleTemplate(difficulty: Difficulty = 'medium'): IdleTemplate {
  // Difficulty-scaled base rate -- easier = faster accrual.
  const rate = difficulty === 'easy' ? 2.0 : difficulty === 'medium' ? 1.0 : 0.5;
  return {
    kind: 'idle',
    archetype: 'incremental',
    startingResource: 0,
    baseRatePerSec: rate,
    multiplierCostBase: 10,
    multiplierCostScalar: 1.15,
    multiplierStep: 0.5,
    difficulty,
  };
}

/**
 * Pure-function accrual step. Given current resource + rate + elapsed
 * seconds, returns the new resource.
 */
export function accrue(resource: number, ratePerSec: number, dtSec: number): number {
  return resource + ratePerSec * dtSec;
}

/**
 * Pure-function multiplier-purchase cost calculator. Exponential cost
 * scaling per the cohort's idle-incremental conventions.
 */
export function multiplierCost(
  base: number,
  scalar: number,
  purchasesAlready: number,
): number {
  return base * Math.pow(scalar, purchasesAlready);
}
