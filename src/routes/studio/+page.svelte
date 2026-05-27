<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  export let form: ActionData;

  let prompt = '';
</script>

<h1>Studio</h1>

<p class="lede">
  Describe your game. The forge will identify the mechanic, fill in defaults,
  and generate a playable spec. Phase 1 ships three mechanic kinds: puzzle,
  arcade, idle.
</p>

<form method="POST" action="?/generate" use:enhance>
  <textarea
    name="prompt"
    bind:value={prompt}
    placeholder="A game where you stack blocks as high as you can. Neon palette. Chill music."
    rows="6"
    maxlength="2000"
  ></textarea>
  <div class="actions">
    <button type="submit">Generate</button>
    <span class="hint">{prompt.length}/2000 chars</span>
  </div>
</form>

{#if form?.error}
  <div class="error">{form.error}</div>
{/if}

{#if form?.result}
  <section class="result">
    <h2>{form.result.spec.title}</h2>
    <p class="meta">
      <span class="tag">{form.result.spec.mechanicKind}</span>
      <span class="tag">{form.result.spec.visualStyle}</span>
      <span class="tag">{form.result.spec.difficulty}</span>
      <span class="tag">{form.result.spec.audioMood}</span>
      <span class="tag escape-{form.result.escape.kind.toLowerCase()}">
        {form.result.escape.kind}
      </span>
    </p>
    <p class="description">{form.result.spec.description}</p>

    <div class="forge-stages">
      <details>
        <summary>IDENTIFY</summary>
        <p>
          Classified as <strong>{form.result.identify.mechanicKind}</strong> with
          {Math.round(form.result.identify.confidence * 100)}% confidence.
        </p>
        <p>Closest existing games:</p>
        <ul>
          {#each form.result.identify.closestExistingGames as g}
            <li>{g}</li>
          {/each}
        </ul>
      </details>

      <details>
        <summary>ASSESS</summary>
        <p>
          Playable: {form.result.assess.playable ? 'yes' : 'no'}.
          Completable: {form.result.assess.completable ? 'yes' : 'no'}.
          Engagement: {form.result.assess.engagementScoreBasisPoints / 100}%.
        </p>
      </details>

      <details>
        <summary>ESCAPE -- {form.result.escape.kind}</summary>
        <p>{form.result.escape.rationale}</p>
      </details>

      <details>
        <summary>EXPLAIN</summary>
        <p>{form.result.explain.explanation}</p>
      </details>

      <details>
        <summary>OBSERVE / FORGET / PERSIST (Phase 2 placeholders)</summary>
        <p><em>{form.result.observe.note}</em></p>
        <p><em>{form.result.forget.note}</em></p>
        <p><em>{form.result.persist.note}</em></p>
      </details>
    </div>
  </section>
{/if}

<style>
  h1 {
    color: #b389ff;
  }
  .lede {
    color: #b8b8d0;
    margin-bottom: 24px;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    background: #14142a;
    color: #e7e7f0;
    border: 1px solid #20203a;
    border-radius: 6px;
    padding: 12px;
    font-family: inherit;
    font-size: 1rem;
    resize: vertical;
  }
  .actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
  }
  button {
    background: #b389ff;
    color: #0a0a12;
    border: 0;
    padding: 10px 20px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
  }
  .hint {
    color: #8888a0;
    font-size: 0.9rem;
  }
  .error {
    background: #3a1a1a;
    color: #ff8888;
    padding: 12px;
    border-radius: 6px;
    margin-top: 16px;
  }
  .result {
    margin-top: 32px;
    padding: 24px;
    background: #14142a;
    border-radius: 6px;
    border: 1px solid #20203a;
  }
  .result h2 {
    margin: 0;
    color: #b389ff;
  }
  .meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin: 12px 0;
  }
  .tag {
    background: #20203a;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.85rem;
    color: #b8b8d0;
  }
  .escape-routine { background: #1a3a1a; color: #88ff88; }
  .escape-investigate { background: #3a3a1a; color: #ffff88; }
  .escape-learn { background: #1a1a3a; color: #8888ff; }
  .escape-alert { background: #3a1a1a; color: #ff8888; }
  .description {
    font-style: italic;
    color: #b8b8d0;
  }
  .forge-stages {
    margin-top: 16px;
  }
  details {
    background: #1a1a30;
    padding: 12px;
    margin-bottom: 8px;
    border-radius: 4px;
  }
  summary {
    cursor: pointer;
    color: #b389ff;
    font-weight: 600;
  }
</style>
