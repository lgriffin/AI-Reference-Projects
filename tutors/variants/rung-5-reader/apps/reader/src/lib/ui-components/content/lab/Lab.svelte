<!--
  A lab, one step at a time: the list of steps, the open step, and previous and next links. The arrow keys
  move between steps. Mirrors upstream Lab
  (packages/svelte/ui-components/src/learning-objects/content/lab/Lab.svelte) and its navigateStep.
-->
<script lang="ts">
  import { goto } from "$app/navigation";
  import type { LiveLab } from "../../../course/live-lab.ts";
  import Markdown from "../../../ui-primitives/Markdown.svelte";
  import SecondaryNavigator from "../../../ui-navigators/SecondaryNavigator.svelte";

  let { liveLab }: { liveLab: LiveLab } = $props();
  const { lab, step, index, previous, next } = $derived(liveLab);

  function navigateStep(event: KeyboardEvent) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, button, a")) return;
    const to = event.key === "ArrowRight" ? next : event.key === "ArrowLeft" ? previous : undefined;
    if (to) {
      event.preventDefault();
      void goto(to.route);
    }
  }
</script>

<svelte:window onkeydown={navigateStep} />
<SecondaryNavigator lo={lab} />
<div class="lab">
  <nav aria-label="Lab steps">
    <ol>
      {#each lab.los as each (each.id)}
        <li><a href={each.route} aria-current={each === step ? "step" : undefined}>{each.title}</a></li>
      {/each}
    </ol>
  </nav>
  <div>
    <p class="meta">{lab.title}: step {index + 1} of {lab.los.length}</p>
    <article data-lo-type="lab"><Markdown markdown={step.contentMd} /></article>
    <nav class="pager" aria-label="Step pager">
      {#if previous}<a href={previous.route} rel="prev">&larr; {previous.title}</a>{/if}
      {#if next}<a class="next" href={next.route} rel="next">{next.title} &rarr;</a>{/if}
    </nav>
  </div>
</div>

<style>
  .lab { display: grid; grid-template-columns: 14rem minmax(0, 1fr); gap: 1.5rem; }
  @media (max-width: 48rem) { .lab { grid-template-columns: minmax(0, 1fr); } }
  ol { padding-left: 1.25rem; }
  [aria-current="step"] { font-weight: 700; }
  .meta { color: var(--muted); font-size: 0.9rem; }
  .pager { display: flex; justify-content: space-between; border-top: 1px solid var(--border); margin-top: 2rem; padding-top: 1rem; }
  .next { margin-left: auto; }
</style>
