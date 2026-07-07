/**
 * Conjure Phase-2 auth route server actions.
 *
 * SIGNUP / LOGIN are SCAFFOLD PLACEHOLDERS. The auth-not-live R143
 * advisory + the password-hashing R143 advisory both fire on this
 * surface. Production deployments MUST NOT serve this surface publicly.
 *
 * See `src/lib/server/accounts.ts` for the canonical advisory text +
 * see `CONTEXT.md` Phase-2 section for the wire-in plan.
 */

import { fail, type Actions } from '@sveltejs/kit';

import {
  createCreator,
  createPlayer,
  findAccountByEmail,
  isAcceptablePasswordPlaceholder,
  isValidEmail,
} from '$lib/server/accounts';

export const actions: Actions = {
  /**
   * Phase-2 placeholder signup. Creates a Player OR Creator depending on
   * the `kind` field. NO REAL AUTHENTICATION. No session cookie is set.
   */
  signup: async ({ request }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const kind = String(data.get('kind') ?? 'player').trim();
    const handle = String(data.get('handle') ?? '').trim();
    const displayName = String(data.get('displayName') ?? '').trim();

    if (!isValidEmail(email)) {
      return fail(400, { mode: 'signup', email, error: 'Invalid email shape.' });
    }
    if (!isAcceptablePasswordPlaceholder(password)) {
      return fail(400, {
        mode: 'signup',
        email,
        error: 'Password placeholder must be 8-256 characters.',
      });
    }

    if (kind === 'creator') {
      const res = createCreator({
        email,
        passwordPlaceholder: password,
        handle,
        displayName,
      });
      if (!res.ok) {
        return fail(400, { mode: 'signup', email, error: res.error });
      }
      return {
        mode: 'signup',
        ok: true,
        accountId: res.account.id,
        handle: res.account.handle,
        kind: 'creator' as const,
      };
    }
    const res = createPlayer({ email, passwordPlaceholder: password });
    if (!res.ok) {
      return fail(400, { mode: 'signup', email, error: res.error });
    }
    return {
      mode: 'signup',
      ok: true,
      accountId: res.account.id,
      kind: 'player' as const,
    };
  },

  /**
   * Phase-2 placeholder login. Looks up the email; "matches" by literal
   * string comparison against `passwordPlaceholder`. NO REAL AUTH. NO
   * SESSION ISSUED. Returns the resolved AccountId for the route to
   * display.
   */
  login: async ({ request }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');

    if (!isValidEmail(email)) {
      return fail(400, { mode: 'login', email, error: 'Invalid email shape.' });
    }
    const acc = findAccountByEmail(email);
    if (acc === null) {
      return fail(401, { mode: 'login', email, error: 'No account with that email.' });
    }
    if (acc.passwordPlaceholder !== password) {
      return fail(401, { mode: 'login', email, error: 'Wrong password placeholder.' });
    }
    return {
      mode: 'login',
      ok: true,
      accountId: acc.id,
      kind: acc.kind,
    };
  },
};
