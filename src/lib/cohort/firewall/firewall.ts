/**
 * Package firewall implements the R145.C FIREWALL-TEST-DISCIPLINE pin for
 * Conjure -- a structural firewall package that pins Conjure's expected
 * on-disk cohort-package layout AND pins every cohort-canonical literal.
 *
 * # Why this package exists (R174 strict)
 *
 * R174 (R-COHORT-5-OF-5-MATURITY, promoted 2026-05-27) makes a dedicated
 * cohort-firewall package one of the 10 canonical R145.C firewall-pin
 * shapes. Conjure ships at R174 5-of-5 cohort maturity FROM INCEPTION.
 *
 * The firewall exports `EXPECTED_COHORT_PACKAGES` + cohort-literal anchors
 * so:
 *
 *  1. Drift detection runs as a code-time test (not a doc grep).
 *  2. Adding a package to src/lib/cohort/ requires updating this list AND
 *     the impl log -- the firewall test fails loudly when on-disk reality
 *     diverges from the canonical list.
 *  3. Cohort-canonical literals (KAT-1 hex, lore@v1: prefix, the wire body
 *     length, [LOUD-ONCE-WARNING] prefix, R150 SchemaVersion) get pinned
 *     in one grep-discoverable place per flagship.
 *
 * # Sister-flagship parity
 *
 * Same shape as graphql-forge / forge-ide cohort firewalls (TypeScript
 * cohort siblings), and as harvest / ouroboros / memoria internal/firewall
 * packages (Go cohort siblings). All members of the R174 5-of-5 cohort.
 *
 * # Mirror-Problem-aware
 *
 * The expected list is derived from a hand-curated constant in this file
 * (`EXPECTED_COHORT_PACKAGES`). The on-disk list is derived from
 * `fs.readdirSync` at test time. If the hand-curated list were a doc-comment
 * in README.md, the firewall would be vulnerable to stale-doc Mirror
 * failure (README says X but code ships Y). By making the expected list
 * a code-time constant, drift always lands as a code change that gets
 * reviewed.
 */

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Cohort-canonical KAT-1 HMAC-SHA256 hex. Pinned here for the firewall
 * grep -- a single grep for this string across the ecosystem finds every
 * cohort pin site.
 *
 * Byte-identical to:
 *   - oracle Go canonical at apps/lore-mark-verify/internal/kat/kat1.go
 *   - iris Python
 *   - foundry Rust
 *   - forge-game / ghost / gleam-js / graphql-forge / forge-ide
 *   - + ~30 more substrate languages per godfather memory
 */
export const KAT1_CANONICAL_HEX: string =
  '239a7d0d3f1bbe3a98aede01e2ad818c2db60b7177c02e2f015035b2b5b7dbca';

/**
 * Cohort-canonical L43 Mirror-Mark wire prefix. Byte-identical to every
 * cohort sibling.
 */
export const MIRRORMARK_WIRE_PREFIX: string = 'lore@v1:';

/**
 * Cohort-canonical R143 LOUD-ONCE prefix. Byte-identical to every cohort
 * sibling.
 */
export const LOUD_ONCE_PREFIX_CANONICAL: string = '[LOUD-ONCE-WARNING]';

/**
 * Cohort-canonical Mirror-Mark body length in base64url chars (54 chars,
 * no padding). Pinned for the cohort firewall test.
 */
export const MIRRORMARK_BODY_BASE64URL_LEN: number = 54;

/**
 * Cohort-canonical Mirror-Mark body length in raw bytes (40 bytes -- 8
 * corpus prefix + 32 digest).
 */
export const MIRRORMARK_BODY_LEN: number = 40;

/**
 * Conjure's R150 schema version pin. Bumped only on additive-non-breaking
 * schema changes per R145 strict-additive.
 */
export const R150_SCHEMA_VERSION: string = 'conjure.r150.v1';

/**
 * Canonical list of expected sub-packages under `src/lib/cohort/`. The
 * firewall test scans the on-disk directory and fails loudly on drift.
 *
 * R174 5-of-5 cohort maturity requires the canonical 5: firewall, honest,
 * lore, manifest, mirrormark. Conjure adds a sixth (`legal`) for the R166
 * LIABILITY-FOOTER-CONST surface.
 *
 * Adding a sub-package requires updating this list AND the impl log at
 * reviews/IMPLEMENTATION_<date>/NEW_FLAGSHIP_CONJURE.md.
 */
export const EXPECTED_COHORT_PACKAGES: ReadonlyArray<string> = Object.freeze([
  'firewall',
  'honest',
  'legal',
  'lore',
  'manifest',
  'mirrormark',
]);

/**
 * Canonical R174 5-of-5 cohort sub-set. The legal/ sub-package is a R166
 * sibling (cohort-adjacent but not part of the 5-of-5 maturity test).
 */
export const R174_FIVE_OF_FIVE_PACKAGES: ReadonlyArray<string> = Object.freeze([
  'firewall',
  'honest',
  'lore',
  'manifest',
  'mirrormark',
]);

/**
 * Scan the cohort root directory and return the list of sub-directories
 * containing TypeScript source files. Used by the firewall test to detect
 * drift against EXPECTED_COHORT_PACKAGES.
 *
 * `cohortRoot` is the absolute path to `src/lib/cohort/`. Tests compute
 * this via `import.meta.url` so the test is portable across CI hosts.
 */
export function scanCohortPackages(cohortRoot: string): string[] {
  const entries = readdirSync(cohortRoot);
  const packages: string[] = [];
  for (const entry of entries) {
    const fullPath = join(cohortRoot, entry);
    try {
      const stat = statSync(fullPath);
      if (!stat.isDirectory()) continue;
      // Verify it contains at least one .ts file (excluding .test.ts).
      const innerEntries = readdirSync(fullPath);
      const hasSource = innerEntries.some(
        (f) => f.endsWith('.ts') && !f.endsWith('.test.ts'),
      );
      if (hasSource) packages.push(entry);
    } catch {
      // Skip unreadable entries.
    }
  }
  packages.sort();
  return packages;
}

/**
 * Verify the on-disk package layout matches `EXPECTED_COHORT_PACKAGES`.
 * Returns the drift verdict and lists any missing or unexpected packages.
 */
export interface DriftVerdict {
  readonly drift: boolean;
  readonly missing: ReadonlyArray<string>;
  readonly unexpected: ReadonlyArray<string>;
}

export function verifyPackageLayout(cohortRoot: string): DriftVerdict {
  const onDisk = new Set(scanCohortPackages(cohortRoot));
  const expected = new Set(EXPECTED_COHORT_PACKAGES);

  const missing: string[] = [];
  for (const e of expected) if (!onDisk.has(e)) missing.push(e);

  const unexpected: string[] = [];
  for (const d of onDisk) if (!expected.has(d)) unexpected.push(d);

  missing.sort();
  unexpected.sort();
  return {
    drift: missing.length > 0 || unexpected.length > 0,
    missing,
    unexpected,
  };
}
