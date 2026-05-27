/**
 * Pistachio client stub for Conjure.
 *
 * Pistachio is the game-runtime engine that runs generated games in a
 * sandboxed environment within the platform. Phase 1 ships this as a
 * stub -- the Pistachio HTTP / gRPC binding lands in Phase 2.
 *
 * Honest status: this module returns deterministic placeholder data based
 * on the input mechanic kind. No real Pistachio engine is wired.
 */

import type { GameSpec, MechanicKind } from '$lib/types/game';

/** Pistachio-shaped game-spec extension (Phase 2 will carry runtime args). */
export interface PistachioGameRequest {
  readonly spec: GameSpec;
}

/** Pistachio-shaped response. Phase 1 is a placeholder. */
export interface PistachioGameResponse {
  readonly status: 'placeholder';
  readonly note: string;
  readonly mechanicKind: MechanicKind;
}

/**
 * Phase 1 placeholder Pistachio client. Returns a deterministic stub.
 *
 * `CONJURE_PISTACHIO_BASE_URL` env var is reserved but NOT consumed in
 * Phase 1 -- it stays as a placeholder for the Phase-2 wiring branch.
 */
export class PistachioClient {
  readonly baseUrl: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.baseUrl = env.CONJURE_PISTACHIO_BASE_URL ?? 'placeholder://pistachio-not-wired';
  }

  /**
   * Phase 1 stub. Returns a placeholder response with the input mechanic
   * kind echoed back. No real Pistachio runtime invocation.
   */
  async generate(req: PistachioGameRequest): Promise<PistachioGameResponse> {
    return {
      status: 'placeholder',
      note: 'Pistachio client stub -- Phase 2 runtime binding pending. Returns deterministic placeholder.',
      mechanicKind: req.spec.mechanicKind,
    };
  }
}
