/**
 * R166 LIABILITY-FOOTER-CONST + REVIEWED-BY-COUNSEL-FALSE tests.
 *
 * Pins:
 *  1. `LEGAL_LIABILITY_FOOTER` is a typed constant (NEVER inline string).
 *  2. `REVIEWED_BY_COUNSEL` defaults to false (honest-default sentinel).
 *  3. Footer names the founder-drafted surfaces explicitly.
 *  4. LIBRARY-RECOMMENDS-HOST-ACTS expression is present + non-empty.
 *  5. `getLegalLiabilityDisclosure()` returns a frozen object.
 */

import { describe, it, expect } from 'vitest';

import {
  LEGAL_LIABILITY_FOOTER,
  LIBRARY_RECOMMENDS_HOST_ACTS,
  REVIEWED_BY_COUNSEL,
  getLegalLiabilityDisclosure,
} from './liability_footer';

describe('R166 LIABILITY-FOOTER-CONST', () => {
  it('LEGAL_LIABILITY_FOOTER is a non-empty typed constant', () => {
    expect(typeof LEGAL_LIABILITY_FOOTER).toBe('string');
    expect(LEGAL_LIABILITY_FOOTER.length).toBeGreaterThan(100);
  });

  it('footer names the 60/40 revenue split explicitly', () => {
    expect(LEGAL_LIABILITY_FOOTER).toContain('60%');
    expect(LEGAL_LIABILITY_FOOTER).toContain('40%');
  });

  it('footer names Phase-4 creator-payout surface explicitly', () => {
    expect(LEGAL_LIABILITY_FOOTER).toContain('Phase-4');
  });

  it('footer states counsel review has NOT YET completed', () => {
    expect(LEGAL_LIABILITY_FOOTER).toContain('NOT YET');
    expect(LEGAL_LIABILITY_FOOTER.toLowerCase()).toContain('counsel');
  });

  it('footer states the library does NOT constitute legal advice', () => {
    expect(LEGAL_LIABILITY_FOOTER).toContain('NOT constitute');
    expect(LEGAL_LIABILITY_FOOTER.toLowerCase()).toContain('legal advice');
  });
});

describe('R166 REVIEWED_BY_COUNSEL honest-default sentinel', () => {
  it('defaults to false at module load', () => {
    expect(REVIEWED_BY_COUNSEL).toBe(false);
  });

  it('is a typed boolean (not undefined / null / truthy-ish)', () => {
    expect(typeof REVIEWED_BY_COUNSEL).toBe('boolean');
  });
});

describe('R166 LIBRARY-RECOMMENDS-HOST-ACTS expression', () => {
  it('contains the canonical LIBRARY-RECOMMENDS-HOST-ACTS literal', () => {
    expect(LIBRARY_RECOMMENDS_HOST_ACTS).toContain('LIBRARY-RECOMMENDS-HOST-ACTS');
  });

  it('names three host acts (counsel engagement / docs update / sentinel flip)', () => {
    expect(LIBRARY_RECOMMENDS_HOST_ACTS).toContain('(1)');
    expect(LIBRARY_RECOMMENDS_HOST_ACTS).toContain('(2)');
    expect(LIBRARY_RECOMMENDS_HOST_ACTS).toContain('(3)');
  });

  it('names the R145.B SIBLING-NOT-STACKED procedure for flip-to-true', () => {
    expect(LIBRARY_RECOMMENDS_HOST_ACTS).toContain('R145.B');
  });
});

describe('R166 disclosure helper', () => {
  it('returns a frozen object with all three R166 surfaces', () => {
    const d = getLegalLiabilityDisclosure();
    expect(Object.isFrozen(d)).toBe(true);
    expect(d.footer).toBe(LEGAL_LIABILITY_FOOTER);
    expect(d.reviewedByCounsel).toBe(false);
    expect(d.hostActs).toBe(LIBRARY_RECOMMENDS_HOST_ACTS);
  });
});
