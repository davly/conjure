/**
 * Conjure studio server actions.
 *
 * Phase 1 ships the `generate` action: takes a user prompt, runs the
 * 7-phase forge pipeline, returns the GenerationResult. The Pistachio +
 * Nexus clients are stubs; the forge returns deterministic placeholder
 * data per the cohort honesty contract.
 */

import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

import { generate } from '$lib/server/forge';

export const actions: Actions = {
  generate: async ({ request }) => {
    const data = await request.formData();
    const prompt = String(data.get('prompt') ?? '').trim();
    const creatorId = String(data.get('creatorId') ?? 'anon');

    if (prompt.length === 0) {
      return fail(400, {
        prompt,
        error: 'Prompt is empty. Describe the game you want to conjure.',
      });
    }
    if (prompt.length > 2000) {
      return fail(400, {
        prompt,
        error: 'Prompt too long. Phase-1 cap is 2000 characters.',
      });
    }

    const result = await generate({ prompt, creatorId });
    return {
      prompt,
      result,
    };
  },
};
