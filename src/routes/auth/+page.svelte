<script lang="ts">
  // Phase-2 placeholder signup / login UI.
  //
  // Clearly marked PHASE-2-PLACEHOLDER -- no real authentication is wired.
  // The three R143 advisories
  // (CONJURE_ACCOUNTS_AUTH_NOT_LIVE_PLACEHOLDER /
  // CONJURE_ACCOUNTS_PASSWORD_HASHING_PLACEHOLDER /
  // CONJURE_ACCOUNTS_GDPR_ARTICLE_6_LAWFUL_BASIS_NOT_DOCUMENTED) fire
  // once-per-process on first call to the accounts store. The visible
  // banner here makes the boundary loud at the UI layer too.

  import { enhance } from '$app/forms';

  export let form: any = null;

  let kind: 'player' | 'creator' = 'player';
</script>

<section class="hero">
  <h1>Sign up / Log in</h1>
  <p class="lede">
    Phase-2 placeholder. No real authentication is wired in this scaffold &mdash;
    this form is a UI skeleton only. See the honesty boundary banner below.
  </p>
</section>

<aside class="warn">
  <strong>PHASE-2-PLACEHOLDER &middot; AUTH NOT LIVE</strong>
  <p>
    This signup / login surface DOES NOT issue session cookies, does NOT
    hash passwords, and DOES NOT enforce a CSRF token. The password is
    stored as the literal cleartext string submitted &mdash; PRODUCTION
    DEPLOYMENTS MUST NOT SERVE THIS PAGE PUBLICLY. See
    <a href="https://github.com/davly/conjure/blob/main/SECURITY.md">SECURITY.md</a>
    for the wire-in plan.
  </p>
  <p class="r143">
    R143 advisories fire on first account-store call:
    <code>CONJURE_ACCOUNTS_AUTH_NOT_LIVE_PLACEHOLDER</code> /
    <code>CONJURE_ACCOUNTS_PASSWORD_HASHING_PLACEHOLDER</code> /
    <code>CONJURE_ACCOUNTS_GDPR_ARTICLE_6_LAWFUL_BASIS_NOT_DOCUMENTED</code>.
  </p>
</aside>

<div class="kind-toggle">
  <button class:active={kind === 'player'} on:click={() => (kind = 'player')}>Player</button>
  <button class:active={kind === 'creator'} on:click={() => (kind = 'creator')}>Creator</button>
</div>

<section class="forms">
  <form method="POST" action="?/signup" use:enhance>
    <h2>Sign up</h2>
    <input type="hidden" name="kind" value={kind} />
    <label>
      Email
      <input name="email" type="email" required placeholder="you@example.com" />
    </label>
    <label>
      Password placeholder (8-256 chars; stored cleartext &mdash; do not reuse)
      <input name="password" type="password" required minlength="8" maxlength="256" />
    </label>
    {#if kind === 'creator'}
      <label>
        Creator handle (lowercase, letters / digits / hyphens, starts with a letter)
        <input name="handle" type="text" required placeholder="my-handle" />
      </label>
      <label>
        Display name
        <input name="displayName" type="text" required placeholder="My Creator Name" />
      </label>
    {/if}
    <button type="submit" class="primary">Sign up as {kind}</button>
  </form>

  <form method="POST" action="?/login" use:enhance>
    <h2>Log in</h2>
    <label>
      Email
      <input name="email" type="email" required placeholder="you@example.com" />
    </label>
    <label>
      Password placeholder
      <input name="password" type="password" required />
    </label>
    <button type="submit" class="secondary">Log in (placeholder)</button>
  </form>
</section>

{#if form?.error}
  <p class="err">Error: {form.error}</p>
{/if}
{#if form?.ok}
  <p class="ok">
    Accepted &mdash; resolved account id: <code>{form.accountId}</code>
    {#if form.kind === 'creator' && form.handle}
      &middot; <a href={`/creator/${form.handle}`}>visit creator profile</a>
    {:else}
      &middot; <a href="/me">visit your profile</a>
    {/if}
    <br />
    <em>(Note: no session cookie set &mdash; this is a placeholder.)</em>
  </p>
{/if}

<style>
  .hero {
    text-align: center;
    padding: 24px 0;
  }
  .hero h1 {
    color: #b389ff;
    margin-bottom: 8px;
  }
  .lede {
    color: #b8b8d0;
  }
  .warn {
    background: #2a1a1a;
    border: 1px solid #ff5555;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 24px;
    color: #ffb0b0;
    font-size: 0.95rem;
  }
  .warn strong {
    color: #ff5555;
    display: block;
    margin-bottom: 6px;
  }
  .warn code,
  .r143 code {
    background: #2a0a0a;
    color: #ffb0b0;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 0.85em;
  }
  .kind-toggle {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    justify-content: center;
  }
  .kind-toggle button {
    padding: 8px 18px;
    background: #14142a;
    border: 1px solid #20203a;
    color: #b8b8d0;
    border-radius: 4px;
    cursor: pointer;
  }
  .kind-toggle button.active {
    background: #b389ff;
    color: #0a0a12;
    border-color: #b389ff;
  }
  .forms {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  @media (max-width: 700px) {
    .forms {
      grid-template-columns: 1fr;
    }
  }
  form {
    background: #14142a;
    border: 1px solid #20203a;
    border-radius: 6px;
    padding: 20px;
  }
  form h2 {
    color: #b389ff;
    margin: 0 0 12px;
  }
  label {
    display: block;
    margin-bottom: 12px;
    color: #b8b8d0;
    font-size: 0.95rem;
  }
  input {
    display: block;
    width: 100%;
    padding: 8px;
    margin-top: 4px;
    background: #0a0a12;
    border: 1px solid #20203a;
    border-radius: 4px;
    color: #e7e7f0;
    box-sizing: border-box;
  }
  .primary,
  .secondary {
    padding: 10px 18px;
    border-radius: 4px;
    border: none;
    font-weight: 600;
    cursor: pointer;
  }
  .primary {
    background: #b389ff;
    color: #0a0a12;
  }
  .secondary {
    background: transparent;
    border: 1px solid #b389ff;
    color: #b389ff;
  }
  .err {
    margin-top: 16px;
    padding: 12px;
    background: #2a1a1a;
    border: 1px solid #ff5555;
    color: #ffb0b0;
    border-radius: 4px;
  }
  .ok {
    margin-top: 16px;
    padding: 12px;
    background: #1a2a1a;
    border: 1px solid #55ff55;
    color: #b0ffb0;
    border-radius: 4px;
  }
  a {
    color: #b389ff;
  }
  code {
    font-family: ui-monospace, monospace;
  }
</style>
