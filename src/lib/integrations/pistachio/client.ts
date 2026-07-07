/**
 * PistachioKnowledgeClient -- Conjure-side TypeScript client for the
 * Pistachio Knowledge Bedrock + Lore graph integration.
 *
 * Phase 1.5 (this ship): the production constructor accepts a base URL
 * but ALWAYS routes through the mock when `CONJURE_PISTACHIO_LIVE` env
 * var is unset or falsy. This lets Phase-1 tests run without a live
 * Pistachio binding while the Phase-2 wire-in lands behind a feature
 * flag.
 *
 * # Honest defaults
 *
 * - The live-binding code path is a `fetch`-based HTTP client. Phase 1.5
 *   ships the call sites + URL builder + JSON parser; the actual
 *   Pistachio HTTP endpoint does NOT yet exist (see `endpoints.ts` for
 *   the Phase-2 contract). Calling `live()` against a Phase-1.5
 *   Pistachio instance will return 404 -- the env-flag gate prevents
 *   this in production.
 *
 * - When `CONJURE_PISTACHIO_LIVE=true` AND `CONJURE_PISTACHIO_KNOWLEDGE_URL`
 *   is set, the client uses the live binding. Otherwise the client
 *   delegates to `MockPistachioKnowledgeClient` and the mock-corpus
 *   citation flows into the EXPLAIN rationale.
 *
 * # R157 substrate-native idiom
 *
 * - TypeScript class with `#`-private state.
 * - `async`/`await` for all HTTP stubs (no callback API).
 * - Returns `readonly` frozen result shapes.
 * - No global state -- env vars read once at construction time.
 *
 * # R166 LIBRARY-RECOMMENDS-HOST-ACTS
 *
 * The host (Limitless / David Carson) is responsible for:
 *   1. Verifying Pistachio's Knowledge Bedrock corpus version against
 *      the cohort firewall before flipping CONJURE_PISTACHIO_LIVE=true.
 *   2. Counsel-reviewing any Bedrock entry used on revenue / IP /
 *      liability surfaces -- the mock returns ReviewedByCounsel=false
 *      sentinel.
 *   3. Routing Pistachio HTTP calls through Nexus (per the godfather
 *      memory `feedback_nexus_is_fw_ai_provider.md` -- "Nexus is THE AI
 *      provider for the Limitless ecosystem"). Direct-to-Pistachio
 *      bindings are fallback-only and MUST NOT be the default in
 *      production.
 */

import type { MechanicKind } from '$lib/types/game';

import { PISTACHIO_ENDPOINTS, PISTACHIO_PLACEHOLDER_BASE_URL, buildEndpointUrl } from './endpoints';
import { MockPistachioKnowledgeClient } from './mock';
import type {
  DifficultyCurve,
  IPistachioKnowledgeClient,
  KnowledgeBedrockResponse,
  LoreContext,
  MechanicPattern,
} from './types';

/** Construction options for PistachioKnowledgeClient. */
export interface PistachioKnowledgeClientOptions {
  /**
   * Base URL for the Pistachio Knowledge Service. Phase 2 production:
   * the real Pistachio HTTP endpoint. Phase 1.5: defaults to the
   * placeholder URL.
   */
  readonly baseUrl?: string;
  /**
   * Live-binding feature flag. When `false` (Phase 1.5 default), the
   * client delegates to MockPistachioKnowledgeClient.
   */
  readonly live?: boolean;
  /**
   * Optional fetch implementation injection for tests. Defaults to the
   * global `fetch`.
   */
  readonly fetchImpl?: typeof fetch;
  /** Optional environment for testing. Defaults to `process.env`. */
  readonly env?: NodeJS.ProcessEnv;
}

/**
 * PistachioKnowledgeClient is the Phase 1.5 + Phase 2 Conjure-side client
 * surface. It implements `IPistachioKnowledgeClient` so callers can
 * substitute the mock or live binding freely.
 *
 * Defaults (Phase 1.5):
 *   - baseUrl = `placeholder://pistachio-knowledge-service-not-wired`
 *   - live = false  (delegates to mock)
 *
 * To opt-in to live binding (Phase 2):
 *   - Set `CONJURE_PISTACHIO_LIVE=true`
 *   - Set `CONJURE_PISTACHIO_KNOWLEDGE_URL=https://<host>` (preferably
 *     through Nexus per the cohort memory)
 */
export class PistachioKnowledgeClient implements IPistachioKnowledgeClient {
  readonly #baseUrl: string;
  readonly #live: boolean;
  readonly #fetchImpl: typeof fetch;
  readonly #mock: MockPistachioKnowledgeClient;

  constructor(opts: PistachioKnowledgeClientOptions = {}) {
    const env = opts.env ?? (typeof process !== 'undefined' ? process.env : {});
    this.#baseUrl =
      opts.baseUrl ??
      env.CONJURE_PISTACHIO_KNOWLEDGE_URL ??
      PISTACHIO_PLACEHOLDER_BASE_URL;
    // Live binding is opt-in via explicit constructor flag OR env var.
    // Default: false (Phase 1.5 mock-only).
    this.#live =
      opts.live ??
      (env.CONJURE_PISTACHIO_LIVE === 'true' &&
        this.#baseUrl !== PISTACHIO_PLACEHOLDER_BASE_URL);
    this.#fetchImpl = opts.fetchImpl ?? fetch;
    this.#mock = new MockPistachioKnowledgeClient();
  }

  /** Public read-only accessor for verdict provenance. */
  get baseUrl(): string {
    return this.#baseUrl;
  }

  get live(): boolean {
    return this.#live;
  }

  /**
   * Look up the closest existing game mechanics for a natural-language
   * prompt. Phase 1.5 routes to the mock; Phase 2 routes to the live
   * Pistachio Knowledge Service.
   */
  async queryClosestMechanics(
    prompt: string,
  ): Promise<KnowledgeBedrockResponse> {
    if (!this.#live) {
      return this.#mock.queryClosestMechanics(prompt);
    }
    const url = buildEndpointUrl(
      this.#baseUrl,
      PISTACHIO_ENDPOINTS.closestMechanics,
      { prompt },
    );
    return this.#fetchJson<KnowledgeBedrockResponse>(url);
  }

  async getRetentionPattern(
    mechanicKind: MechanicKind,
  ): Promise<MechanicPattern> {
    if (!this.#live) {
      return this.#mock.getRetentionPattern(mechanicKind);
    }
    const url = buildEndpointUrl(
      this.#baseUrl,
      PISTACHIO_ENDPOINTS.retentionPattern,
      { mechanicKind },
    );
    return this.#fetchJson<MechanicPattern>(url);
  }

  async getDifficultyCurve(
    targetCompletionPercent: number,
  ): Promise<DifficultyCurve> {
    if (!this.#live) {
      return this.#mock.getDifficultyCurve(targetCompletionPercent);
    }
    const url = buildEndpointUrl(
      this.#baseUrl,
      PISTACHIO_ENDPOINTS.difficultyCurve,
      { targetCompletionPercent },
    );
    return this.#fetchJson<DifficultyCurve>(url);
  }

  async getLoreContext(theme: string): Promise<LoreContext> {
    if (!this.#live) {
      return this.#mock.getLoreContext(theme);
    }
    const url = buildEndpointUrl(this.#baseUrl, PISTACHIO_ENDPOINTS.loreContext, {
      theme,
    });
    return this.#fetchJson<LoreContext>(url);
  }

  /**
   * Private HTTP-JSON helper. Throws on non-2xx. Phase 2 wire-in will
   * add retry / circuit-breaker via Nexus' Resilience-aware client.
   */
  async #fetchJson<T>(url: string): Promise<T> {
    const res = await this.#fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(
        `Pistachio Knowledge Service ${res.status} ${res.statusText}: ${url}`,
      );
    }
    const body = (await res.json()) as T;
    return body;
  }
}

/**
 * Convenience export: a singleton mock client. Useful for forge pipeline
 * code that wants to inject the mock without constructing it inline.
 *
 * Production code should construct a `PistachioKnowledgeClient` with
 * explicit options so the live-flag gate is visible at the call site.
 */
export const pistachioMock: IPistachioKnowledgeClient =
  new MockPistachioKnowledgeClient();
