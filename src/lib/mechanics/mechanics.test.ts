/**
 * Phase 1 mechanic template tests.
 *
 * Pins:
 *  1. Each template builder returns the correct `kind`.
 *  2. Difficulty parameter scaling works in the expected direction.
 *  3. Pure-function physics / accrual / cost helpers are deterministic.
 */

import { describe, it, expect } from 'vitest';

import { buildArcadeTemplate, jumpStep } from './arcade';
import { accrue, buildIdleTemplate, multiplierCost } from './idle';
import { buildPuzzleTemplate, dropStep } from './puzzle';

describe('puzzle template', () => {
  it('builds a block-stacking template with default medium difficulty', () => {
    const t = buildPuzzleTemplate();
    expect(t.kind).toBe('puzzle');
    expect(t.archetype).toBe('block_stacking');
    expect(t.gridRows).toBe(20);
    expect(t.gridCols).toBe(10);
    expect(t.difficulty).toBe('medium');
  });

  it('easy difficulty has slower fall speed than hard', () => {
    const easy = buildPuzzleTemplate('easy');
    const hard = buildPuzzleTemplate('hard');
    expect(easy.fallSpeedMsPerCell).toBeGreaterThan(hard.fallSpeedMsPerCell);
  });

  it('dropStep moves down by one cell', () => {
    expect(dropStep(5, 20)).toBe(6);
  });

  it('dropStep clamps at the bottom row', () => {
    expect(dropStep(19, 20)).toBe(19);
  });
});

describe('arcade template', () => {
  it('builds an endless-runner template with default medium difficulty', () => {
    const t = buildArcadeTemplate();
    expect(t.kind).toBe('arcade');
    expect(t.archetype).toBe('endless_runner');
    expect(t.gravityPxPerSecPerSec).toBeGreaterThan(0);
    expect(t.jumpImpulsePxPerSec).toBeGreaterThan(0);
  });

  it('easy difficulty has wider obstacle spacing than hard', () => {
    const easy = buildArcadeTemplate('easy');
    const hard = buildArcadeTemplate('hard');
    expect(easy.obstacleSpawnIntervalMs).toBeGreaterThan(hard.obstacleSpawnIntervalMs);
  });

  it('jumpStep applies gravity over time', () => {
    const r = jumpStep(100, 0, 2400, 0.1);
    // After 100ms of free fall: vy = 240, y = 100 + 24 = 124
    expect(r.vy).toBeCloseTo(240, 1);
    expect(r.y).toBeCloseTo(124, 1);
  });

  it('jumpStep with negative initial velocity rises then falls', () => {
    // Initial upward velocity (negative because y increases downward).
    const r = jumpStep(200, -920, 2400, 0.1);
    expect(r.vy).toBeCloseTo(-680, 1);
    // y = 200 + (-680 * 0.1) = 132
    expect(r.y).toBeCloseTo(132, 1);
  });
});

describe('idle template', () => {
  it('builds an incremental template with default medium difficulty', () => {
    const t = buildIdleTemplate();
    expect(t.kind).toBe('idle');
    expect(t.archetype).toBe('incremental');
    expect(t.startingResource).toBe(0);
    expect(t.baseRatePerSec).toBe(1.0);
  });

  it('easy difficulty has faster base rate than hard', () => {
    const easy = buildIdleTemplate('easy');
    const hard = buildIdleTemplate('hard');
    expect(easy.baseRatePerSec).toBeGreaterThan(hard.baseRatePerSec);
  });

  it('accrue is deterministic + additive', () => {
    expect(accrue(0, 1.0, 10)).toBe(10);
    expect(accrue(5, 2.0, 3)).toBe(11);
  });

  it('multiplierCost scales exponentially', () => {
    expect(multiplierCost(10, 1.15, 0)).toBe(10);
    expect(multiplierCost(10, 1.15, 1)).toBeCloseTo(11.5, 4);
    expect(multiplierCost(10, 1.15, 5)).toBeCloseTo(20.1136, 3);
  });
});
