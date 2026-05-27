/**
 * R143 LOUD-ONCE-WARNING-FLAG + CONJURE advisories tests.
 *
 * Pins:
 *  1. LOUD_ONCE_PREFIX literal byte-identity.
 *  2. Per-process dedup -- second invocation with same code is no-op.
 *  3. Different codes fire independently.
 *  4. Canonical 5-advisory count + per-advisory field non-emptiness.
 *  5. Severity ladder coverage (Error + Warn present; INFO reserved).
 *  6. Emission shape matches `[LOUD-ONCE-WARNING] {SEVERITY} {CODE}: {MSG} (see {LINK})`.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  CONJURE_ADVISORIES,
  CONJURE_ADVISORY_COUNT,
  findAdvisory,
} from './advisories';
import {
  LOUD_ONCE_PREFIX,
  SEVERITY_ERROR,
  SEVERITY_INFO,
  SEVERITY_WARN,
  hasFired,
  loudOnce,
  resetLoudOnceForTests,
} from './loudonce';

describe('R143 LOUD-ONCE-WARNING-FLAG primitive', () => {
  beforeEach(() => {
    resetLoudOnceForTests();
  });

  it('cohort canonical prefix literal', () => {
    expect(LOUD_ONCE_PREFIX).toBe('[LOUD-ONCE-WARNING]');
  });

  it('severity constants match the cohort vocabulary', () => {
    expect(SEVERITY_INFO).toBe('INFO');
    expect(SEVERITY_WARN).toBe('WARN');
    expect(SEVERITY_ERROR).toBe('ERROR');
  });

  it('loudOnce fires exactly once per code per process', () => {
    const sink: string[] = [];
    const adv = CONJURE_ADVISORIES[0];
    loudOnce(adv, (line) => sink.push(line));
    loudOnce(adv, (line) => sink.push(line));
    loudOnce(adv, (line) => sink.push(line));
    expect(sink.length).toBe(1);
  });

  it('different codes fire independently', () => {
    const sink: string[] = [];
    loudOnce(CONJURE_ADVISORIES[0], (l) => sink.push(l));
    loudOnce(CONJURE_ADVISORIES[1], (l) => sink.push(l));
    loudOnce(CONJURE_ADVISORIES[2], (l) => sink.push(l));
    expect(sink.length).toBe(3);
  });

  it('emission shape matches the cohort canonical shape', () => {
    const sink: string[] = [];
    const adv = CONJURE_ADVISORIES[0];
    loudOnce(adv, (line) => sink.push(line));
    expect(sink[0]).toBe(
      `${LOUD_ONCE_PREFIX} ${adv.severity} ${adv.code}: ${adv.message} (see ${adv.docLink})`,
    );
  });

  it('hasFired returns true after first invocation', () => {
    const sink: string[] = [];
    const adv = CONJURE_ADVISORIES[0];
    expect(hasFired(adv.code)).toBe(false);
    loudOnce(adv, (line) => sink.push(line));
    expect(hasFired(adv.code)).toBe(true);
  });

  it('resetLoudOnceForTests clears the gate', () => {
    const sink: string[] = [];
    const adv = CONJURE_ADVISORIES[0];
    loudOnce(adv, (line) => sink.push(line));
    expect(hasFired(adv.code)).toBe(true);
    resetLoudOnceForTests();
    expect(hasFired(adv.code)).toBe(false);
    loudOnce(adv, (line) => sink.push(line));
    expect(sink.length).toBe(2);
  });
});

describe('CONJURE_ADVISORIES canonical 5-advisory set', () => {
  it('canonical count is exactly 5', () => {
    expect(CONJURE_ADVISORY_COUNT).toBe(5);
    expect(CONJURE_ADVISORIES.length).toBe(CONJURE_ADVISORY_COUNT);
  });

  it('every advisory has non-empty code / message / docLink', () => {
    for (const adv of CONJURE_ADVISORIES) {
      expect(adv.code.length).toBeGreaterThan(0);
      expect(adv.message.length).toBeGreaterThan(0);
      expect(adv.docLink.length).toBeGreaterThan(0);
    }
  });

  it('every advisory code is unique', () => {
    const codes = new Set(CONJURE_ADVISORIES.map((a) => a.code));
    expect(codes.size).toBe(CONJURE_ADVISORIES.length);
  });

  it('every advisory code starts with CONJURE_ prefix', () => {
    for (const adv of CONJURE_ADVISORIES) {
      expect(adv.code.startsWith('CONJURE_')).toBe(true);
    }
  });

  it('severity ladder covers Error + Warn (Info reserved for Phase 2+)', () => {
    const severities = new Set(CONJURE_ADVISORIES.map((a) => a.severity));
    expect(severities.has(SEVERITY_ERROR)).toBe(true);
    expect(severities.has(SEVERITY_WARN)).toBe(true);
  });

  it('three advisories are Error-severity (liability-bearing)', () => {
    const errorAdvs = CONJURE_ADVISORIES.filter((a) => a.severity === SEVERITY_ERROR);
    expect(errorAdvs.length).toBe(3);
  });

  it('two advisories are Warn-severity (degraded)', () => {
    const warnAdvs = CONJURE_ADVISORIES.filter((a) => a.severity === SEVERITY_WARN);
    expect(warnAdvs.length).toBe(2);
  });

  it('findAdvisory returns the advisory for a known code', () => {
    const adv = findAdvisory('CONJURE_REVENUE_SHARE_60_40_NOT_LEGALLY_REVIEWED');
    expect(adv).toBeDefined();
    expect(adv!.severity).toBe(SEVERITY_ERROR);
  });

  it('findAdvisory returns undefined for an unknown code', () => {
    const adv = findAdvisory('CONJURE_NONEXISTENT_CODE');
    expect(adv).toBeUndefined();
  });

  it('advisories are frozen (R145 byte-identity contract)', () => {
    expect(Object.isFrozen(CONJURE_ADVISORIES)).toBe(true);
    for (const adv of CONJURE_ADVISORIES) {
      expect(Object.isFrozen(adv)).toBe(true);
    }
  });

  it('every advisory message names the Phase or surface honestly', () => {
    for (const adv of CONJURE_ADVISORIES) {
      // Each advisory must reference either "Phase" / "NOT" / "PLACEHOLDER"
      // / "PLANNED" / "founder-drafted" to qualify as honest-default.
      const honestMarkers = /Phase|NOT|PLACEHOLDER|PLANNED|founder-drafted/i;
      expect(honestMarkers.test(adv.message)).toBe(true);
    }
  });
});
