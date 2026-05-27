<script lang="ts">
  // Phase 1 marketplace skeleton. No DB-backed game list -- this is a
  // static placeholder UI that documents the Phase-2 marketplace surface.
</script>

<h1>Browse</h1>

<p class="lede">
  Phase 1 marketplace skeleton. The full discovery engine (trending,
  rising, hidden gems, because-you-played, creator spotlight, AI-generated
  collections) lands in Phase 2.
</p>

<div class="placeholder">
  <h2>Marketplace empty</h2>
  <p>
    No published games yet. Phase-2 DB-backed marketplace + ratings + creator
    profiles + remix system are planned per the founder brief.
  </p>
  <p>
    <a href="/studio">Open the studio</a> to generate the first one.
  </p>
</div>

<section class="categories">
  <h2>Categories (Phase 2 surface)</h2>
  <div class="grid">
    {#each ['Puzzle', 'Action', 'Strategy', 'Arcade', 'Simulation', 'Word', 'Card', 'Trivia', 'Idle', 'Relaxation', 'Educational', 'Multiplayer', 'Narrative'] as cat}
      <div class="cat">
        <span>{cat}</span>
        <span class="empty">empty</span>
      </div>
    {/each}
  </div>
</section>

<style>
  h1 {
    color: #b389ff;
  }
  .lede {
    color: #b8b8d0;
  }
  .placeholder {
    background: #14142a;
    border: 1px dashed #20203a;
    border-radius: 6px;
    padding: 32px;
    text-align: center;
    margin: 32px 0;
  }
  .placeholder h2 {
    color: #b389ff;
    margin: 0 0 12px;
  }
  a {
    color: #b389ff;
  }
  .categories h2 {
    color: #b389ff;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
    margin-top: 16px;
  }
  .cat {
    background: #14142a;
    border: 1px solid #20203a;
    border-radius: 4px;
    padding: 12px;
    display: flex;
    justify-content: space-between;
    font-size: 0.95rem;
  }
  .empty {
    color: #555570;
    font-size: 0.85rem;
  }
</style>
