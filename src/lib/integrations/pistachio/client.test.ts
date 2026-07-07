/**
 * Tests for the PistachioKnowledgeClient + the mock.
 *
 * Three layers:
 *   1. Mock layer -- deterministic canned responses for the 3 Phase-1
 *      mechanic kinds + 3 Lore archetypes.
 *   2. Client layer (mock path) -- the client defaults to mock when
 *      `live=false`.
 *   3. Client layer (live path) -- the client routes through fetch when
 *      `live=true` + base URL is set. Uses a fetch-shim for hermetic
 *      tests.
 *
 * All tests are pure-function -- no real HTTP, no real Pistachio.
 */

import { describe, it, expect } from 'vitest';

import { PistachioKnowledgeClient, pistachioMock } from './client';
import {
  PISTACHIO_ENDPOINTS,
  PISTACHIO_PLACEHOLDER_BASE_URL,
  buildEndpointUrl,
} from './endpoints';
import {
  MOCK_REVIEWED_BY_COUNSEL,
  MockPistachioKnowledgeClient,
  PISTACHIO_MOCK_CORPUS_VERSION,
  PISTACHIO_MOCK_LORE_VERSION,
} from './mock';
import { KNOWLEDGE_BEDROCK_DOMAINS } from './types';

describe('Pistachio integration -- type pins', () => {
  it('KNOWLEDGE_BEDROCK_DOMAINS pins the 8 canonical Pistachio domains', () => {
    expect(KNOWLEDGE_BEDROCK_DOMAINS).toEqual([
      'arch',
      'astro',
      'chem',
      'colors',
      'geo',
      'history',
      'music',
      'psych',
    ]);
    expect(KNOWLEDGE_BEDROCK_DOMAINS.length).toBe(8);
  });

  it('mock corpus version is pinned (deterministic mock pin)', () => {
    expect(PISTACHIO_MOCK_CORPUS_VERSION).toBe('knowledge-bedrock@mock-v0.1.0');
    expect(PISTACHIO_MOCK_LORE_VERSION).toBe('lore-graph@mock-v0.1.0');
  });

  it('R166 LIBRARY-RECOMMENDS-HOST-ACTS sentinel defaults to false', () => {
    expect(MOCK_REVIEWED_BY_COUNSEL).toBe(false);
  });

  it('placeholder base URL is the canonical Phase-1.5 default', () => {
    expect(PISTACHIO_PLACEHOLDER_BASE_URL).toBe(
      'placeholder://pistachio-knowledge-service-not-wired',
    );
  });
});

describe('Pistachio integration -- endpoint URL builder', () => {
  it('buildEndpointUrl assembles closest-mechanics URL with query string', () => {
    const url = buildEndpointUrl(
      'https://pistachio.example.com',
      PISTACHIO_ENDPOINTS.closestMechanics,
      { prompt: 'neon stack puzzle' },
    );
    expect(url).toBe(
      'https://pistachio.example.com/forge/knowledge/closest_mechanics?prompt=neon+stack+puzzle',
    );
  });

  it('buildEndpointUrl trims trailing slash on base URL', () => {
    const url = buildEndpointUrl(
      'https://pistachio.example.com/',
      PISTACHIO_ENDPOINTS.retentionPattern,
      { mechanicKind: 'puzzle' },
    );
    expect(url).toBe(
      'https://pistachio.example.com/forge/knowledge/retention_pattern?mechanicKind=puzzle',
    );
  });

  it('buildEndpointUrl url-encodes special characters in prompts', () => {
    const url = buildEndpointUrl(
      'https://pistachio.example.com',
      PISTACHIO_ENDPOINTS.closestMechanics,
      { prompt: 'A & B puzzle' },
    );
    // URLSearchParams uses + for spaces and %26 for & -- canonical.
    expect(url).toContain('prompt=A+%26+B+puzzle');
  });

  it('PISTACHIO_ENDPOINTS pins the 4 canonical paths', () => {
    expect(PISTACHIO_ENDPOINTS.closestMechanics).toBe(
      '/forge/knowledge/closest_mechanics',
    );
    expect(PISTACHIO_ENDPOINTS.retentionPattern).toBe(
      '/forge/knowledge/retention_pattern',
    );
    expect(PISTACHIO_ENDPOINTS.difficultyCurve).toBe(
      '/forge/knowledge/difficulty_curve',
    );
    expect(PISTACHIO_ENDPOINTS.loreContext).toBe('/forge/lore/context');
  });
});

describe('Pistachio integration -- mock client', () => {
  const mock = new MockPistachioKnowledgeClient();

  it('queryClosestMechanics returns puzzle entry for puzzle keywords', async () => {
    const r = await mock.queryClosestMechanics('a neon stack puzzle');
    expect(r.entries.length).toBeGreaterThan(0);
    const ids = r.entries.map((e) => e.entryId);
    expect(ids).toContain('K-PUZZLE-CLOSEST-001');
    expect(r.corpusVersion).toBe(PISTACHIO_MOCK_CORPUS_VERSION);
    expect(r.citation).toContain('K-PUZZLE-CLOSEST-001');
  });

  it('queryClosestMechanics returns arcade entry for arcade keywords', async () => {
    const r = await mock.queryClosestMechanics('endless runner');
    const ids = r.entries.map((e) => e.entryId);
    expect(ids).toContain('K-ARCADE-CLOSEST-001');
  });

  it('queryClosestMechanics returns idle entry for idle keywords', async () => {
    const r = await mock.queryClosestMechanics('idle clicker');
    const ids = r.entries.map((e) => e.entryId);
    expect(ids).toContain('K-IDLE-CLOSEST-001');
  });

  it('queryClosestMechanics returns empty entries + empty citation for unknown prompt', async () => {
    const r = await mock.queryClosestMechanics('something unprecedented');
    expect(r.entries.length).toBe(0);
    expect(r.citation).toBe('');
  });

  it('getRetentionPattern returns canned pattern for each mechanic kind', async () => {
    const puzzle = await mock.getRetentionPattern('puzzle');
    expect(puzzle.mechanicKind).toBe('puzzle');
    expect(puzzle.canonicalName).toBe('Match-pattern stack');
    expect(puzzle.targetCompletionPercent).toBe(70);
    expect(puzzle.retentionScore).toBeGreaterThan(0);
    expect(puzzle.canonicalExamples).toContain('Tetris (1984)');

    const arcade = await mock.getRetentionPattern('arcade');
    expect(arcade.canonicalName).toBe('Endless-runner reflex');

    const idle = await mock.getRetentionPattern('idle');
    expect(idle.canonicalName).toBe('Incremental clicker');
  });

  it('getDifficultyCurve returns 8 per-level multipliers (R150 manifest default)', async () => {
    const curve = await mock.getDifficultyCurve(70);
    expect(curve.targetCompletionPercent).toBe(70);
    expect(curve.perLevelMultiplier.length).toBe(8);
    // First level multiplier ~ 1.0, monotone-rising.
    expect(curve.perLevelMultiplier[0]).toBeCloseTo(1.0, 1);
    expect(
      curve.perLevelMultiplier[curve.perLevelMultiplier.length - 1],
    ).toBeGreaterThan(1.0);
  });

  it('getDifficultyCurve clamps target completion to [10, 95]', async () => {
    const tooLow = await mock.getDifficultyCurve(5);
    expect(tooLow.targetCompletionPercent).toBe(10);
    const tooHigh = await mock.getDifficultyCurve(105);
    expect(tooHigh.targetCompletionPercent).toBe(95);
  });

  it('getLoreContext returns Scholar-Poet edge for learn theme', async () => {
    const r = await mock.getLoreContext('a game about discovery and learning');
    expect(r.edges.length).toBeGreaterThan(0);
    expect(r.edges.some((e) => e.from === 'Scholar' && e.to === 'Poet')).toBe(
      true,
    );
    expect(r.graphVersion).toBe(PISTACHIO_MOCK_LORE_VERSION);
    expect(r.citation).toContain('Pistachio Lore graph');
  });

  it('getLoreContext returns empty for unknown theme', async () => {
    const r = await mock.getLoreContext('an unprecedented theme');
    expect(r.edges.length).toBe(0);
    expect(r.citation).toBe('');
  });

  it('mock results are frozen (cohort immutability discipline)', async () => {
    const r = await mock.queryClosestMechanics('puzzle game');
    expect(Object.isFrozen(r)).toBe(true);
    if (r.entries.length > 0) {
      expect(Object.isFrozen(r.entries[0])).toBe(true);
    }
  });

  it('singleton pistachioMock is a working mock', async () => {
    const r = await pistachioMock.queryClosestMechanics('puzzle');
    expect(r.corpusVersion).toBe(PISTACHIO_MOCK_CORPUS_VERSION);
  });
});

describe('Pistachio integration -- client (mock-path default)', () => {
  it('PistachioKnowledgeClient defaults to live=false (Phase 1.5 mock-only)', () => {
    const client = new PistachioKnowledgeClient({ env: {} });
    expect(client.live).toBe(false);
    expect(client.baseUrl).toBe(PISTACHIO_PLACEHOLDER_BASE_URL);
  });

  it('client routes to mock when live=false (returns mock corpus version)', async () => {
    const client = new PistachioKnowledgeClient({ env: {} });
    const r = await client.queryClosestMechanics('puzzle');
    expect(r.corpusVersion).toBe(PISTACHIO_MOCK_CORPUS_VERSION);
  });

  it('client honours explicit live=true override + base URL', () => {
    const client = new PistachioKnowledgeClient({
      baseUrl: 'https://pistachio.example.com',
      live: true,
      env: {},
    });
    expect(client.live).toBe(true);
    expect(client.baseUrl).toBe('https://pistachio.example.com');
  });

  it('client requires non-placeholder base URL to enable live binding via env', () => {
    // Env says live=true but no base URL -> still mock-routed (placeholder).
    const client = new PistachioKnowledgeClient({
      env: { CONJURE_PISTACHIO_LIVE: 'true' },
    });
    expect(client.live).toBe(false);
    expect(client.baseUrl).toBe(PISTACHIO_PLACEHOLDER_BASE_URL);
  });

  it('client reads CONJURE_PISTACHIO_KNOWLEDGE_URL from env', () => {
    const client = new PistachioKnowledgeClient({
      env: {
        CONJURE_PISTACHIO_LIVE: 'true',
        CONJURE_PISTACHIO_KNOWLEDGE_URL: 'https://nexus.example.com/pistachio',
      },
    });
    expect(client.live).toBe(true);
    expect(client.baseUrl).toBe('https://nexus.example.com/pistachio');
  });
});

describe('Pistachio integration -- client (live-path via fetch shim)', () => {
  it('live client routes through injected fetch with correct URL', async () => {
    let capturedUrl = '';
    const fetchShim: typeof fetch = async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          entries: [],
          corpusVersion: 'shim-corpus-v1',
          citation: '',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };
    const client = new PistachioKnowledgeClient({
      baseUrl: 'https://pistachio.example.com',
      live: true,
      fetchImpl: fetchShim,
      env: {},
    });
    const r = await client.queryClosestMechanics('neon puzzle');
    expect(capturedUrl).toContain(
      'https://pistachio.example.com/forge/knowledge/closest_mechanics?',
    );
    expect(capturedUrl).toContain('prompt=neon+puzzle');
    expect(r.corpusVersion).toBe('shim-corpus-v1');
  });

  it('live client throws on non-2xx response', async () => {
    const fetchShim: typeof fetch = async () =>
      new Response('not found', { status: 404, statusText: 'Not Found' });
    const client = new PistachioKnowledgeClient({
      baseUrl: 'https://pistachio.example.com',
      live: true,
      fetchImpl: fetchShim,
      env: {},
    });
    await expect(client.queryClosestMechanics('puzzle')).rejects.toThrow(
      /Pistachio Knowledge Service 404/,
    );
  });

  it('live client handles getRetentionPattern via fetch shim', async () => {
    const fetchShim: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          mechanicKind: 'puzzle',
          canonicalName: 'live-puzzle',
          canonicalExamples: ['Live Game (2026)'],
          retentionScore: 0.9,
          targetCompletionPercent: 75,
          citation: 'live-citation',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    const client = new PistachioKnowledgeClient({
      baseUrl: 'https://pistachio.example.com',
      live: true,
      fetchImpl: fetchShim,
      env: {},
    });
    const p = await client.getRetentionPattern('puzzle');
    expect(p.canonicalName).toBe('live-puzzle');
    expect(p.citation).toBe('live-citation');
  });

  it('live client handles getDifficultyCurve + getLoreContext via fetch shim', async () => {
    const fetchShim: typeof fetch = async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes('difficulty_curve')) {
        return new Response(
          JSON.stringify({
            targetCompletionPercent: 70,
            perLevelMultiplier: [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.5],
            citation: 'live-curve',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (u.includes('lore/context')) {
        return new Response(
          JSON.stringify({
            theme: 'hero',
            edges: [
              {
                from: 'Hero',
                to: 'Mentor',
                relationship: 'apprentice-master',
                tension: 'autonomy vs. wisdom',
              },
            ],
            graphVersion: 'live-graph-v1',
            citation: 'live-lore',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('not found', { status: 404 });
    };
    const client = new PistachioKnowledgeClient({
      baseUrl: 'https://pistachio.example.com',
      live: true,
      fetchImpl: fetchShim,
      env: {},
    });
    const curve = await client.getDifficultyCurve(70);
    expect(curve.perLevelMultiplier.length).toBe(8);
    const lore = await client.getLoreContext('hero');
    expect(lore.edges.length).toBe(1);
    expect(lore.graphVersion).toBe('live-graph-v1');
  });
});
