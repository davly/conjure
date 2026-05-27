<script lang="ts">
  // Landing page. Describes the proposition and points to the studio.
</script>

<section class="hero">
  <h1>Describe a game. AI builds it.</h1>
  <p class="lede">
    No coding. No engine. No design skills. Describe what you want &mdash;
    Pistachio and Nexus build it. The game appears on a marketplace. Players
    play. You earn.
  </p>
  <div class="cta">
    <a class="primary" href="/studio">Open Studio</a>
    <a class="secondary" href="/browse">Browse Games</a>
  </div>
</section>

<section class="how">
  <h2>How it works</h2>
  <ol>
    <li><strong>Describe.</strong> Natural-language prompt of any complexity.</li>
    <li><strong>Generate.</strong> Pistachio interprets; Nexus provides AI intelligence; the forge fills in unspecified defaults.</li>
    <li><strong>Polish.</strong> Title screen, icon, description, screenshots, difficulty curve, audio &mdash; all generated.</li>
    <li><strong>Publish.</strong> Live on the marketplace.</li>
    <li><strong>Earn.</strong> Free games earn from ads (creator 60% / platform 40%). Paid games priced by you (min &pound;0.49).</li>
  </ol>
</section>

<section class="status">
  <h2>Status</h2>
  <p>
    Phase 1 MVP scaffold &middot; the studio is a working stub backed by a
    7-phase forge pipeline. Most generation stages return placeholder data.
    See <a href="https://github.com/davly/conjure/blob/main/CONTEXT.md">CONTEXT.md</a> for the
    full honesty map.
  </p>
</section>

<style>
  .hero {
    text-align: center;
    padding: 48px 0;
  }
  .hero h1 {
    font-size: 2.5rem;
    margin: 0 0 16px;
    color: #b389ff;
  }
  .lede {
    font-size: 1.2rem;
    max-width: 640px;
    margin: 0 auto 32px;
    color: #b8b8d0;
  }
  .cta {
    display: flex;
    justify-content: center;
    gap: 16px;
  }
  .primary, .secondary {
    padding: 12px 24px;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 600;
  }
  .primary {
    background: #b389ff;
    color: #0a0a12;
  }
  .secondary {
    border: 1px solid #b389ff;
    color: #b389ff;
  }
  .how, .status {
    padding: 24px 0;
    border-top: 1px solid #20203a;
  }
  .how h2, .status h2 {
    color: #b389ff;
  }
  ol {
    line-height: 1.8;
  }
  a {
    color: #b389ff;
  }
</style>
