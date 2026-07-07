/**
 * Pistachio integration barrel. See `docs/INTEGRATION_PISTACHIO.md` for
 * the full architecture + contract + sequence diagrams.
 *
 * # Quick reference
 *
 *   - `PistachioKnowledgeClient` -- Phase 1.5 + Phase 2 client surface.
 *     Defaults to mock; opt into live via `CONJURE_PISTACHIO_LIVE=true` +
 *     `CONJURE_PISTACHIO_KNOWLEDGE_URL=<host>`.
 *   - `MockPistachioKnowledgeClient` -- in-memory mock for Phase 1.5
 *     forge-pipeline integration tests.
 *   - `pistachioMock` -- singleton mock client convenience export.
 *
 *  R166 LIBRARY-RECOMMENDS-HOST-ACTS applies to ALL Pistachio responses
 *  -- both mock + live. The host is responsible for counsel review of any
 *  Knowledge Bedrock data used on revenue / IP / liability surfaces.
 */

export {
  PistachioKnowledgeClient,
  pistachioMock,
  type PistachioKnowledgeClientOptions,
} from './client';
export {
  MockPistachioKnowledgeClient,
  PISTACHIO_MOCK_CORPUS_VERSION,
  PISTACHIO_MOCK_LORE_VERSION,
  MOCK_REVIEWED_BY_COUNSEL,
} from './mock';
export {
  PISTACHIO_ENDPOINTS,
  PISTACHIO_PLACEHOLDER_BASE_URL,
  buildEndpointUrl,
} from './endpoints';
export type {
  DifficultyCurve,
  IPistachioKnowledgeClient,
  KnowledgeBedrockDomain,
  KnowledgeBedrockEntry,
  KnowledgeBedrockQuery,
  KnowledgeBedrockResponse,
  LoreContext,
  LoreEdge,
  MechanicPattern,
} from './types';
export { KNOWLEDGE_BEDROCK_DOMAINS } from './types';
