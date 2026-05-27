/**
 * Conjure 7-phase forge pipeline.
 *
 * IDENTIFY -> ASSESS -> ESCAPE -> OBSERVE -> FORGET -> PERSIST -> EXPLAIN
 *
 * Phase 1 ships a stub pipeline: IDENTIFY uses keyword matching against
 * the prompt; the rest of the stages return deterministic placeholders.
 * The R150 manifest defaults (puzzle: 70% completion target, 8 levels per
 * new mechanic, neon / minimalist visual templates, chill-electronic audio
 * mood) inform the EXPLAIN stage rationale.
 *
 * R143 LOUD-ONCE: the forge fires the
 * `CONJURE_CONTENT_MODERATION_AI_ASSISTED_NOT_ENFORCED` and
 * `CONJURE_IP_INFRINGEMENT_DETECTION_PLACEHOLDER` advisories on first
 * invocation -- surfaces the honest-default state.
 */

import { findAdvisory } from '$lib/cohort/honest/advisories';
import { loudOnce } from '$lib/cohort/honest/loudonce';
import { LimitlessBrowserBridge } from '$lib/integrations/limitless_browser';
import type {
  ContentModerationVerdict,
  ILimitlessBrowserBridge,
  NativeStorageHandle,
} from '$lib/integrations/limitless_browser';
import { PistachioKnowledgeClient } from '$lib/integrations/pistachio';
import type {
  DifficultyCurve,
  IPistachioKnowledgeClient,
  KnowledgeBedrockResponse,
  MechanicPattern,
} from '$lib/integrations/pistachio';
import type {
  AssessResult,
  EscapeResult,
  ExplainResult,
  ForgetResult,
  GenerationResult,
  IdentifyResult,
  ObserveResult,
  PersistResult,
} from '$lib/types/forge';
import { CONJURE_FORGE_VERSION } from '$lib/types/forge';
import type { Difficulty, GameSpec, MechanicKind, VisualStyle } from '$lib/types/game';

import { NexusClient } from './nexus';
import { PistachioClient } from './pistachio';

const nexus = new NexusClient();
const pistachio = new PistachioClient();

// ---------------------------------------------------------------------------
// IDENTIFY -- fingerprint the game concept from the prompt.
// ---------------------------------------------------------------------------

/**
 * Deterministic Phase-1 IDENTIFY: classify the prompt into one of the
 * three Phase-1 mechanic kinds (puzzle / arcade / idle) via simple
 * keyword match. Returns ROUTINE confidence; Phase 2+ will replace this
 * with a Nexus LLM call.
 */
export function identify(prompt: string): IdentifyResult {
  const lc = prompt.toLowerCase();

  // Mechanic-kind keyword sets (universal-fact game-design vocabulary).
  const puzzleKeywords = ['puzzle', 'stack', 'block', 'tetris', 'match', 'grid', 'tile'];
  const arcadeKeywords = ['arcade', 'jump', 'runner', 'shoot', 'dodge', 'race', 'flap'];
  const idleKeywords = ['idle', 'incremental', 'clicker', 'tap to earn', 'auto'];

  const puzzleHits = puzzleKeywords.filter((k) => lc.includes(k)).length;
  const arcadeHits = arcadeKeywords.filter((k) => lc.includes(k)).length;
  const idleHits = idleKeywords.filter((k) => lc.includes(k)).length;

  let mechanicKind: MechanicKind;
  let confidence: number;
  let closest: string[];

  if (puzzleHits >= arcadeHits && puzzleHits >= idleHits) {
    mechanicKind = 'puzzle';
    confidence = Math.min(0.95, 0.5 + puzzleHits * 0.1);
    closest = ['Tetris (1984)', 'Threes (2014)', 'Picross (1995)'];
  } else if (arcadeHits >= idleHits) {
    mechanicKind = 'arcade';
    confidence = Math.min(0.95, 0.5 + arcadeHits * 0.1);
    closest = ['Canabalt (2009)', 'Flappy Bird (2013)', 'Crossy Road (2014)'];
  } else {
    mechanicKind = 'idle';
    confidence = Math.min(0.95, 0.5 + idleHits * 0.1);
    closest = ['Cookie Clicker (2013)', 'AdVenture Capitalist (2014)'];
  }

  // If no keyword matched ANY kind, fall back to puzzle (safest default).
  if (puzzleHits === 0 && arcadeHits === 0 && idleHits === 0) {
    mechanicKind = 'puzzle';
    confidence = 0.3; // low confidence -- pure fallback
    closest = ['Tetris (1984)'];
  }

  return Object.freeze({
    mechanicKind,
    confidence,
    closestExistingGames: Object.freeze(closest),
  });
}

// ---------------------------------------------------------------------------
// ASSESS -- quality threshold check (Phase 1 placeholder: always pass).
// ---------------------------------------------------------------------------

export function assess(_id: IdentifyResult): AssessResult {
  return Object.freeze({
    playable: true,
    completable: true,
    engagementScoreBasisPoints: 7500, // 75% placeholder
  });
}

// ---------------------------------------------------------------------------
// ESCAPE -- two-axis classification (ROUTINE / INVESTIGATE / LEARN / ALERT).
// ---------------------------------------------------------------------------

export function escape(id: IdentifyResult, assess: AssessResult): EscapeResult {
  // Phase 1 escape rules:
  //  - Confidence < 0.4 -> LEARN (genuinely novel concept; warn creator).
  //  - assess.playable=false OR assess.completable=false -> ALERT.
  //  - Confidence 0.4..0.7 -> INVESTIGATE.
  //  - Else -> ROUTINE.
  if (!assess.playable || !assess.completable) {
    return Object.freeze({
      kind: 'ALERT',
      rationale:
        'Phase-1 forge could not produce a playable result. Generated artefacts are stubs only; significant refinement needed in Phase 2.',
    });
  }
  if (id.confidence < 0.4) {
    return Object.freeze({
      kind: 'LEARN',
      rationale:
        'Phase-1 keyword matcher saw no mechanic-class keywords. Falling back to puzzle template; creator should expect to refine the prompt.',
    });
  }
  if (id.confidence < 0.7) {
    return Object.freeze({
      kind: 'INVESTIGATE',
      rationale:
        'Phase-1 classifier moderate confidence. Mechanic kind chosen but creator may want to refine.',
    });
  }
  return Object.freeze({
    kind: 'ROUTINE',
    rationale:
      'Phase-1 classifier high confidence. Mechanic-template defaults applied per R150 manifest.',
  });
}

// ---------------------------------------------------------------------------
// OBSERVE / FORGET / PERSIST -- Phase 2 placeholders.
// ---------------------------------------------------------------------------

export function observe(): ObserveResult {
  return Object.freeze({
    placeholder: true,
    note: 'OBSERVE stage Phase-2 placeholder. Telemetry feedback wiring lands in Phase 2.',
  });
}

export function forget(): ForgetResult {
  return Object.freeze({
    placeholder: true,
    note: 'FORGET stage Phase-2 placeholder. Trend-decay model lands in Phase 2.',
  });
}

export function persist(): PersistResult {
  return Object.freeze({
    placeholder: true,
    note: 'PERSIST stage Phase-2 placeholder. Creator-profile + game-performance storage lands in Phase 2.',
  });
}

// ---------------------------------------------------------------------------
// EXPLAIN -- human-readable forge rationale.
// ---------------------------------------------------------------------------

function chooseVisualStyle(prompt: string): VisualStyle {
  const lc = prompt.toLowerCase();
  if (lc.includes('neon') || lc.includes('synthwave') || lc.includes('cyberpunk')) return 'neon';
  if (lc.includes('minimal') || lc.includes('clean') || lc.includes('simple')) return 'minimalist';
  if (lc.includes('pixel') || lc.includes('retro') || lc.includes('8-bit')) return 'pixel';
  return 'minimalist'; // safest forge default
}

function chooseDifficulty(prompt: string): Difficulty {
  const lc = prompt.toLowerCase();
  if (lc.includes('easy') || lc.includes('relax') || lc.includes('chill')) return 'easy';
  if (lc.includes('hard') || lc.includes('difficult') || lc.includes('intense')) return 'hard';
  return 'medium';
}

export function explain(
  id: IdentifyResult,
  esc: EscapeResult,
  prompt: string,
): ExplainResult {
  const difficulty = chooseDifficulty(prompt);
  const visualStyle = chooseVisualStyle(prompt);
  const completionTarget = 70; // R150 manifest puzzle_70pct_completion_target

  let title: string;
  switch (id.mechanicKind) {
    case 'puzzle':
      title = visualStyle === 'neon' ? 'Neon Stack' : 'Block Cascade';
      break;
    case 'arcade':
      title = visualStyle === 'neon' ? 'Neon Dash' : 'Sky Runner';
      break;
    case 'idle':
      title = visualStyle === 'neon' ? 'Neon Tap' : 'Tap Empire';
      break;
  }

  const explanation =
    `Conjure forge default: classified as ${id.mechanicKind} (` +
    `${Math.round(id.confidence * 100)}% confidence) -- closest existing games: ` +
    `${id.closestExistingGames.join(', ')}. Visual style ${visualStyle} chosen from ` +
    `R150 manifest defaults. Difficulty ${difficulty}; completion-rate target ` +
    `${completionTarget}% per R150 puzzle_70pct_completion_target convention. ` +
    `Escape classification: ${esc.kind} -- ${esc.rationale}`;

  return Object.freeze({ title, difficulty, explanation });
}

// ---------------------------------------------------------------------------
// generate() -- composite forge pipeline entry point.
// ---------------------------------------------------------------------------

/**
 * Run the 7-phase forge pipeline against a user prompt. Returns the
 * composite GenerationResult.
 *
 * R143 LOUD-ONCE: the IP-infringement detection + content-moderation
 * advisories fire on first call -- surfaces the honest-default state.
 */
export async function generate(opts: {
  prompt: string;
  creatorId: string;
}): Promise<GenerationResult> {
  // Fire R143 honesty advisories on first call -- honest-default surface.
  const ipAdv = findAdvisory('CONJURE_IP_INFRINGEMENT_DETECTION_PLACEHOLDER');
  const modAdv = findAdvisory('CONJURE_CONTENT_MODERATION_AI_ASSISTED_NOT_ENFORCED');
  if (ipAdv) loudOnce(ipAdv);
  if (modAdv) loudOnce(modAdv);

  // Phase 1 stubs (Nexus + Pistachio return placeholders, but exercise them
  // for the integration-test wire).
  await nexus.interpret({ prompt: opts.prompt });

  // 7-phase pipeline.
  const id = identify(opts.prompt);
  const asResult = assess(id);
  const esc = escape(id, asResult);
  const obs = observe();
  const fg = forget();
  const ps = persist();
  const ex = explain(id, esc, opts.prompt);

  const generatedAtUnixMs = Date.now();
  const gameId = `game_${generatedAtUnixMs}_${id.mechanicKind}`;
  const spec: GameSpec = Object.freeze({
    gameId,
    title: ex.title,
    mechanicKind: id.mechanicKind,
    visualStyle: chooseVisualStyle(opts.prompt),
    audioMood: 'chill',
    difficulty: ex.difficulty,
    description: `Conjured: ${opts.prompt}`,
    generatedAtUnixMs,
  });

  // Exercise Pistachio stub for integration parity (return ignored).
  await pistachio.generate({ spec });

  return Object.freeze({
    spec,
    identify: id,
    assess: asResult,
    escape: esc,
    observe: obs,
    forget: fg,
    persist: ps,
    explain: ex,
  });
}

/** Pin to the cohort forge version for receipt provenance. */
export const FORGE_VERSION: string = CONJURE_FORGE_VERSION;

// ---------------------------------------------------------------------------
// Integration-enriched forge pipeline (R145.B sibling-not-stacked variant).
//
// This is the Phase-1.5 integration-aware forge.generate(). It is opt-in via
// `opts.integrations` so the existing `generate()` Phase-1 behaviour is
// PRESERVED unchanged. Adding integration callers does NOT require touching
// the original pipeline.
//
// R145.B compliance: this is a sibling function on the same parent module,
// NOT a stacked overload of `generate()`. Callers explicitly opt in by using
// `generateWithIntegrations()` + passing integration clients.
//
// Wiring summary:
//   IDENTIFY  -> consult PistachioKnowledgeClient.queryClosestMechanics(prompt)
//                to enrich the closestExistingGames rationale with Pistachio
//                Knowledge Bedrock entries.
//   ASSESS    -> consult PistachioKnowledgeClient.getRetentionPattern(kind)
//                to source the quality scoring threshold from Pistachio's
//                playtest corpus.
//   PERSIST   -> consult LimitlessBrowserBridge.getNativeStorage(scope) and
//                prefer the native handle when running inside
//                limitless-browser; fall back to IndexedDB otherwise.
//   EXPLAIN   -> append Pistachio Knowledge Bedrock citation + difficulty
//                curve citation to the rationale when integrations returned
//                non-empty data.
//
// All integration clients default to the mock implementations so Phase-1
// tests continue to pass without any environment configuration.
// ---------------------------------------------------------------------------

/** Per-integration provenance trail surfaced on the result. */
export interface IntegrationsTrail {
  readonly pistachioCorpusVersion: string;
  readonly pistachioCitations: ReadonlyArray<string>;
  readonly bridgeNativeStorageBackend: string;
  readonly bridgeIsLimitlessBrowser: boolean;
  readonly contentModerationVerdict: string;
  readonly contentModerationReviewedByCounsel: boolean;
}

/** Integration-enriched GenerationResult superset (additive over base). */
export interface GenerationResultEnriched extends GenerationResult {
  readonly integrations: IntegrationsTrail;
}

/** Optional integration overrides for generateWithIntegrations(). */
export interface IntegrationsOptions {
  readonly pistachio?: IPistachioKnowledgeClient;
  readonly bridge?: ILimitlessBrowserBridge;
  /**
   * Optional storage scope key for the native-storage handle. Defaults
   * to the cohort-canonical "conjure.games" scope.
   */
  readonly storageScope?: string;
  /**
   * When true, submit a content-moderation request to the bridge as
   * part of the pipeline. Defaults to true (Phase 1.5: mock returns
   * requires-human-review).
   */
  readonly enableContentModeration?: boolean;
}

/**
 * Build the integration trail provenance record. Composable + pure --
 * just shapes the inputs into the readonly trail record.
 */
function buildIntegrationsTrail(args: {
  readonly pistachioResp: KnowledgeBedrockResponse;
  readonly retention: MechanicPattern;
  readonly curve: DifficultyCurve;
  readonly storage: NativeStorageHandle;
  readonly bridge: ILimitlessBrowserBridge;
  readonly moderation: ContentModerationVerdict | null;
}): IntegrationsTrail {
  const citations: string[] = [];
  if (args.pistachioResp.citation) citations.push(args.pistachioResp.citation);
  if (args.retention.citation) citations.push(args.retention.citation);
  if (args.curve.citation) citations.push(args.curve.citation);
  return Object.freeze({
    pistachioCorpusVersion: args.pistachioResp.corpusVersion,
    pistachioCitations: Object.freeze(citations),
    bridgeNativeStorageBackend: args.storage.backend,
    bridgeIsLimitlessBrowser: args.bridge.isRunningInLimitlessBrowser(),
    contentModerationVerdict: args.moderation
      ? args.moderation.verdict
      : 'not-checked',
    contentModerationReviewedByCounsel: args.moderation
      ? args.moderation.reviewedByCounsel
      : false,
  });
}

/**
 * Phase 1.5 integration-enriched forge entry point. Defaults to the mock
 * Pistachio + mock LimitlessBrowserBridge so this is safe to call from
 * Phase-1 tests.
 *
 * R143 honest-defaults still fire (content-moderation + IP-infringement
 * advisories) -- the bridge's content-moderation verdict is a SUPPLEMENTAL
 * source of moderation truth, NOT a replacement for the R143 advisory
 * surface (which warns that moderation is NOT enforced in Phase 1).
 *
 * R166 LIBRARY-RECOMMENDS-HOST-ACTS: the returned IntegrationsTrail
 * exposes the `contentModerationReviewedByCounsel` boolean so callers
 * can branch on counsel-review status before silencing the R143
 * `CONJURE_REVENUE_SHARE_60_40_NOT_LEGALLY_REVIEWED` advisory.
 */
export async function generateWithIntegrations(opts: {
  readonly prompt: string;
  readonly creatorId: string;
  readonly integrations?: IntegrationsOptions;
}): Promise<GenerationResultEnriched> {
  // Resolve integration clients (default to mocks for safety).
  const pistachioClient: IPistachioKnowledgeClient =
    opts.integrations?.pistachio ?? new PistachioKnowledgeClient({ env: {} });
  const bridge: ILimitlessBrowserBridge =
    opts.integrations?.bridge ?? new LimitlessBrowserBridge({ forceMock: true });
  const storageScope = opts.integrations?.storageScope ?? 'conjure.games';
  const enableModeration = opts.integrations?.enableContentModeration ?? true;

  // Fire R143 honesty advisories (preserved from base generate()).
  const ipAdv = findAdvisory('CONJURE_IP_INFRINGEMENT_DETECTION_PLACEHOLDER');
  const modAdv = findAdvisory('CONJURE_CONTENT_MODERATION_AI_ASSISTED_NOT_ENFORCED');
  if (ipAdv) loudOnce(ipAdv);
  if (modAdv) loudOnce(modAdv);

  // Phase 1 stubs (Nexus + Pistachio runtime stub).
  await nexus.interpret({ prompt: opts.prompt });

  // IDENTIFY -- consult Pistachio Knowledge Bedrock for closest mechanics.
  const baseId = identify(opts.prompt);
  const pistachioResp = await pistachioClient.queryClosestMechanics(opts.prompt);
  const enrichedClosest: string[] = [...baseId.closestExistingGames];
  for (const entry of pistachioResp.entries) {
    const title = (entry.body as { readonly title?: unknown }).title;
    if (typeof title === 'string' && !enrichedClosest.includes(title)) {
      enrichedClosest.push(title);
    }
  }
  const id: IdentifyResult = Object.freeze({
    mechanicKind: baseId.mechanicKind,
    confidence: baseId.confidence,
    closestExistingGames: Object.freeze(enrichedClosest),
  });

  // ASSESS -- consult retention pattern for quality scoring threshold.
  const retention = await pistachioClient.getRetentionPattern(id.mechanicKind);
  const retentionBp = Math.round(retention.retentionScore * 10000);
  // Retention-pattern-informed quality score: blend the Phase-1 placeholder
  // (7500 bp = 75%) with the Pistachio playtest retention score weighted
  // 50/50. Phase 2 will replace this with a calibrated assessor.
  const blendedScore = Math.round((7500 + retentionBp) / 2);
  const asResult: AssessResult = Object.freeze({
    playable: true,
    completable: true,
    engagementScoreBasisPoints: blendedScore,
  });

  // ESCAPE (unchanged).
  const esc = escape(id, asResult);

  // OBSERVE / FORGET (unchanged).
  const obs = observe();
  const fg = forget();

  // PERSIST -- prefer native-storage handle when bridge is available.
  const storage = await bridge.getNativeStorage(storageScope);
  const ps: PersistResult = Object.freeze({
    placeholder: true,
    note:
      storage.backend === 'unavailable'
        ? 'PERSIST stage Phase-1.5: bridge unavailable, falling back to IndexedDB plan (Phase-2 wire-in). storage.backend=unavailable'
        : `PERSIST stage Phase-1.5: native-storage handle acquired via limitless-browser bridge. storage.backend=${storage.backend}; handle=${storage.handleId}`,
  });

  // EXPLAIN -- enrich rationale with Pistachio difficulty-curve citation.
  const baseEx = explain(id, esc, opts.prompt);
  const curve = await pistachioClient.getDifficultyCurve(
    retention.targetCompletionPercent,
  );
  const enrichedExplanation =
    `${baseEx.explanation} ` +
    `Closest existing games (Pistachio-enriched): ${enrichedClosest.join(', ')}. ` +
    `Retention pattern: ${retention.canonicalName} (${retention.citation}). ` +
    `Difficulty curve: target ${curve.targetCompletionPercent}% completion ` +
    `(${curve.citation}).`;
  const ex: ExplainResult = Object.freeze({
    title: baseEx.title,
    difficulty: baseEx.difficulty,
    explanation: enrichedExplanation,
  });

  // Build the GameSpec (unchanged shape).
  const generatedAtUnixMs = Date.now();
  const gameId = `game_${generatedAtUnixMs}_${id.mechanicKind}`;
  const spec: GameSpec = Object.freeze({
    gameId,
    title: ex.title,
    mechanicKind: id.mechanicKind,
    visualStyle: chooseVisualStyle(opts.prompt),
    audioMood: 'chill',
    difficulty: ex.difficulty,
    description: `Conjured: ${opts.prompt}`,
    generatedAtUnixMs,
  });

  // Exercise the Phase-1 Pistachio runtime stub for parity (return ignored).
  await pistachio.generate({ spec });

  // Optional content-moderation step via the bridge.
  let moderation: ContentModerationVerdict | null = null;
  if (enableModeration) {
    moderation = await bridge.getContentModerationVerdict({
      gameId: spec.gameId,
      title: spec.title,
      description: spec.description,
      creatorId: opts.creatorId,
    });
  }

  const integrations = buildIntegrationsTrail({
    pistachioResp,
    retention,
    curve,
    storage,
    bridge,
    moderation,
  });

  return Object.freeze({
    spec,
    identify: id,
    assess: asResult,
    escape: esc,
    observe: obs,
    forget: fg,
    persist: ps,
    explain: ex,
    integrations,
  });
}
