/**
 * Forge types for Conjure.
 *
 * The forge pipeline has 7 stages: IDENTIFY -> ASSESS -> ESCAPE ->
 * OBSERVE -> FORGET -> PERSIST -> EXPLAIN. Each stage returns a typed
 * record. Phase 1 ships stub stages -- IDENTIFY uses keyword matching,
 * the rest return deterministic placeholders.
 */

import type { Difficulty, GameSpec, MechanicKind } from './game';

/** R74-style escape classification axis (cohort vocabulary). */
export type EscapeKind = 'ROUTINE' | 'INVESTIGATE' | 'LEARN' | 'ALERT';

export const ESCAPE_KINDS: ReadonlyArray<EscapeKind> = Object.freeze([
  'ROUTINE',
  'INVESTIGATE',
  'LEARN',
  'ALERT',
]);

/** IDENTIFY stage output -- fingerprint the game concept. */
export interface IdentifyResult {
  readonly mechanicKind: MechanicKind;
  readonly confidence: number; // 0..1
  readonly closestExistingGames: ReadonlyArray<string>;
}

/** ASSESS stage output -- quality score against thresholds. */
export interface AssessResult {
  readonly playable: boolean;
  readonly completable: boolean;
  readonly engagementScoreBasisPoints: number; // 0..10000
}

/** ESCAPE stage output -- two-axis classification. */
export interface EscapeResult {
  readonly kind: EscapeKind;
  readonly rationale: string;
}

/** OBSERVE stage output -- placeholder for Phase-2 telemetry feedback. */
export interface ObserveResult {
  readonly placeholder: true;
  readonly note: string;
}

/** FORGET stage output -- trend decay placeholder. */
export interface ForgetResult {
  readonly placeholder: true;
  readonly note: string;
}

/** PERSIST stage output -- placeholder for Phase-2 storage. */
export interface PersistResult {
  readonly placeholder: true;
  readonly note: string;
}

/** EXPLAIN stage output -- human-readable forge rationale. */
export interface ExplainResult {
  readonly title: string;
  readonly difficulty: Difficulty;
  readonly explanation: string;
}

/** Composite forge generation result returned to the studio. */
export interface GenerationResult {
  readonly spec: GameSpec;
  readonly identify: IdentifyResult;
  readonly assess: AssessResult;
  readonly escape: EscapeResult;
  readonly observe: ObserveResult;
  readonly forget: ForgetResult;
  readonly persist: PersistResult;
  readonly explain: ExplainResult;
}

/** Conjure forge version pin. Bumped per R145 strict-additive. */
export const CONJURE_FORGE_VERSION: string = '0.1.0';
