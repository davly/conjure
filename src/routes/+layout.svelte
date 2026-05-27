<script lang="ts">
  // Conjure root layout. The "Conjured on Limitless" badge appears in the
  // footer on every page -- the cohort signature surface where a future
  // wave will attach the L43 Mirror-Mark v1 attestation.
</script>

<div class="page">
  <header>
    <a class="brand" href="/">Limitless Conjure</a>
    <nav>
      <a href="/studio">Studio</a>
      <a href="/browse">Browse</a>
    </nav>
  </header>

  <main>
    <slot />
  </main>

  <footer>
    <span class="badge">Conjured on Limitless</span>
    <span class="phase">Phase 1 MVP scaffold &middot; cohort R174 5-of-5</span>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    background: #0a0a12;
    color: #e7e7f0;
  }
  .page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 32px;
    border-bottom: 1px solid #20203a;
  }
  .brand {
    color: #b389ff;
    font-weight: 700;
    text-decoration: none;
    font-size: 1.2rem;
  }
  nav a {
    color: #e7e7f0;
    text-decoration: none;
    margin-left: 20px;
  }
  nav a:hover {
    color: #b389ff;
  }
  main {
    flex: 1;
    padding: 32px;
    max-width: 960px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }
  footer {
    padding: 16px 32px;
    border-top: 1px solid #20203a;
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: #8888a0;
  }
  .badge {
    color: #b389ff;
    font-weight: 600;
  }
</style>
