/**
 * Conjure DRM -- append-only revocation ledger tests.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  appendRevocation,
  DEV_REVOCATION_KEY_PLACEHOLDER,
  findRevocation,
  GENESIS_PREV_SIGNATURE,
  isRevocationReason,
  isRevoked,
  ledgerSize,
  listLedger,
  MalformedRevocationRecord,
  REVOCATION_KEY_ENV_FLAG,
  REVOCATION_REASON_COUNT,
  REVOCATION_REASONS,
  REVOCATION_WIRE_PREFIX,
  RevocationChainBroken,
  resetRevocationLedgerForTests,
  resolveRevocationKey,
  verifyChain,
} from '../../src/lib/drm/revocation';

const KEY = Buffer.from('test-revocation-key', 'utf8');
const NOW = 1_700_000_000_000;

beforeEach(() => {
  resetRevocationLedgerForTests();
});

describe('Conjure DRM revocation -- cohort firewall pins', () => {
  it('REVOCATION_WIRE_PREFIX equals "revocation@v1:"', () => {
    expect(REVOCATION_WIRE_PREFIX).toBe('revocation@v1:');
  });

  it('GENESIS_PREV_SIGNATURE is a pinned literal', () => {
    expect(GENESIS_PREV_SIGNATURE).toBe('GENESIS@v1');
  });

  it('REVOCATION_REASON_COUNT equals 6', () => {
    expect(REVOCATION_REASON_COUNT).toBe(6);
    expect(REVOCATION_REASONS).toHaveLength(6);
  });

  it('REVOCATION_KEY_ENV_FLAG pin', () => {
    expect(REVOCATION_KEY_ENV_FLAG).toBe('CONJURE_DRM_REVOCATION_KEY');
  });

  it('DEV_REVOCATION_KEY_PLACEHOLDER carries grep-loud prefix', () => {
    expect(DEV_REVOCATION_KEY_PLACEHOLDER.startsWith('iik_dev_CONJURE_DRM_REVOCATION_')).toBe(true);
  });
});

describe('Conjure DRM revocation -- closed-enum reasons', () => {
  it('isRevocationReason true for known', () => {
    for (const r of REVOCATION_REASONS) expect(isRevocationReason(r)).toBe(true);
  });

  it('isRevocationReason false for bogus', () => {
    expect(isRevocationReason('bogus')).toBe(false);
  });
});

describe('Conjure DRM revocation -- append', () => {
  it('append rejects empty licenseSignature', () => {
    expect(() =>
      appendRevocation(
        { licenseSignature: '', reason: 'chargeback', revokedAtUnixMs: NOW, revokedBy: 'ops' },
        KEY,
      ),
    ).toThrow(MalformedRevocationRecord);
  });

  it('append rejects unknown reason', () => {
    expect(() =>
      appendRevocation(
        {
          licenseSignature: 'sig1',
          reason: 'bogus' as 'chargeback',
          revokedAtUnixMs: NOW,
          revokedBy: 'ops',
        },
        KEY,
      ),
    ).toThrow(MalformedRevocationRecord);
  });

  it('append rejects bad revokedAtUnixMs', () => {
    expect(() =>
      appendRevocation(
        { licenseSignature: 'sig1', reason: 'chargeback', revokedAtUnixMs: 0, revokedBy: 'ops' },
        KEY,
      ),
    ).toThrow(MalformedRevocationRecord);
  });

  it('append rejects empty revokedBy', () => {
    expect(() =>
      appendRevocation(
        { licenseSignature: 'sig1', reason: 'chargeback', revokedAtUnixMs: NOW, revokedBy: '' },
        KEY,
      ),
    ).toThrow(MalformedRevocationRecord);
  });

  it('first append uses GENESIS_PREV_SIGNATURE', () => {
    const r = appendRevocation(
      { licenseSignature: 'sig1', reason: 'chargeback', revokedAtUnixMs: NOW, revokedBy: 'ops' },
      KEY,
    );
    expect(r.prevSignature).toBe(GENESIS_PREV_SIGNATURE);
  });

  it('subsequent append chains to prior signature', () => {
    const r1 = appendRevocation(
      { licenseSignature: 'sig1', reason: 'chargeback', revokedAtUnixMs: NOW, revokedBy: 'ops' },
      KEY,
    );
    const r2 = appendRevocation(
      { licenseSignature: 'sig2', reason: 'fraud_detection', revokedAtUnixMs: NOW + 1, revokedBy: 'ops' },
      KEY,
    );
    expect(r2.prevSignature).toBe(r1.signature);
  });

  it('append rejects duplicate (sig, reason) pair', () => {
    appendRevocation(
      { licenseSignature: 'sig1', reason: 'chargeback', revokedAtUnixMs: NOW, revokedBy: 'ops' },
      KEY,
    );
    expect(() =>
      appendRevocation(
        { licenseSignature: 'sig1', reason: 'chargeback', revokedAtUnixMs: NOW + 1, revokedBy: 'ops' },
        KEY,
      ),
    ).toThrow(MalformedRevocationRecord);
  });

  it('append allows same sig under different reason', () => {
    appendRevocation(
      { licenseSignature: 'sig1', reason: 'chargeback', revokedAtUnixMs: NOW, revokedBy: 'ops' },
      KEY,
    );
    const r2 = appendRevocation(
      { licenseSignature: 'sig1', reason: 'fraud_detection', revokedAtUnixMs: NOW + 1, revokedBy: 'ops' },
      KEY,
    );
    expect(r2.reason).toBe('fraud_detection');
  });

  it('record is frozen', () => {
    const r = appendRevocation(
      { licenseSignature: 'sig1', reason: 'chargeback', revokedAtUnixMs: NOW, revokedBy: 'ops' },
      KEY,
    );
    expect(Object.isFrozen(r)).toBe(true);
  });

  it('signature is base64url-decodable', () => {
    const r = appendRevocation(
      { licenseSignature: 'sig1', reason: 'chargeback', revokedAtUnixMs: NOW, revokedBy: 'ops' },
      KEY,
    );
    expect(() => Buffer.from(r.signature, 'base64url')).not.toThrow();
  });
});

describe('Conjure DRM revocation -- lookup', () => {
  it('isRevoked false for unknown signature', () => {
    expect(isRevoked('unknown_sig')).toBe(false);
  });

  it('isRevoked true after append', () => {
    appendRevocation(
      { licenseSignature: 'sig1', reason: 'chargeback', revokedAtUnixMs: NOW, revokedBy: 'ops' },
      KEY,
    );
    expect(isRevoked('sig1')).toBe(true);
  });

  it('findRevocation returns null for unknown', () => {
    expect(findRevocation('unknown_sig')).toBeNull();
  });

  it('findRevocation returns the record', () => {
    appendRevocation(
      { licenseSignature: 'sig1', reason: 'chargeback', revokedAtUnixMs: NOW, revokedBy: 'ops' },
      KEY,
    );
    const r = findRevocation('sig1');
    expect(r?.reason).toBe('chargeback');
  });

  it('listLedger returns empty initially', () => {
    expect(listLedger()).toHaveLength(0);
  });

  it('listLedger returns records in append order', () => {
    appendRevocation(
      { licenseSignature: 'sig1', reason: 'chargeback', revokedAtUnixMs: NOW, revokedBy: 'ops' },
      KEY,
    );
    appendRevocation(
      { licenseSignature: 'sig2', reason: 'fraud_detection', revokedAtUnixMs: NOW + 1, revokedBy: 'ops' },
      KEY,
    );
    const records = listLedger();
    expect(records).toHaveLength(2);
    expect(records[0].licenseSignature).toBe('sig1');
    expect(records[1].licenseSignature).toBe('sig2');
  });

  it('ledgerSize reports count', () => {
    expect(ledgerSize()).toBe(0);
    appendRevocation(
      { licenseSignature: 'sig1', reason: 'chargeback', revokedAtUnixMs: NOW, revokedBy: 'ops' },
      KEY,
    );
    expect(ledgerSize()).toBe(1);
  });
});

describe('Conjure DRM revocation -- chain verification', () => {
  it('verifyChain succeeds on empty ledger', () => {
    expect(verifyChain(KEY)).toBe(true);
  });

  it('verifyChain succeeds on single-record ledger', () => {
    appendRevocation(
      { licenseSignature: 'sig1', reason: 'chargeback', revokedAtUnixMs: NOW, revokedBy: 'ops' },
      KEY,
    );
    expect(verifyChain(KEY)).toBe(true);
  });

  it('verifyChain succeeds on multi-record ledger', () => {
    appendRevocation(
      { licenseSignature: 'sig1', reason: 'chargeback', revokedAtUnixMs: NOW, revokedBy: 'ops' },
      KEY,
    );
    appendRevocation(
      { licenseSignature: 'sig2', reason: 'fraud_detection', revokedAtUnixMs: NOW + 1, revokedBy: 'ops' },
      KEY,
    );
    appendRevocation(
      { licenseSignature: 'sig3', reason: 'creator_takedown', revokedAtUnixMs: NOW + 2, revokedBy: 'ops' },
      KEY,
    );
    expect(verifyChain(KEY)).toBe(true);
  });

  it('verifyChain throws if a wrong key is used', () => {
    appendRevocation(
      { licenseSignature: 'sig1', reason: 'chargeback', revokedAtUnixMs: NOW, revokedBy: 'ops' },
      KEY,
    );
    const otherKey = Buffer.from('other-key', 'utf8');
    expect(() => verifyChain(otherKey)).toThrow();
  });
});

describe('Conjure DRM revocation -- key resolution', () => {
  it('resolveRevocationKey returns placeholder when env unset', () => {
    expect(resolveRevocationKey({} as NodeJS.ProcessEnv).toString('utf8')).toBe(
      DEV_REVOCATION_KEY_PLACEHOLDER,
    );
  });

  it('resolveRevocationKey returns override when env set', () => {
    const k = resolveRevocationKey({
      [REVOCATION_KEY_ENV_FLAG]: 'real-key',
    } as unknown as NodeJS.ProcessEnv);
    expect(k.toString('utf8')).toBe('real-key');
  });
});

describe('Conjure DRM revocation -- reset', () => {
  it('resetRevocationLedgerForTests clears state', () => {
    appendRevocation(
      { licenseSignature: 'sig1', reason: 'chargeback', revokedAtUnixMs: NOW, revokedBy: 'ops' },
      KEY,
    );
    resetRevocationLedgerForTests();
    expect(ledgerSize()).toBe(0);
    expect(isRevoked('sig1')).toBe(false);
  });
});
