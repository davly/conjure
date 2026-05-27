/**
 * Nexus AI client stub for Conjure.
 *
 * Nexus is the AI provider for the Limitless ecosystem. Every Conjure AI
 * call (game-description interpretation / mechanic classification / title
 * generation / quality-gating LLM) routes via Nexus in Phase 2+. Phase 1
 * ships this as a stub -- the Nexus HTTP binding lands in Phase 2.
 *
 * Honest status: this module returns deterministic placeholder data. No
 * real Nexus call is made.
 *
 * Per `feedback_nexus_is_fw_ai_provider.md` godfather memory: ALL AI calls
 * route through Nexus. Conjure MUST NOT call OpenAI / Anthropic / Google /
 * any vendor directly -- Nexus mediates every vendor key.
 */

/** Nexus interpret-prompt request. */
export interface NexusInterpretRequest {
  readonly prompt: string;
}

/** Nexus interpret-prompt response (Phase 1 placeholder). */
export interface NexusInterpretResponse {
  readonly status: 'placeholder';
  readonly note: string;
  readonly keywordsFound: ReadonlyArray<string>;
}

/**
 * Phase 1 placeholder Nexus client. Returns a deterministic stub.
 *
 * `CONJURE_NEXUS_BASE_URL` env var is reserved but NOT consumed in Phase
 * 1 -- it stays as a placeholder for the Phase-2 wiring branch.
 */
export class NexusClient {
  readonly baseUrl: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.baseUrl = env.CONJURE_NEXUS_BASE_URL ?? 'placeholder://nexus-not-wired';
  }

  /**
   * Phase 1 stub. Returns the keywords found in the prompt by simple
   * lowercase substring match. No real Nexus LLM call.
   */
  async interpret(req: NexusInterpretRequest): Promise<NexusInterpretResponse> {
    const lc = req.prompt.toLowerCase();
    const keywords: string[] = [];
    const dictionary = [
      'puzzle',
      'arcade',
      'idle',
      'stack',
      'jump',
      'block',
      'runner',
      'incremental',
      'tap',
      'neon',
      'minimalist',
    ];
    for (const k of dictionary) {
      if (lc.includes(k)) keywords.push(k);
    }
    return {
      status: 'placeholder',
      note: 'Nexus client stub -- Phase 2 HTTP binding pending. Returns deterministic keyword match.',
      keywordsFound: Object.freeze(keywords),
    };
  }
}
